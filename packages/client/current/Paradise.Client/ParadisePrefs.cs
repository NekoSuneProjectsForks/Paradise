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
using System.IO;
using System.Linq;
using System.Reflection;
using System.Xml;
using System.Xml.Serialization;
using UberStrike.DataCenter.Common.Entities;
using UnityEngine;

namespace Paradise.Client {
	public class ParadisePrefs {
		public enum Key {
			HasMigratedSettings,

			TelemetryChoice,
			MainMenuMusic,

			EnableDiscordRichPresence,
			ShowDetailedItemStatistics,
			ShowWeaponInKillfeed,
			EnableLandingGrunt,

			EncryptWebServiceTraffic,

			WebServiceBaseUrls,
			WebServiceUrlIndex,
			WebServiceEndpoint,
			WebServicePrefix,
			WebServiceSuffix,

			FileServerUrls,
			FileServerUrlIndex,
			ImagePathEndpoint,

			AutoUpdates,
			UpdateChannel,
			UpdateEndpoint,

			ParadiseVersion,
			LastUpdateCheckTimeStamp,

			MaximumFPS,
		}

		public enum TelemetryChoice {
			None,
			Yes,
			No
		}

		public enum MainMenuMusicType {
			None,
			Default,
			Selotron,
			Catalyst,
			ApexTwin,
			GhostIsland,
			DangerZone
		}

		public static Dictionary<Key, object> Defaults => new Dictionary<Key, object> {
			[Key.TelemetryChoice] = TelemetryChoice.None,
			[Key.MainMenuMusic] = MainMenuMusicType.Default,

			[Key.EnableDiscordRichPresence] = true,
			[Key.ShowDetailedItemStatistics] = false,
			[Key.ShowWeaponInKillfeed] = false,
			[Key.EnableLandingGrunt] = true,

			[Key.EncryptWebServiceTraffic] = true,

			[Key.WebServiceBaseUrls] = new List<string> { "https://ws.paradise.festival.tf", "https://ws-stg.paradise.festival.tf" },
			[Key.WebServiceUrlIndex] = 0,
			[Key.WebServiceEndpoint] = "/2.0",
			[Key.WebServicePrefix] = "UberStrike.DataCenter.WebService.CWS.",
			[Key.WebServiceSuffix] = "Contract.svc",

			[Key.FileServerUrls] = new List<string> { "https://static.paradise.festival.tf", "https://static-stg.paradise.festival.tf" },
			[Key.FileServerUrlIndex] = 0,
			[Key.ImagePathEndpoint] = "/images",

			[Key.AutoUpdates] = false,
			[Key.UpdateChannel] = UpdateChannel.Stable,
			[Key.UpdateEndpoint] = "/updates",

			[Key.LastUpdateCheckTimeStamp] = DateTime.MinValue,

			[Key.MaximumFPS] = 150f,
		};

		public TelemetryChoice Telemetry;
		public bool TelemetryChoiceMade => Telemetry != TelemetryChoice.None;
		public bool AllowTelemetry => Telemetry == TelemetryChoice.Yes;
		public MainMenuMusicType MainMenuMusic;

		public bool EnableDiscordRichPresence;
		public bool ShowDetailedItemStatistics;
		public bool ShowWeaponInKillfeed;
		public bool EnableLandingGrunt;

		public bool EncryptWebServiceTraffic;

		public List<string> WebServiceBaseUrls;
		public int WebServiceUrlIndex;
		public string WebServiceBaseUrl => WebServiceBaseUrls[WebServiceUrlIndex];

		public string WebServiceEndpoint;
		public string WebServicePrefix;
		public string WebServiceSuffix;

		public List<string> FileServerUrls;
		public int FileServerUrlIndex;
		public string FileServerUrl => FileServerUrls[FileServerUrlIndex];

		public string ImagePathEndpoint;

		public bool AutoUpdates;
		public UpdateChannel UpdateChannel;
		public string UpdateEndpoint;

		public string ParadiseVersion => ParadiseConstants.Version;
		public string ParadiseBuild => ParadiseConstants.Build;

		public DateTime LastUpdateCheckTimeStamp;

		public float MaximumFPS;

		public ParadisePrefs() {
			ReloadSettings();
		}

