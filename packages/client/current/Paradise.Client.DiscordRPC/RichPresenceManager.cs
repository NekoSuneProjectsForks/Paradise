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
using DiscordRPC.Logging;
using System;
using System.IO;
using System.Reflection;

namespace Paradise.Client.DiscordRPC {
	internal class RichPresenceManager {
		private const string defaultAppId = "1071893834172223518";
		private static DiscordRpcClient rpcClient;

		private static string ResolveAppId() {
			try {
				var sidecar = Path.Combine(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location) ?? ".", "discord-app-id.txt");

				if (File.Exists(sidecar)) {
					var id = File.ReadAllText(sidecar).Trim();
					if (!string.IsNullOrEmpty(id)) return id;
				}
			} catch { }
			return defaultAppId;
		}

		public static void Initialize() {
			var appId = ResolveAppId();

			Console.WriteLine($"Initializing DiscordRPC for application \"{appId}\"");

			rpcClient = new DiscordRpcClient(appId) {
				Logger = new ConsoleLogger() { Level = LogLevel.Warning }
			};

			rpcClient.OnReady += (sender, e) => {
				Console.WriteLine($"Received Ready from user {e.User.Username}");
			};

			rpcClient.OnPresenceUpdate += (sender, e) => {
				Console.WriteLine($"Received Update! {e.Presence}");
			};

			rpcClient.Initialize();
		}

		public static void SetPresence(RichPresenceSerializable presence) {
			try {
				if (presence.ClearPresence) {
					rpcClient.ClearPresence();
				} else {
					rpcClient.SetPresence(RichPresenceSerializable.Deserialize(presence));
				}
			} catch (Exception e) {
				Console.WriteLine($"Failed to set presence: {e}");
			}
		}
	}
}
