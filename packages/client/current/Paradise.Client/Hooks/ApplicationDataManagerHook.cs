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

using HarmonyLib;
using System;
using UnityEngine;

namespace Paradise.Client {
	[HarmonyPatch(typeof(ApplicationDataManager))]
	public static class ApplicationDataManagerHook {
		public static GameObject PluginHolder;

		[HarmonyPatch(MethodType.StaticConstructor), HarmonyPrepare]
		public static void ctor_Postfix() {
			PluginHolder = new GameObject("Plugin Holder");
			PluginHolder.AddComponent<ParadiseApplicationManager>();
			PluginHolder.AddComponent<DebugTools>();

			UnityEngine.Object.DontDestroyOnLoad(PluginHolder);

			var webServiceUri = new UriBuilder(ParadiseClient.Settings.WebServiceBaseUrl) {
				Path = ParadiseClient.Settings.WebServiceEndpoint
			}.ToString();

			var imagePathUri = new UriBuilder(ParadiseClient.Settings.FileServerUrl) {
				Path = ParadiseClient.Settings.ImagePathEndpoint
			}.ToString();

			var traverse = ParadiseTraverse.Create(typeof(ApplicationDataManager));

			traverse.SetField("WebServiceBaseUrl", ForceTrailingSlash(webServiceUri));
			traverse.SetField("ImagePath", ForceTrailingSlash(imagePathUri));
		}

		private static string ForceTrailingSlash(string uri) {
			return uri.EndsWith("/") ? uri : uri + "/";
		}
	}
}
