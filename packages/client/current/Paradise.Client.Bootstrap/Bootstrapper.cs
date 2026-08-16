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
using Microsoft.Win32;
using System;
using System.IO;
using System.Reflection;
using UnityEngine;

namespace Paradise.Client.Bootstrap {
	public static class Bootstrapper {
		public static void Initialize() {
			// Fix the current working directory if launched via URI protocol
			Environment.CurrentDirectory = Path.GetDirectoryName(Application.dataPath);

			ParadiseClient.Initialize();

			var harmonyInstance = new Harmony("tf.festival.Paradise");
			harmonyInstance.PatchAll(Assembly.GetAssembly(typeof(ParadiseClient)));

			// Register URI handler
			if (Application.platform == RuntimePlatform.WindowsPlayer) {
				if (Registry.CurrentUser.OpenSubKey(@"SOFTWARE\Classes\uberstrike") == null) {
					using (var key = Registry.CurrentUser.CreateSubKey("SOFTWARE\\Classes\\uberstrike")) {
						var appLocation = System.Diagnostics.Process.GetCurrentProcess().MainModule.FileName;

						key.SetValue("", "URL:UberStrike");
						key.SetValue("URL Protocol", "");

						using (var defaultIcon = key.CreateSubKey("DefaultIcon")) {
							defaultIcon.SetValue("", appLocation + ",1");
						}

						using (var commandKey = key.CreateSubKey(@"shell\open\command")) {
							commandKey.SetValue("", "\"" + appLocation + "\" \"%1\"");
						}
					}
				}
			}
		}
	}
}
