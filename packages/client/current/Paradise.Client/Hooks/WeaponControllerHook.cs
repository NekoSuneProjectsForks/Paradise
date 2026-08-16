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
using UberStrike.Core.Models.Views;
using UberStrike.Core.Types;
using UberStrike.Realtime.UnitySdk;
using UnityEngine;

namespace Paradise.Client {
	/// <summary>
	/// <br>• Limits the player loadout to melee weapons if "Melee Only" game flag is set</br>
	/// <br>• Enables weapon quick switching if the game's flag is set or the player is exploring maps.</br>
	/// </summary>
	[HarmonyPatch(typeof(WeaponController))]
	public static class WeaponControllerHook {
		private static ParadiseTraverse<WeaponController> traverse;

		private static WeaponSlot[] _weapons {
			get {
				return traverse.GetField<WeaponSlot[]>("_weapons");
			}
		}

		[HarmonyPatch("InitializeAllWeapons"), HarmonyPrefix]
		public static bool InitializeAllWeapons_Prefix(WeaponController __instance, Transform attachPoint) {
			if (traverse == null) {
				traverse = ParadiseTraverse<WeaponController>.Create(__instance);
			}

			for (int i = 0; i < _weapons.Length; i++) {
				if (_weapons[i] != null && _weapons[i].Decorator != null) {
					UnityEngine.Object.Destroy(_weapons[i].Decorator.gameObject);
				}

				_weapons[i] = null;
			}

			for (int j = 0; j < LoadoutManager.WeaponSlots.Length; j++) {
				var loadoutSlotType = LoadoutManager.WeaponSlots[j];

				if (GameFlags.IsFlagSet(GameFlags.GAME_FLAGS.MeleeOnly, GameState.Current.RoomData.GameFlags) && GameState.Current.RoomData.GameMode != GameModeType.None && loadoutSlotType != LoadoutSlotType.WeaponMelee) {
					traverse.InvokeMethod("SetSlotWeapon", loadoutSlotType, null);
				} else {
					InventoryItem inventoryItem;

					if (Singleton<LoadoutManager>.Instance.TryGetItemInSlot(loadoutSlotType, out inventoryItem)) {
						WeaponSlot weaponSlot = new WeaponSlot(loadoutSlotType, inventoryItem.Item, attachPoint, __instance);
						traverse.InvokeMethod("AddGameLogicToWeapon", weaponSlot);

						_weapons[j] = weaponSlot;

						AmmoDepot.SetMaxAmmoForType(inventoryItem.Item.View.ItemClass, ((UberStrikeItemWeaponView)inventoryItem.Item.View).MaxAmmo);
						AmmoDepot.SetStartAmmoForType(inventoryItem.Item.View.ItemClass, ((UberStrikeItemWeaponView)inventoryItem.Item.View).StartAmmo);

						traverse.InvokeMethod("SetSlotWeapon", loadoutSlotType, inventoryItem.Item);
					} else {
						traverse.InvokeMethod("SetSlotWeapon", loadoutSlotType, null);
					}
				}
			}

			GameState.Current.PlayerData.LoadoutWeapons.Value = __instance.LoadoutWeapons;
			Singleton<QuickItemController>.Instance.Initialize();
			__instance.Reset();

			return false;
		}

		[HarmonyPatch("Shoot"), HarmonyPostfix]
		public static void Shoot_Postfix(WeaponController __instance, ref bool __result) {
			if (GameFlags.IsFlagSet(GameFlags.GAME_FLAGS.QuickSwitch, GameState.Current.RoomData.GameFlags) ||
				GameState.Current.GameMode == GameModeType.None) {
				traverse.SetField("_holsterTime", 0);
			}
		}
	}
}
