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
using System.Collections;

namespace Paradise.Client {
	/// <summary>
	/// Fixes the weapon selection scroller being stuck on screen sometimes.
	/// </summary>
	[HarmonyPatch(typeof(HUDWeaponScroller))]
	public static class HUDWeaponScrollerHook {
		[HarmonyPatch("OnEnable"), HarmonyPostfix]
		public static void OnEnable_Postfix(HUDWeaponScroller __instance) {
			__instance.StartCoroutine(ParadiseTraverse.InvokeMethod<IEnumerator>(__instance, "Show", false, 0f, 0f));
		}
	}
}
