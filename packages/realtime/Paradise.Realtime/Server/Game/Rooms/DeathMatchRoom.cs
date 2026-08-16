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

using Paradise.Realtime.Core;
using System.Linq;
using UberStrike.Core.Models;

namespace Paradise.Realtime.Server.Game {
	internal class DeathMatchRoom : BaseGameRoom {
		public DeathMatchRoom(GameRoomData metaData, ILoopScheduler scheduler) : base(metaData, scheduler) { }

		public override bool CanJoinMatch => true;

		public override bool CanStartMatch {
			get {
				int minPlayers;

				if (!GameServerApplication.Instance.Configuration.GameplaySettings.MinimumPlayerCount.TryGetValue("DeathMatch", out minPlayers)) {
					minPlayers = 2;
				}

				return Players.Count >= minPlayers;
			}
		}

		public override void GetCurrentScore(out short killsRemaining, out short blueTeamScore, out short redTeamScore) {
			var leader = Players.OrderByDescending(_ => _.Actor.ActorInfo.Kills).First();

			killsRemaining = (short)(MetaData.KillLimit - leader.Actor.ActorInfo.Kills);
			blueTeamScore = 0;
			redTeamScore = 0;
		}

		protected override void OnPlayerKilled(PlayerKilledEventArgs args) {
			base.OnPlayerKilled(args);

			var leader = Players.OrderByDescending(_ => _.Actor.ActorInfo.Kills).First();
			if (leader.Actor.ActorInfo.Kills >= MetaData.KillLimit) {
				WinningCmid = leader.Actor.Cmid;

				HasRoundEnded = true;
			}
		}

		protected override void SwitchTeam(GamePeer peer) {
			return;
		}
	}
}
