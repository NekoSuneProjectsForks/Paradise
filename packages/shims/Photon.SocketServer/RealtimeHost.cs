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

using LiteNetLib;
using Paradise.Transport;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using System.Threading;

using DisconnectReason = PhotonHostRuntimeInterfaces.DisconnectReason;

namespace Photon.SocketServer {
    public sealed class RealtimeHostOptions {
		public string IPAddress;
        public int Port = 5055;
        public int MaxPeers = 100;

        public string BinaryPath;
        public string ApplicationPath;

        public int PollInterval = 10;
        public int DisconnectTimeout = 10000;

        public string ConnectionKey = "tf.festival.paradise";
    }

    public sealed class RealtimeHost : INetEventListener {
        private readonly ApplicationBase application;
        private readonly RealtimeHostOptions options;
        private readonly NetManager manager;

        private readonly ConcurrentDictionary<int, PeerBase> peers = new ConcurrentDictionary<int, PeerBase>();
		private readonly ConcurrentDictionary<int, string> pendingAppIds = new ConcurrentDictionary<int, string>();

        private volatile bool running;

        public int PeerCount => peers.Count;
		public int Port => options.Port;

        public RealtimeHost(ApplicationBase application, RealtimeHostOptions options) {
            this.application = application;
            this.options = options;

            manager = new NetManager(this) {
                AutoRecycle = true,
                DisconnectTimeout = options.DisconnectTimeout,
                UpdateTime = Math.Max(1, options.PollInterval),
                ChannelsCount = 4,
            };
        }

        public void Run() {
            if (!manager.Start(options.IPAddress, IPAddress.IPv6None.ToString(), options.Port)) {
                throw new InvalidOperationException($"Failed to bind to UDP port at {options.IPAddress}:{options.Port}.");
            }

            running = true;

            while (running) {
                manager.PollEvents();
                try {
					manager.PollEvents();
				} catch (Exception ex) {
					NetDebug.WriteError($"[RealtimeHost] PollEvents error: {ex}");
				}

                Thread.Sleep(options.PollInterval);
            }

            manager.Stop();
        }

        public void Stop() {
            running = false;
        }

		private const byte TimeSyncOpCode = 254;

        internal static bool TraceEnabled = System.Environment.GetEnvironmentVariable("DEBUG") == "1";
        private static void Trace(string message) {
            if (TraceEnabled) {
                Console.WriteLine($"[net] {message}");
            }
        }

        internal SendResult Send(PeerBase peer, byte[] data, bool unreliable, byte channel) {
            var transport = peer.Transport;

            if (transport == null || transport.ConnectionState != ConnectionState.Connected) return SendResult.Disconnected;

            try {
                transport.Send(data, (byte)(unreliable ? 1 : 0), unreliable ? DeliveryMethod.Sequenced : DeliveryMethod.ReliableOrdered);

                Trace($"TX {data.Length} bytes -> peer {transport.Id} (unreliable: {(unreliable ? "yes" : "no")})");

                return SendResult.Ok;
            } catch (Exception ex) {
                Trace($"TX fail: ${ex}");
                return SendResult.Failed;
            }
        }

        internal void Disconnect(PeerBase peer) {
            var transport = peer.Transport;

            if (transport != null) {
                manager.DisconnectPeer(transport);
            }
        }

        // #region INetEventListener
        public void OnConnectionRequest(ConnectionRequest request) {
            if (options.MaxPeers >= 0 && peers.Count >= options.MaxPeers) {
                request.Reject();
            }

            var applicationId = string.Empty;
            try {
                if (request.Data != null && request.Data.AvailableBytes > 0) {
                    applicationId = request.Data.GetString();
                }
            } catch {}

            var peer = request.Accept();
            if (peer != null) pendingAppIds[peer.Id] = applicationId;

            Trace($"connection request for applicationId \"{applicationId}\": {(peer != null ? $"accepted peer {peer.Id}" : "rejected")}");
        }

