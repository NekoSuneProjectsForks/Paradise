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
using Photon.SocketServer;
using UberStrike.DataCenter.Common.Entities;

namespace Paradise.Realtime.Server.Game {
	public partial class GamePeer : BasePeer {
		public struct ShotData {
			public int StartTime;
			public int EndTime;
			public int WeaponID;
		}

		public GameActor Actor { get; set; }
		public BaseGameRoom Room { get; set; }
		public StateMachine<PlayerStateId> State { get; private set; } = new StateMachine<PlayerStateId>();

		public LoadoutView Loadout;

		public GamePeer.EventSender PeerEventSender { get; private set; }
		public BaseGameRoom.EventSender GameEventSender => PeerEventSender.GameEventSender;

		private static readonly OperationHandler OpHandler = new OperationHandler();

		public ShotData Shooting = new ShotData();

		public GamePeer(InitRequest initRequest) : base(initRequest) {
			PeerEventSender = new EventSender(this);

			State.RegisterState(PlayerStateId.None, null);
			State.RegisterState(PlayerStateId.Overview, new PlayerOverviewState(this));
			State.RegisterState(PlayerStateId.PrepareForMatch, new PlayerPrepareState(this));
			State.RegisterState(PlayerStateId.Playing, new PlayerPlayingState(this));
			State.RegisterState(PlayerStateId.Killed, new PlayerKilledState(this));
			State.RegisterState(PlayerStateId.Spectating, new PlayerSpectatingState(this));

			State.SetState(PlayerStateId.None);

			AddOperationHandler(OpHandler);
		}

		protected override void SendHeartbeat(string hash) {
			PeerEventSender.SendHeartbeatChallenge(hash);
		}

		public override void SendError(string message = "An error occured that forced UberStrike to halt.") {
			base.SendError(message);
			PeerEventSender.SendDisconnectAndDisablePhoton(message);
		}

		public bool HasSpawnedOnSpawnPoint(SpawnPoint spawnPoint) {
			if (Actor.PreviousSpawnPoints.Count == 0) return false;

			foreach (var point in Actor.PreviousSpawnPoints) {
				if (point.Position.Equals(spawnPoint.Position) && point.Rotation.Equals(spawnPoint.Rotation)) {
					return true;
				}
			}

			return false;
		}

		public override string ToString() {
			return $"GamePeer[{Actor?.ActorInfo?.PlayerName}({Actor?.ActorInfo?.Cmid})]";
		}
	}
}
