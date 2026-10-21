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
using System.Threading;
using System.Threading.Tasks;
using UberStrike.Core.Models;
using UberStrike.Core.Types;
using static Paradise.Realtime.Server.Game.BaseGameRoom;

namespace Paradise.Realtime.Server.Game {
	internal class PrepareNextRoundState : BaseMatchState {
		private Countdown MatchStartCountdown;
		private CancellationTokenSource _countdownStartCancellation;
		private bool _countdownStartPending;

		public PrepareNextRoundState(BaseGameRoom room) : base(room) { }

		public override void OnEnter() {
			Room.PlayerJoined += OnPlayerJoined;
			Room.PlayerLeft += OnPlayerLeft;

			Room.HasRoundEnded = false;
			Room.RoundNumber++;

			Room.PowerUpManager.RespawnItems();
			Room.SpawnPointManager.Reset();

			foreach (var player in Room.Players) {
				player.Actor.PreviousSpawnPoints.Clear();

				bool wasSpectator = player.Actor.ActorInfo.IsSpectator;

				Room.PreparePlayer(player);
				Room.SpawnPlayer(player, wasSpectator);

				player.State.SetState(PlayerStateId.PrepareForMatch);

				if (Room.MetaData.GameMode == GameModeType.DeathMatch) {
					short killsRemaining = (short)Room.MetaData.KillLimit;

					Room.GetCurrentScore(out killsRemaining, out _, out _);

					player.GameEventSender.SendKillsRemaining(killsRemaining, 0);
				} else {
					Room.GetCurrentScore(out _, out short blueTeamScore, out short redTeamScore);

					player.GameEventSender.SendUpdateRoundScore(Room.RoundNumber, blueTeamScore, redTeamScore);
				}
			}

			ScheduleCountdownStart();

			GameServerApplication.Instance.SocketClient?.SendSync(PacketType.RoundStarted, Room.MetaData);
		}

		public override void OnExit() {
			Room.PlayerJoined -= OnPlayerJoined;
			Room.PlayerLeft -= OnPlayerLeft;
			CancelPendingCountdownStart();
			StopMatchStartCountdown();
		}

		public override void OnResume() { }

		public override void OnUpdate() {
			MatchStartCountdown?.Tick();
		}

		private void ScheduleCountdownStart() {
			if (_countdownStartPending || MatchStartCountdown?.IsEnabled == true) {
				return;
			}

			CancelPendingCountdownStart();
			var cancellation = new CancellationTokenSource();
			_countdownStartCancellation = cancellation;
			_countdownStartPending = true;
			_ = StartCountdownAfterDelay(cancellation);
		}

		private async Task StartCountdownAfterDelay(CancellationTokenSource cancellation) {
			try {
				await Task.Delay(1000, cancellation.Token);
			} catch (OperationCanceledException) {
				return;
			}

			// Countdown state and game events must be changed on the room loop, not a worker thread.
			Room.Loop.Enqueue(() => {
				if (cancellation.IsCancellationRequested ||
					!ReferenceEquals(_countdownStartCancellation, cancellation)) {
					return;
				}

				_countdownStartPending = false;
				if (!Room.CanStartMatch || Room.Players.Count == 0) {
					return;
				}

				MatchStartCountdown = new Countdown(Room.Loop, GameServerApplication.Instance.Configuration.GameplaySettings.MatchCountdownTime, 0);
				MatchStartCountdown.Counted += OnCountdownCounted;
				MatchStartCountdown.Completed += OnCountdownCompleted;
				MatchStartCountdown.Restart();
			});
		}

		private void CancelPendingCountdownStart() {
			_countdownStartPending = false;
			if (_countdownStartCancellation == null) {
				return;
			}

			_countdownStartCancellation.Cancel();
			_countdownStartCancellation.Dispose();
			_countdownStartCancellation = null;
		}

		private void StopMatchStartCountdown() {
			if (MatchStartCountdown == null) {
				return;
			}

			MatchStartCountdown.Counted -= OnCountdownCounted;
			MatchStartCountdown.Completed -= OnCountdownCompleted;
			MatchStartCountdown.Stop();
			MatchStartCountdown = null;
		}

		#region Handlers
		private void OnCountdownCounted(int count) {
			foreach (var peer in Room.Players) {
				peer.GameEventSender.SendMatchStartCountdown((byte)count);
			}
		}

		private void OnCountdownCompleted() {
			Room.State.SetState(GameStateId.MatchRunning);
		}

		private void OnPlayerJoined(object sender, PlayerJoinedEventArgs args) {
			args.Player.Actor.PreviousSpawnPoints.Clear();

			Room.PreparePlayer(args.Player);
			Room.SpawnPlayer(args.Player, true);

			args.Player.GameEventSender.SendWaitingForPlayers();
			args.Player.State.SetState(PlayerStateId.PrepareForMatch);

			if (Room.CanStartMatch) {
				ScheduleCountdownStart();
			}
		}

		private void OnPlayerLeft(object sender, PlayerLeftEventArgs args) {
			var players = Room.Players;
			if (!Room.CanStartMatch || players.Count == 0) {
				Log.Info("Player left during PrepareNextRound; match viability changed " +
					$"(canStartMatch={Room.CanStartMatch}, blue={players.Count(p => p.Actor.Team == TeamID.BLUE)}, " +
					$"red={players.Count(p => p.Actor.Team == TeamID.RED)}, total={players.Count}) - stopping the match-start countdown.");
				CancelPendingCountdownStart();
				StopMatchStartCountdown();
				//Room.State.SetState(GameStateId.EndOfMatch);
			}
		}
		#endregion
	}
}
