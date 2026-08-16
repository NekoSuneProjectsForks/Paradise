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
using System;
using UnityEngine;

namespace Paradise.Client {
	[HarmonyPatch(typeof(ProxyItem))]
	public static class ProxyItemHook {
		[HarmonyPatch("Create"), HarmonyPostfix]
		public static void Create_Postfix(ProxyItem __instance, Vector3 position, Quaternion rotation, ref GameObject __result) {
			if (__result != null) return;

			try {
				var view = __instance.View;
				if (view == null) return;

				if (!UnityItemConfiguration.Exists || UnityItemConfiguration.Instance == null) {
					return;
				}

				var defaultItem = UnityItemConfiguration.Instance.GetDefaultItem(view.ItemClass);
				if (defaultItem == null) return;

				__result = UnityEngine.Object.Instantiate(defaultItem, position, rotation) as GameObject;
				Debug.LogWarning($"Failed to load prefab for item '{view.Name}' (ID {view.ID})");
			} catch (Exception e) {
				Debug.LogWarning($"ProxyItem hook failed: {e}");
			}
		}
	}
}
