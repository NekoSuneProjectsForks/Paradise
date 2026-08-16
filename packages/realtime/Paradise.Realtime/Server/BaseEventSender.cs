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

using log4net;
using Photon.SocketServer;
using System;
using System.Collections.Generic;
using System.IO;

namespace Paradise.Realtime.Server {
	public abstract class BaseEventSender {
		protected static readonly ILog Log = LogManager.GetLogger(nameof(BaseEventSender));

		public BasePeer Peer { get; private set; }

		protected BaseEventSender(BasePeer peer) {
			Peer = peer ?? throw new ArgumentNullException(nameof(peer));
		}

		protected SendResult SendEvent(byte opCode, MemoryStream bytes, bool unreliable) {
			var eventData = new EventData(opCode, new Dictionary<byte, object> {
				{ 0, bytes.ToArray() }
			});

			var result = Peer.SendEvent(eventData, new SendParameters { Unreliable = unreliable });
			if (result != SendResult.Ok && result != SendResult.Disconnected) {
				Log.Error($"Send event failed {opCode} -> {result}");
			}

			return result;
		}

		public virtual SendResult SendEvent(byte opCode, MemoryStream bytes) => SendEvent(opCode, bytes, false);
	}
}
