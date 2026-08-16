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
	internal class DebugGameStatePanel : IDebugPage {
		public string Title => "Game States";

		private ParadiseTraverse gameStateTraverse;

		public void Draw() {
			if (gameStateTraverse == null) {
				gameStateTraverse = ParadiseTraverse.Create(GameState.Current);
			}

			ParadiseGUITools.DrawGroup("Game States", delegate {
				ParadiseGUITools.DrawTextField("Mode", $"{GameState.Current.RoomData.GameMode}/{Singleton<GameStateController>.Instance.CurrentGameMode}");
				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
				ParadiseGUITools.DrawTextField("Match State", GameState.Current.MatchState.CurrentStateId);
				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
				ParadiseGUITools.DrawTextField("Player State", GameState.Current.PlayerState.CurrentStateId);

				if (GameState.Current.RoomData.Server != null) {
					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
					ParadiseGUITools.DrawTextField("Server", GameState.Current.RoomData.Server.ConnectionString);
					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
					ParadiseGUITools.DrawTextField("Room", $"{GameState.Current.RoomData.Name} ({GameState.Current.RoomData.Number})");
				}

				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
				GUILayout.Toggle(GameState.Current.HasJoinedGame, "Has Joined Game", BlueStonez.toggle);
				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
				GUILayout.Toggle(GameState.Current.IsMatchRunning, "Is Match Runníng", BlueStonez.toggle);
				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
				GUILayout.Toggle(GameState.Current.PlayerData.IsSpectator, "Is Spectator", BlueStonez.toggle);
				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
				ParadiseGUITools.DrawTextField("Camera Mode", LevelCamera.CurrentMode);

				GUILayout.Space(ParadiseGUITools.ITEM_SPACING_V);

				GUILayout.Toggle(AutoMonoBehaviour<InputManager>.Instance.IsInputEnabled, "Is Input Enabled", BlueStonez.toggle);
				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
				GUILayout.Toggle(Screen.lockCursor, "Lock Cursor", BlueStonez.toggle);
				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
				ParadiseGUITools.DrawTextField("Mouse", $"{UserInput.Mouse} {UserInput.Rotation}");
				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
				ParadiseGUITools.DrawTextField("Key State", GameState.Current.PlayerData.KeyState);
				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
				ParadiseGUITools.DrawTextField("Movement State", GameState.Current.PlayerData.MovementState);
				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
				GUILayout.Toggle(GameState.Current.Player.IsWalkingEnabled, "Is Walking Enabled", BlueStonez.toggle);
				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
				GUILayout.Toggle(GameState.Current.Player.WeaponCamera.IsEnabled, "Weapon Camera", BlueStonez.toggle);
				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
				GUILayout.Toggle(GameState.Current.Player.EnableWeaponControl, "Weapon Control", BlueStonez.toggle);

				GUILayout.Space(ParadiseGUITools.ITEM_SPACING_V);

				ParadiseGUITools.DrawTextField("Round Start Time", $"{gameStateTraverse.GetField<int>("roundStartTime")}");
				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
				ParadiseGUITools.DrawTextField("Time Limit", $"{GameState.Current.RoomData.TimeLimit}");
				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
				ParadiseGUITools.DrawTextField("Server Ticks", $"{Singleton<GameStateController>.Instance.Client.ServerTimeTicks}");
				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
				ParadiseGUITools.DrawTextField("Game Time", $"{GameState.Current.GameTime:N2} s");
				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
				ParadiseGUITools.DrawTextField("Round Trip Time", $"{Singleton<GameStateController>.Instance.Client.Peer.RoundTripTime:N2} ms");
			});
		}
	}
}
