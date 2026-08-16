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
using UnityEngine;

namespace Paradise.Client {
	/// <summary>
	/// Allows staff members to toggle the Free Camera inside Training Mode (aka "Explore Maps").
	/// </summary>
	[HarmonyPatch(typeof(TrainingRoom))]
	public static class TrainingRoomHook {
		private static bool IsFreeCamera;

		[HarmonyPatch(MethodType.Constructor), HarmonyPrefix]
		public static bool ctor_Prefix(TrainingRoom __instance) {
			var spectatingState = typeof(TrainingRoom).Assembly.GetType("PlayerSpectatingState");

			if (!GameState.Current.PlayerState.ContainsState(PlayerStateId.Spectating)) {
				GameState.Current.PlayerState.RegisterState(PlayerStateId.Spectating, (IState)Activator.CreateInstance(spectatingState, new[] { GameState.Current.PlayerState }));
			}

			return true;
		}

		[HarmonyPatch("OnUpdate"), HarmonyPostfix]
		public static void OnUpdate_Postfix() {
			if (KeyInput.AltPressed && KeyInput.CtrlPressed && KeyInput.GetKeyDown(KeyCode.C)) {
				if (!IsFreeCamera) {
					IsFreeCamera = true;

					GameState.Current.PlayerState.SetState(PlayerStateId.Spectating);
					GameObject.Find("HUDNotifications").GetComponent<HUDNotifications>().Hide(true);
				} else {
					IsFreeCamera = false;
					GameState.Current.PlayerState.SetState(PlayerStateId.Playing);
				}
			}
		}

		[HarmonyPatch(typeof(AvatarDecorator), "PlayFootSound", new[] { typeof(float), typeof(FootStepSoundType) }), HarmonyPrefix]
		public static bool AvatarDecorator_PlayFootSound_Prefix(float walkingSpeed, FootStepSoundType sound) {
			if (GameState.Current.GameMode != UberStrike.Core.Types.GameModeType.None)
				return true;

			return !IsFreeCamera;
		}

		[HarmonyPatch(typeof(LocalPlayer), "OnCharacterGrounded"), HarmonyPrefix]
		public static bool LocalPlayer_OnCharacterGrounded_Prefix() {
			if (GameState.Current.GameMode != UberStrike.Core.Types.GameModeType.None)
				return true;

			return !IsFreeCamera;
		}

		[HarmonyPatch(typeof(HUDNotifications), "ShowCrt"), HarmonyPrefix]
		public static bool HUDNotifications_ShowCrt_Prefix() {
			if (GameState.Current.GameMode != UberStrike.Core.Types.GameModeType.None)
				return true;

			return !IsFreeCamera;
		}
	}
}
