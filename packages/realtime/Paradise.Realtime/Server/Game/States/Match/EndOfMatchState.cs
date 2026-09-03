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

using System;
using System.Threading.Tasks;
using UberStrike.Core.Types;
using UberStrike.Realtime.UnitySdk;
using static Paradise.Realtime.Server.Game.BaseGameRoom;

namespace Paradise.Realtime.Server.Game {
	internal class EndOfMatchState : BaseMatchState {
		public EndOfMatchState(BaseGameRoom room) : base(room) { }

		public override void OnEnter() {
			Room.PlayerJoined += OnPlayerJoined;
			//Room.PlayerLeft += OnPlayerLeft;

			Room.RoundEndTime = SystemTime.Running;
			Room.RoundDurations.Add(TimeSpan.FromMilliseconds(Room.RoundEndTime - Room.RoundStartTime));

			if (Room.MetaData.GameMode == GameModeType.DeathMatch) {
				short killsRemaining = (short)Room.MetaData.KillLimit;

				Room.GetCurrentScore(out killsRemaining, out _, out _);
				foreach (var peer in Room.Peers) {
					peer.GameEventSender.SendKillsRemaining(killsRemaining, 0);
				}
			} else {
				Room.GetCurrentScore(out _, out short blueTeamScore, out short redTeamScore);
				foreach (var peer in Room.Peers) {
					peer.GameEventSender.SendUpdateRoundScore(Room.RoundNumber, blueTeamScore, redTeamScore);
				}
			}

			foreach (var peer in Room.Peers) {
				peer.GameEventSender.SendTeamWins(Room.WinningTeam);
			}

			Task t = Task.Run(async () => {
				await Task.Delay(GameServerApplication.Instance.Configuration.GameplaySettings.MatchEndTimeout * 1000);

				Room.Loop.Enqueue(() => {
					if (Room.MetaData.GameMode == GameModeType.EliminationMode) {
						Room.GetCurrentScore(out _, out short blueTeamScore, out short redTeamScore);

						// Game should end if RoundNumber >= KillLimit (aka "Max Rounds")
						if (Math.Max(blueTeamScore, redTeamScore) >= Room.MetaData.KillLimit || !Room.CanStartMatch) {
							Room.State.SetState(GameStateId.AfterRound);
						} else {
							Room.State.SetState(GameStateId.WaitingForPlayers);
						}
					} else {
						Room.State.SetState(GameStateId.AfterRound);
					}
				});
			});
		}

		public override void OnExit() {
			Room.PlayerJoined -= OnPlayerJoined;
			//Room.PlayerLeft -= OnPlayerLeft;
		}

		public override void OnResume() { }

		public override void OnUpdate() { }



		private void OnPlayerJoined(object sender, PlayerJoinedEventArgs args) {
			var player = args.Player;

			Room.PreparePlayer(player);
			Room.SpawnPlayer(player, true);

			player.GameEventSender.SendWaitingForPlayers();
		}
	}
}
