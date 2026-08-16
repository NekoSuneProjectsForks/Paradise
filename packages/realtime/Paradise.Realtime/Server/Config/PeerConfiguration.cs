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

namespace Paradise.Realtime.Server {
	public class PeerConfiguration {
		public bool EnableHashVerification;

		public int HeartbeatInterval;
		public int HeartbeatTimeout;

		public IReadOnlyList<byte[]> CompositeHashes { get; }
		public IReadOnlyList<byte[]> JunkHashes { get; }

		public PeerConfiguration(int heartbeatInterval, int heartbeatTimeout, IReadOnlyList<byte[]> compositeHashes, IReadOnlyList<byte[]> junkHashes) {
			CompositeHashes = compositeHashes ?? throw new ArgumentNullException(nameof(compositeHashes));
			JunkHashes = junkHashes ?? throw new ArgumentNullException(nameof(junkHashes));

			if (heartbeatInterval <= 0) {
				throw new ArgumentOutOfRangeException(nameof(heartbeatInterval));
			}

			HeartbeatInterval = heartbeatInterval;

			if (heartbeatTimeout <= 0) {
				throw new ArgumentOutOfRangeException(nameof(heartbeatTimeout));
			}

			HeartbeatTimeout = heartbeatTimeout;
		}
	}
}
