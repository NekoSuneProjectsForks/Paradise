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

namespace Paradise.Client {
	/// <summary>
	/// Allows displaying popups above panels
	/// </summary>
	[HarmonyPatch(typeof(BasePopupDialog))]
	public static class BasePopupDialogHook {
		[HarmonyPatch("get_Depth"), HarmonyPostfix]
		public static void get_Depth_Postfix(ref GuiDepth __result) {
			__result = (GuiDepth)(-100);
		}
	}
}