        public void OnPeerConnected(NetPeer peer) {
            pendingAppIds.TryRemove(peer.Id, out var applicationId);

            var endpoint = peer.EndPoint;
            var request = new InitRequest {
                ApplicationId = applicationId,
                RemoteIP = endpoint.Address.ToString(),
                RemotePort = endpoint.Port,
                LocalIP = IPAddress.Any.ToString(),
                LocalPort = options.Port,
            };

            PeerBase clientPeer;

            try {
                clientPeer = application.CreatePeerInternal(request);
            } catch (Exception ex) {
                NetDebug.WriteError($"[RealtimeHost] CreatePeer failed: {ex}");
                manager.DisconnectPeer(peer);

                return;
            }

            if (clientPeer == null) {
                manager.DisconnectPeer(peer);
                return;
            }

            clientPeer.Transport = peer;
            clientPeer.Host = this;
            clientPeer.RemoteIP = request.RemoteIP;
            clientPeer.RemotePort = request.RemotePort;
            clientPeer.LocalIP = request.LocalIP;
            clientPeer.LocalPort = request.LocalPort;

            peers[peer.Id] = clientPeer;

            if (clientPeer.DisconnectRequested) {
                manager.DisconnectPeer(peer);
            }
        }

        public void OnPeerDisconnected(NetPeer peer, DisconnectInfo disconnectInfo) {
            pendingAppIds.TryRemove(peer.Id, out var _);

            if (peers.TryRemove(peer.Id, out var clientPeer)) {
                try {
                    clientPeer.DispatchDisconnect(MapReason(disconnectInfo.Reason), disconnectInfo.Reason.ToString());
                } catch (Exception ex) {
                    NetDebug.WriteError($"[RealtimeHost] error in disconnect handler: {ex}");
                }
            }
        }

        public void OnNetworkReceive(NetPeer peer, NetPacketReader reader, DeliveryMethod deliveryMethod) {
            if (!peers.TryGetValue(peer.Id, out var clientPeer)) return;

            var data = reader.GetRemainingBytes();
            WireMessage message;

            try {
                message = WireCodec.Decode(data);
            } catch (Exception ex) {
                NetDebug.WriteError($"[RealtimeHost] bad wire message: {ex}");
                return;
            }

            Trace($"RX {data.Length} bytes from peer {peer.Id} -> {message.Type} code {message.Code} ({message.Parameters.Count} params)");

            if (message.Type != WireMessageType.Operation) return;

			if (message.Code == TimeSyncOpCode) {
				try {
					var response = WireMessage.OperationResponse(TimeSyncOpCode, 0, null, new Dictionary<byte, object> {
						{ 0, Environment.TickCount }
					});

					peer.Send(WireCodec.Encode(response), 0, DeliveryMethod.ReliableOrdered);
				} catch (Exception e) {
					Trace($"time-sync reply failed: {e.Message}");
				}
				return;
			}

            var request = new OperationRequest(message.Code, message.Parameters);
            var parameters = new SendParameters {
                Unreliable = deliveryMethod != DeliveryMethod.ReliableOrdered
            };

            try {
				clientPeer.DispatchOperationRequest(request, parameters);
			} catch (Exception ex) {
				NetDebug.WriteError($"[RealtimeHost] error in operation handler: {ex}");
			}
        }

        public void OnNetworkError(IPEndPoint endPoint, SocketError socketError) { }

		public void OnNetworkReceiveUnconnected(IPEndPoint remoteEndPoint, NetPacketReader reader, UnconnectedMessageType messageType) { }

		public void OnNetworkLatencyUpdate(NetPeer peer, int latency) { }
        // #endregion

        private static DisconnectReason MapReason(LiteNetLib.DisconnectReason reason) {
			switch (reason) {
				case LiteNetLib.DisconnectReason.Timeout:
				case LiteNetLib.DisconnectReason.ConnectionFailed:
					return DisconnectReason.TimeoutDisconnect;
				case LiteNetLib.DisconnectReason.DisconnectPeerCalled:
					return DisconnectReason.ServerDisconnect;
				case LiteNetLib.DisconnectReason.RemoteConnectionClose:
					return DisconnectReason.ClientDisconnect;
				default:
					return DisconnectReason.ManagedDisconnect;
			}
		}
    }
}
