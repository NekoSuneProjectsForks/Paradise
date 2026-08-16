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

namespace Paradise.Client {
	/// <summary>
	/// Fixed team assignment in Team Elimination
	/// </summary>
	[HarmonyPatch(typeof(TeamEliminationRoom))]
	public static class TeamEliminationRoomHook {
		[HarmonyPatch("OnPlayerJoinedGame"), HarmonyPrefix]
		public static bool OnPlayerJoinedGame_Prefix(TeamEliminationRoom __instance, GameActorInfo player, PlayerMovement position) {
			if (player.Cmid == PlayerDataManager.Cmid) {
				GameState.Current.PlayerData.Team.Value = player.TeamID;
			}

			return true;
		}
	}
}
