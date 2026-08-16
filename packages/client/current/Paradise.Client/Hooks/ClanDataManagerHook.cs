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

namespace Paradise.Client {
	/// <summary>
	/// Disables client-side clan requirements for Admins.
	/// </summary>
	[HarmonyPatch(typeof(ClanDataManager))]
	public static class ClanDataManagerHook {
		[HarmonyPatch("get_HaveFriends"), HarmonyPostfix]
		public static void get_HaveFriends_Postfix(ref bool __result) {
			if (PlayerDataManager.AccessLevel == MemberAccessLevel.Admin) {
				__result = true;
			}
		}

		[HarmonyPatch("get_HaveLevel"), HarmonyPostfix]
		public static void get_HaveLevel_Postfix(ref bool __result) {
			if (PlayerDataManager.AccessLevel == MemberAccessLevel.Admin) {
				__result = true;
			}
		}

		[HarmonyPatch("get_HaveLicense"), HarmonyPostfix]
		public static void get_HaveLicense_Postfix(ref bool __result) {
			if (PlayerDataManager.AccessLevel == MemberAccessLevel.Admin) {
				__result = true;
			}
		}
	}
}
