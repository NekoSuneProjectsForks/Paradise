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

using Cmune.DataCenter.Common.Entities;
using System;

namespace Paradise {
	public partial class WebSocket {
		public enum ServerType {
			None,
			MasterServer,
			Comm,
			Game
		}

		public struct SocketInfo {
			public Guid SocketId;
			public ServerType Type;
			public int PhotonId;
			public bool IsClient;
		}

		public struct SocketConnectionStatus {
			public bool Connected;
			public bool Rejected;
			public string DisconnectReason;
		}

		public struct SocketChatMessage {
			public int Cmid;
			public string Name;
			public string Message;
			public int RoomNumber;
		}

		public struct SocketCommand {
			public string Command;
			public string[] Arguments;
			public PublicProfileView Invoker;
		}

		public struct RealtimeError {
			public ServerType Type;
			public Type ExceptionType;
			public string Message;
			public string StackTrace;
		}
	}
}
