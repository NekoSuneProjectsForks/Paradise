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

import ParadiseService from '@/ParadiseService';
import { Log } from '@/utils';
import PacketCodec, { PacketType, PayloadType } from '@/utils/PacketCodec';
import { PhotonServer } from '@festivaldev/paradise-models';
import { ArrayProxy, ByteProxy, EnumProxy } from '@festivaldev/uberstrike-js/UberStrike/Core/Serialization';
import type { Server } from 'bun';
import EventEmitter from 'events';
import status from 'http-status';
import WebSocketConnection from './Connection';
import {
  WebSocketConnectedEventArgs,
  WebSocketConnectionRejectedEventArgs,
  WebSocketDataReceivedEventArgs,
  WebSocketDisconnectedEventArgs
} from './EventArgs';
import RijndaelCryptoProvider from './RijndaelCryptoProvider';
import { ServerType, WebSocketConnectionStatus, WebSocketInfo } from './WebSocket';

const MAGIC_BYTES = [0x50, 0x61, 0x52, 0x61, 0x44, 0x69, 0x53, 0x65];

export type WebSocketData = {
  socketId: string;
};

export default class WebSocketHost extends EventEmitter {
  readonly port: number;
  private socket: Server<WebSocketData> | undefined;

  get Socket(): Server<WebSocketData> | undefined {
    return this.socket;
  }

  private commServer?: WebSocketConnection;
  private gameServers: { [key: string]: WebSocketConnection } = {};

  private connectedSockets: { [key: string]: WebSocketConnection } = {};
  private CryptoProviders: { [key: string]: RijndaelCryptoProvider } = {};

  constructor(port: number = 8080) {
    super();

    this.port = port;
  }

  start(): void {
    if (this.socket) {
      Log.error('Cannot start more than one WebSocket server.');
      return;
    }

    Log.info('Starting WebSocket server...');

    this.socket = Bun.serve<WebSocketData>({
      hostname: ParadiseService.Instance.ServiceSettings.Hostname ?? '0.0.0.0',
      port: this.port,
      fetch: (req, server) =>
        server.upgrade(req, {
          data: {
            socketId: crypto.randomUUID()
          }
        })
          ? undefined
          : new Response(null, { status: status.BAD_REQUEST }),
      websocket: {
        open: (ws) => {
          Log.debug(`[Socket] new ws connection from ${ws.remoteAddress}`);

          const socketClient = new WebSocketConnection({
            ConnectionId: ws.data.socketId,
            Socket: ws,
            Info: new WebSocketInfo({
              IsClient: true
            })
          });

          this.connectedSockets[socketClient.ConnectionId] = socketClient;

          socketClient.sendPacket(PacketType.MagicBytes);
        },
        message: async (ws, message) => {
          if (Object.keys(this.connectedSockets).includes(ws.data.socketId)) {
            const socketClient = this.connectedSockets[ws.data.socketId]!;
            const inputBytes = [...(message as Buffer)];

            Log.debug(`[Socket] received ${message.length} bytes from client at ${socketClient.remoteAddress}`);
            Log.debug(Array.from(inputBytes, (byte) => byte).join(','));

            const payloadType = EnumProxy.Deserialize<PayloadType>(inputBytes);

            if (payloadType === PayloadType.Raw) {
              const packetType = EnumProxy.Deserialize<PacketType>(inputBytes);

              switch (packetType) {
                case PacketType.MagicBytes: {
                  const magicBytes = ArrayProxy.Deserialize<number>(inputBytes, ByteProxy.Deserialize);

                  if (
                    magicBytes.length !== MAGIC_BYTES.length ||
                    ![...magicBytes].reverse().every((val, index) => val === MAGIC_BYTES[index])
                  ) {
                    ws.close();
                    delete this.connectedSockets[ws.data.socketId];

                    Log.debug('[Socket] client sent invalid magic byte packet');
                    break;
                  }

                  socketClient.sendPacket(PacketType.ClientInfo);

                  break;
                }
                case PacketType.Pong:
                  socketClient.resetPingTimeout();
                  break;
                default:
                  Log.debug(`[Socket] client sent unknown packet of type ${PacketType[packetType]}(${packetType})`);
                  break;
              }
            } else if (payloadType === PayloadType.Serialized) {
              const [payloadObj, packetType, oneWay, conversationId] =
                PacketCodec.decode(inputBytes, socketClient.CryptoProvider) ?? [];

              if (!payloadObj || !conversationId) return;

              switch (packetType) {
                case PacketType.ClientInfo: {
                  const clientInfo = payloadObj! as WebSocketInfo;

                  socketClient.Info = clientInfo;
                  socketClient.Info.IsClient = true;

                  const photonServer = await PhotonServer.findOne({
                    where: {
                      Guid: socketClient.identifier
                    }
                  });

                  if (!photonServer)
                    return this.rejectConnection(socketClient, clientInfo, 'Unknown server', conversationId);

                  switch (clientInfo.Type) {
                    case ServerType.Comm:
                      if (this.commServer) {
                        return this.rejectConnection(
                          socketClient,
                          clientInfo,
                          'Cannot register more than one Comm Server',
                          conversationId
                        );
                      }

                      this.commServer = socketClient;

                      break;
                    case ServerType.Game:
                      if (Object.keys(this.gameServers).find((identifier) => identifier === socketClient.identifier)) {
                        return this.rejectConnection(
                          socketClient,
                          clientInfo,
                          'Duplicate server identifier',
                          conversationId
                        );
                      }

                      this.gameServers[socketClient.identifier] = socketClient;

                      break;
                    default:
                      return this.rejectConnection(socketClient, clientInfo, 'Invalid server type', conversationId);
                  }

                  this.connectedSockets[socketClient.ConnectionId] = socketClient;

                  const uuidByteArray = [...Buffer.from(socketClient.Info.SocketId.replaceAll('-', ''), 'hex')];
                  const uuidBytes = Buffer.from(
                    uuidByteArray
                      .slice(0, 4)
                      .reverse()
                      .concat(uuidByteArray.slice(4, 6).reverse())
                      .concat(uuidByteArray.slice(6, 8).reverse())
                      .concat(uuidByteArray.slice(8))
                  );

                  const cryptoProvider = new RijndaelCryptoProvider(
                    Buffer.from(photonServer.Passphrase, 'utf-8'),
                    uuidBytes,
                    uuidBytes
                  );

                  this.CryptoProviders[socketClient.ConnectionId] = cryptoProvider;
                  socketClient.CryptoProvider = cryptoProvider;

                  await this.acceptConnection(socketClient, conversationId);
                  socketClient.onOpen();

                  break;
                }
                default:
                  break;
              }

              this.emit(
                'DataReceived',
                new WebSocketDataReceivedEventArgs({
                  Socket: socketClient,
                  Type: packetType,
                  Data: payloadObj,
                  ConversationId: conversationId,
                  ServerType: socketClient.Info.Type
                })
              );
            }
          }
        },
        close: (ws) => {
          try {
            if (Object.keys(this.connectedSockets).includes(ws.data.socketId)) {
              const socketClient = this.connectedSockets[ws.data.socketId]!;
              socketClient.onClose();

              delete this.connectedSockets[ws.data.socketId];

              switch (socketClient.type) {
                case ServerType.Comm:
                  if (this.commServer && this.commServer.identifier === socketClient.identifier) {
                    this.commServer = undefined;
                  }
                  break;
                case ServerType.Game:
                  if (Object.keys(this.gameServers).includes(socketClient.identifier)) {
                    delete this.gameServers[socketClient.identifier];
                  }
                  break;
                default:
                  break;
              }

              if (Object.keys(this.CryptoProviders).includes(socketClient.identifier)) {
                delete this.CryptoProviders[socketClient.identifier];
              }

              this.emit(
                'ClientDisconnected',
                new WebSocketDisconnectedEventArgs({
                  Info: socketClient.Info,
                  Socket: socketClient,
                  Reason: socketClient.DisconnectReason
                })
              );

              ws.close();

              Log.debug(`[Socket] ws connection closed from ${ws.remoteAddress}`);
            }
          } catch (e: any) {
            Log.error(e);
          }
        }
      }
    });

    Log.info(`WebSocket server listening on ${this.socket.hostname}:${this.socket.port}`);
  }

