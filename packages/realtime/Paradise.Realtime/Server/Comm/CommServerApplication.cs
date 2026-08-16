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
using Photon.SocketServer;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using static Paradise.WebSocket;

namespace Paradise.Realtime.Server.Comm {
	public class CommServerApplication : BaseRealtimeApplication {
		protected static readonly new ILog Log = LogManager.GetLogger(nameof(CommServerApplication));
		protected static readonly ILog ChatLog = LogManager.GetLogger("ChatLog");

		public static new CommServerApplication Instance => (CommServerApplication)ApplicationBase.Instance;
		public override ServerType ServerType => ServerType.Comm;

		private static readonly ProfanityFilter.ProfanityFilter ProfanityFilter = new ProfanityFilter.ProfanityFilter();

		public override int Peers {
			get {
				return LobbyManager.Instance.Peers.Count;
			}
		}

		protected override PeerBase OnCreatePeer(InitRequest initRequest) {
			return new CommPeer(initRequest);
		}

		protected override void OnBeforeSetup() {
			if (Configuration.CommApplicationSettings.ApplicationIdentifier == null) {
				Log.Fatal("ApplicationIdentifier is null!");
				throw new ArgumentNullException(nameof(Configuration.CommApplicationSettings.ApplicationIdentifier));
			}

			Identifier = Configuration.CommApplicationSettings.ApplicationIdentifier;

			if (Configuration.CommApplicationSettings.PhotonId == 0) {
				Log.Fatal("PhotonId is null!");
				throw new ArgumentNullException(nameof(Configuration.CommApplicationSettings.PhotonId));
			}

			PhotonId = Configuration.CommApplicationSettings.PhotonId;

			Log.Info($"Starting CommServer[{Identifier}]...");
		}

		protected override void OnSetup() {
			SocketClient = new SocketClient(Identifier, ServerType.Comm, PhotonId, Configuration.CommApplicationSettings.EncryptionPassPhrase);

			SocketClient.Connected += (sender, e) => {
				Log.Info("Comm: CONNECTED TO SOCKET");

				PublishPeerList();
			};

			SocketClient.Disconnected += (sender, e) => {
				Log.Info("Comm: DISCONNECTED FROM SOCKET");

				SocketClient.Reconnect(25);
			};

			SocketClient.ConnectionRejected += (sender, e) => {
				Log.Info($"Comm: Rejected connection by socket server (Reason: {e.Reason})");
			};

			SocketClient.DataReceived += (sender, e) => {
				try {
					switch (e.Type) {
						case PacketType.ChatMessage:
							var message = (SocketChatMessage)e.Data;

							var censored = ProfanityFilter.CensorString(message.Message);
							var trimmed = censored.Substring(0, Math.Min(censored.Length, 140));

							if (Configuration.EnableChatLog) {
								ChatLog.Info($"[Lobby] {message.Name}: {message.Message}");
							}

							foreach (var peer in LobbyManager.Instance.Peers) {
								peer.LobbyEventSender.SendLobbyChatMessage(message.Cmid, message.Name, trimmed);
							}
							break;
						case PacketType.BanPlayer: {
							var data = (Dictionary<string, object>)e.Data;
							var targetPeer = LobbyManager.Instance.Peers.FirstOrDefault(_ => _.Actor.Cmid == (long)data["TargetCmid"]);

							if (targetPeer != null) {
								if ((long)data["Duration"] == 0) {
									targetPeer.SendError($"You have been banned permanently.\n\nReason: {data["Reason"]}");
								} else {
									var expireTime = ((DateTime)data["ExpireTime"]).ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss \"GMT\"zzz");
									targetPeer.SendError($"You have been banned for {data["Duration"]} minute(s).\nYour ban will expire at {expireTime}\n\nReason: {data["Reason"]}");
								}
							}

							break;
						}
					}
				} catch (Exception ex) {
					Log.Error($"Error while receiving WebSocket data", ex);
				}
			};

			var tcpAddress = Dns.GetHostAddresses(Configuration.MasterHostname).Where(_ => _.AddressFamily == AddressFamily.InterNetwork).First();

			if (tcpAddress != null) {
				SocketClient.Connect(tcpAddress, Configuration.SocketPort);
			}

			Log.Info($"Started CommServer[{Identifier}].");
		}

		protected override void OnBeforeTearDown() {
			Log.Info($"Stopping CommServer[{Identifier}]...");
		}

		protected override void OnTearDown() {
			Log.Info($"Stopped CommServer[{Identifier}].");
		}

		private void PublishPeerList() {
			var peerList = LobbyManager.Instance.Peers.Select(peer => new Dictionary<string, object> {
				["Cmid"] = peer.Actor.Cmid,
				["RemoteIP"] = peer.RemoteIPAddress.ToString(),
				["RemotePort"] = peer.RemotePort,
				["Channel"] = peer.Actor.ActorInfo.Channel,
				["LocalIP"] = peer.LocalIPAddress.ToString(),
				["LocalPort"] = peer.LocalPort
			});

			SocketClient?.SendSync(PacketType.ListPeers, peerList.ToList(), serverType: ServerType.Comm);
		}
	}
}
