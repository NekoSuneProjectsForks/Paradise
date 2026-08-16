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

using Cmune.DataCenter.Common.Entities;
using log4net;
using Newtonsoft.Json;
using Paradise.Realtime.Server.Comm;
using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using UberStrike.Core.Models;
using UberStrike.Core.Serialization;
using static Paradise.WebSocket;

namespace Paradise {
	public enum PayloadType {
		Raw,
		Serialized
	}

	public enum PacketType {
		MagicBytes = 1,
		ClientInfo,
		ConnectionStatus,

		Ping,
		Pong,

		Command,
		CommandOutput,
		Monitoring,
		Error,

		ListPeers,
		ListRooms,

		ChatMessage,
		RoomChatMessage,
		PlayerList,
		PlayerJoined,
		PlayerLeft,
		RoomOpened,
		RoomClosed,
		PlayerJoinedRoom,
		PlayerLeftRoom,
		RoundStarted,
		RoundEnded,

		OpenRoom,
		CloseRoom,
		BanPlayer
	}

	public static class PacketCodec {
		private static readonly ILog Log = LogManager.GetLogger(nameof(PacketCodec));

		public static byte[] Encode(PacketType type, object data, RijndaelManaged cryptoProvider = null, bool oneWay = false, Guid conversationId = default) {
			var encrypted = false;

			using (var payloadBytes = new MemoryStream()) {
				switch (type) {
					case PacketType.MagicBytes:
					case PacketType.Ping:
					case PacketType.Pong:
						break;
					case PacketType.ClientInfo:
					case PacketType.ConnectionStatus:
						StringProxy.Serialize(payloadBytes, JsonConvert.SerializeObject(data));
						break;
					case PacketType.Command:
					case PacketType.Error:
					case PacketType.ChatMessage:
						encrypted = true;

						StringProxy.Serialize(payloadBytes, JsonConvert.SerializeObject(data));

						break;
					case PacketType.CommandOutput:
						encrypted = true;

						StringProxy.Serialize(payloadBytes, (string)data);

						break;
					case PacketType.RoomChatMessage: {
						encrypted = true;

						var input = ((SocketChatMessage message, GameRoomData metadata))data;

						StringProxy.Serialize(payloadBytes, JsonConvert.SerializeObject(input.message));
						GameRoomDataProxy.Serialize(payloadBytes, input.metadata);

						break;
					}
					case PacketType.Monitoring:
					case PacketType.BanPlayer:
						encrypted = true;

						DictionaryProxy<string, object>.Serialize(payloadBytes, (Dictionary<string, object>)data, StringProxy.Serialize, (stream, instance) => {
							StringProxy.Serialize(stream, JsonConvert.SerializeObject(instance));
						});

						break;
					case PacketType.ListPeers:
						encrypted = true;

						ListProxy<Dictionary<string, object>>.Serialize(payloadBytes, (List<Dictionary<string, object>>)data, (stream, instance) => {
							DictionaryProxy<string, object>.Serialize(stream, instance, StringProxy.Serialize, (stream2, instance2) => {
								StringProxy.Serialize(stream, JsonConvert.SerializeObject(instance2));
							});
						});

						break;
					case PacketType.ListRooms:
						encrypted = true;

						ListProxy<GameRoomData>.Serialize(payloadBytes, (List<GameRoomData>)data, GameRoomDataProxy.Serialize);

						break;
					case PacketType.PlayerJoined:
					case PacketType.PlayerLeft: {
						encrypted = true;

						var peer = (CommPeer)data;
						Int32Proxy.Serialize(payloadBytes, peer.Actor.Cmid);
						StringProxy.Serialize(payloadBytes, peer.RemoteIPAddress.ToString());
						Int32Proxy.Serialize(payloadBytes, peer.RemotePort);
						EnumProxy<ChannelType>.Serialize(payloadBytes, peer.Actor.ActorInfo.Channel);

						break;
					}
					case PacketType.RoomOpened:
					case PacketType.RoomClosed:
						encrypted = true;

						GameRoomDataProxy.Serialize(payloadBytes, (GameRoomData)data);

						break;
					case PacketType.PlayerJoinedRoom:
					case PacketType.PlayerLeftRoom: {
						encrypted = true;

						var (actorInfo, gameRoom) = ((Realtime.Server.Game.GameActorInfo actorInfo, GameRoomData gameRoom))data;

						GameActorInfoProxy.Serialize(payloadBytes, actorInfo);
						GameRoomDataProxy.Serialize(payloadBytes, gameRoom);

						break;
					}
					case PacketType.RoundStarted: {
						encrypted = true;

						GameRoomDataProxy.Serialize(payloadBytes, (GameRoomData)data);

						break;
					}
					case PacketType.RoundEnded: {
						encrypted = true;

						var input = ((GameRoomData metadata, EndOfMatchData matchData, Dictionary<int, StatsCollection> playerStats))data;

						GameRoomDataProxy.Serialize(payloadBytes, input.metadata);
						EndOfMatchDataProxy.Serialize(payloadBytes, input.matchData);
						DictionaryProxy<int, StatsCollection>.Serialize(payloadBytes, input.playerStats, Int32Proxy.Serialize, StatsCollectionProxy.Serialize);

						break;
					}
					case PacketType.OpenRoom: {
						encrypted = true;

						var input = ((GameRoomData metadata, string password))data;

						GameRoomDataProxy.Serialize(payloadBytes, input.metadata);
						StringProxy.Serialize(payloadBytes, input.password);

						break;
					}
					case PacketType.CloseRoom:
						encrypted = true;

						Int32Proxy.Serialize(payloadBytes, (int)data);

						break;
					default:
						Log.Warn($"Rejecting to encode payload of type {type}: Unknown type.");

						return null;
				}

				using (var outputBytes = new MemoryStream()) {
					EnumProxy<PayloadType>.Serialize(outputBytes, PayloadType.Serialized);
					EnumProxy<PacketType>.Serialize(outputBytes, type);
					BooleanProxy.Serialize(outputBytes, cryptoProvider != null && encrypted);

					if (cryptoProvider != null && encrypted) {
						using (var memoryStream = new MemoryStream()) {
							using (var cryptoStream = new CryptoStream(memoryStream, cryptoProvider.CreateEncryptor(), CryptoStreamMode.Write)) {
								var _bytes = payloadBytes.ToArray();
								cryptoStream.Write(_bytes, 0, _bytes.Length);
							}

							ArrayProxy<byte>.Serialize(outputBytes, memoryStream.ToArray(), ByteProxy.Serialize);
						}
					} else {
						ArrayProxy<byte>.Serialize(outputBytes, payloadBytes.ToArray(), ByteProxy.Serialize);
					}

					BooleanProxy.Serialize(outputBytes, oneWay);
					StringProxy.Serialize(outputBytes, (conversationId != null ? conversationId : Guid.NewGuid()).ToString());

					return outputBytes.ToArray();
				}
			}
		}

