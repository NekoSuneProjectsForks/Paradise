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
using System.Text;
using UnityEngine;

namespace Paradise.Client {
	public class ParadisePopupDialog : IPopupDialog {
		public enum PopupSize {
			LowHeight,
			Regular,
			Large,
		}

		public static readonly Vector2 LowHeightFrame = new Vector2(320f, 160f);
		public static readonly Vector2 RegularFrame = new Vector2(320f, 240f);
		public static readonly Vector2 LargeFrame = new Vector2(460, 240f);

		protected Vector2 _size {
			get {
				switch (Size) {
					case PopupSize.LowHeight:
						return LowHeightFrame;
					case PopupSize.Large:
						return LargeFrame;
					case PopupSize.Regular:
					default:
						return RegularFrame;
				}
			}
		}

		protected Vector2 _btnSize {
			get {
				return new Vector2((_size.x - (_btnSpacing.x * 3f)) / 2f, 32f);
			}
		}

		protected Vector2 _btnSpacing = new Vector2(5f, 8f);

		public PopupSize Size = PopupSize.Large;

		public PopupSystem.AlertType AlertType { get; set; }
		public PopupSystem.ActionType ActionType { get; set; }

		protected bool _allowAudio = true;

		public string OkCaption { get; set; } = string.Empty;
		public string CancelCaption { get; set; } = string.Empty;
		public string AuxCaption { get; set; } = string.Empty;

		public Action OkAction { get; set; }
		public Action CancelAction { get; set; }
		public Action AuxAction { get; set; }

		public string Text { get; set; }
		public string Title { get; set; }

		public bool HideOnOk { get; set; } = true;
		public bool HideOnCancel { get; set; } = true;
		public bool HideOnAux { get; set; } = false;

		public bool IsOkButtonEnabled { get; set; } = true;
		public bool IsCancelButtonEnabled { get; set; } = true;
		public bool IsAuxButtonEnabled { get; set; } = true;

		public GuiDepth Depth { get; set; } = (GuiDepth)ParadiseGuiDepth.Default;

		public ParadisePopupDialog() { }

		public virtual void OnHide() { }

		public void OnGUI() {
			var rect = new Rect((Screen.width - _size.x) * 0.5f, (Screen.height - _size.y - 56f) * 0.5f, _size.x, _size.y);

			GUITools.PushGUIState();
			GUI.depth = (int)Depth;

			GUI.BeginGroup(rect, GUIContent.none, PopupSkin.window);
			GUI.Label(new Rect(0f, 0f, _size.x, 56f), Title, PopupSkin.title);

			DrawPopupWindow();

			switch (AlertType) {
				case PopupSystem.AlertType.OK:
					DoOKButton();
					break;
				case PopupSystem.AlertType.OKCancel:
					DoOKCancelButtons();
					break;
				case PopupSystem.AlertType.Cancel:
					DoCancelButton();
					break;
			}

			GUI.EndGroup();

			GUITools.PopGUIState();
		}

		protected virtual void DrawPopupWindow() {
			GUI.Label(new Rect(17f, 55f, _size.x - 34f, _size.y - 100f), Text, PopupSkin.label);
		}

