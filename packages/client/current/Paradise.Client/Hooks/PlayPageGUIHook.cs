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
using System.Linq;
using System.Reflection;
using System.Text;
using HarmonyLib;
using UnityEngine;

namespace Paradise.Client {
	[HarmonyPatch(typeof(PlayPageGUI))]
	public static class PlayPageGUIHook {
		private static float nextServerCheckTime;

		[HarmonyPatch("SelectedServerUpdated"), HarmonyPostfix]
		public static void SelectedServerUpdates_Postfix(PhotonServer view) {
			nextServerCheckTime = (view == null) ? 0 : Time.time + 10f;
		}

		[HarmonyPatch("DrawQuickSearch"), HarmonyPrefix]
		public static bool DrawQuickSearch_Prefix(PlayPageGUI __instance, Rect rect) {
			GUITools.PushGUIState();

			GUI.enabled = Time.time > nextServerCheckTime;
			if (GUITools.Button(new Rect(rect.x - (8 + 64), rect.y, 64, rect.height), new GUIContent((nextServerCheckTime >= Time.time) ? $"{LocalizedStrings.Refresh} ({Math.Ceiling(nextServerCheckTime - Time.time):N0})" : LocalizedStrings.Refresh), BlueStonez.buttondark_medium)) {
				Singleton<GameStateController>.Instance.Client.RefreshGameLobby();
				nextServerCheckTime = Time.time + 10f;
			}
			GUI.enabled = true;

			GUITools.PopGUIState();

			var searchBar = typeof(PlayPageGUI).GetField("_searchBar", BindingFlags.NonPublic | BindingFlags.Instance).GetValue(__instance);
			ParadiseTraverse.InvokeMethod(searchBar, "Draw", rect);

			return false;
		}
	}
}
