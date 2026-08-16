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
using UberStrike.Core.Models.Views;

namespace Paradise.Realtime.Server.Game {
	public static class XpPointsUtil {
		public static ApplicationConfigurationView Config { get; set; }

		private static readonly System.Timers.Timer UpdateTimer;

		static XpPointsUtil() {
			Config = ApplicationWebServiceClient.Instance.GetConfigurationData("4.7.1");

			UpdateTimer = new System.Timers.Timer(TimeSpan.FromMinutes(15).TotalMilliseconds);
			UpdateTimer.Elapsed += delegate {
				Config = ApplicationWebServiceClient.Instance.GetConfigurationData("4.7.1");
			};
			UpdateTimer.Start();
		}

		public static void GetXpRangeForLevel(int level, out int minXp, out int maxXp) {
			level = Math.Min(Math.Max(level, 1), XpPointsUtil.MaxPlayerLevel);

			if (level < MaxPlayerLevel) {
				Config.XpRequiredPerLevel.TryGetValue(level, out minXp);
				Config.XpRequiredPerLevel.TryGetValue(level + 1, out maxXp);
			} else {
				Config.XpRequiredPerLevel.TryGetValue(MaxPlayerLevel, out minXp);
				maxXp = minXp + 1;
			}
		}

		public static int GetLevelForXp(int xp) {
			for (int i = MaxPlayerLevel; i > 0; i--) {
				if (Config.XpRequiredPerLevel.TryGetValue(i, out var num) && xp >= num) {
					return i;
				}
			}

			return 1;
		}

		public static int MaxPlayerLevel {
			get {
				return Config.MaxLevel;
			}
		}
	}
}
