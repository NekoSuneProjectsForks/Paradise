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

using System.Text;
using UberStrike.WebService.Unity;
using UnityEngine;

namespace Paradise.Client {
	internal class DebugWebServicesPanel : IDebugPage {
		public string Title => "Web Services";

		private readonly StringBuilder requestLog = new StringBuilder();
		private string currentLog = string.Empty;

		private Vector2 consoleScrollPos;
		private bool autoScroll = true;

		public DebugWebServicesPanel() {
			Configuration.RequestLogger = delegate (string log) {
				requestLog.AppendLine(log);
				currentLog = requestLog.ToString();

				if (autoScroll) consoleScrollPos.y = float.MaxValue;
			};
		}

		public void Draw() {
			ParadiseGUITools.DrawGroup("Web Services", delegate {
				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
				ParadiseGUITools.DrawTextField("Inbound Traffic", ParadiseGUITools.FormatSize(WebServiceStatistics.TotalBytesIn));
				GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);
				ParadiseGUITools.DrawTextField("Outbound Traffic", ParadiseGUITools.FormatSize(WebServiceStatistics.TotalBytesOut));

				foreach (var keyValuePair in WebServiceStatistics.Data) {
					GUILayout.Space(ParadiseGUITools.LIST_ITEM_SPACING);

					var statistic = keyValuePair.Value;
					ParadiseGUITools.DrawTextField(keyValuePair.Key, $"count: {statistic.Counter}/{statistic.FailCounter} | time: {statistic.Time:F2} | data: {ParadiseGUITools.FormatSize(statistic.IncomingBytes)}/{ParadiseGUITools.FormatSize(statistic.OutgoingBytes)}");
				}
			});

			GUILayout.Space(ParadiseGUITools.SECTION_SPACING);

			ParadiseGUITools.DrawGroup("Log", delegate {
				autoScroll = GUILayout.Toggle(autoScroll, "Enable Auto Scroll", BlueStonez.toggle);

				GUILayout.Space(ParadiseGUITools.ITEM_SPACING_V);

				consoleScrollPos = GUILayout.BeginScrollView(consoleScrollPos, false, true, GUIStyle.none, BlueStonez.verticalScrollbar, BlueStonez.scrollView, GUILayout.Height(300f));
				GUILayout.TextArea(currentLog, BlueStonez.textArea);
				GUILayout.EndScrollView();
			});
		}
	}
}
