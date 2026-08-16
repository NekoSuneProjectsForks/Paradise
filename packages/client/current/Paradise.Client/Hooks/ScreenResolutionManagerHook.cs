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
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Xml.Serialization;
using UnityEngine;

namespace Paradise.Client {
	[XmlRoot]
	public class ScreenResolutionOptions {
		[XmlArray]
		[XmlArrayItem(typeof(ScreenResolution))]
		public List<ScreenResolution> ScreenResolutionList { get; set; }
	}

#pragma warning disable IDE1006
	public class ScreenResolution {
		[XmlAttribute]
		public int width { get; set; }

		[XmlAttribute]
		public int height { get; set; }

		[XmlAttribute]
		public float refreshRate { get; set; }
	}
#pragma warning restore IDE1006

	[HarmonyPatch(typeof(ScreenResolutionManager))]
	public static class ScreenResolutionManagerHook {
		[HarmonyPrepare]
		public static void Prepare() {
			XmlSerializer serializer = new XmlSerializer(typeof(ScreenResolutionOptions));
			using (Stream stream = Assembly.GetAssembly(typeof(ParadiseClient)).GetManifestResourceStream("Paradise.Client.ScreenResolutions.xml")) {
				using (StreamReader reader = new StreamReader(stream)) {
					ScreenResolutionManager.Resolutions.Clear();

					var screenResolutionOptions = (ScreenResolutionOptions)serializer.Deserialize(reader);
					foreach (var resolution in screenResolutionOptions.ScreenResolutionList) {
						if (Screen.currentResolution.width >= resolution.width && Screen.currentResolution.height >= resolution.height) {
							ScreenResolutionManager.Resolutions.Add(new Resolution {
								width = resolution.width,
								height = resolution.height
							});
						}
					}
				}
			}

			if (ScreenResolutionManager.Resolutions.Find(_ => _.width == Screen.currentResolution.width && _.height == Screen.currentResolution.height).Equals(default(Resolution))) {
				ScreenResolutionManager.Resolutions.Add(Screen.currentResolution);
			}

			ScreenResolutionManager.Resolutions.Sort((a, b) => {
				var result = a.width.CompareTo(b.width);

				return result != 0 ? result : a.height.CompareTo(b.height);
			});
		}
	}
}
