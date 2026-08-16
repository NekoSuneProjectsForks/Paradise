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

using log4net;
using System;
using System.Collections;
using System.Collections.Generic;
using UberStrike.Core.Models.Views;
using UnityEngine;

namespace Paradise.Client {
	internal class ParadiseMapManager {
		private static readonly ILog Log = LogManager.GetLogger(nameof(ParadiseMapManager));

		public static List<ParadiseMapView> Maps { get; private set; } = new List<ParadiseMapView>();

		private static AssetBundle Bundle;
		private static bool IsLoading = false;

		public static bool LoadMaps(List<ParadiseMapView> maps) {
			Maps.Clear();
			Maps.AddRange(maps);

			return Maps.Count > 0;
		}

		private static ParadiseMapView GetMap(int mapId) {
			foreach (ParadiseMapView map in Maps) {
				if (map.MapId.Equals(mapId)) {
					return map;
				}
			}
			return null;
		}

		public static bool IsBundleMap(int mapid) {
			foreach (var map in Maps) {
				if (map.MapId == mapid) {
					return true;
				}
			}

			return false;
		}

		public static void LoadBundle(int mapId, Action onSucces = null) {
			if (!IsLoading) {
				try {
					Bundle.Unload(true);
				} catch { }

				UnityRuntime.StartRoutine(LoadBundleMap(mapId, onSucces));
			}
		}

		public static IEnumerator LoadBundleMap(int mapId, Action successCallback = null) {
			IsLoading = true;

			var map = GetMap(mapId);

			if (map == null) {
				PopupSystem.ShowMessage(ParadiseLocalizedStrings.BundleError, ParadiseLocalizedStrings.MapBundleNotFound);

				yield break;
			}

			var progressPopup = new ProgressPopupDialog(ParadiseLocalizedStrings.Loading, string.Format(ParadiseLocalizedStrings.LoadingMapFrom, map.FileName), null);
			PopupSystem.Show(progressPopup);

			var path = $"file:///{Application.dataPath}/Maps/{map.FileName}";

			using (WWW loader = WWW.LoadFromCacheOrDownload(path, 1)) {
				while (!loader.isDone) {
					progressPopup.Progress = loader.progress;

					yield return null;
				}

				IsLoading = false;

				if (string.IsNullOrEmpty(loader.error)) {
					Bundle = loader.assetBundle;
					PopupSystem.HideMessage(progressPopup);

					try {
						Bundle.LoadAll();
						successCallback?.Invoke();
					} catch (Exception e) {
						PopupSystem.ShowMessage(LocalizedStrings.Error, string.Format(ParadiseLocalizedStrings.ErrorLoadingMap, e.Message), PopupSystem.AlertType.OK);
						yield break;
					}
				} else {
					PopupSystem.HideMessage(progressPopup);
					PopupSystem.ShowMessage(LocalizedStrings.Error, string.Format(ParadiseLocalizedStrings.ErrorLoadingMap, loader.error), PopupSystem.AlertType.OK);

					yield break;
				}
			}
		}
	}
}
