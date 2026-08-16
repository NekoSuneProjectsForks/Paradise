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
using System.Linq;
using UberStrike.Core.Models;
using UberStrike.Core.Types;
using UnityEngine;

namespace Paradise.Realtime.Server.Game {
	public class TestRoom : BaseGameRoom {
		protected readonly static new ILog Log = LogManager.GetLogger(nameof(TestRoom));

		public TestRoom(GameRoomData metaData, ILoopScheduler scheduler) : base(metaData, scheduler) { }

		public override bool CanJoinMatch => true;
		//public override bool CanJoinMatch => State.CurrentStateId != GameStateId.MatchRunning;
		public override bool CanStartMatch => Players.Count >= 1;

		public override void GetCurrentScore(out short killsRemaining, out short blueTeamScore, out short redTeamScore) {
			var leader = Players.OrderByDescending(_ => _.Actor.ActorInfo.Kills).First();

			killsRemaining = (short)(MetaData.KillLimit - leader.Actor.ActorInfo.Kills);
			blueTeamScore = 1;
			redTeamScore = 3;
		}

		protected override void OnMatchEnded(EventArgs args) {
			WinningTeam = TeamID.BLUE;

			base.OnMatchEnded(args);
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
			if (MetaData.GameMode == GameModeType.DeathMatch)
				return;
			if (State.CurrentStateId == GameStateId.PrepareNextRound)
				return;
			if (Math.Abs((peer.Actor.LastTeamSwitchTime - DateTime.UtcNow).TotalSeconds) < 30)
				return;

			if (peer.Actor.Team == TeamID.BLUE) {
				peer.Actor.Team = TeamID.RED;
			} else if (peer.Actor.Team == TeamID.RED) {
				peer.Actor.Team = TeamID.BLUE;
			}

			peer.Actor.ActorInfo.PlayerState |= PlayerStates.Dead;

			OnPlayerKilled(new PlayerKilledEventArgs {
				AttackerCmid = peer.Actor.Cmid,
				VictimCmid = peer.Actor.Cmid,
				ItemClass = UberstrikeItemClass.WeaponMachinegun,
				Part = BodyPart.Body,
				Direction = new Vector3()
			});

			peer.Actor.LastTeamSwitchTime = DateTime.UtcNow;

			foreach (var otherPeer in Peers) {
				otherPeer.GameEventSender.SendPlayerChangedTeam(peer.Actor.Cmid, peer.Actor.Team);
			}
		}
	}
}