		private void DoOKButton() {
			var guiStyle = PopupSkin.button;
			var actionType = ActionType;

			switch (actionType) {
				case PopupSystem.ActionType.Positive:
					guiStyle = PopupSkin.button_green;
					break;
				case PopupSystem.ActionType.Negative:
					guiStyle = PopupSkin.button_red;
					break;
				default: break;
			}

			var okRect = new Rect((_size.x - _btnSize.x) * 0.5f, _size.y - _btnSize.y - _btnSpacing.y, _btnSize.x, _btnSize.y);

			if (!string.IsNullOrEmpty(AuxCaption)) {
				okRect = new Rect(_size.x - (_btnSpacing.x + _btnSize.x), _size.y - _btnSize.y - _btnSpacing.y, _btnSize.x, _btnSize.y);
			}

			var okGuiContent = new GUIContent((!string.IsNullOrEmpty(OkCaption)) ? OkCaption : LocalizedStrings.OkCaps);

			GUI.enabled = IsOkButtonEnabled;
			if (_allowAudio ? GUITools.Button(okRect, okGuiContent, guiStyle) : GUI.Button(okRect, okGuiContent, guiStyle)) {
				if (HideOnOk)
					PopupSystem.HideMessage(this);

				OkAction?.Invoke();
			}
			GUI.enabled = true;

			if (!string.IsNullOrEmpty(AuxCaption)) {
				var auxRect = new Rect(_btnSpacing.x, _size.y - _btnSize.y - _btnSpacing.y, _btnSize.x, _btnSize.y);
				var auxGuiContent = new GUIContent(AuxCaption);

				GUI.enabled = IsAuxButtonEnabled;
				if (_allowAudio ? GUITools.Button(auxRect, auxGuiContent, PopupSkin.button) : GUI.Button(auxRect, auxGuiContent, PopupSkin.button)) {
					if (HideOnAux)
						PopupSystem.HideMessage(this);

					AuxAction?.Invoke();
				}
				GUI.enabled = true;
			}
		}

		private void DoOKCancelButtons() {
			var guiStyle = PopupSkin.button;
			var actionType = ActionType;

			switch (actionType) {
				case PopupSystem.ActionType.Positive:
					guiStyle = PopupSkin.button_green;
					break;
				case PopupSystem.ActionType.Negative:
					guiStyle = PopupSkin.button_red;
					break;
				default: break;
			}

			var btnWidth = _btnSize.x;
			var cancelRect = new Rect(_size.x * 0.5f - (_btnSize.x + _btnSpacing.x / 2), _size.y - _btnSize.y - _btnSpacing.y, btnWidth, _btnSize.y);
			var okRect = new Rect(_size.x * 0.5f + _btnSpacing.x / 2, _size.y - _btnSize.y - _btnSpacing.y, btnWidth, _btnSize.y);

			if (!string.IsNullOrEmpty(AuxCaption)) {
				btnWidth = (_size.x - (4 * _btnSpacing.x)) / 3;
				cancelRect = new Rect(btnWidth + _btnSpacing.x * 2, _size.y - _btnSize.y - _btnSpacing.y, btnWidth, _btnSize.y);
				okRect = new Rect(btnWidth * 2 + _btnSpacing.x * 3, _size.y - _btnSize.y - _btnSpacing.y, btnWidth, _btnSize.y);
			}

			var cancelGuiContent = new GUIContent((!string.IsNullOrEmpty(CancelCaption)) ? CancelCaption : LocalizedStrings.CancelCaps);
			var okGuiContent = new GUIContent((!string.IsNullOrEmpty(OkCaption)) ? OkCaption : LocalizedStrings.OkCaps);

			GUI.enabled = IsOkButtonEnabled;
			if (_allowAudio ? GUITools.Button(cancelRect, cancelGuiContent, PopupSkin.button) : GUI.Button(cancelRect, cancelGuiContent, PopupSkin.button)) {
				if (HideOnCancel)
					PopupSystem.HideMessage(this);

				CancelAction?.Invoke();
			}
			GUI.enabled = true;

			GUI.enabled = IsOkButtonEnabled;
			if (_allowAudio ? GUITools.Button(okRect, okGuiContent, guiStyle) : GUI.Button(okRect, okGuiContent, guiStyle)) {
				if (HideOnOk)
					PopupSystem.HideMessage(this);

				OkAction?.Invoke();
			}
			GUI.enabled = true;

			if (!string.IsNullOrEmpty(AuxCaption)) {
				var auxRect = new Rect(_btnSpacing.x, _size.y - _btnSize.y - _btnSpacing.y, btnWidth, _btnSize.y);
				var auxGuiContent = new GUIContent(AuxCaption);

				GUI.enabled = IsAuxButtonEnabled;
				if (_allowAudio ? GUITools.Button(auxRect, auxGuiContent, PopupSkin.button) : GUI.Button(auxRect, auxGuiContent, PopupSkin.button)) {
					if (HideOnAux)
						PopupSystem.HideMessage(this);

					AuxAction?.Invoke();
				}
				GUI.enabled = true;
			}
		}

