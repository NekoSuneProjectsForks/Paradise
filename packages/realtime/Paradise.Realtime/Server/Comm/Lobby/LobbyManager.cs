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
using System.Collections.Generic;
using UberStrike.Core.Models;

namespace Paradise.Realtime.Server.Comm {
	public class LobbyManager {
		protected static readonly ILog Log = LogManager.GetLogger(nameof(LobbyManager));

		public static LobbyManager Instance { get; } = new LobbyManager();

		public LobbyRoom GlobalLobby { get; private set; } = new LobbyRoom();
		public IReadOnlyList<CommPeer> Peers => GlobalLobby.Peers;

		private readonly object _lock = new object();

		public void UpdatePlayerList() {
			lock (_lock) {
				var actorsInfo = new List<CommActorInfo>(Peers.Count);
				foreach (var peer in Peers) {
					actorsInfo.Add(peer.Actor.ActorInfo);
				}

				foreach (var peer in Peers) {
					peer.LobbyEventSender.SendFullPlayerListUpdate(actorsInfo);
				}
			}
		}
	}
}
