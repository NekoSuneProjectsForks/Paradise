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
using System.Xml.Serialization;

namespace Paradise {
	public partial class RichPresenceSerializable {
		[XmlElement]
		public bool ClearPresence;

		[XmlElement]
		public string State;

		[XmlElement]
		public string Details;

		[XmlElement]
		public ButtonSerializable[] Buttons;

		[XmlElement]
		public TimestampsSerializable Timestamps;

		[XmlElement]
		public AssetsSerializable Assets;

		[XmlElement]
		public PartySerializable Party;

		[XmlElement]
		public SecretsSerializable Secrets;
	}

	public partial class ButtonSerializable {
		[XmlElement]
		public string Label;

		[XmlElement]
		public string Url;
	}

	public partial class TimestampsSerializable {
		[XmlElement]
		public DateTime? Start;

		[XmlElement]
		public ulong? StartUnixMilliseconds;

		[XmlElement]
		public DateTime? End;

		[XmlElement]
		public ulong? EndUnixMilliseconds;
	}

	public partial class AssetsSerializable {
		[XmlElement]
		public string LargeImageKey;

		[XmlElement]
		public string LargeImageText;

		[XmlElement]
		public string SmallImageKey;

		[XmlElement]
		public string SmallImageText;
	}

	public partial class PartySerializable {
		[XmlElement]
		public int Max;

		[XmlElement]
		public int Privacy;

		[XmlElement]
		public int Size;
	}

	public partial class SecretsSerializable {
		[XmlElement]
		public string JoinSecret;

		[XmlElement]
		public string MatchSecret;

		[XmlElement]
		public string SpectateSecret;
	}
}
