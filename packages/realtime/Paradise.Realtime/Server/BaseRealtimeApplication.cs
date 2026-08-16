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

using Cmune.DataCenter.Common.Entities;
using log4net;
using log4net.Config;
using Photon.SocketServer;
using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.ServiceModel;
using System.Xml;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using static Paradise.WebSocket;

namespace Paradise.Realtime.Server {
	public abstract class BaseRealtimeApplication : ApplicationBase {
		protected static readonly ILog Log = LogManager.GetLogger(typeof(BaseRealtimeApplication));

		public static new BaseRealtimeApplication Instance => (BaseRealtimeApplication)ApplicationBase.Instance;
		public virtual WebSocket.ServerType ServerType { get; }

		public string EncryptionPassPhrase { get; private set; }
		public string EncryptionInitVector { get; private set; }

		public Guid Identifier;
		public int PhotonId;
		public WebSocket.SocketClient SocketClient;

		public ApplicationConfiguration Configuration { get; private set; }
		private PeerConfiguration PeerConfiguration;

		public abstract int Peers { get; }

		protected virtual void OnBeforeSetup() { }
		protected virtual void OnSetup() { }
		protected virtual void OnBeforeTearDown() { }
		protected virtual void OnTearDown() { }

		protected abstract PeerBase OnCreatePeer(InitRequest initRequest);

		protected sealed override void Setup() {
			AppDomain.CurrentDomain.UnhandledException += (sender, e) => {
				Log.Error(e.ExceptionObject);
				HandleException(e.ExceptionObject as Exception);
			};

			GlobalContext.Properties["Photon:ApplicationLogPath"] = Path.Combine(BinaryPath, "logs");

			using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("Paradise.Realtime.log4net.config")) {
				using (StreamReader reader = new StreamReader(stream)) {
					var logConfig = new XmlDocument();
					logConfig.LoadXml(reader.ReadToEnd());

					XmlConfigurator.Configure(logConfig.DocumentElement);
				}
			}

			try {
				using (var input = File.OpenText(Path.GetFullPath(Path.Combine(BinaryPath, "paradise-realtime.yml")))) {
					var deserializer = new DeserializerBuilder()
						.WithNamingConvention(PascalCaseNamingConvention.Instance)
						.Build();

					Configuration = deserializer.Deserialize<ApplicationConfiguration>(input);

					Configuration.Validate();
				}
			} catch (Exception e) {
				Log.Error($"There was an error parsing the settings file: {e.Message}");
				Log.Debug(e);

				Configuration = new ApplicationConfiguration();
			}

			OnBeforeSetup();

			PeerConfiguration = new PeerConfiguration(
				heartbeatInterval: Configuration.HeartbeatTimeout,
				heartbeatTimeout: Configuration.HeartbeatInterval,
				compositeHashes: Configuration.CompositeHashBytes.AsReadOnly(),
				junkHashes: Configuration.JunkHashBytes.AsReadOnly()
			) {
				EnableHashVerification = Configuration.EnableHashVerification
			};

			try {
				if (ApplicationWebServiceClient.Instance.AuthenticateApplication("4.7.1", ChannelType.Steam, $"ParadiseRealtime{ServerType}") is var data) {
					EncryptionInitVector = data.EncryptionInitVector;
					EncryptionPassPhrase = data.EncryptionPassPhrase;
				}
			} catch (EndpointNotFoundException) {
				Log.Fatal("Could not connect to the Web Services. Ensure the Web Services are running and restart the Realtime application.");
				StopHost();
				Environment.Exit(1);

				return;
			}

			OnSetup();
		}

		protected sealed override void TearDown() {
			OnBeforeTearDown();

			OnTearDown();
		}

		protected sealed override PeerBase CreatePeer(InitRequest initRequest) {
			Log.Info($"Accepted new connection from {initRequest.RemoteIP}:{initRequest.RemotePort}.");

			initRequest.UserData = PeerConfiguration;
			return OnCreatePeer(initRequest);
		}

		public void HandleException(Exception exception) {
			SocketClient?.SendSync(PacketType.Error, new RealtimeError {
				Type = ServerType,
				ExceptionType = exception.GetType(),
				Message = exception.Message,
				StackTrace = exception.StackTrace
			});
		}
	}
}
