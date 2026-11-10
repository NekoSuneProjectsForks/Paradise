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
using System.Collections;
using System.Threading;
using UnityEngine;

namespace Paradise.Client {
	/// <summary>
	/// The game downloads web images (map icons, flags, banners) in TextureLoader.WorkerCrt with
	/// Unity 4.6's WWW, whose bundled OpenSSL only speaks TLS 1.0 - a TLS 1.2+ server answers
	/// "tlsv1 alert protocol version". This replaces the worker: https images on Windows come through
	/// WinHTTP (TLS 1.2/1.3, see WinHttp.cs), everything else still through WWW, exactly as before.
	/// </summary>
	[HarmonyPatch(typeof(TextureLoader))]
	public static class TextureLoaderHook {
		private const float Timeout = 30f;

		[HarmonyPatch("WorkerCrt"), HarmonyPrefix]
		public static bool WorkerCrt_Prefix(TextureLoader __instance, ref IEnumerator __result) {
			__result = Worker(__instance);
			return false;
		}

		private static IEnumerator Worker(TextureLoader loader) {
			for (;;) {
				while (loader.pending.Count == 0) {
					yield return 0;
				}

				var item = loader.pending[0];
				loader.pending.RemoveAt(0);

				if (WinHttp.ShouldUse(item.Url)) {
					WinHttp.Response response = null;
					var worker = new Thread(() => response = WinHttp.Send("GET", item.Url, null, null, (int)(Timeout * 1000)));
					worker.IsBackground = true;
					worker.Start();
					while (worker.IsAlive) {
						yield return 0;
					}

					if (response != null && response.Ok && item.Texture != null && item.Texture.LoadImage(response.Body)) {
						item.State = TextureLoader.State.Ok;
					} else {
						item.State = TextureLoader.State.Error;
						Debug.Log("Failed to download texture " + item.Url + ". " + (response?.Error ?? "not an image"));
					}
					continue;
				}

				var www = new WWW(item.Url);
				var start = Time.time;
				while (!www.isDone && Time.time - start <= Timeout) {
					yield return 0;
				}

				if (www.isDone) {
					if (string.IsNullOrEmpty(www.error)) {
						www.LoadImageIntoTexture(item.Texture);
						item.State = TextureLoader.State.Ok;
					} else {
						item.State = TextureLoader.State.Error;
						Debug.Log("Failed to download texture " + item.Url + ". " + www.error);
					}
				} else {
					item.State = TextureLoader.State.Timeout;
					Debug.Log("Failed to download texture " + item.Url + ". Timeout.");
					www.Dispose();
				}
			}
		}
	}
}
