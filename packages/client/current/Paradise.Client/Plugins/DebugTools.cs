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

using RuntimeUnityEditor.Core;
using RuntimeUnityEditor.Core.Utils;
using RuntimeUnityEditor.Core.Utils.Abstractions;
using System;
using System.Collections.Generic;
using System.Reflection;
using System.Xml.Serialization;
using UnityEngine;

namespace Paradise.Client {
	public class RuntimeUnityEditorSettings {
		private readonly Dictionary<string, Dictionary<string, SettingBase>> Categories = new Dictionary<string, Dictionary<string, SettingBase>>();

		public void Add(string category, string settingName, SettingBase setting) {
			if (!Categories.ContainsKey(category)) Categories.Add(category, new Dictionary<string, SettingBase>());
			Categories[category][settingName] = setting;
		}

		public bool Get<T>(string categoryName, string settingName, out Setting<T> setting) {
			if (Categories.TryGetValue(categoryName, out Dictionary<string, SettingBase> category) && category.TryGetValue(settingName, out var _setting)) {
				setting = (Setting<T>)_setting;
				return true;
			}

			setting = default;
			return false;
		}

		public abstract class SettingBase {
			[XmlIgnore]
			public abstract object BoxedValue { get; set; }
			[XmlIgnore]
			public abstract Type type { get; }
		}

		public class Setting<T> : SettingBase {
			internal Setting() { }
			public Setting(T value) { Value = value; }
			private T _value;

			public T Value {
				get => _value;
				set {
					if (Equals(_value, value)) return;

					_value = value;
					OnChanged?.Invoke(value);
				}
			}

			[XmlIgnore]
			public override object BoxedValue { get => Value; set => Value = (T)value; }
			[XmlIgnore]
			public override Type type { get { return typeof(T); } }
			[XmlIgnore]
			public Action<T> OnChanged;
		}
	}

	internal class DebugToolsInitSettings : InitSettings {
		private readonly DebugTools _instance;

		private readonly RuntimeUnityEditorSettings Settings = new RuntimeUnityEditorSettings();


		public DebugToolsInitSettings(DebugTools instance) {
			_instance = instance;
			LoggerWrapper = new Logger();
		}

		protected override Action<T> RegisterSetting<T>(string category, string name, T defaultValue, string description, Action<T> onValueUpdated) {
			if (!Settings.Get<T>(category, name, out var setting)) {
				setting = new RuntimeUnityEditorSettings.Setting<T>(defaultValue);
				Settings.Add(category, name, setting);
			}

			setting.OnChanged = onValueUpdated;
			onValueUpdated(setting.Value);

			return (newValue) => { setting.Value = newValue; onValueUpdated(newValue); };
		}

		public override MonoBehaviour PluginMonoBehaviour => _instance;
		public override ILoggerWrapper LoggerWrapper { get; }
		public override string ConfigPath => @"C:\Users\Public\Desktop";

		internal class Logger : ILoggerWrapper {
			public void Log(RuntimeUnityEditor.Core.Utils.Abstractions.LogLevel logLevel, object content) {
				UnityEngine.Debug.Log(content);
			}
		}
	}

	internal class DebugTools : MonoBehaviour {
		private static RuntimeUnityEditorCore Instance { get; set; }

		private MethodInfo UpdateImp;
		private MethodInfo LateUpdateImp;
		private MethodInfo OnGUIImp;

		void Awake() {
			if (RuntimeUnityEditorCore.IsInitialized()) {
				UnityEngine.Debug.Log(Instance.ShowHotkey);
				return;
			}

			var constructor = typeof(RuntimeUnityEditorCore).GetConstructor(BindingFlags.NonPublic | BindingFlags.Instance, null, new Type[] { typeof(InitSettings) }, null);
			var initSettings = new DebugToolsInitSettings(this);

			if (constructor != null) {
				Instance = (RuntimeUnityEditorCore)constructor.Invoke(new[] { initSettings });

				UpdateImp = typeof(RuntimeUnityEditorCore).GetMethod("Update", BindingFlags.Instance | BindingFlags.NonPublic);
				LateUpdateImp = typeof(RuntimeUnityEditorCore).GetMethod("LateUpdate", BindingFlags.Instance | BindingFlags.NonPublic);
				OnGUIImp = typeof(RuntimeUnityEditorCore).GetMethod("OnGUI", BindingFlags.Instance | BindingFlags.NonPublic);
			}
		}

		private void Update() {
			UpdateImp?.Invoke(Instance, null);
		}

		private void LateUpdate() {
			LateUpdateImp?.Invoke(Instance, null);
		}

		private void OnGUI() {
			OnGUIImp?.Invoke(Instance, null);
		}
	}
}
