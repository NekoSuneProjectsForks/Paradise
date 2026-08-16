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

using LiteNetLib;
using LiteNetLib.Utils;
using Paradise.Transport;
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;

namespace ExitGames.Client.Photon {
	public class PhotonPeer : INetEventListener {
		private readonly IPhotonPeerListener listener;
		private readonly NetManager manager;
		private NetPeer serverPeer;
		private PeerStateValue state = PeerStateValue.Disconnected;

		private int serverTimeOffset;
		private int timeSyncSentTick;
		private bool timeSyncPending;

		private const byte TimeSyncOpCode = 254;

		public ConnectionProtocol ProtocolInUse { get; private set; }
		public DebugLevel DebugLevel { get; set; } = DebugLevel.ERROR;
		public string ServerAddress { get; private set; }

		public static string ConnectionKey = "tf.festival.paradise";

		public PhotonPeer(IPhotonPeerListener listener, ConnectionProtocol protocolType) {
			this.listener = listener ?? throw new ArgumentNullException(nameof(listener));
			this.ProtocolInUse = protocolType;

			manager = new NetManager(this) {
				AutoRecycle = true,
				UnconnectedMessagesEnabled = false,
				ChannelsCount = 4,
				UpdateTime = 10,
				IPv6Enabled = IPv6Mode.Disabled,
			};
		}

		public PeerStateValue PeerState => state;
		public int RoundTripTime => serverPeer?.Ping * 2 ?? 0;
		public long BytesIn => manager.Statistics.BytesReceived;
		public long BytesOut => manager.Statistics.BytesSent;

		public int ServerTimeInMilliSeconds => Environment.TickCount + serverTimeOffset;

		public bool Connect(string serverAddress, string applicationName) {
			ServerAddress = serverAddress;

			if (!ParseEndpoint(serverAddress, out var host, out var port)) {
				listener.DebugReturn(DebugLevel.ERROR, $"Bad server address: {serverAddress}");

				return false;
			}

			if (!manager.IsRunning && !manager.Start()) {
				listener.DebugReturn(DebugLevel.ERROR, "Failed to start client socket.");

				return false;
			}

			state = PeerStateValue.Connecting;

			var writer = new NetDataWriter();
			writer.Put(applicationName ?? string.Empty);

			serverPeer = manager.Connect(host, port, writer);

			return serverPeer != null;
		}

		public void Disconnect() {
			if (serverPeer != null) {
				manager.DisconnectPeer(serverPeer);
				serverPeer = null;
			}

			state = PeerStateValue.Disconnected;
			manager.Stop();
		}

		public void Service() {
			manager.PollEvents();
		}

		public bool SendOutgoingCommands() {
			manager.PollEvents();
			return true;
		}

		public bool SendAcksOnly() {
			return true;
		}

		public bool DispatchIncomingCommands() {
			manager.PollEvents();
			return true;
		}

		public void FetchServerTimestamp() {
			SendTimeSync();
		}

		public virtual bool OpCustom(byte customOpCode, Dictionary<byte, object> customOpParameters, bool sendReliable, byte channelId, bool encrypt) {
			if (serverPeer == null || serverPeer.ConnectionState != ConnectionState.Connected) {
				listener.DebugReturn(DebugLevel.WARNING, $"[LNL] op {customOpCode} dropped: not connected (state {serverPeer?.ConnectionState ?? ConnectionState.Disconnected})");

				return false;
			}

			var wire = WireMessage.Operation(customOpCode, customOpParameters);
			var bytes = WireCodec.Encode(wire);

			try {
				serverPeer.Send(bytes, (byte)(sendReliable ? 0 : 1), sendReliable ? DeliveryMethod.ReliableOrdered : DeliveryMethod.Sequenced);
				// listener.DebugReturn(DebugLevel.INFO, $"[LNL] -> op {customOpCode} ({bytes.Length} bytes, reliable: {(sendReliable ? "yes" : "no")})");

				return true;
			} catch (Exception e) {
				listener.DebugReturn(DebugLevel.ERROR, $"[LNL] send failed: {e.Message}");
				listener.OnStatusChanged(StatusCode.SendError);

				return false;
			}
		}

		public virtual bool OpCustom(byte customOpCode, Dictionary<byte, object> customOpParameters, bool sendReliable, byte channelId) {
			return OpCustom(customOpCode, customOpParameters, sendReliable, channelId, false);
		}

		public virtual bool OpCustom(byte customOpCode, Dictionary<byte, object> customOpParameters, bool sendReliable) {
			return OpCustom(customOpCode, customOpParameters, sendReliable, 0, false);
		}