		private void DoCancelButton() {
			var guiStyle = PopupSkin.button;
			var actionType = ActionType;

			switch (actionType) {
				case PopupSystem.ActionType.Positive:
					guiStyle = PopupSkin.button_green;
					break;
				case PopupSystem.ActionType.Negative:
					guiStyle = PopupSkin.button_red;
					break;
				default: break;
			}

			var cancelRect = new Rect((_size.x - _btnSize.x) * 0.5f, _size.y - _btnSize.y - _btnSpacing.y, _btnSize.x, _btnSize.y);

			if (!string.IsNullOrEmpty(AuxCaption)) {
				cancelRect = new Rect(_size.x - (_btnSpacing.x + _btnSize.x), _size.y - _btnSize.y - _btnSpacing.y, _btnSize.x, _btnSize.y);
			}

			var cancelGuiContent = new GUIContent((!string.IsNullOrEmpty(CancelCaption)) ? CancelCaption : LocalizedStrings.CancelCaps);

			GUI.enabled = IsOkButtonEnabled;
			if (_allowAudio ? GUITools.Button(cancelRect, cancelGuiContent, guiStyle) : GUI.Button(cancelRect, cancelGuiContent, guiStyle)) {
				if (HideOnCancel)
					PopupSystem.HideMessage(this);

				CancelAction?.Invoke();
			}
			GUI.enabled = true;

			if (!string.IsNullOrEmpty(AuxCaption)) {
				var auxRect = new Rect(_btnSpacing.x, _size.y - _btnSize.y - _btnSpacing.y, _btnSize.x, _btnSize.y);
				var auxGuiContent = new GUIContent(AuxCaption);

				GUI.enabled = IsAuxButtonEnabled;
				if (_allowAudio ? GUITools.Button(auxRect, auxGuiContent, PopupSkin.button) : GUI.Button(auxRect, auxGuiContent, PopupSkin.button)) {
					if (HideOnAux)
						PopupSystem.HideMessage(this);

					AuxAction?.Invoke();
				}
				GUI.enabled = true;
			}
		}
	}

	public class ParadiseProgressPopupDialog : ParadisePopupDialog {
		private Func<float> _progress;

		public float Progress { get; set; }

		public ParadiseProgressPopupDialog(Func<float> progress = null) : base() {
			this.Size = ParadisePopupDialog.PopupSize.Regular;
			this.AlertType = PopupSystem.AlertType.None;

			this._progress = progress;
		}

		protected override void DrawPopupWindow() {
			GUI.Label(new Rect(17f, 95f, _size.x - 34f, 32f), Text, BlueStonez.label_interparkbold_11pt);

			if (this._progress != null) {
				DrawLevelBar(new Rect(17f, 125f, this._size.x - 34f, 16f), this._progress(), ColorScheme.ProgressBar);
			} else {
				DrawLevelBar(new Rect(17f, 125f, this._size.x - 34f, 16f), this.Progress, ColorScheme.ProgressBar);
			}
		}

		private void DrawLevelBar(Rect position, float amount, Color barColor) {
			GUI.BeginGroup(position);
			GUI.Label(new Rect(0f, 0f, position.width, 12f), GUIContent.none, BlueStonez.progressbar_background);
			GUI.color = barColor;
			GUI.Label(new Rect(2f, 2f, (position.width - 4f) * Mathf.Clamp01(amount), 8f), string.Empty, BlueStonez.progressbar_thumb);
			GUI.color = Color.white;
			GUI.EndGroup();
		}
	}
}
