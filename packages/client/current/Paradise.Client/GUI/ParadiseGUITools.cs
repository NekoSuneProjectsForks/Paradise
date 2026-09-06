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
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Paradise.Client {
	public enum ParadiseGuiDepth {
		PreloadOptionsButton = -200,
		UpdatePopup = -180,
		Default = -100,
		OptionsPanelGUI = -97,
		ScreenResChangePanel = 1,
	}

	public static class ParadiseGUITools {
		public const float OPTIONS_PANEL_WIDTH = 600f;
		public const float OPTIONS_PANEL_HEIGHT = 540f;

		public const float CONSOLE_PANEL_WIDTH = 720f;
		public const float CONSOLE_PANEL_HEIGHT = 480f;

		public const float PANEL_TITLE_HEIGHT = 32f;
		public const float PANEL_PADDING_H = 16f;
		public const float PANEL_PADDING_H_SCROLLBAR = 8f;
		public const float PANEL_PADDING_V = 20f;

		public const float PANEL_BUTTON_PADDING_H = 16f;
		public const float PANEL_BUTTON_PADDING_V = 8f;
		public const float PANEL_BUTTON_HEIGHT = 32f;

		public const float SECTION_PADDING_H = 16f;
		public const float SECTION_PADDING_TOP = 20f;
		public const float SECTION_PADDING_BOTTOM = 12f;
		public const float SECTION_SPACING = 16f;

		public const float ITEM_SPACING_H = 16f;
		public const float ITEM_SPACING_V = 8f;
		public const float LIST_ITEM_SPACING = 4f;

		public const float SLIDER_WIDTH = 250f;
		public const float SLIDER_VALUE_WIDTH = 48f;

		public const float TOOLBAR_WIDTH = 250f;
		public const float TOOLBAR_SPACE_WIDTH = 48f;

		public const float INPUT_WIDTH = 300f;

		public const float BUTTON_HEIGHT = 22f;
		public const float BUTTON_PADDING_H = 8f;

		#region Groups
		public static void DrawGroup(string title, Action drawCallback = null) {
			GUILayout.BeginHorizontal(BlueStonez.group_grey81, GUILayout.ExpandWidth(true));
			GUILayout.Space(SECTION_PADDING_H);
			GUILayout.BeginVertical();
			GUILayout.Space(SECTION_PADDING_TOP);

			drawCallback?.Invoke();

			GUILayout.Space(SECTION_PADDING_BOTTOM);
			GUILayout.EndVertical();
			GUILayout.Space(SECTION_PADDING_H);
			GUILayout.EndHorizontal();

			DrawGroupHeader(title, BlueStonez.label_group_interparkbold_18pt);
		}

		private static void DrawGroupHeader(string title, GUIStyle style) {
			var lastRect = GUILayoutUtility.GetLastRect();
			GUI.Label(new Rect(lastRect.x + 18f, lastRect.y - 8f, GetWidth(title, style), 16f), title, style);
		}
		#endregion

		#region Sliders
		public static void DrawSlider(string title, ref float value, float min, float max) {
			DrawSlider(title, ref value, min, max, null);
		}

		public static void DrawSlider(string title, ref float value, float min, float max, Action<float> drawLabel = null) {
			GUILayout.BeginHorizontal();

			GUILayout.Label(title, BlueStonez.label_interparkbold_11pt_left, GUILayout.ExpandWidth(true), GUILayout.Height(22f));
			GUILayout.Space(ITEM_SPACING_H);

			value = Mathf.Clamp(GUILayout.HorizontalSlider(value, min, max, BlueStonez.horizontalSlider, BlueStonez.horizontalSliderThumb, GUILayout.Width(SLIDER_WIDTH), GUILayout.Height(22f)), min, max);

			GUILayout.Space(ITEM_SPACING_H);

			if (drawLabel != null) {
				drawLabel(value);
			} else {
				GUILayout.Label($"{value:N1}", BlueStonez.label_interparkbold_11pt_left, GUILayout.Width(SLIDER_VALUE_WIDTH), GUILayout.Height(22f));
			}

			GUILayout.EndHorizontal();
		}
		#endregion

		public static void DrawToolbar(string title, ref int value, string[] content) {
			GUILayout.BeginHorizontal();

			GUILayout.Label(title, BlueStonez.label_interparkbold_11pt_left, GUILayout.ExpandWidth(true), GUILayout.Height(22f));
			GUILayout.Space(ITEM_SPACING_H);

			value = GUILayout.Toolbar(value, content, BlueStonez.tab_medium, GUILayout.Width(TOOLBAR_WIDTH), GUILayout.Height(22f));

			GUILayout.Space(ITEM_SPACING_H);
			GUILayout.Label(string.Empty, BlueStonez.label_interparkbold_11pt_left, GUILayout.Width(TOOLBAR_SPACE_WIDTH));

			GUILayout.EndHorizontal();
		}

		#region Text Field
		public static void DrawTextField(string title, object value) {
			var _value = value?.ToString() ?? string.Empty;

			DrawTextField(title, ref _value);
		}

		public static void DrawTextField(string title, ref string value) {
			GUILayout.BeginHorizontal();

			if (!string.IsNullOrEmpty(title)) {
				GUILayout.Label(title, BlueStonez.label_interparkbold_11pt_left, GUILayout.ExpandWidth(true), GUILayout.Height(22f));
				GUILayout.Space(ITEM_SPACING_H);
			}

			value = GUILayout.TextField(value, BlueStonez.textField, GUILayout.ExpandWidth(true), GUILayout.MaxWidth(INPUT_WIDTH), GUILayout.Height(22f));

			GUILayout.EndHorizontal();
		}
		#endregion

		#region Text Area
		public static void DrawTextArea(string title, string value) {
			var _value = value?.ToString() ?? string.Empty;

			DrawTextArea(title, ref _value);
		}

		public static void DrawTextArea(string title, ref string value) {
			GUILayout.BeginHorizontal();
			GUILayout.BeginVertical();

			GUILayout.Label(title, BlueStonez.label_interparkbold_11pt_left, GUILayout.ExpandWidth(true), GUILayout.ExpandHeight(true));

			GUILayout.EndVertical();

			GUILayout.Space(ITEM_SPACING_H);

			value = GUILayout.TextArea(value, BlueStonez.textArea, GUILayout.ExpandWidth(true), GUILayout.MaxWidth(INPUT_WIDTH), GUILayout.MinHeight(64f));

			GUILayout.EndHorizontal();
		}
		#endregion

		public static float GetWidth(string content, GUIStyle style) {
			return style.CalcSize(new GUIContent(content)).x + 10f;
		}

		public static float GetButtonWidth(IEnumerable<string> content, GUIStyle style) {
			return content.Select(_ => GetWidth(_, style)).Max() + (BUTTON_PADDING_H * 2);
		}
	}
}
