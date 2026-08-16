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

namespace Paradise.Realtime.Server.Game {
	internal class PlayerPlayingState : BasePlayerState {
		private TimeSpan DepleteTime;

		public PlayerPlayingState(GamePeer peer) : base(peer) { }

		public override void OnEnter() { }

		public override void OnExit() { }

		public override void OnResume() { }

		public override void OnUpdate() {
			if (DateTime.UtcNow.TimeOfDay >= DepleteTime) {
				if (Peer.Actor.ActorInfo.Health > 100) {
					Peer.Actor.ActorInfo.Health--;
				}

				if (Peer.Actor.ActorInfo.ArmorPoints > Peer.Actor.ActorInfo.ArmorPointCapacity) {
					Peer.Actor.ActorInfo.ArmorPoints--;
				}

				DepleteTime = DateTime.UtcNow.TimeOfDay.Add(TimeSpan.FromSeconds(1));
			}
		}
	}
}
