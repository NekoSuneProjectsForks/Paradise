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
using System;
using System.Collections.Generic;
using System.Linq;
using UberStrike.Core.Models;
using UberStrike.Core.Types;
using UnityEngine;

namespace Paradise.Realtime.Server.Game {
	internal class TeamEliminationRoom : BaseGameRoom {
		private readonly Dictionary<TeamID, int> TeamScores;

		public TeamEliminationRoom(GameRoomData metaData, ILoopScheduler scheduler) : base(metaData, scheduler) {
			TeamScores = new Dictionary<TeamID, int> {
				[TeamID.BLUE] = 0,
				[TeamID.RED] = 0
			};
		}

		public override bool CanJoinMatch => State.CurrentStateId != GameStateId.MatchRunning;

		public override bool CanStartMatch {
			get {
				int minPlayersTeam;

				if (!GameServerApplication.Instance.Configuration.GameplaySettings.MinimumPlayerCount.TryGetValue("TeamElimination", out minPlayersTeam)) {
					minPlayersTeam = 1;
				}

				return Players.Where(_ => _.Actor.Team == TeamID.BLUE).Count() >= minPlayersTeam &&
					   Players.Where(_ => _.Actor.Team == TeamID.RED).Count() >= minPlayersTeam;
			}
		}

		public override void GetCurrentScore(out short killsRemaining, out short blueTeamScore, out short redTeamScore) {
			killsRemaining = 0;
			blueTeamScore = (short)TeamScores[TeamID.BLUE];
			redTeamScore = (short)TeamScores[TeamID.RED];
		}

		public override void Reset() {
			if (TeamScores != null) {
				TeamScores[TeamID.BLUE] = 0;
				TeamScores[TeamID.RED] = 0;
			}

			base.Reset();
		}

		protected override void OnPlayerKilled(PlayerKilledEventArgs args) {
			if (Players.Where(_ => _.Actor.Team == TeamID.RED && _.Actor.ActorInfo.IsAlive && !_.Actor.ActorInfo.IsSpectator).Count() == 0) {
				TeamScores[TeamID.BLUE] += 1;
				WinningTeam = TeamID.BLUE;

				HasRoundEnded = true;
			} else if (Players.Where(_ => _.Actor.Team == TeamID.BLUE && _.Actor.ActorInfo.IsAlive && !_.Actor.ActorInfo.IsSpectator).Count() == 0) {
				TeamScores[TeamID.RED] += 1;
				WinningTeam = TeamID.RED;

				HasRoundEnded = true;
			}

			base.OnPlayerKilled(args);
		}

		protected override void SwitchTeam(GamePeer peer) {
			if (State.CurrentStateId == GameStateId.PrepareNextRound)
				return;
			if (Peers.Where(_ => _.Actor.Team != peer.Actor.Team).Count() >= Peers.Where(_ => _.Actor.Team == peer.Actor.Team).Count())
				return;
			if (Math.Abs((peer.Actor.LastTeamSwitchTime - DateTime.UtcNow).TotalSeconds) < 5)
				return;

			if (peer.Actor.Team == TeamID.BLUE) {
				peer.Actor.Team = TeamID.RED;
			} else if (peer.Actor.Team == TeamID.RED) {
				peer.Actor.Team = TeamID.BLUE;
			}

			peer.Actor.ActorInfo.PlayerState |= PlayerStates.Dead;


			foreach (var otherPeer in Peers) {
				otherPeer.GameEventSender.SendPlayerKilled(peer.Actor.Cmid, peer.Actor.Cmid, (byte)UberstrikeItemClass.WeaponMachinegun, 0, (byte)BodyPart.Body, Vector3.zero);
			}

			peer.State.SetState(PlayerStateId.Killed);
			peer.Actor.PreviousSpawnPoints.Clear();
			peer.Actor.LastTeamSwitchTime = DateTime.UtcNow;

			foreach (var otherPeer in Peers) {
				otherPeer.GameEventSender.SendPlayerChangedTeam(peer.Actor.Cmid, peer.Actor.Team);
			}
		}
	}
}
