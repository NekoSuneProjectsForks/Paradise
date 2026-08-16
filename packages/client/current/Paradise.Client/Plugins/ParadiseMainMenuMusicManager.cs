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
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using static Paradise.Client.ParadisePrefs;

namespace Paradise.Client {
	internal static class ParadiseMainMenuMusicManager {
		public static readonly Dictionary<MainMenuMusicType, AudioClip> MenuAudio = new Dictionary<MainMenuMusicType, AudioClip> {
			[MainMenuMusicType.None] = null,
			[MainMenuMusicType.Default] = GameAudio.HomeSceneBackground
		};

		public static List<MainMenuMusicType> GetAvailableClips() => MenuAudio.Keys.OrderBy((key) => (int)key).ToList();
		public static string[] GetAvailableClipNames() => GetAvailableClips().Select(clip => ParadiseLocalizedStrings.SettingsMenuThemeOptions[clip]).ToArray();

		public static AudioClip GetMenuAudioClip(MainMenuMusicType type) {
			if (type == MainMenuMusicType.None) {
				return null;
			}

			MenuAudio.TryGetValue(type, out var clip);

			// null is okay, don't fall back to default music if clip is not found
			return clip;
		}

		public static void LoadMainMenuMusic() {
			foreach (MainMenuMusicType type in Enum.GetValues(typeof(MainMenuMusicType))) {
				var resource = GetResourceName(type);

				if (!string.IsNullOrEmpty(resource)) {
					UnityRuntime.StartRoutine(GetAudio(resource, (AudioClip clip) => {
						if (clip != null) {
							MenuAudio[type] = clip;
						}
					}));
				}
			}
		}

		private static string GetResourceName(MainMenuMusicType type) {
			switch (type) {
				case MainMenuMusicType.Selotron:
					return "SeletronRadio-Short.ogg";
				case MainMenuMusicType.Catalyst:
					return "0305-Catalyst2D_V2.ogg";
				case MainMenuMusicType.ApexTwin:
					return "0416-ApexTwinTowers_V4Gandhi.ogg";
				case MainMenuMusicType.GhostIsland:
					return "1017-Halloween_MusicSELODEMO_V3.ogg";
				case MainMenuMusicType.DangerZone:
					return "0503-Volley_V1.ogg";
				default:
					return null;
			}
		}

		private static IEnumerator GetAudio(string resource, Action<AudioClip> callback) {
			if (!string.IsNullOrEmpty(resource)) {
				var resourceUri = string.Join("/", new[] { Application.dataPath, "Resources", resource });

				if (File.Exists(resourceUri)) {
					using (var request = new WWW("file://" + resourceUri)) {
						while (!request.isDone) {
							yield return null;
						}

						if (request.isDone) {
							callback(request.GetAudioClip(false));
							yield break;
						}
					}
				}
			}

			yield break;
		}
	}
}
