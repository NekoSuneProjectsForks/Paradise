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

using System.Collections.Generic;
using UberStrike.Core.Models;

namespace Paradise.Realtime.Server.Game {
	internal class PlayerOverviewState : BasePlayerState {
		public PlayerOverviewState(GamePeer peer) : base(peer) { }

		public override void OnEnter() {
			Room.StatisticsManager.ResetStatistics(Peer);

			var players = Room.Players;

			if (players.Count > 0) {
				var allPlayers = new List<GameActorInfo>(players.Count);
				var allPositions = new List<PlayerMovement>(players.Count);

				foreach (var player in players) {
					allPlayers.Add(player.Actor.ActorInfo);
					allPositions.Add(player.Actor.Movement);
				}

				Peer.GameEventSender.SendAllPlayers(allPlayers, allPositions, 0);
			}
		}

		public override void OnExit() { }

		public override void OnResume() { }

		public override void OnUpdate() { }
	}
}
