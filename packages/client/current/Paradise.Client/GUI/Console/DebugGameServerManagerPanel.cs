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
	internal class DebugGameServerManagerPanel : IDebugPage {
		public string Title => "Load Requests";

		public void Draw() {
			ParadiseGUITools.DrawGroup("Server Load Requests", delegate {
				if (Singleton<GameServerManager>.Instance.ServerRequests.Count() == 0) {
					GUI.enabled = false;
					GUILayout.Label("Nothing to show here", BlueStonez.label_interparkbold_11pt_left);
					GUI.enabled = true;

					return;
				}

				foreach (var item in Singleton<GameServerManager>.Instance.ServerRequests.ToList().Select((x, i) => new { Value = x, Index = i })) {
					var serverLoadRequest = item.Value;

					if (item.Index > 0) {
						GUILayout.Space(ParadiseGUITools.ITEM_SPACING_V);
					}

					GUILayout.Label($"Server #{serverLoadRequest.Server.Id}", BlueStonez.label_interparkbold_11pt_left);
					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
					ParadiseGUITools.DrawTextField("Server Name", serverLoadRequest.Server.Name);
					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
					ParadiseGUITools.DrawTextField("Latency", serverLoadRequest.Server.Latency);
					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
					ParadiseGUITools.DrawTextField("Valid", serverLoadRequest.Server.IsValid);
					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
					ParadiseGUITools.DrawTextField("State", serverLoadRequest.Server.Data.State);
					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
					ParadiseGUITools.DrawTextField("Request State", serverLoadRequest.RequestState);
					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
					ParadiseGUITools.DrawTextField("Peer State", serverLoadRequest.Peer.PeerState);
				}
			});
		}
	}
}
