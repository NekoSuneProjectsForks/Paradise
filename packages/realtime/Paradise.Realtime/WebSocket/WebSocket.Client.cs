/*
 * Copyright (C) 2017, 2022-2026 Team FESTIVAL
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

using log4net;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UberStrike.Core.Serialization;
using WebSocketSharp;

namespace Paradise {
	public partial class WebSocket {
		public class SocketClient {
			readonly byte[] MAGIC_BYTES = new byte[] { 0x65, 0x53, 0x69, 0x44, 0x61, 0x52, 0x61, 0x50 /* 0x50 */ };

			public const int CONNECT_TIMEOUT = 3;
			public const int RECONNECT_INTERVAL = 1;
			public const int MAX_RECONNECT = 10;
			public const int SEND_TIMEOUT = 3;
			public const int RECEIVE_TIMEOUT = 3;

			protected static readonly ILog Log = LogManager.GetLogger(nameof(SocketClient));

			private IPEndPoint RemoteEndPoint;
			private WebSocketSharp.WebSocket SocketConnection;
			private readonly ManualResetEvent ConnectionWaitHandle = new ManualResetEvent(false);
			private readonly ManualResetEvent ConnectionRejectedHandle = new ManualResetEvent(false);
			public DateTime LastResponseTime;

			//private Task<int> sendTask;
			private Task<object> receiveTask;
			private readonly Dictionary<Guid, TaskCompletionSource<object>> receiveTasks = new Dictionary<Guid, TaskCompletionSource<object>>();

			private SocketInfo ClientInfo;
			private readonly RijndaelManaged CryptoProvider;

			public event EventHandler<SocketConnectedEventArgs> Connected;
			public event EventHandler<SocketDisconnectedEventArgs> Disconnected;
			public event EventHandler<SocketDataReceivedEventArgs> DataReceived;
			public event EventHandler<SocketConnectionRejectedEventArgs> ConnectionRejected;

			public SocketClient(Guid serverId, ServerType serverType, int photonId, string encryptionPassphrase) {
				try {
					ClientInfo = new SocketInfo {
						SocketId = serverId,
						PhotonId = photonId,
						Type = serverType
					};

					if (!string.IsNullOrEmpty(encryptionPassphrase)) {
						CryptoProvider = new RijndaelManaged {
							KeySize = 256,
							Key = new Rfc2898DeriveBytes(encryptionPassphrase, ClientInfo.SocketId.ToByteArray()).GetBytes(32),
							IV = ClientInfo.SocketId.ToByteArray()
						};
					}
				} catch (Exception e) {
					Log.Error(e);
				}
			}

			public async void Connect(IPAddress ip, int port, int maxAttempts = MAX_RECONNECT) {
				RemoteEndPoint = new IPEndPoint(ip, port);

				var uriBuilder = new UriBuilder {
					Scheme = "ws",
					Host = RemoteEndPoint.Address.ToString(),
					Port = RemoteEndPoint.Port
				};

				SocketConnection = new WebSocketSharp.WebSocket(uriBuilder.ToString());
				SocketConnection.Log.Level = (LogLevel)6; // Set to "None", which doesn't exist in the LogLevel enum

				SocketConnection.OnOpen += (sender, e) => {
					ConnectionWaitHandle.Set();
				};

				SocketConnection.OnClose += (sender, e) => {
					if ((e.Code == (ushort)CloseStatusCode.Abnormal && ConnectionWaitHandle.WaitOne(0)) || e.Code != (ushort)CloseStatusCode.Abnormal) {
						Disconnected?.Invoke(this, new SocketDisconnectedEventArgs {
							Socket = SocketConnection,
							Info = ClientInfo,
							Code = e.Code,
							Reason = e.Reason
						});
					}
				};

				SocketConnection.OnMessage += (sender, e) => {
					using (var inputStream = new MemoryStream(e.RawData))
					using (var outputStream = new MemoryStream()) {
						var payloadType = EnumProxy<PayloadType>.Deserialize(inputStream);

						if (payloadType == PayloadType.Raw) {
							var packetType = EnumProxy<PacketType>.Deserialize(inputStream);

							switch (packetType) {
								case PacketType.MagicBytes:
									EnumProxy<PayloadType>.Serialize(outputStream, PayloadType.Raw);
									EnumProxy<PacketType>.Serialize(outputStream, PacketType.MagicBytes);
									ArrayProxy<byte>.Serialize(outputStream, MAGIC_BYTES, ByteProxy.Serialize);

									SendBytesSync(outputStream.ToArray());
									break;
								case PacketType.ClientInfo:
									SendSync(PacketType.ClientInfo, ClientInfo, serverType: ClientInfo.Type);
									break;
								case PacketType.Ping:
									LastResponseTime = DateTime.UtcNow;
									SendPacketSync(PacketType.Pong);
									break;
								default:
									break;
							}
						} else if (payloadType == PayloadType.Serialized) {
							var (payloadObj, packetType, oneWay, conversationId) = PacketCodec.Decode<object>(inputStream, CryptoProvider);

							switch (packetType) {
								case PacketType.ConnectionStatus:
									var status = (SocketConnectionStatus)payloadObj;

									if (status.Connected) {
										Connected?.Invoke(this, new SocketConnectedEventArgs {
											Socket = SocketConnection
										});
									} else if (status.Rejected) {
										ConnectionRejectedHandle.Set();

										ConnectionRejected?.Invoke(this, new SocketConnectionRejectedEventArgs {
											Info = ClientInfo,
											Socket = SocketConnection,
											Reason = status.DisconnectReason
										});

										SocketConnection.Close();
									}
									break;
								default:
									DataReceived?.Invoke(this, new SocketDataReceivedEventArgs {
										Socket = SocketConnection,
										Type = packetType,
										Data = payloadObj
									});

									if (receiveTasks.ContainsKey(conversationId)) {
										receiveTasks[conversationId].SetResult(payloadObj);
										receiveTasks.Remove(conversationId);
									}

									break;
							}
						}
					}
				};

				int connectionAttempts = 0;

				while ((maxAttempts == 0 || connectionAttempts < maxAttempts) && !ConnectionRejectedHandle.WaitOne(0)) {
					try {
						connectionAttempts++;

						ConnectionWaitHandle.Reset();

						SocketConnection.ConnectAsync();

						if (!ConnectionWaitHandle.WaitOne(TimeSpan.FromSeconds(CONNECT_TIMEOUT))) {
							Log.Info($"Failed to establish connection within {CONNECT_TIMEOUT} second(s), retrying in {RECONNECT_INTERVAL} second(s). (Attempt {connectionAttempts})");
							SocketConnection.Close();
						} else {
							return;
						}

					} catch (Exception e) {
						Log.Error(e);
					}


					if (maxAttempts == 0 || connectionAttempts < maxAttempts) {
						await Task.Delay(TimeSpan.FromSeconds(RECONNECT_INTERVAL));
					} else {
						Log.Info($"Failed to establish connection within {maxAttempts} attempts(s).");
						return;
					}
				}
			}

			public void Reconnect(int maxAttempts = MAX_RECONNECT) {
				if (RemoteEndPoint == null)
					return;

				Connect(RemoteEndPoint.Address, RemoteEndPoint.Port, maxAttempts);
			}

			#region Send
			public async Task SendBytes(byte[] bytes) {
				await Task.Run(() => {
					SendBytesSync(bytes);
				});
			}

			public void SendBytesSync(byte[] bytes) {
				SocketConnection.Send(bytes);
			}

			public async Task SendPacket(PacketType type) {
				await Task.Run(() => {
					SendPacketSync(type);
				});
			}

			public void SendPacketSync(PacketType type) {
				using (var stream = new MemoryStream()) {
					EnumProxy<PayloadType>.Serialize(stream, PayloadType.Raw);
					EnumProxy<PacketType>.Serialize(stream, type);

					SocketConnection.Send(stream.ToArray());
				}
			}

			public async Task<object> Send(PacketType type, object payload, bool oneWay = true, Guid conversationId = default, ServerType serverType = ServerType.None) {
				if (conversationId == null) {
					conversationId = Guid.NewGuid();
				}

				await Task.Run(() => {
					SocketConnection.Send(PacketCodec.Encode(type, payload, CryptoProvider, oneWay, conversationId));
				});

				if (oneWay)
					return null;

				receiveTasks[conversationId] = new TaskCompletionSource<object>();
				receiveTask = receiveTasks[conversationId].Task;

				var timeout = Task.Delay(TimeSpan.FromSeconds(RECEIVE_TIMEOUT));

				if (await Task.WhenAny(receiveTask, timeout) == timeout) {
					Log.Error($"Failed to receive data within {RECEIVE_TIMEOUT} second(s).");
					receiveTask = null;
					return null;
				}

				var taskData = await receiveTask;
				receiveTask = null;

				return taskData;
			}

			public object SendSync(PacketType type, object payload, bool oneWay = true, Guid conversationId = default, ServerType serverType = ServerType.None) {
				return Task.Run(async () => {
					return await Send(type, payload, oneWay, conversationId, serverType);
				}).Result;
			}
			#endregion
		}
	}
}
