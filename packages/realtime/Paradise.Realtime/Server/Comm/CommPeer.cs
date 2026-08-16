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

using Photon.SocketServer;

namespace Paradise.Realtime.Server.Comm {
	public partial class CommPeer : BasePeer {
		public CommActor Actor { get; set; }
		public LobbyRoom Lobby { get; set; }

		public CommPeer.EventSender PeerEventSender { get; private set; }
		public LobbyRoom.EventSender LobbyEventSender => PeerEventSender.LobbyEventSender;

		private static readonly OperationHandler OpHandler = new OperationHandler();

		public CommPeer(InitRequest initRequest) : base(initRequest) {
			PeerEventSender = new EventSender(this);

			AddOperationHandler(OpHandler);
		}

		protected override void SendHeartbeat(string hash) {
			PeerEventSender.SendHeartbeatChallenge(hash);
		}

		public override void SendError(string message = "An error occured that forced UberStrike to halt.") {
			base.SendError(message);
			PeerEventSender.SendDisconnectAndDisablePhoton(message);
		}

		public override string ToString() {
			return $"CommPeer[{Actor?.ActorInfo?.PlayerName}({Actor?.ActorInfo?.Cmid})]";
		}
	}
}
