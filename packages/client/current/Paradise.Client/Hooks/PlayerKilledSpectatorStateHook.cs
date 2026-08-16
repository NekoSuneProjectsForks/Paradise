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
using System;
using System.Threading;

namespace Paradise.Client {
	/// <summary>
	/// Moves a player to Spectator state if killed while playing Team Elimination.
	/// </summary>
	[HarmonyPatch("PlayerKilledSpectatorState")]
	public static class PlayerKilledSpectatorStateHook {
		[HarmonyPatch("PlayerKilledSpectatorState", "OnEnter"), HarmonyPostfix]
		public static void OnEnter_Postfix() {
			Timer timer = null;

			timer = new Timer((_) => {
				try {
					if (GameState.Current.MatchState.CurrentStateId == GameStateId.MatchRunning &&
						GameState.Current.PlayerState.CurrentStateId == PlayerStateId.Killed) {
						GameState.Current.PlayerState.SetState(PlayerStateId.Spectating);
					}
				} catch (Exception e) {
					UnityEngine.Debug.LogWarning($"PlayerKilledSpectatorStateHook timer failed: {e}");
				} finally {
					timer?.Dispose();
				}
			}, null, (int)TimeSpan.FromSeconds(3).TotalMilliseconds, Timeout.Infinite);
		}
	}
}
