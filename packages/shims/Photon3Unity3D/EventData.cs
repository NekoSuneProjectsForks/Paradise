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

namespace ExitGames.Client.Photon {
	public class EventData {
		public byte Code;
		public Dictionary<byte, object> Parameters = new Dictionary<byte, object>();

		public object this[byte key] {
			get {
				this.Parameters.TryGetValue(key, out var obj);
				return obj;
			}
			set {
				this.Parameters[key] = value;
			}
		}

		public override string ToString() {
			return $"Event {this.Code}.";
		}

		public string ToStringFull() {
			return $"Event {this.Code}: {SupportClass.DictionaryToString(this.Parameters)}";
		}
	}
}
