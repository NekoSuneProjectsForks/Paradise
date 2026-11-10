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
using System.Text;
using System.Threading;
using UnityEngine;

namespace Paradise.Client {
	/// <summary>
	/// A GET download with the members of UnityEngine.WWW the client uses (isDone, progress, error,
	/// bytes, text). HTTPS on Windows goes through WinHTTP (TLS 1.2/1.3); everything else through WWW.
	/// </summary>
	public sealed class WebDownload : IDisposable {
		private readonly WWW www;
		private volatile WinHttp.Response response;

		private WebDownload(string url, int timeoutMs) {
			if (WinHttp.ShouldUse(url)) {
				var worker = new Thread(() => response = WinHttp.Send("GET", url, null, null, timeoutMs));
				worker.IsBackground = true;
				worker.Start();
			} else {
				www = new WWW(url);
			}
		}

		public static WebDownload Get(string url, int timeoutMs = 120000) => new WebDownload(url, timeoutMs);

		public bool isDone => www != null ? www.isDone : response != null;
		public float progress => www != null ? www.progress : (response != null ? 1f : 0f);
		public string error => www != null ? www.error : response?.Error;
		public byte[] bytes => www != null ? www.bytes : (response?.Body ?? new byte[0]);
		public string text => www != null ? www.text : Encoding.UTF8.GetString(bytes).TrimStart('\uFEFF');

		public void Dispose() {
			www?.Dispose();
		}
	}
}
