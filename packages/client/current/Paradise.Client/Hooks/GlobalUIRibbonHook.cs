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
using HarmonyLib;
using System;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEngine;

namespace Paradise.Client {
	[HarmonyPatch(typeof(GlobalUIRibbon))]
	public static class GlobalUIRibbonHook {
		[HarmonyPatch("InitOptionsDropdown"), HarmonyPostfix]
		public static void InitOptionsDropdown_Postfix(GlobalUIRibbon __instance) {
			var optionsDropdown = ParadiseTraverse.GetField<GuiDropDown>(__instance, "_optionsDropdown");

			// Link to Discord Server
			using (var stream = Assembly.GetAssembly(typeof(ParadiseClient)).GetManifestResourceStream("Paradise.Client.Resources.icon_discord.png")) {
				using (var reader = new BinaryReader(stream)) {
					var texture = new Texture2D(16, 16, TextureFormat.RGBA32, false);
					texture.LoadImage(reader.ReadBytes((int)stream.Length));


					optionsDropdown.Add(new GUIContent($" {ParadiseLocalizedStrings.Discord}", texture), delegate {
						Application.OpenURL("discord:///channels/1071142989579178116/");
					});
				}
			}

			// Link to GitHub Issues
			using (var stream = Assembly.GetAssembly(typeof(ParadiseClient)).GetManifestResourceStream("Paradise.Client.Resources.icon_github.png")) {
				using (var reader = new BinaryReader(stream)) {
					var texture = new Texture2D(16, 16, TextureFormat.RGBA32, false);
					texture.LoadImage(reader.ReadBytes((int)stream.Length));

					optionsDropdown.Add(new GUIContent($" {ParadiseLocalizedStrings.ReportIssue}", texture), delegate {
						Application.OpenURL("https://github.com/festivaldev/Paradise/issues");
					});
				}
			}

			// Debug Console
			EventHandler.Global.AddListener<GlobalEvents.Login>(delegate (GlobalEvents.Login e) {
				var args = Environment.GetCommandLineArgs();

				if (e.AccessLevel == MemberAccessLevel.Admin || (args.Length > 1 && args.Contains("-console"))) {
					using (var stream = Assembly.GetAssembly(typeof(ParadiseClient)).GetManifestResourceStream("Paradise.Client.Resources.icon_console.png")) {
						using (var reader = new BinaryReader(stream)) {
							var texture = new Texture2D(16, 16, TextureFormat.RGBA32, false);
							texture.LoadImage(reader.ReadBytes((int)stream.Length));

							optionsDropdown.Add(new GUIContent($" {ParadiseLocalizedStrings.ConsoleCaps}", texture), delegate {
								AutoMonoBehaviour<ConsolePanelGUI>.Instance.Show();
							});
						}
					}
				}
			});
		}

		[HarmonyPatch("DoMenuBar"), HarmonyPostfix]
		public static void DoMenuBar_Postfix(Rect rect) {
			if (!ApplicationDataManager.IsMobile) {
				if (GamePageManager.HasPage || GameState.Current.HasJoinedGame) {
					if (GameState.Current.GameMode != UberStrike.Core.Types.GameModeType.None) {
						var xOffset = 88f;
						var width = 100f;

						if (GamePageManager.HasPage) {
							xOffset = 420f;
						}

						if (GUITools.Button(new Rect(rect.width - (xOffset + width), rect.y + 9f, width, 26f), new GUIContent("Copy game link", "Copy this game's link to your clipboard"), BlueStonez.buttondark_medium)) {
							var room = GameState.Current.RoomData;

							TextEditor editor = new TextEditor {
								content = new GUIContent($"uberstrike://connect/{room.Server.ConnectionString}/{room.Number}")
							};

							editor.SelectAll();
							editor.Copy();
						}
					}
				}
			}
		}
	}
}
