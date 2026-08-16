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

using System;
using System.Linq;
using UberStrike.Core.Models;
using UberStrike.Core.Types;
using UnityEngine;

namespace Paradise.Client {
	internal class DebugSpawnPointsPanel : IDebugPage {
		public string Title => "Spawn";

		private int selectedGameMode;
		private int selectedTeam;

		public void Draw() {
			selectedGameMode = GUILayout.Toolbar(selectedGameMode, Enum.GetValues(typeof(GameModeType)).Cast<GameModeType>().Select(_ => _.ToString()).ToArray(), BlueStonez.tab_medium);
			selectedTeam = GUILayout.Toolbar(selectedTeam, Enum.GetValues(typeof(TeamID)).Cast<TeamID>().Select(_ => _.ToString()).ToArray(), BlueStonez.tab_medium);
			GUILayout.Space(ParadiseGUITools.SECTION_SPACING);

			ParadiseGUITools.DrawGroup("Spawn Points", delegate {
				Singleton<SpawnPointManager>.Instance.GetAllSpawnPoints((GameModeType)selectedGameMode, (TeamID)selectedTeam, out var positions, out var angles);

				if (positions.Count == 0) {
					GUI.enabled = false;
					GUILayout.Label("The current map, game mode or team does not have any spawn points", BlueStonez.label_interparkbold_11pt_left);
					GUI.enabled = true;

					return;
				}

				GUI.enabled = false;
				GUILayout.BeginHorizontal();

				GUILayout.Label(string.Empty, BlueStonez.label_interparkmed_10pt_left, GUILayout.Width(48f), GUILayout.Height(22f));
				GUILayout.Space(ParadiseGUITools.ITEM_SPACING_H);
				GUILayout.Label("Position", BlueStonez.label_interparkbold_11pt_left, GUILayout.ExpandWidth(true));
				GUILayout.Space(ParadiseGUITools.ITEM_SPACING_H);
				GUILayout.Label("Rotation", BlueStonez.label_interparkbold_11pt_left, GUILayout.Width(64f));

				GUILayout.EndHorizontal();
				GUI.enabled = true;

				for (var i = 0; i < positions.Count; i++) {
					if (i > 0) GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);

					var position = positions[i];
					var angle = angles[i];

					GUILayout.BeginHorizontal();

					GUILayout.Label(i.ToString(), BlueStonez.label_interparkmed_10pt_left, GUILayout.Width(48f), GUILayout.Height(22f));
					GUILayout.Space(ParadiseGUITools.ITEM_SPACING_H);
					GUILayout.TextField($"{{ x: {position.x:F2}, y: {position.y:F2}, z: {position.z:F2} }}", BlueStonez.textField, GUILayout.ExpandWidth(true), GUILayout.Height(22f));
					GUILayout.Space(ParadiseGUITools.ITEM_SPACING_H);
					GUILayout.TextField(angle.ToString("F2"), BlueStonez.textField, GUILayout.Width(64f), GUILayout.Height(22f));

					GUILayout.EndHorizontal();
				}
			});
		}
	}
}
