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
using UnityEngine;

namespace Paradise.Client {
	[HarmonyPatch(typeof(LocalPlayer))]
	public static class LocalPlayerHook {
		[HarmonyPatch("OnCharacterGrounded"), HarmonyPrefix]
		public static bool OnCharacterGrounded_Prefix(LocalPlayer __instance, float velocity) {
			if (/*GameState.Current.HasJoinedGame && GameState.Current.IsInGame &&*/ !WeaponFeedbackManager.IsBobbing && ParadiseTraverse.GetField<float>(__instance, "_lastGrounded") + 0.5f < Time.time && !GameState.Current.PlayerData.Is(MoveStates.Diving)) {
				ParadiseTraverse.SetField(__instance, "_lastGrounded", Time.time);

				if (__instance.Character != null && __instance.Character.Avatar != null && __instance.Character.Avatar.Decorator != null) {
					__instance.Character.Avatar.Decorator.PlayFootSound(__instance.Character.WalkingSoundSpeed);
					if (velocity < -20f) {
						LevelCamera.DoLandFeedback(true);

						if (ParadiseClient.Settings.EnableLandingGrunt) {
							AutoMonoBehaviour<SfxManager>.Instance.Play2dAudioClip(GameAudio.LandingGrunt);
						}
					} else {
						LevelCamera.DoLandFeedback(false);
					}
				}
			}

			return false;
		}
	}
}
