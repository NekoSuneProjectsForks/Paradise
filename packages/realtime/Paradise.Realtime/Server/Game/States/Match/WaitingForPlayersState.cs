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

using UberStrike.Core.Types;
using static Paradise.Realtime.Server.Game.BaseGameRoom;

namespace Paradise.Realtime.Server.Game {
	internal class WaitingForPlayersState : BaseMatchState {
		public WaitingForPlayersState(BaseGameRoom room) : base(room) { }

		public override void OnEnter() {
			Room.PlayerJoined += OnPlayerJoined;
			Room.PlayerLeft += OnPlayerLeft;
			Room.PlayerKilled += OnPlayerKilled;
			Room.PlayerRespawned += OnPlayerRespawned;

			Room.StatisticsManager.Clear();
			Room.SpawnPointManager.Reset();

			if (Room.MetaData.GameMode == GameModeType.EliminationMode) {
				foreach (var player in Room.Players) {
					bool wasSpectator = player.Actor.ActorInfo.IsSpectator;

					Room.PreparePlayer(player);
					Room.SpawnPlayer(player, wasSpectator);

					player.GameEventSender.SendWaitingForPlayers();
				}

				if (Room.CanStartMatch) {
					Room.State.SetState(GameStateId.PrepareNextRound);
				}
			} else {
				foreach (var player in Room.Players) {
					player.GameEventSender.SendWaitingForPlayers();
				}
			}
		}

		public override void OnExit() {
			Room.PlayerJoined -= OnPlayerJoined;
			Room.PlayerLeft -= OnPlayerLeft;
			Room.PlayerKilled -= OnPlayerKilled;
			Room.PlayerRespawned -= OnPlayerRespawned;
		}

		public override void OnResume() {
		}

		public override void OnUpdate() {
		}


		private void OnPlayerJoined(object sender, PlayerJoinedEventArgs args) {
			var player = args.Player;

			Room.PreparePlayer(player, args.Player.Actor.ActorInfo.IsSpectator);
			Room.SpawnPlayer(player, true);

			player.GameEventSender.SendWaitingForPlayers();

			if (Room.CanStartMatch) {
				Room.State.SetState(GameStateId.PrepareNextRound);
			}
		}

		private void OnPlayerLeft(object sender, PlayerLeftEventArgs args) {
			if (Room.Players.Count == 0) {
				Room.SpawnPointManager.Reset();
			}
		}

		private void OnPlayerKilled(object sender, PlayerKilledEventArgs args) {
			foreach (var peer in Room.Peers) {
				peer.GameEventSender.SendPlayerKilled(args.AttackerCmid, args.VictimCmid, (byte)args.ItemClass, args.Damage, (byte)args.Part, args.Direction);

				if (peer.Actor.Cmid.CompareTo(args.VictimCmid) == 0) {
					peer.State.SetState(PlayerStateId.Killed);
				}
			}
		}

		private void OnPlayerRespawned(object sender, PlayerRespawnedEventArgs args) {
			Room.SpawnPlayer(args.Player, false);

			args.Player.State.ResetState();
			args.Player.GameEventSender.SendWaitingForPlayers();
		}
	}
}
