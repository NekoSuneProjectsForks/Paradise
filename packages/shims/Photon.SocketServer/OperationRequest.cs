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

using System.Collections.Generic;

namespace Photon.SocketServer {
    public sealed class OperationRequest{
		public object this[byte parameterKey] {
			get {
				return Parameters[parameterKey];
			}

			set {
				Parameters[parameterKey] = value;
			}
		}

        public byte OperationCode;
        public Dictionary<byte, object> Parameters = new Dictionary<byte, object>();

        // public OperationRequest(byte operationCode, object dataContract) {
		// 	OperationCode = operationCode;
		// 	SetParameters(dataContract);
		// }

		public OperationRequest(byte operationCode, Dictionary<byte, object> parameters) {
			OperationCode = operationCode;
			Parameters = parameters;
		}

		public OperationRequest(byte operationCode) {
			OperationCode = operationCode;
		}

        // public void SetParameters(object dataContract) {
		// 	Parameters = ((dataContract == null) ? null : ObjectDataMemberMapper.GetValues<DataMemberAttribute>(dataContract));
		// }

		// public void SetParameters(Dictionary<byte, object> parameters) {
		// 	Parameters = parameters;
		// }
    }
}
