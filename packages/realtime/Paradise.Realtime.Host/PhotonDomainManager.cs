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

using CommandLine;
using CommandLine.Text;
using log4net;
using log4net.Config;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Reflection;
using System.Threading;
using System.Xml.Linq;
using Photon.SocketServer;

namespace Paradise.Realtime.Host {
	static class PhotonDomainManager {
		private static readonly string Log4NetConfigFilename = "Photon.local.log4net";
		private static readonly ILog log = LogManager.GetLogger("PhotonHostRuntime.PhotonDomainManager");

		private static ApplicationBase AppInstance;

		/// <summary>
        /// The main entry point for the application.
        /// </summary>
        [STAThread]
        static void Main(string[] args) {
			ConfigureLogging();

			var configPath = ResolveConfiguration();

			var parser = new Parser(with => with.HelpWriter = null);
            var parserResult = parser.ParseArguments<CommApplicationOptions, GameApplicationOptions>(args);
            parserResult
                .WithParsed<CommApplicationOptions>(options => {
                    var appEntry = ResolveApplication(configPath, "Paradise.Realtime.Comm");

                    if (appEntry != null) {
						ExecuteApplication(appEntry, options);
					}
                })
                .WithParsed<GameApplicationOptions>(options => {
                    var appEntry = ResolveApplication(configPath, "Paradise.Realtime.Game");

                    if (appEntry != null) {
						ExecuteApplication(appEntry, options);
					}
                })
                .WithNotParsed(errs => DisplayHelp(parserResult, errs));
		}

		private static void ConfigureLogging() {
			var pwd = AppDomain.CurrentDomain.BaseDirectory;
			var path = Path.Combine(pwd, PhotonDomainManager.Log4NetConfigFilename);

			GlobalContext.Properties["Photon:UnmanagedLogDirectory"] = Path.Combine(pwd, "logs");;

			var fileInfo = new FileInfo(path);
			if (fileInfo.Exists) {
				XmlConfigurator.ConfigureAndWatch(fileInfo);
			} else {
				// this.LogUnmanagedMsg("Failed to setup PhotonClr.log - '{0}' does not exist.");
			}

			if (log.IsInfoEnabled) {
				log.Info($"Initialize: ApplicationName = '{AppDomain.CurrentDomain.FriendlyName}', DomainID = '{AppDomain.CurrentDomain.Id}'");
			}
		}

		private static void DisplayHelp<T>(ParserResult<T> result, IEnumerable<Error> errs) {
            var helpText = HelpText.AutoBuild(result, h => {
                h.AdditionalNewLineAfterOption = false;

                return HelpText.DefaultParsingErrorsHandler(result, h);
            }, e => e, verbsIndex: true);

            Console.WriteLine(helpText);
        }

		private static string ResolveConfiguration() {
			var pwd = AppDomain.CurrentDomain.BaseDirectory;

			var candidates = new string[] {
				Path.Combine(pwd, "PhotonServer.config"),
				Path.Combine(pwd, "..", "PhotonServer.config"),
				Path.Combine(pwd, "..", "photon", "PhotonServer.config"),
			};

			foreach (var candidate in candidates) {
				if (File.Exists(candidate)) return Path.GetFullPath(candidate);
			}

			return null;
		}

