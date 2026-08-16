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

using PhotonHostRuntimeInterfaces;
using System.Collections.Generic;

using DisconnectReason = PhotonHostRuntimeInterfaces.DisconnectReason;

namespace Photon.SocketServer {
    public sealed class EventData : IEventData {
		public byte Code { get; set ; }
		public Dictionary<byte, object> Parameters { get; set; }= new Dictionary<byte, object>();

		public object this[byte parameterKey] {
			get {
				return Parameters[parameterKey];
			}

			set {
				Parameters[parameterKey] = value;
			}
		}

		// public EventData(byte eventCode, object dataContract) {
		// 	Code = eventCode;
		// 	SetParameters(dataContract);
		// }

		public EventData(byte eventCode, Dictionary<byte, object> parameters) {
			Code = eventCode;
			Parameters = parameters;
		}

		public EventData(byte eventCode) {
			Code = eventCode;
		}

		// public static void SendTo<TPeer>(IEventData eventData, IEnumerable<TPeer> peers, SendParameters sendParameters) where TPeer : PeerBase {
		// 	if (eventData == null) {
		// 		throw new ArgumentNullException("eventData");
		// 	}

		// 	if (peers == null) {
		// 		throw new ArgumentNullException("peers");
		// 	}

		// 	ApplicationBase.Instance.BroadCastEvent<TPeer>(eventData, peers, sendParameters);
		// }

		// public void SendTo<TPeer>(IEnumerable<TPeer> peers, SendParameters sendParameters) where TPeer : PeerBase {
		// 	EventData.SendTo<TPeer>(this, peers, sendParameters);
		// }

		// public void SetParameters(object dataContract) {
		// 	Parameters = ((dataContract == null) ? null : ObjectDataMemberMapper.GetValues<DataMemberAttribute>(dataContract));
		// }

		// public void SetParameters(Dictionary<byte, object> parameters) {
		// 	Parameters = parameters;
		// }

		// public byte[] Serialize(IRpcProtocol protocol, CustomTypeCache privateCustomTypeCache) {
		// 	return protocol.SerializeEventData(this, privateCustomTypeCache);
		// }
	}
}
