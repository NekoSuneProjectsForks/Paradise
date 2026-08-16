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

using System.Linq;
using UberStrike.Realtime.UnitySdk;
using UnityEngine;

namespace Paradise.Client {
	internal class DebugPlayerManagerPanel : IDebugPage {
		public string Title => "Player Manager";

		public void Draw() {
			if (GameState.Current.Players.Count == 0) {
				ParadiseGUITools.DrawGroup("Players", delegate {
					GUI.enabled = false;
					GUILayout.Label("No players to show", BlueStonez.label_interparkbold_11pt_left);
					GUI.enabled = true;
				});

				return;
			}

			foreach (var item in GameState.Current.Players.Values.Select((x, i) => new { Value = x, Index = i })) {
				if (item.Index > 0) {
					GUILayout.Space(ParadiseGUITools.SECTION_SPACING);
				}

				var gameActorInfo = item.Value;

				ICharacterState characterState = GameState.Current.RemotePlayerStates.GetState(gameActorInfo.PlayerId);
				if (gameActorInfo.Cmid == PlayerDataManager.Cmid) {
					characterState = GameState.Current.PlayerData;
				}

				ParadiseGUITools.DrawGroup(gameActorInfo.PlayerName, delegate {
					ParadiseGUITools.DrawTextField("Cmid", gameActorInfo.Cmid);
					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
					ParadiseGUITools.DrawTextField("Player ID", gameActorInfo.PlayerId);
					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
					ParadiseGUITools.DrawTextField("Player State", gameActorInfo.PlayerState);
					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
					ParadiseGUITools.DrawTextField("Current Weapon", $"Slot: {gameActorInfo.CurrentWeaponSlot}, Weapon: {gameActorInfo.CurrentWeaponID}");
					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
					ParadiseGUITools.DrawTextField("Life", $"{gameActorInfo.Health} HP / {gameActorInfo.ArmorPoints} AP");
					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
					ParadiseGUITools.DrawTextField("Team", gameActorInfo.TeamID);
					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
					ParadiseGUITools.DrawTextField("Weapons", string.Join(", ", gameActorInfo.Weapons.Select(_ => _.ToString()).ToArray()));
					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
					ParadiseGUITools.DrawTextField("Gear", string.Join(", ", gameActorInfo.Gear.Select(_ => _.ToString()).ToArray()));
					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);

					if (characterState != null) {
						GUILayout.Space(ParadiseGUITools.ITEM_SPACING_V);

						ParadiseGUITools.DrawTextField("Key States", CmunePrint.Flag(characterState.KeyState));
						GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
						ParadiseGUITools.DrawTextField("Movement States", CmunePrint.Flag(characterState.MovementState));
						GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);

						var num = Mathf.Clamp(characterState.VerticalRotation + 90f, 0f, 180f) / 180f;
						ParadiseGUITools.DrawTextField("Rotation", $"{characterState.HorizontalRotation} / {characterState.VerticalRotation:F2} / {num:F2}");
						GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);

						ParadiseGUITools.DrawTextField("Position", characterState.Position);
						GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
						ParadiseGUITools.DrawTextField("Velocity", characterState.Velocity);
						GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
					}

					ParadiseGUITools.DrawTextField("Avatar", GameState.Current.Avatars.ContainsKey(gameActorInfo.Cmid));
					GUILayout.Space(ParadiseGUITools.ITEM_SPACING_V);

					if (gameActorInfo.Cmid != PlayerDataManager.Cmid || true) {
						if (GUILayout.Button("Kick", BlueStonez.buttondark_small, GUILayout.Height(ParadiseGUITools.BUTTON_HEIGHT))) {
							GameState.Current.Actions.KickPlayer(gameActorInfo.Cmid);
						}
					}
				});
			}
		}
	}
}
