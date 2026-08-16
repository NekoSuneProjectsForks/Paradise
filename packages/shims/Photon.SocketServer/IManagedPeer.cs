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

using DisconnectReason = PhotonHostRuntimeInterfaces.DisconnectReason;

namespace Photon.SocketServer {
	internal interface IManagedPeer{
		bool Application_OnDisconnect(DisconnectReason reasonCode, string reasonDetail, int rtt, int rttVariance, int numFailures);

		void Application_OnReceive(byte[] data, SendParameters sendParameters, int rtt, int rttVariance, int numFailure);

		void Application_OnSendBufferEmpty();
	}
}
