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
using UberStrike.Core.Types;

namespace Paradise.Realtime.Server.Game {
	internal class PlayerKilledState : BasePlayerState {
		private Countdown RespawnCountdown;

		public PlayerKilledState(GamePeer peer) : base(peer) { }

		public override void OnEnter() {
			// Only allow respawn when not in Team Elimination
			if (Peer.Room.MetaData.GameMode != GameModeType.EliminationMode) {
				Peer.Actor.NextRespawnTime = DateTime.UtcNow.AddSeconds(Math.Max(1, GameServerApplication.Instance.Configuration.GameplaySettings.PlayerRespawnTime));

				RespawnCountdown = new Countdown(Room.Loop, Math.Max(GameServerApplication.Instance.Configuration.GameplaySettings.PlayerRespawnTime, 1), 0);
				RespawnCountdown.Counted += OnRespawnCountdownCounted;
				RespawnCountdown.Completed += OnRespawnCountdownCompleted;

				RespawnCountdown.Restart();
			}
		}

		public override void OnExit() { }

		public override void OnResume() { }

		public override void OnUpdate() {
			RespawnCountdown.Tick();
		}

		#region Handlers
		private void OnRespawnCountdownCounted(int count) {
			Peer.GameEventSender.SendPlayerRespawnCountdown((byte)count);
		}

		private void OnRespawnCountdownCompleted() {
			Peer.GameEventSender.SendPlayerRespawnCountdown(0);
		}
		#endregion
	}
}
