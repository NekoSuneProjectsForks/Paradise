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
using UberStrike.Core.Types;

namespace Paradise.Client {
	/// <summary>
	/// Disables player lead audio (n kills left, taken/lost/tied for the lead) in Team Elimination games.
	/// </summary>
	[HarmonyPatch(typeof(PlayerLeadAudio))]
	public static class PlayerLeadAudioHook {
		[HarmonyPatch("UpdateLeadStatus"), HarmonyPrefix]
		public static bool UpdateLeadStatus_Prefix() {
			if (GameState.Current.GameMode == GameModeType.EliminationMode ||
				GameState.Current.MatchState.CurrentStateId == GameStateId.PrepareNextRound)
				return false;

			return true;
		}

		[HarmonyPatch("PlayKillsLeftAudio"), HarmonyPrefix]
		public static bool PlayKillsLeftAudio_Prefix() {
			if (GameState.Current.GameMode == GameModeType.EliminationMode ||
				GameState.Current.MatchState.CurrentStateId == GameStateId.PrepareNextRound)
				return false;

			return true;
		}
	}
}
