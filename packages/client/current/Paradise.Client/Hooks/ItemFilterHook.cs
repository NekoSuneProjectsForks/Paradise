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
using UberStrike.Core.Types;

namespace Paradise.Client {
	[HarmonyPatch]
	public static class ItemFilterHook {
		[HarmonyPatch(typeof(InventoryItemFilter), "CanPass"), HarmonyPostfix]
		public static void InventoryItemFilter_CanPass_Postfix(ref bool __result, IUnityItem item) {
			switch (ParadiseTraverse.GetField<SelectionGroup<LoadoutArea>>(ShopPageGUI.Instance, "_loadoutAreaSelection").Current) {
				case LoadoutArea.Weapons:
					__result = __result && item.View.ItemType == UberstrikeItemType.Weapon;
					break;
				case LoadoutArea.Gear:
					__result = __result && item.View.ItemType == UberstrikeItemType.Gear;
					break;
				case LoadoutArea.QuickItems:
					__result = __result && item.View.ItemType == UberstrikeItemType.QuickUse;
					break;
			}
		}

		[HarmonyPatch(typeof(ItemByClassFilter), "CanPass"), HarmonyPostfix]
		public static void ItemByClassFilter_CanPass_Postfix(ref bool __result, IUnityItem item) {
			__result = __result && CheckRank(item);
		}

		[HarmonyPatch(typeof(ItemByTypeFilter), "CanPass"), HarmonyPostfix]
		public static void ItemByTypeFilter_CanPass_Postfix(ref bool __result, IUnityItem item) {
			__result = __result && CheckRank(item);
		}

		[HarmonyPatch(typeof(SpecialItemFilter), "CanPass"), HarmonyPostfix]
		public static void SpecialItemFilter_CanPass_Postfix(ref bool __result, IUnityItem item) {
			__result = __result && CheckRank(item);
		}

		private static bool CheckRank(IUnityItem item) {
			if (item.View.CustomProperties != null && item.View.CustomProperties.ContainsKey("MinimumRank")) {
				var minimumRank = (MemberAccessLevel)Enum.Parse(typeof(MemberAccessLevel), item.View.CustomProperties["MinimumRank"]);

				return PlayerDataManager.AccessLevel >= minimumRank;
			}

			return true;
		}
	}
}
