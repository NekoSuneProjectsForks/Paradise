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
using UnityEngine;

namespace Paradise.Client {
	[HarmonyPatch(typeof(UserInput))]
	public static class UserInputHook {
		[HarmonyPatch("UpdateMouse"), HarmonyPrefix]
		public static bool UpdateMouse_Prefix() {
			if (Camera.main != null) {
				float fovMult = Mathf.Pow(Camera.main.fieldOfView / ApplicationDataManager.ApplicationOptions.CameraFovMax, 1.1f);

				UserInput.Mouse.x += AutoMonoBehaviour<InputManager>.Instance.RawValue(GameInputKey.HorizontalLook) * ApplicationDataManager.ApplicationOptions.InputXMouseSensitivity * fovMult;
				UserInput.Mouse.x = ClampAngle(UserInput.Mouse.x, ApplicationDataManager.ApplicationOptions.InputMouseRotationMinX, ApplicationDataManager.ApplicationOptions.InputMouseRotationMaxX);

				int mouseMult = (!ApplicationDataManager.ApplicationOptions.InputInvertMouse) ? 1 : -1;

				UserInput.Mouse.y += AutoMonoBehaviour<InputManager>.Instance.RawValue(GameInputKey.VerticalLook) * ApplicationDataManager.ApplicationOptions.InputYMouseSensitivity * mouseMult * fovMult;
				UserInput.Mouse.y = ClampAngle(UserInput.Mouse.y, ApplicationDataManager.ApplicationOptions.InputMouseRotationMinY, ApplicationDataManager.ApplicationOptions.InputMouseRotationMaxY);
			}

			return false;
		}

		private static float ClampAngle(float angle, float min, float max) {
			if (angle < -360f) {
				angle += 360f;
			}

			if (angle > 360f) {
				angle -= 360f;
			}

			return Mathf.Clamp(angle, min, max);
		}
	}
}