		public static (T, PacketType, bool, Guid) Decode<T>(MemoryStream inputStream, RijndaelManaged cryptoProvider = null) {
			var type = EnumProxy<PacketType>.Deserialize(inputStream);
			var encrypted = BooleanProxy.Deserialize(inputStream);
			var data = ArrayProxy<byte>.Deserialize(inputStream, ByteProxy.Deserialize);

			var oneWay = BooleanProxy.Deserialize(inputStream);
			var conversationId = Guid.Parse(StringProxy.Deserialize(inputStream));

			if (encrypted) {
				if (cryptoProvider == null) {
					Log.Error("Failed to decrypt encrypted payload: No crypto provider.");

					return default;
				}

				using (var memoryStream = new MemoryStream()) {
					using (var cryptoStream = new CryptoStream(memoryStream, cryptoProvider.CreateDecryptor(), CryptoStreamMode.Write)) {
						cryptoStream.Write(data, 0, data.Length);
					}

					data = memoryStream.ToArray();
				}
			}

			using (var payloadBytes = new MemoryStream(data)) {
				var result = default(object);

				switch (type) {
					case PacketType.MagicBytes:
					case PacketType.Ping:
					case PacketType.Pong:
						break;
					case PacketType.ClientInfo:
						result = JsonConvert.DeserializeObject<SocketInfo>(StringProxy.Deserialize(payloadBytes));

						break;
					case PacketType.ConnectionStatus:
						result = JsonConvert.DeserializeObject<SocketConnectionStatus>(StringProxy.Deserialize(payloadBytes));

						break;
					case PacketType.Command:
						result = JsonConvert.DeserializeObject<SocketCommand>(StringProxy.Deserialize(payloadBytes));

						break;
					case PacketType.CommandOutput:
						result = StringProxy.Deserialize(payloadBytes);

						break;
					case PacketType.Monitoring:
					case PacketType.BanPlayer:
						result = DictionaryProxy<string, object>.Deserialize(payloadBytes, StringProxy.Deserialize, (stream) => {
							return JsonConvert.DeserializeObject<object>(StringProxy.Deserialize(stream));
						});

						break;
					case PacketType.Error:
						result = JsonConvert.DeserializeObject<RealtimeError>(StringProxy.Deserialize(payloadBytes));

						break;
					case PacketType.ListPeers:
						result = ListProxy<Dictionary<string, object>>.Deserialize(payloadBytes, stream => {
							return DictionaryProxy<string, object>.Deserialize(stream, StringProxy.Deserialize, (stream2) => {
								return JsonConvert.DeserializeObject<object>(StringProxy.Deserialize(stream2));
							});
						});

						break;
					case PacketType.ListRooms:
						result = ListProxy<GameRoomData>.Deserialize(payloadBytes, GameRoomDataProxy.Deserialize);

						break;
					case PacketType.ChatMessage:
						result = JsonConvert.DeserializeObject<SocketChatMessage>(StringProxy.Deserialize(payloadBytes));

						break;
					case PacketType.RoomChatMessage:
						result = (
							JsonConvert.DeserializeObject<SocketChatMessage>(StringProxy.Deserialize(payloadBytes)),
							GameRoomDataProxy.Deserialize(payloadBytes)
						);

						break;
					case PacketType.PlayerJoined:
					case PacketType.PlayerLeft:
						result = new Dictionary<string, object> {
							["Cmid"] = Int32Proxy.Deserialize(payloadBytes),
							["RemoteIPAddress"] = StringProxy.Deserialize(payloadBytes),
							["RemotePort"] = Int32Proxy.Deserialize(payloadBytes),
							["Channel"] = EnumProxy<ChannelType>.Deserialize(payloadBytes),
						};

						break;
					case PacketType.RoomOpened:
					case PacketType.RoomClosed:
						result = GameRoomDataProxy.Deserialize(payloadBytes);

						break;
					case PacketType.PlayerJoinedRoom:
					case PacketType.PlayerLeftRoom:
						result = (GameActorInfoProxy.Deserialize(payloadBytes), GameRoomDataProxy.Deserialize(payloadBytes));

						break;
					case PacketType.RoundStarted:
						result = GameRoomDataProxy.Deserialize(payloadBytes);

						break;
					case PacketType.RoundEnded:
						result = (
							GameRoomDataProxy.Deserialize(payloadBytes),
							EndOfMatchDataProxy.Deserialize(payloadBytes),
							DictionaryProxy<int, StatsCollection>.Deserialize(payloadBytes, Int32Proxy.Deserialize, StatsCollectionProxy.Deserialize)
						);

						break;
					case PacketType.OpenRoom:
						result = (GameRoomDataProxy.Deserialize(payloadBytes), StringProxy.Deserialize(payloadBytes));

						break;
					case PacketType.CloseRoom:
						result = Int32Proxy.Deserialize(payloadBytes);

						break;
					default:
						Log.Warn($"Rejecting to decode payload of type {type}: Unknown type.");

						break;
				}

				return ((T)result, type, oneWay, conversationId);
			}
		}
	}
}
