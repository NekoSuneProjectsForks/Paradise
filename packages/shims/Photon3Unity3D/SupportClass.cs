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
using System.Text;
using System.Threading;

namespace ExitGames.Client.Photon {
	public class SupportClass {
		protected internal static IntegerMillisecondsDelegate IntegerMilliseconds = () => Environment.TickCount;

		public delegate int IntegerMillisecondsDelegate();

		public static int GetTickCount() {
			return SupportClass.IntegerMilliseconds();
		}

		public static void CallInBackground(Func<bool> myThread) {
			SupportClass.CallInBackground(myThread, 100);
		}

		public static void CallInBackground(Func<bool> myThread, int millisecondsInterval) {
			var thread = new Thread(() => {
				try {
					while (myThread()) {
						Thread.Sleep(millisecondsInterval);
					}
				} catch {}
			}) {
				IsBackground = true,
			};

			thread.Start();
		}

		public static string DictionaryToString(IDictionary dictionary) {
			return DictionaryToString(dictionary, true);
		}

		public static string DictionaryToString(IDictionary dictionary, bool includeTypes) {
			if (dictionary == null) {
				return "null";
			}

			var stringBuilder = new StringBuilder();
			stringBuilder.Append("{");

			foreach (object obj in dictionary.Keys) {
				if (stringBuilder.Length > 1) {
					stringBuilder.Append(", ");
				}

				Type type;
				string text;

				if (dictionary[obj] == null) {
					type = typeof(object);
					text = "null";
				} else {
					type = dictionary[obj].GetType();
					text = dictionary[obj].ToString();
				}

				if (typeof(IDictionary) == type || typeof(Hashtable) == type) {
					text = SupportClass.DictionaryToString((IDictionary)dictionary[obj]);
				}

				if (typeof(string[]) == type) {
					text = string.Format("{{{0}}}", string.Join(",", (string[])dictionary[obj]));
				}

				if (includeTypes) {
					stringBuilder.AppendFormat("({0}){1}=({2}){3}", new object[] {
						obj.GetType().Name,
						obj,
						type.Name,
						text
					});
				} else {
					stringBuilder.AppendFormat("{0}={1}", obj, text);
				}
			}

			stringBuilder.Append("}");

			return stringBuilder.ToString();
		}
	}
}
