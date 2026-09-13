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
using UberStrike.Core.Models;
using UberStrike.Core.Types;

namespace Paradise.Client {
	/// <summary>
	/// Adds the name of the weapon a player has been killed with to the killfeed.
	/// </summary>
	[HarmonyPatch(typeof(HUDDesktopEventStream))]
	public static class HUDDesktopEventStreamHook {
		[HarmonyPatch("HandleKilledMessage"), HarmonyPrefix]
		public static bool HandleKilledMessage_Prefix(GameActorInfo shooter, GameActorInfo target, UberstrikeItemClass weapon, BodyPart bodyPart) {
			if (GameState.Current.GameMode == GameModeType.None) {
				return false;
			}

			if (target == null) {
				return false;
			}

			if (shooter == null || shooter == target) {
				GameData.Instance.OnHUDStreamMessage.Fire(target, LocalizedStrings.NKilledThemself, null);
			} else {
				if (!ParadiseClient.Settings.ShowWeaponInKillfeed)
					return true;

				var weaponName = Singleton<ItemManager>.Instance.GetItemInShop(shooter.CurrentWeaponID).Name;
				string killString;

				if (weapon == UberstrikeItemClass.WeaponMelee) {
					killString = $"[ {weaponName} ] smacked";
				} else if (bodyPart == BodyPart.Head) {
					killString = $"[ {weaponName} ] headshot";
				} else if (bodyPart == BodyPart.Nuts) {
					killString = $"[ {weaponName} ] nutshot";
				} else {
					killString = $"[ {weaponName} ] killed";
				}

				GameData.Instance.OnHUDStreamMessage.Fire(shooter, killString, target);
			}

			return false;
		}
	}
}
