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

namespace Paradise.Client {
	public static class ParadiseUtils {
		public static string FormatSize(long value, int decimalPlaces = 1) {
			string[] SizeSuffixes =
				   { "bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB" };

			if (decimalPlaces < 0) { throw new ArgumentOutOfRangeException(nameof(decimalPlaces)); }
			if (value < 0) { return "-" + FormatSize(-value, decimalPlaces); }
			if (value == 0) { return string.Format("{0:n" + decimalPlaces + "} bytes", 0); }

			int mag = (int)Math.Log(value, 1024);

			decimal adjustedSize = (decimal)value / (1L << (mag * 10));

			if (Math.Round(adjustedSize, decimalPlaces) >= 1000) {
				mag += 1;
				adjustedSize /= 1024;
			}

			return string.Format("{0:n" + decimalPlaces + "} {1}",
				adjustedSize,
				SizeSuffixes[mag]);
		}

		public static long ToUnixTimeSeconds(DateTime date) {
			return (long)(date.ToUniversalTime() - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalSeconds;
		}

		public static DateTime FromUnixTimeSeconds(long timestamp) {
    		return new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddSeconds(timestamp).ToLocalTime();
		}
	}
}
