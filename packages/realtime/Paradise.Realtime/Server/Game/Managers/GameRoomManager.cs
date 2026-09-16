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
using Paradise.Realtime.Core;
using System;
using System.Collections.Generic;
using UberStrike.Core.Models;
using UberStrike.Core.Types;

namespace Paradise.Realtime.Server.Game {
	public class GameRoomManager : IDisposable {
		protected static readonly ILog Log = LogManager.GetLogger(nameof(GameRoomManager));

		private static readonly ProfanityFilter.ProfanityFilter ProfanityFilter = new ProfanityFilter.ProfanityFilter();

		private bool isDisposed;

		private readonly BalancingLoopScheduler LoopScheduler = new BalancingLoopScheduler(GameServerApplication.Instance.Configuration.GameplaySettings.TickRate);

		public Dictionary<int, BaseGameRoom> Rooms { get; private set; } = new Dictionary<int, BaseGameRoom>();

		private readonly object Lock = new object();

		public BaseGameRoom CreateRoom(GameRoomData data, string password, bool notify = true) {
			if (data == null) {
				throw new ArgumentNullException(nameof(data));
			}

			if (ProfanityFilter.ContainsProfanity(data.Name)) {
				data.Name = ProfanityFilter.CensorString(data.Name);
			}

			/* Set those to 0, so the client knows there is no level restriction. */
			if (data.LevelMin <= 1) {
				data.LevelMin = 0;
			}
			if (data.LevelMax >= 100) {
				data.LevelMax = 0;
			}

			BaseGameRoom room = null;
			try {
				switch (data.GameMode) {
					case GameModeType.DeathMatch:
						room = new DeathMatchRoom(data, LoopScheduler);
						break;
					case GameModeType.TeamDeathMatch:
						room = new TeamDeathMatchRoom(data, LoopScheduler);
						break;
					case GameModeType.EliminationMode:
						room = new TeamEliminationRoom(data, LoopScheduler);
						break;
					default:
						//room = new TestRoom(data, LoopScheduler);
						//break;
						throw new NotSupportedException();
				}
			} catch {
				room?.Dispose();
				throw;
			}

			lock (Lock) {
				if (data.Number == 0) {
					var random = new Random((int)DateTime.UtcNow.Ticks);

					var roomId = random.Next(1, int.MaxValue);
					while (Rooms.ContainsKey(roomId)) {
						roomId = random.Next(1, int.MaxValue);
					}

					room.RoomId = roomId;
				} else {
					room.RoomId = data.Number;
				}

				room.Password = password;

				Rooms.Add(room.RoomId, room);

				Log.Info($"Created {room}({room.RoomId})");

				if (notify) {
					GameServerApplication.Instance.SocketClient?.SendSync(PacketType.RoomOpened, room.MetaData);
				}
			}

			return room;
		}

		public bool TryGetRoom(int roomId, out BaseGameRoom room) {
			if (!Rooms.ContainsKey(roomId)) {
				room = null;
				return false;
			}

			return Rooms.TryGetValue(roomId, out room);
		}

		public void RemoveRoom(int roomId, bool notify = true) {
			if (TryGetRoom(roomId, out var room) && room != null) {
				lock (Lock) {
					if (notify) {
						GameServerApplication.Instance.SocketClient?.SendSync(PacketType.RoomClosed, room.MetaData);
					}

					room.Dispose();
					Rooms.Remove(room.RoomId);

					Log.Info($"Destroyed {room}({room.RoomId})");
				}
			}
		}

		public void Dispose() {
			if (isDisposed)
				return;

			LoopScheduler.Dispose();
			isDisposed = true;
		}

		public GamePeer FindPeerWithCmid(int cmid) {
			foreach (var room in Rooms) {
				foreach (var peer in room.Value.Peers) {
					if (peer.Actor.Cmid == cmid) {
						return peer;
					}
				}
			}

			return null;
		}
	}
}