  async stop(): Promise<void> {
    if (!this.socket) {
      return;
    }

    Log.info('Stopping WebSocket server...');

    await this.socket?.stop(true);
    this.socket = undefined;
  }

  // #region Send
  async sendToCommServer(
    type: PacketType,
    payload: any,
    oneWay: boolean = true,
    conversationId?: string
  ): Promise<any> {
    if (!this.commServer) return null;

    const r = await this.commServer.send(type, payload, oneWay, conversationId);
    return r;
  }

  async sendToGameServer(
    guid: string,
    type: PacketType,
    payload: any,
    oneWay: boolean = true,
    conversationId?: string
  ): Promise<any> {
    const gameServer = this.gameServers[guid];

    if (!gameServer) return null;

    const r = await gameServer.send(type, payload, oneWay, conversationId);
    return r;
  }

  async sendToGameServers(type: PacketType, payload: any): Promise<void> {
    // Sending to multiple game servers is one-way only

    for (const [id, server] of Object.entries(this.gameServers)) {
      server.send(type, payload, true);
    }
  }
  // #endregion

  // #region
  async acceptConnection(socketClient: WebSocketConnection, conversationId: string) {
    this.emit(
      'ClientConnected',
      new WebSocketConnectedEventArgs({
        Socket: socketClient
      })
    );

    await socketClient.send(
      PacketType.ConnectionStatus,
      new WebSocketConnectionStatus({
        Connected: true
      }),
      true,
      conversationId
    );
  }

  async rejectConnection(
    socketClient: WebSocketConnection,
    clientInfo: WebSocketInfo,
    disconnectReason: string,
    conversationId: string
  ) {
    socketClient.DisconnectReason = disconnectReason;

    this.emit(
      'ConnectionRejected',
      new WebSocketConnectionRejectedEventArgs({
        Info: clientInfo,
        Socket: socketClient,
        Reason: disconnectReason
      })
    );

    await socketClient.send(
      PacketType.ConnectionStatus,
      new WebSocketConnectionStatus({
        Connected: false,
        Rejected: true,
        DisconnectReason: disconnectReason
      }),
      true,
      conversationId
    );
  }
  // #endregion
}
