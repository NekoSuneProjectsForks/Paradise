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

using Paradise.Transport;

using DisconnectReason = PhotonHostRuntimeInterfaces.DisconnectReason;

namespace Photon.SocketServer {
    public abstract class ClientPeer : PeerBase {
		protected ClientPeer(InitRequest initRequest) {
            if (initRequest != null) {
				RemoteIP = initRequest.RemoteIP;
				RemotePort = initRequest.RemotePort;
                LocalIP = initRequest.LocalIP;
				LocalPort = initRequest.LocalPort;
			}
		}

        protected virtual void OnOperationRequest(OperationRequest operationRequest, SendParameters sendParameters) { }
		protected virtual void OnDisconnect(DisconnectReason reasonCode, string reasonDetail) { }

		public SendResult SendEvent(EventData eventData, SendParameters sendParameters) {
			if (Transport == null || Host == null) return SendResult.Disconnected;
			var wire = WireMessage.Event(eventData.Code, eventData.Parameters);
			return Host.Send(this, WireCodec.Encode(wire), sendParameters.Unreliable, sendParameters.ChannelId);
		}

		public SendResult SendOperationResponse(OperationResponse operationResponse, SendParameters sendParameters) {
			if (Transport == null || Host == null) return SendResult.Disconnected;
			var wire = WireMessage.OperationResponse(operationResponse.OperationCode, operationResponse.ReturnCode, operationResponse.DebugMessage, operationResponse.Parameters);
			return Host.Send(this, WireCodec.Encode(wire), sendParameters.Unreliable, sendParameters.ChannelId);
		}

		public void Disconnect() {
			DisconnectRequested = true;
			Host?.Disconnect(this);
		}

		internal sealed override void DispatchOperationRequest(OperationRequest request, SendParameters sendParameters) => OnOperationRequest(request, sendParameters);
		internal sealed override void DispatchDisconnect(DisconnectReason reasonCode, string reasonDetail) => OnDisconnect(reasonCode, reasonDetail);
	}
}
