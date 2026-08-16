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
using Photon.SocketServer;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using UberStrike.Realtime.UnitySdk;
using static Paradise.WebSocket;
using Paradise.Realtime;
using UberStrike.Core.Models;

namespace Paradise.Realtime.Server.Game {
	public class GameServerApplication : BaseRealtimeApplication {
		protected static readonly new ILog Log = LogManager.GetLogger(nameof(GameServerApplication));
		protected static readonly ILog ChatLog = LogManager.GetLogger("ChatLog");

		public static new GameServerApplication Instance => (GameServerApplication)ApplicationBase.Instance;
		public override ServerType ServerType => ServerType.Game;
		public GameRoomManager RoomManager { get; private set; } = new GameRoomManager();

		private static readonly ProfanityFilter.ProfanityFilter ProfanityFilter = new ProfanityFilter.ProfanityFilter();

		public override int Peers {
			get {
				var count = 0;
				foreach (var room in RoomManager.Rooms.Values) {
					count += room.Peers.Count;
				}
				return count;
			}
		}

		public int Players {
			get {
				var count = 0;
				foreach (var room in RoomManager.Rooms.Values) {
					count += room.Players.Count;
				}
				return count;
			}
		}

		protected override PeerBase OnCreatePeer(InitRequest initRequest) {
			return new GamePeer(initRequest);
		}

		protected override void OnBeforeSetup() {
			if (Configuration.GameApplicationSettings.ApplicationIdentifier == null) {
				Log.Fatal("ApplicationIdentifier is null!");
				throw new ArgumentNullException(nameof(Configuration.GameApplicationSettings.ApplicationIdentifier));
			}

			Identifier = Configuration.GameApplicationSettings.ApplicationIdentifier;

			if (Configuration.GameApplicationSettings.PhotonId == 0) {
				Log.Fatal("PhotonId is null!");
				throw new ArgumentNullException(nameof(Configuration.GameApplicationSettings.PhotonId));
			}

			PhotonId = Configuration.GameApplicationSettings.PhotonId;

			Log.Info($"Starting GameServer[{Identifier}]...");
		}

		protected override void OnSetup() {
			try {
				if (ParadiseWebServiceClient.Instance.GetPermanentGameRooms(PhotonId) is var data) {
					foreach (var room in data.rooms) {
						data.passwords.TryGetValue(room.Number, out var password);

						RoomManager.CreateRoom(room, password ?? "", false);
					}
				}
			} catch (Exception ex) {
				//Log.Fatal("Could not connect to the Web Services. Ensure the Web Services are running and restart the Realtime application.");
				Log.Fatal(ex);

				return;
			}

			SocketClient = new SocketClient(Identifier, ServerType.Game, PhotonId, Configuration.GameApplicationSettings.EncryptionPassPhrase);

			SocketClient.Connected += (sender, e) => {
				Log.Info("Game: CONNECTED TO SOCKET");

				PublishRoomList();
			};

			SocketClient.Disconnected += (sender, e) => {
				Log.Info("Game: DISCONNECTED FROM SOCKET");
				SocketClient.Reconnect(25);
			};

			SocketClient.ConnectionRejected += (sender, e) => {
				Log.Info($"Game: Rejected connection by socket server (Reason: {e.Reason})");
			};

			SocketClient.DataReceived += (sender, e) => {
				try {
					switch (e.Type) {
						case PacketType.ChatMessage: {
							var message = (SocketChatMessage)e.Data;

							if (RoomManager.TryGetRoom(message.RoomNumber, out var room) && room != null) {
								var senderPeer = room.Peers.FirstOrDefault(_ => _.Actor.Cmid == message.Cmid);

								if (senderPeer != null) {
									var censored = ProfanityFilter.CensorString(message.Message);
									var trimmed = censored.Substring(0, Math.Min(censored.Length, 140));

									if (Configuration.EnableChatLog) {
										ChatLog.Info($"[{room.RoomId}] {message.Name}: {message.Message}");
									}

									foreach (var peer in room.Peers) {
										peer.GameEventSender.SendChatMessage(message.Cmid, message.Name, trimmed, senderPeer.Actor.AccessLevel, (byte)ChatContext.None);
									}
								}
							}

							break;
						}
						case PacketType.OpenRoom: {
							var (roomData, password) = ((GameRoomData roomData, string password))e.Data;

							RoomManager.CreateRoom(roomData, password, false);
							break;
						}
						case PacketType.CloseRoom: {
							var roomId = (int)e.Data;

							if (RoomManager.TryGetRoom(roomId, out var room)) {
								var peers = new List<GamePeer>(room.Peers);

								foreach (var roomPeer in peers) {
									room.Leave(roomPeer);
									roomPeer.PeerEventSender.SendRoomEnterFailed(string.Empty, 0, "Game has been closed.");
								}

								RoomManager.RemoveRoom(room.RoomId);
							}
							break;
						}
					}
				} catch (Exception ex) {
					Log.Error($"Error while receiving WebSocket data", ex);
				}
			};

			var tcpAddress = Dns.GetHostAddresses(Configuration.MasterHostname).Where(_ => _.AddressFamily == AddressFamily.InterNetwork).First();

			if (tcpAddress != null) {
				SocketClient.Connect(tcpAddress, Configuration.SocketPort);
			}

			Log.Info($"Started GameServer[{Identifier}].");
		}

		protected override void OnBeforeTearDown() {
			Log.Info($"Stopping GameServer[{Identifier}]...");
		}

		protected override void OnTearDown() {
			Log.Info($"Stopped GameServer[{Identifier}].");
		}

		private void PublishRoomList() {
			SocketClient?.SendSync(PacketType.ListRooms, RoomManager.Rooms.Values.Select(room => room.MetaData).Where(room => !room.IsPermanentGame).ToList());
		}
	}
}
