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
using UberStrike.Core.Models;
using UberStrike.Core.Types;
using UnityEngine;

namespace Paradise.Realtime.Server.Game {
	public partial class BaseGameRoom {
		public class PlayerRespawnedEventArgs : EventArgs {
			public GamePeer Player { get; set; }
		}

		public class PlayerJoinedEventArgs : EventArgs {
			public GamePeer Player { get; set; }
			public TeamID Team { get; set; }
		}

		public class PlayerLeftEventArgs : EventArgs {
			public GamePeer Player { get; set; }
		}

		public class PlayerKilledEventArgs : EventArgs {
			public int VictimCmid { get; set; }
			public int AttackerCmid { get; set; }
			public UberstrikeItemClass ItemClass { get; set; }
			public ushort Damage { get; set; }
			public BodyPart Part { get; set; }
			public Vector3 Direction { get; set; }
		}
	}
}
