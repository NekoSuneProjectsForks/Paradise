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
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Xml.Serialization;

namespace Paradise.Client.DiscordRPC {
	internal class Program {
		static readonly ManualResetEvent QuitEvent = new ManualResetEvent(false);

		static readonly Mutex mutex = new Mutex(true, "{7b37f0ce-4a3e-4735-a713-2bf27277ad74}");
		static readonly string PresenceFile = Path.Combine(Path.GetTempPath(), "7b37f0ce-4a3e-4735-a713-2bf27277ad74");

		private static readonly object Lock = new object();


		[STAThread]
		static void Main() {
			if (!mutex.WaitOne(TimeSpan.Zero, true)) {
				return;
			}

			AppDomain.CurrentDomain.AssemblyResolve += (sender, e) => {
				var assemblyName = new AssemblyName(e.Name).Name;
				var resourceName = Assembly.GetExecutingAssembly().GetManifestResourceNames().FirstOrDefault(_ => _.EndsWith($"{assemblyName}.dll"));

				if (string.IsNullOrEmpty(resourceName)) return null;

				using (var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName)) {
					return Assembly.Load(new BinaryReader(stream).ReadBytes((int)stream.Length));
				}
			};

			try {
				RichPresenceManager.Initialize();

				var watcher = new FileSystemWatcher(Path.GetDirectoryName(PresenceFile), Path.GetFileName(PresenceFile)) {
					NotifyFilter = NotifyFilters.LastWrite
				};
				watcher.Changed += (object sender, FileSystemEventArgs eArgs) => {
					try {
						watcher.EnableRaisingEvents = false;

						ReadPresenceFile();
					} catch (Exception e) {
						Console.WriteLine(e);
					} finally {
						watcher.EnableRaisingEvents = true;
					}
				};

				try {
					ReadPresenceFile();
				} catch (Exception e) {
					Console.WriteLine(e);
				}

				watcher.EnableRaisingEvents = true;
			} catch (Exception e) {
				Console.WriteLine(e);
			}

			QuitEvent.WaitOne();
		}

		private static void ReadPresenceFile() {
			lock (Lock) {
				using (var stream = File.Open(PresenceFile, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.ReadWrite)) {
					using (var reader = new StreamReader(stream)) {
						var content = Encoding.UTF8.GetString(Convert.FromBase64String(reader.ReadToEnd()));

						if (!string.IsNullOrWhiteSpace(content)) {
							var serializer = new XmlSerializer(typeof(RichPresenceSerializable));
							using (var xmlReader = new StringReader(content)) {
								RichPresenceManager.SetPresence((RichPresenceSerializable)serializer.Deserialize(xmlReader));
							}
						}

						stream.SetLength(0);
						stream.Close();
					}
				}
			}
		}
	}
}
