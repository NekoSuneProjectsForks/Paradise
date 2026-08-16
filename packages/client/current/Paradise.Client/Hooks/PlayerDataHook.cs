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
using UnityEngine;

namespace Paradise.Client {
	[HarmonyPatch(typeof(PlayerData))]
	public static class PlayerDataHook {
		[HarmonyPatch("Reset"), HarmonyPrefix]
		public static bool Reset_Prefix(PlayerData __instance) {
			Singleton<LoadoutManager>.Instance.GetArmorValues(out var armorPoints);

			__instance.Player.ArmorPointCapacity = (byte)armorPoints;
			__instance.Player.PlayerState = PlayerStates.None;
			ParadiseTraverse.SetProperty(__instance, "KeyState", KeyState.Still);
			__instance.MovementState = MoveStates.None;
			__instance.Velocity = Vector3.zero;

			// If the player is in Training mode, reset these to local values
			// Otherwise these values will be provided by the server
			if (GameState.Current.GameMode == GameModeType.None) {
				__instance.Health.Value = 100;
				__instance.ArmorPoints.Value = armorPoints;
			}

			return false;
		}
	}
}
