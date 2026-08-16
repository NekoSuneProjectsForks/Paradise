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

using DiscordRPC;
using System.Collections.Generic;

namespace Paradise {
	public partial class RichPresenceSerializable {
		public static RichPresence Deserialize(RichPresenceSerializable s) {
			if (s == null) return null;

			return new RichPresence {
				State = s.State,
				Details = s.Details,
				Buttons = ButtonSerializable.Deserialize(s.Buttons),
				Timestamps = TimestampsSerializable.Deserialize(s.Timestamps),
				Assets = AssetsSerializable.Deserialize(s.Assets),
				Party = PartySerializable.Deserialize(s.Party),
				Secrets = SecretsSerializable.Deserialize(s.Secrets)
			};
		}
	}

	public partial class ButtonSerializable {
		public static Button Deserialize(ButtonSerializable s) {
			if (s == null) return null;

			return new Button {
				Label = s.Label,
				Url = s.Url
			};
		}

		public static Button[] Deserialize(ButtonSerializable[] s) {
			if (s == null) return null;

			var buttons = new List<Button>();

			foreach (var b in s) {
				if (ButtonSerializable.Deserialize(b) is var button) {
					buttons.Add(button);
				}
			}

			return buttons.ToArray();
		}
	}

	public partial class TimestampsSerializable {
		public static Timestamps Deserialize(TimestampsSerializable s) {
			if (s == null) return null;

			var timestamp = new Timestamps();

			if (s.Start != null && s.Start.HasValue) timestamp.Start = s.Start.Value;
			if (s.StartUnixMilliseconds != null && s.StartUnixMilliseconds.HasValue) timestamp.StartUnixMilliseconds = s.StartUnixMilliseconds.Value;

			if (s.End != null && s.End.HasValue) timestamp.End = s.End.Value;
			if (s.EndUnixMilliseconds != null && s.EndUnixMilliseconds.HasValue) timestamp.EndUnixMilliseconds = s.EndUnixMilliseconds.Value;

			return timestamp;
		}
	}

	public partial class AssetsSerializable {
		public static Assets Deserialize(AssetsSerializable s) {
			if (s == null) return null;

			return new Assets {
				LargeImageKey = s.LargeImageKey,
				LargeImageText = s.LargeImageText,
				SmallImageKey = s.SmallImageKey,
				SmallImageText = s.SmallImageText
			};
		}
	}

	public partial class PartySerializable {
		public static Party Deserialize(PartySerializable s) {
			if (s == null) return null;

			return new Party {
				Max = s.Max,
				Privacy = (Party.PrivacySetting)s.Privacy,
				Size = s.Size
			};
		}
	}

	public partial class SecretsSerializable {
		public static Secrets Deserialize(SecretsSerializable s) {
			if (s == null) return null;

			return new Secrets {
				JoinSecret = s.JoinSecret,
				//MatchSecret = s.MatchSecret,
				SpectateSecret = s.SpectateSecret
			};
		}
	}
}
