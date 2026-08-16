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
using System.Collections.Generic;
using UnityEngine;

namespace Paradise.Client {
	[HarmonyPatch(typeof(InputManager))]
	public static class InputManagerHook {
		[HarmonyPatch("SetDefaultKeyMapping"), HarmonyPostfix]
		public static void SetDefaultKeyMapping_Postfix(InputManager __instance) {
			var _keyMapping = ParadiseTraverse.GetField<Dictionary<int, UserInputMap>>(__instance, "_keyMapping");
			_keyMapping[24] = new UserInputMap(__instance.GetSlotName(GameInputKey.Chat), GameInputKey.Chat, new KeyInputChannel(KeyCode.Return), true, true, KeyCode.None);
		}

		[HarmonyPatch("GetPrefsKeyForSlot"), HarmonyPrefix]
		public static bool GetPrefsKeyForSlot_Prefix(InputManager __instance, int slot, ref CmunePrefs.Key __result) {
			if (slot == 24) {
				__result = CmunePrefs.Key.Keymap_Chat;
				return false;
			}

			return true;
		}

		[HarmonyPatch(typeof(HUDDesktopChat), "Update"), HarmonyPrefix]
		public static bool HUDDesktopChat_Update_Prefix(HUDDesktopChat __instance) {
			var keyMapping = AutoMonoBehaviour<InputManager>.Instance.KeyMapping;

			if (keyMapping.TryGetValue((int)GameInputKey.Chat, out var userInputMap)) {
				if (Input.GetKeyUp(((KeyInputChannel)userInputMap.Channel).Key) && !GameData.Instance.HUDChatIsTyping && !PopupSystem.IsAnyPopupOpen) {
					if (!ParadiseTraverse.GetField<bool>(__instance, "skipNextEnter")) {
						var textInput = ParadiseTraverse.GetField<UIInput>(__instance, "textInput");
						textInput.text = string.Empty;

						ParadiseTraverse.InvokeMethod(__instance, "ActivateTextInput", new object[] { !GameData.Instance.HUDChatIsTyping });
					}
				}
			}

			if (Input.GetKeyUp(KeyCode.Return) && !PopupSystem.IsAnyPopupOpen) {
				ParadiseTraverse.SetField(__instance, "skipNextEnter", false);
			}

			if (GameData.Instance.HUDChatIsTyping && !ParadiseTraverse.GetField<UIInput>(__instance, "textInput").selected) {
				ParadiseTraverse.InvokeMethod(__instance, "ActivateTextInput", new object[] { false });
			}

			var items = ParadiseTraverse.GetField<List<HUDDesktopChat.Item>>(__instance, "items");
			while (items.Count > 0 && Time.time >= items[0].TimeEnd) {
				items.RemoveAt(0);
				ParadiseTraverse.InvokeMethod(__instance, "ApplyChanges");
			}

			var spamLabel = ParadiseTraverse.GetField<UILabel>(__instance, "spamLabel");
			var lastSpammingTime = ParadiseTraverse.GetField<float>(__instance, "lastSpammingTime");

			if (spamLabel.enabled && Time.time >= lastSpammingTime + 5f) {
				spamLabel.enabled = false;
			}

			return false;
		}
	}
}
