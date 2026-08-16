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

using LiteNetLib;
using System;
using System.Net;

using DisconnectReason = PhotonHostRuntimeInterfaces.DisconnectReason;

namespace Photon.SocketServer {
    public abstract class PeerBase : IDisposable {
        internal NetPeer Transport;
        internal RealtimeHost Host;
        internal bool DisconnectRequested;

        public string RemoteIP { get; internal set; }
        public IPAddress RemoteIPAddress {
            get {
		        if (!string.IsNullOrEmpty(RemoteIP)) {
			        return IPAddress.Parse(RemoteIP);
		        }

                return IPAddress.None;
            }
        }
        public int RemotePort { get; internal set; }
        public string LocalIP { get; internal set; }
        public IPAddress LocalIPAddress {
            get {
		        if (!string.IsNullOrEmpty(LocalIP)) {
			        return IPAddress.Parse(LocalIP);
		        }

                return IPAddress.None;
            }
        }
        public int LocalPort { get; internal set; }

        public int RoundTripTime => Transport != null ? Transport.Ping * 2 : 0;
		public int RoundTripTimeVariance => 0;

        public virtual void Dispose() {
			DisconnectRequested = true;
			Host?.Disconnect(this);
		}

        internal abstract void DispatchOperationRequest(OperationRequest request, SendParameters sendParameters);
		internal abstract void DispatchDisconnect(DisconnectReason reasonCode, string reasonDetail);
    }
}
