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

namespace ExitGames.Client.Photon {
	public enum StatusCode {
		Ok = 0,
		SecurityExceptionOnConnect = 1022,
		ExceptionOnConnect,
		Connect,
		Disconnect,
		Exception,
		QueueOutgoingReliableWarning,
		QueueOutgoingUnreliableWarning = 1029,
		SendError,
		QueueOutgoingAcksWarning,
		QueueIncomingReliableWarning = 1033,
		QueueIncomingUnreliableWarning = 1035,
		QueueSentWarning = 1037,
		ExceptionOnReceive = 1039,
		[Obsolete("Replaced by ExceptionOnReceive")]
		InternalReceiveException = 1039,
		TimeoutDisconnect,
		DisconnectByServer,
		DisconnectByServerUserLimit,
		DisconnectByServerLogic,
		[Obsolete("TCP routing was removed after becoming obsolete.")]
		TcpRouterResponseOk,
		[Obsolete("TCP routing was removed after becoming obsolete.")]
		TcpRouterResponseNodeIdUnknown,
		[Obsolete("TCP routing was removed after becoming obsolete.")]
		TcpRouterResponseEndpointUnknown,
		[Obsolete("TCP routing was removed after becoming obsolete.")]
		TcpRouterResponseNodeNotReady,
		EncryptionEstablished,
		EncryptionFailedToEstablish
	}
}
