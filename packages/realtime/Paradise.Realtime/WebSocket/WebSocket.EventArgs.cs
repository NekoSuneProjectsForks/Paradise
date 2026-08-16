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

namespace Paradise {
	public partial class WebSocket {
		public class SocketConnectedEventArgs : EventArgs {
			public WebSocketSharp.WebSocket Socket;
		}

		public class SocketDisconnectedEventArgs : EventArgs {
			public SocketInfo Info;
			public WebSocketSharp.WebSocket Socket;
			public uint Code;
			public string Reason;
		}

		public class SocketDataReceivedEventArgs : EventArgs {
			public WebSocketSharp.WebSocket Socket;
			public int BytesReceived;

			public PacketType Type;
			public object Data;
			public string ConversationId;
			public ServerType ServerType;
		}

		public class SocketDataSentEventArgs : EventArgs {
			public WebSocketSharp.WebSocket Socket;
			public int BytesSent;
		}

		public class SocketConnectionRejectedEventArgs : EventArgs {
			public SocketInfo Info;
			public WebSocketSharp.WebSocket Socket;
			public string Reason;
		}

		public class SocketStateChangedEventArgs : EventArgs {
			public WebSocketSharp.WebSocket Socket;
			//public SocketState State;
		}
	}
}
