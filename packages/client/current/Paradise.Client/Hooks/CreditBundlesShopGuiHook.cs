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
using UnityEngine;

namespace Paradise.Client {
	/// <summary>
	/// Disables rendering of Credit Bundles in the shop
	/// </summary>
	[HarmonyPatch(typeof(CreditBundlesShopGui))]
	public static class CreditBundlesShopGuiHook {
		[HarmonyPatch("Draw"), HarmonyPrefix]
		public static bool Draw_Prefix(Rect position) {
			GUI.Label(new Rect(4f, 4f, position.width - 20f, 240f), "No credit packs are currently on sale.", BlueStonez.label_interparkbold_11pt);

			return false;
		}
	}
}