		public void SaveSettings() {
			SetKey(Key.TelemetryChoice, Telemetry);
			SetKey(Key.MainMenuMusic, MainMenuMusic);

			SetKey(Key.EnableDiscordRichPresence, EnableDiscordRichPresence);
			SetKey(Key.ShowDetailedItemStatistics, ShowDetailedItemStatistics);
			SetKey(Key.ShowWeaponInKillfeed, ShowWeaponInKillfeed);
			SetKey(Key.EnableLandingGrunt, EnableLandingGrunt);

			SetKey(Key.EncryptWebServiceTraffic, EncryptWebServiceTraffic);

			// These are handled by the settings GUI
			//SetKey(Key.WebServiceBaseUrls, WebServiceBaseUrls);
			//SetKey(Key.WebServiceUrlIndex, WebServiceUrlIndex);
			//SetKey(Key.WebServiceEndpoint, WebServiceEndpoint);
			//SetKey(Key.WebServicePrefix, WebServicePrefix);
			//SetKey(Key.WebServiceSuffix, WebServiceSuffix);

			//SetKey(Key.FileServerUrls, FileServerUrls);
			//SetKey(Key.FileServerUrlIndex, FileServerUrlIndex);
			//SetKey(Key.ImagePathEndpoint, ImagePathEndpoint);

			SetKey(Key.AutoUpdates, AutoUpdates);
			SetKey(Key.UpdateChannel, (int)UpdateChannel);
			//SetKey(Key.UpdateEndpoint, UpdateEndpoint);

			SetKey(Key.LastUpdateCheckTimeStamp, LastUpdateCheckTimeStamp);

			SetKey(Key.MaximumFPS, MaximumFPS);
		}

		public void ResetDefaults() {
			foreach (var item in Defaults) {
				SetKey(item.Key, item.Value);
			}

			ReloadSettings();
		}

		private void ReloadSettings() {
			Telemetry = GetKey(Key.TelemetryChoice, (TelemetryChoice)Defaults[Key.TelemetryChoice]);
			MainMenuMusic = GetKey(Key.MainMenuMusic, (MainMenuMusicType)Defaults[Key.MainMenuMusic]);

			EnableDiscordRichPresence = GetKey(Key.EnableDiscordRichPresence, (bool)Defaults[Key.EnableDiscordRichPresence]);
			ShowDetailedItemStatistics = GetKey(Key.ShowDetailedItemStatistics, (bool)Defaults[Key.ShowDetailedItemStatistics]);
			ShowWeaponInKillfeed = GetKey(Key.ShowWeaponInKillfeed, (bool)Defaults[Key.ShowWeaponInKillfeed]);
			EnableLandingGrunt = GetKey(Key.EnableLandingGrunt, (bool)Defaults[Key.EnableLandingGrunt]);

			EncryptWebServiceTraffic = GetKey(Key.EncryptWebServiceTraffic, (bool)Defaults[Key.EncryptWebServiceTraffic]);

			WebServiceBaseUrls = GetKey(Key.WebServiceBaseUrls, (List<string>)Defaults[Key.WebServiceBaseUrls]);
			WebServiceUrlIndex = GetKey(Key.WebServiceUrlIndex, (int)Defaults[Key.WebServiceUrlIndex]);
			WebServiceEndpoint = GetKey(Key.WebServiceEndpoint, (string)Defaults[Key.WebServiceEndpoint]);
			WebServicePrefix = GetKey(Key.WebServicePrefix, (string)Defaults[Key.WebServicePrefix]);
			WebServiceSuffix = GetKey(Key.WebServiceSuffix, (string)Defaults[Key.WebServiceSuffix]);

			FileServerUrls = GetKey(Key.FileServerUrls, (List<string>)Defaults[Key.FileServerUrls]);
			FileServerUrlIndex = GetKey(Key.FileServerUrlIndex, (int)Defaults[Key.FileServerUrlIndex]);
			ImagePathEndpoint = GetKey(Key.ImagePathEndpoint, (string)Defaults[Key.ImagePathEndpoint]);

			AutoUpdates = GetKey(Key.AutoUpdates, (bool)Defaults[Key.AutoUpdates]);
			UpdateChannel = (UpdateChannel)GetKey(Key.UpdateChannel, (int)Defaults[Key.UpdateChannel]);
			UpdateEndpoint = GetKey(Key.UpdateEndpoint, (string)Defaults[Key.UpdateEndpoint]);

			LastUpdateCheckTimeStamp = GetKey(Key.LastUpdateCheckTimeStamp, (DateTime)Defaults[Key.LastUpdateCheckTimeStamp]);

			MaximumFPS = GetKey(Key.MaximumFPS, (float)Defaults[Key.MaximumFPS]);
		}

		public bool HasKey(Key key) {
			return PlayerPrefs.HasKey($"Paradise_{key}");
		}

		public T GetKey<T>(Key key) {
			return GetKey<T>(key, (T)Defaults[key]);
		}