		// #region INetEventListener
        public void OnConnectionRequest(ConnectionRequest request) {
			request.Reject();
		}

        public void OnPeerConnected(NetPeer peer) {
			serverPeer = peer;
			state = PeerStateValue.Connected;
			listener.DebugReturn(DebugLevel.INFO, $"[LNL] connected to {ServerAddress}");

			SendTimeSync();

			listener.OnStatusChanged(StatusCode.Connect);
		}

        public void OnPeerDisconnected(NetPeer peer, DisconnectInfo disconnectInfo) {
			state = PeerStateValue.Disconnected;
			serverPeer = null;

			listener.OnStatusChanged(MapStatus(disconnectInfo.Reason));
		}

        public void OnNetworkReceive(NetPeer peer, NetPacketReader reader, DeliveryMethod deliveryMethod) {
			var data = reader.GetRemainingBytes();

			WireMessage message;
			try {
				message = WireCodec.Decode(data);
			} catch (Exception e) {
				listener.DebugReturn(DebugLevel.ERROR, $"bad wire message: {e.Message}");
				return;
			}

			// listener.DebugReturn(DebugLevel.INFO, $"[LNL] <- {message.Type} code {message.Code} ({data.Length} bytes)");

			switch (message.Type) {
				case WireMessageType.Event:
					listener.OnEvent(new EventData {
						Code = message.Code,
						Parameters = message.Parameters
					});

					break;
				case WireMessageType.OperationResponse:
					if (message.Code == TimeSyncOpCode) {
						if (timeSyncPending && message.Parameters.TryGetValue(0, out var tick) && tick is int serverTick) {
							var now = Environment.TickCount;

							// Estimate the server's tick "now" as serverTick + half the round-trip, so the
							// offset maps our local clock onto the server's: offset = serverTick - (T0+T1)/2.
							int midpoint = timeSyncSentTick + ((now - timeSyncSentTick) / 2);

							serverTimeOffset = serverTick - midpoint;
							timeSyncPending = false;

							listener.DebugReturn(DebugLevel.INFO, $"[LNL] server clock synced (offset {serverTimeOffset}ms).");
						}

						break;
					}

					listener.OnOperationResponse(new OperationResponse {
						OperationCode = message.Code,
						ReturnCode = message.ReturnCode,
						DebugMessage = message.DebugMessage,
						Parameters = message.Parameters,
					});

					break;
			}
		}

        public void OnNetworkError(IPEndPoint endPoint, SocketError socketError) {
			listener.OnStatusChanged(StatusCode.Exception);
		}

		public void OnNetworkReceiveUnconnected(IPEndPoint remoteEndPoint, NetPacketReader reader, UnconnectedMessageType messageType) { }

		public void OnNetworkLatencyUpdate(NetPeer peer, int latency) { }
        // #endregion

		private void SendTimeSync() {
			if (serverPeer == null || serverPeer.ConnectionState != ConnectionState.Connected) return;

			try {
				timeSyncSentTick = Environment.TickCount;
				timeSyncPending = true;

				var wire = WireMessage.Operation(TimeSyncOpCode, new Dictionary<byte, object> {
					{ 0, timeSyncSentTick }
				});

				serverPeer.Send(WireCodec.Encode(wire), 0, DeliveryMethod.ReliableOrdered);
			} catch (Exception e) {
				listener.DebugReturn(DebugLevel.WARNING, $"[LNL] time-sync send failed: {e.Message}");
			}
		}

		private static bool ParseEndpoint(string address, out string host, out int port) {
			host = null;
			port = 0;

			if (string.IsNullOrEmpty(address)) return false;

			address = address.Replace("udp://", string.Empty).Trim();

			var colon = address.LastIndexOf(':');
			if (colon < 0) {
				host = address;
				port = 5055;

				return true;
			}

			host = address.Substring(0, colon);
			return int.TryParse(address.Substring(colon + 1), out port);
		}

		private static StatusCode MapStatus(DisconnectReason reason) {
			switch (reason) {
				case DisconnectReason.Timeout:
				case DisconnectReason.ConnectionFailed:
					return StatusCode.TimeoutDisconnect;
				case DisconnectReason.ConnectionRejected:
					return StatusCode.DisconnectByServerLogic;
				case DisconnectReason.RemoteConnectionClose:
					return StatusCode.DisconnectByServer;
				default:
					return StatusCode.Disconnect;
			}
		}
	}
}