		private static ApplicationEntry ResolveApplication(string configPath, string requestedApplication) {
			try {
				if (!File.Exists(configPath)) {
					throw new FileNotFoundException($"PhotonServer.config not found at \"{configPath}\"");
				}

				var xmlDocument = XDocument.Load(configPath);
				var root = xmlDocument.Root?.Element("ParadiseApplication") ?? xmlDocument.Root;

				var listeners = root
					.Element("UDPListeners")
					.Elements("UDPListener")
					.Select(listener => new UDPListenerEntry {
						IPAddress = (string)listener.Attribute("IPAddress"),
						Port = (int)listener.Attribute("Port"),
						OverrideApplication = (string)listener.Attribute("OverrideApplication"),
					}).ToList() ?? new List<UDPListenerEntry>();

				var applications = root
					.Element("Applications")
					.Elements("Application")
					.Select(app => new ApplicationEntry {
						Name = (string)app.Attribute("Name"),
						BaseDirectory = (string)app.Attribute("BaseDirectory"),
						Assembly = (string)app.Attribute("Assembly"),
						Type = (string)app.Attribute("Type"),
						ForceAutoRestart = (bool)app.Attribute("ForceAutoRestart"),
						ListenerEntry = listeners.FirstOrDefault(listener => listener.OverrideApplication == (string)app.Attribute("Name"))
					}).ToList() ?? new List<ApplicationEntry>();

				if (applications.Count == 0) {
					throw new InvalidOperationException("No <Application> entries in config.");
				}

				var entry = applications.FirstOrDefault(app => string.Equals(app.Name, requestedApplication, StringComparison.OrdinalIgnoreCase));

				if (entry == null) {
					throw new InvalidOperationException($"Photon application \"{requestedApplication}\" not found.");
				}

				return entry;
			} catch (Exception e) {
				log.Error($"Failed to resolve application \"{requestedApplication}\"", e);

				return null;
			}
		}

		private static void ExecuteApplication(ApplicationEntry appEntry, ApplicationOptions options) {
			var pwd = AppDomain.CurrentDomain.BaseDirectory;
			var binaryPath = options.BinaryPath ?? (Directory.Exists(Path.Combine(pwd, appEntry.BaseDirectory)) ? Path.Combine(pwd, appEntry.BaseDirectory) : pwd);
			var assemblyPath = Path.Combine(pwd, appEntry.Assembly + ".dll");

			if (!File.Exists(assemblyPath)) {
				log.Error($"Photon server assembly \"{appEntry.Assembly}.dll\" not found.");

                return;
            }

			var assembly = Assembly.LoadFrom(assemblyPath);
            var applicationType = assembly.GetType(appEntry.Type, throwOnError: false);

            if (applicationType == null) {
				log.Error($"Type \"{appEntry.Type}\" not found in {assembly.GetName().Name}.");

				return;
			}

			AppInstance = (ApplicationBase)Activator.CreateInstance(applicationType);
			if (AppInstance == null) {
				log.Error($"Type \"{appEntry.Type}\" is not a Photon.SocketServer.ApplicationBase.");

				return;
			}

			var hostOptions = new RealtimeHostOptions {
				IPAddress = options.ListenAddress ?? appEntry.ListenerEntry.IPAddress ?? IPAddress.Any.ToString(),
				Port = options.Port ?? appEntry.ListenerEntry.Port,
				MaxPeers = options.MaxPeers ?? 100,

				BinaryPath = binaryPath,
				ApplicationPath = Path.GetDirectoryName(binaryPath.TrimEnd(Path.DirectorySeparatorChar)) ?? binaryPath,

				ConnectionKey = options.ConnectionKey ?? "tf.festival.paradise",
			};

			log.Info($"{appEntry.Name} ({appEntry.Type})");
			log.Info($"  Listen address: {hostOptions.IPAddress}");
			log.Info($"  Port: {hostOptions.Port}");
			log.Info($"  Binary Path: {hostOptions.BinaryPath}");
			log.Info($"  Max Peers: {hostOptions.MaxPeers}");

			Console.CancelKeyPress += (s, e) => { e.Cancel = true; Shutdown(); };
			AppDomain.CurrentDomain.ProcessExit += (s, e) => Shutdown();
			AppDomain.CurrentDomain.AssemblyLoad += (s, e) => {
				log.Debug(string.Format("AssemblyLoadEvent: " + e.LoadedAssembly.FullName + " from " + e.LoadedAssembly.CodeBase, new object[0]));
			};

			try {
				AppInstance.RunHost(hostOptions);
			} catch (Exception e) {
				log.Fatal($"fatal", e);
				return;
			}
		}

		private static void Shutdown() {
			var app = Interlocked.Exchange(ref AppInstance, null);

			if (app != null) {
				log.Info($"RequestStop: ApplicationName = '{AppDomain.CurrentDomain.FriendlyName}', DomainId='{AppDomain.CurrentDomain.Id}'");

				try { app.StopHost(); } catch { }
                Environment.Exit(0);
			}
		}
	}
}