		public T GetKey<T>(Key key, T defaultValue) {
			var _key = $"Paradise_{key}";
			var value = defaultValue;

			if (!PlayerPrefs.HasKey(_key))
				return value;

			if (typeof(T) == typeof(bool)) {
				value = (T)(object)Convert.ToBoolean(PlayerPrefs.GetInt(_key));
			} else if (typeof(T) == typeof(int) || value.GetType().IsEnum) {
				value = (T)(object)PlayerPrefs.GetInt(_key);
			} else if (typeof(T) == typeof(float)) {
				value = (T)(object)PlayerPrefs.GetFloat(_key);
			} else if (typeof(T) == typeof(string)) {
				value = (T)(object)PlayerPrefs.GetString(_key);
			} else if (typeof(T) == typeof(DateTime)) {
				value = (T)(object)ParadiseUtils.FromUnixTimeSeconds(long.Parse(PlayerPrefs.GetString(_key)));
			} else if (typeof(T).IsGenericType && typeof(T).GetGenericTypeDefinition() == typeof(List<>)) {
				var listType = typeof(T).GetGenericArguments()[0];

				if (listType == typeof(string)) {
					value = (T)(object)PlayerPrefs.GetString(_key).Split(',').ToList();
				} else {
					value = (T)(object)PlayerPrefs.GetString(_key).Split(',').Select(_ => Convert.ChangeType(_, listType)).ToList();
				}
			} else {
				Debug.LogError($"ParadisePrefs: Could not read key \"{key}\" because type {typeof(T)} is not supported.");
			}

			return value;
		}

		public bool SetKey<T>(Key key, T value) {
			var _key = $"Paradise_{key}";

			if (value.GetType() == typeof(bool)) {
				PlayerPrefs.SetInt(_key, Convert.ToInt32(value));
			} else if (value.GetType() == typeof(int) || value.GetType().IsEnum) {
				PlayerPrefs.SetInt(_key, (int)(object)value);
			} else if (value.GetType() == typeof(float)) {
				PlayerPrefs.SetFloat(_key, (float)(object)value);
			} else if (value.GetType() == typeof(string)) {
				PlayerPrefs.SetString(_key, (string)(object)value);
			} else if (value.GetType() == typeof(DateTime)) {
				PlayerPrefs.SetString(_key, ParadiseUtils.ToUnixTimeSeconds((DateTime)(object)value).ToString());
			} else if (value.GetType().IsGenericType && value.GetType().GetGenericTypeDefinition() == typeof(List<>)) {
				var listType = value.GetType().GetGenericArguments()[0];

				if (listType == typeof(string)) {
					PlayerPrefs.SetString(_key, string.Join(",", ((IEnumerable<string>)value).Select(_ => _.ToString()).ToArray()));
				} else {
					PlayerPrefs.SetString(_key, string.Join(",", ((IEnumerable<object>)value).Select(_ => _.ToString()).ToArray()));
				}
			} else {
				Debug.LogError($"ParadisePrefs: Could not set key \"{key}\" because type {value.GetType()} is not supported.");
				return false;
			}

			return true;
		}

		public override string ToString() {
			var settings = new List<string> {
				$"[Telemetry:{Telemetry}]",
				$"[MainMenuMusic:{MainMenuMusic}]",
				$"[EnableDiscordRichPresence:{EnableDiscordRichPresence}]",
				$"[ShowDetailedItemStatistics:{ShowDetailedItemStatistics}]",
				$"[ShowWeaponInKillfeed:{ShowWeaponInKillfeed}]",
				$"[EnableLandingGrunt:{EnableLandingGrunt}]",
				$"[EncryptWebServiceTraffic:{EncryptWebServiceTraffic}]",
				$"[WebServiceBaseUrls:{{{string.Join(",", WebServiceBaseUrls.ToArray())}}}]",
				$"[WebServiceUrlIndex:{WebServiceUrlIndex}]",
				$"[@WebServiceBaseUrl:{WebServiceBaseUrl}]",
				$"[WebServiceEndpoint:{WebServiceEndpoint}]",
				$"[WebServicePrefix:{WebServicePrefix}]",
				$"[WebServiceSuffix:{WebServiceSuffix}]",
				$"[FileServerUrls:{{{string.Join(",", FileServerUrls.ToArray())}}}]",
				$"[FileServerUrlIndex:{FileServerUrlIndex}]",
				$"[@FileServerUrl:{FileServerUrl}]",
				$"[ImagePathEndpoint:{ImagePathEndpoint}]",
				$"[AutoUpdates:{AutoUpdates}]",
				$"[UpdateChannel:{UpdateChannel}]",
				$"[UpdateEndpoint:{UpdateEndpoint}]",
				$"[LastUpdateCheckTimeStamp:{LastUpdateCheckTimeStamp}]",
				$"[MaximumFPS:{MaximumFPS}]",
			};

			return $"[ParadisePrefs:{string.Join("\n", settings.ToArray())}]";
		}
	}
}
