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

using HarmonyLib;
using System.Diagnostics;
using UnityEngine;

namespace Paradise.Client {
	[HarmonyPatch(typeof(UberDaemon))]
	public static class UberDaemonHook {
		[HarmonyPatch("GetMagicHash"), HarmonyPrefix]
		public static bool GetMagicHash_Prefix() {
			return false;
		}

		[HarmonyPatch("GetMagicHash"), HarmonyPostfix]
		public static void GetMagicHash_Postfix(string authToken, ref string __result) {
			var processStartInfo = new ProcessStartInfo {
				RedirectStandardError = true,
				RedirectStandardOutput = true,
				UseShellExecute = false,
				WindowStyle = ProcessWindowStyle.Minimized,
				CreateNoWindow = true
			};

			if (Application.platform == RuntimePlatform.WindowsPlayer) {
				processStartInfo.FileName = "uberdaemon_paradise.exe";
				processStartInfo.Arguments = authToken;
			} else {
				processStartInfo.FileName = "/usr/bin/bash";
				processStartInfo.Arguments = $"uberdaemon_paradise.sh {authToken}";
			}

			try {
				var process = Process.Start(processStartInfo);

				__result = process.StandardOutput.ReadToEnd().Trim();
			} catch {
				__result = string.Empty;
			}
		}
	}
}
