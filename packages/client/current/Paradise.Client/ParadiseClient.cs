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
using log4net.Appender;
using log4net.Config;
using log4net.Core;
using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Xml;
using UnityEngine;

namespace Paradise.Client {
	public static class ParadiseClient {
		public static readonly ILog Log = LogManager.GetLogger(nameof(ParadiseClient));
		public static ParadisePrefs Settings { get; private set; } = new ParadisePrefs();

		private static float lastExceptionSent;

		static ParadiseClient() {
			AppDomain.CurrentDomain.AssemblyResolve += (sender, e) => {
				var assemblyName = new AssemblyName(e.Name).Name;
				var resourceName = Assembly.GetExecutingAssembly().GetManifestResourceNames().FirstOrDefault(_ => _.EndsWith($"{assemblyName}.dll"));

				if (string.IsNullOrEmpty(resourceName))
					return null;

				using (var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName)) {
					return Assembly.Load(new BinaryReader(stream).ReadBytes((int)stream.Length));
				}
			};
		}

		public static void Initialize() {
			Application.RegisterLogCallback(new Application.LogCallback(OnUnityDebugCallback));

			using (var stream = Assembly.GetAssembly(typeof(ParadiseClient)).GetManifestResourceStream("Paradise.Client.log4net.config")) {
				using (var reader = new StreamReader(stream)) {
					var logConfig = new XmlDocument();
					logConfig.LoadXml(reader.ReadToEnd());

					XmlConfigurator.Configure(logConfig.DocumentElement);

					var appender = LogManager.GetLogger(typeof(ParadiseClient)).Logger.Repository.GetAppenders().First() as EventRaisingRollingFileAppender;
					appender.LogEventRaised += delegate (LoggingEvent loggingEvent) {
						DebugLogMessagesPanel.Console.Log(loggingEvent.Level, loggingEvent.RenderedMessage, loggingEvent.TimeStamp);
					};
				}
			}

			Log.Info($"Initializing Paradise (Version {Assembly.GetExecutingAssembly().GetName().Version}) ({Application.platform})");

			ParadiseMainMenuMusicManager.LoadMainMenuMusic();
			RichPresenceClient.Initialize();
		}

		private static void OnUnityDebugCallback(string logString, string stackTrace, LogType logType) {
			if (logType >= LogType.Warning)
				return;

			if (ApplicationDataManager.IsOnline) {
				if (lastExceptionSent + 3f <= Time.time) {
					ParadiseWebServiceClient.RecordException(PlayerDataManager.Cmid, ApplicationDataManager.Channel, ApplicationDataManager.Version, logString, stackTrace, DebugLogMessages.Console.ToHTML(), () => { });
					lastExceptionSent = Time.time;
				}
			}
		}
	}

	public class EventRaisingRollingFileAppender : RollingFileAppender {
		public event Action<LoggingEvent> LogEventRaised;

		protected override void Append(LoggingEvent loggingEvent) {
			base.Append(loggingEvent);

			LogEventRaised?.Invoke(loggingEvent);

			//switch (loggingEvent.Level) {
			//	case Level.Emergency:
			//	case Level.Fatal:
			//	case Level.Alert:
			//	case Level.Critical:
			//	case Level.Severe:
			//	case Level.Error:
			//	case Level.Warn:
			//	case Level.Notice:
			//	case Level.Info:
			//	case Level.Debug:
			//	case Level.Fine:
			//	case Level.Trace:
			//	case Level.Finer:
			//	case Level.Verbose:
			//	case Level.Finest:
			//	case Level.All:
			//		break;
			//}
		}
	}
}
