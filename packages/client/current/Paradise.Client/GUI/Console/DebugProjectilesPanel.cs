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
using UnityEngine;

namespace Paradise.Client {
	internal class DebugProjectilesPanel : IDebugPage {
		public string Title => "Projectiles";

		private int selectedTab;
		private readonly string[] tabs = { "All", "Limited" };

		public void Draw() {
			ParadiseGUITools.DrawGroup("Projectiles", delegate {
				selectedTab = GUILayout.Toolbar(selectedTab, tabs, BlueStonez.tab_medium);
				GUILayout.Space(ParadiseGUITools.ITEM_SPACING_V);

				switch (selectedTab) {
					case 0:
						DrawAllProjectiles();
						break;
					case 1:
						DrawLimitedProjectiles();
						break;
				}
			});
		}

		private void DrawAllProjectiles() {
			if (Singleton<ProjectileManager>.Instance.AllProjectiles.Count() == 0) {
				GUI.enabled = false;
				GUILayout.Label("Nothing to see here.", BlueStonez.label_interparkbold_11pt_left);
				GUI.enabled = true;
				return;
			}

			foreach (var keyValuePair in Singleton<ProjectileManager>.Instance.AllProjectiles) {
				if (keyValuePair.Value == null) {
					GUILayout.Label($"{ProjectileManager.PrintID(keyValuePair.Key)} (exploded zombie)", BlueStonez.label_interparkbold_11pt_left);
				} else {
					GUILayout.Label($"{ProjectileManager.PrintID(keyValuePair.Key)}", BlueStonez.label_interparkbold_11pt_left);
				}

				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
			}
		}

		private void DrawLimitedProjectiles() {
			if (Singleton<ProjectileManager>.Instance.LimitedProjectiles.Count() == 0) {
				GUI.enabled = false;
				GUILayout.Label("Nothing to see here.", BlueStonez.label_interparkbold_11pt_left);
				GUI.enabled = true;
				return;
			}

			foreach (var id in Singleton<ProjectileManager>.Instance.LimitedProjectiles) {
				GUILayout.Label("Limited " + ProjectileManager.PrintID(id), BlueStonez.label_interparkbold_11pt_left);
				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
			}
		}
	}
}
