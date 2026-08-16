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
using UberStrike.Core.Models.Views;
using UberStrike.Core.Types;
using UnityEngine;

namespace Paradise.Client {
	internal class DebugMapsPanel : IDebugPage {
		public string Title => "Maps";

		public void Draw() {
			foreach (var item in Singleton<MapManager>.Instance.AllMaps.Select((x, i) => new { Value = x, Index = i })) {
				if (item.Index > 0) {
					GUILayout.Space(ParadiseGUITools.SECTION_SPACING);
				}

				var uberstrikeMap = item.Value;

				ParadiseGUITools.DrawGroup(uberstrikeMap.Name, delegate {
					ParadiseGUITools.DrawTextField("ID", uberstrikeMap.Id);
					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
					ParadiseGUITools.DrawTextField("Scene Name", uberstrikeMap.SceneName);

					if (uberstrikeMap.Id > 0) {
						GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
						ParadiseGUITools.DrawTextField("Map Icon", uberstrikeMap.MapIconUrl);
						GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
						ParadiseGUITools.DrawTextArea("Description", uberstrikeMap.Description);
					}

					if (uberstrikeMap.View?.Settings != null) {
						GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);

						GUILayout.BeginHorizontal();

						GUILayout.Label("Supported Modes", BlueStonez.label_interparkbold_11pt_left, GUILayout.ExpandWidth(true), GUILayout.Height(22f));
						GUILayout.Space(ParadiseGUITools.ITEM_SPACING_H);

						GUILayout.BeginVertical(GUILayout.MaxWidth(ParadiseGUITools.INPUT_WIDTH));

						foreach (var mode in Enum.GetValues(typeof(GameModeType)).Cast<GameModeType>().Where(_ => _ != GameModeType.None)) {
							GUILayout.Toggle(uberstrikeMap.View.Settings.ContainsKey(mode), mode.ToString(), GUILayout.Height(22f));
						}

						GUILayout.EndVertical();

						GUILayout.EndHorizontal();
					}

					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);

					GUILayout.Toggle(uberstrikeMap.Id == 0, "Is Builtin", GUILayout.Height(22f));
					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
					GUILayout.Toggle(ParadiseMapManager.IsBundleMap(uberstrikeMap.Id), "Is Bundle Map", GUILayout.Height(22f));
				});
			}
		}
	}
}
