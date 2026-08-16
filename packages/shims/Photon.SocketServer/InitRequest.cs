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
using System.Collections.Generic;

namespace Photon.SocketServer {
	public sealed class InitRequest {
		public string ApplicationId { get; internal set; }
		public string LocalIP { get; internal set; }
		public int LocalPort { get; internal set; }
		public string RemoteIP { get; internal set; }
		public int RemotePort { get; internal set; }
        public object UserData { get; set; }

		// internal InitRequest(string applicationId, string localIp, int localPort, string remoteIp, int remotePort, object userData) {
		// 	ApplicationId = applicationId;
        //     LocalIP = localIp;
        //     LocalPort = localPort;
        //     RemoteIP = remoteIp;
        //     RemotePort = remotePort;
        //     UserData = userData;
		// }
	}
}
