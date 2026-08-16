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

using UberStrike.Core.Models;
using UberStrike.Core.Types;

namespace Paradise.Realtime.Server.Game {
	internal class PlayerSpectatingState : BasePlayerState {
		public PlayerSpectatingState(GamePeer peer) : base(peer) { }

		public override void OnEnter() {
			Peer.Actor.ActorInfo.PlayerState |= PlayerStates.Spectator;

			if (Room.State.CurrentStateId == GameStateId.MatchRunning) {
				Peer.GameEventSender.SendMatchStart(Room.RoundNumber, Room.RoundEndTime);

				if (Room.MetaData.GameMode == GameModeType.DeathMatch) {
					short killsRemaining = (short)Room.MetaData.KillLimit;

					Room.GetCurrentScore(out killsRemaining, out _, out _);
					Peer.GameEventSender.SendKillsRemaining(killsRemaining, 0);
				} else {
					Room.GetCurrentScore(out _, out short blueTeamScore, out short redTeamScore);
					Peer.GameEventSender.SendUpdateRoundScore(Room.RoundNumber, blueTeamScore, redTeamScore);
				}
			}

			Peer.GameEventSender.SendJoinedAsSpectator();
		}

		public override void OnExit() {
			Peer.Actor.ActorInfo.PlayerState &= ~PlayerStates.Spectator;
		}

		public override void OnResume() { }

		public override void OnUpdate() { }
	}
}
