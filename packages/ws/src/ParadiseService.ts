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

import {
  ActivePlayer,
  ApplicationConfiguration,
  GameRoom,
  PhotonServer,
  PublicProfile
} from '@festivaldev/paradise-models';
import { formatDuration, intervalToDuration } from 'date-fns';
import readline, { type Interface } from 'readline';
import { MoreThan } from 'typeorm';
import util from 'util';
import { CommandHandler, ConsoleHelper } from './console';
import { createDataSource } from './Database';
import DiscordClient from './discord/DiscordClient';
import { ParadiseServiceSettings } from './ParadiseServiceSettings';
import { FileServerHost } from './services/file-server';
import PipeClient from './services/pipe/PipeClient';
import PipeServer from './services/pipe/PipeServer';
import {
  ServerType,
  WebSocketCommand,
  WebSocketConnectedEventArgs,
  WebSocketConnectionRejectedEventArgs,
  WebSocketDataReceivedEventArgs,
  WebSocketDisconnectedEventArgs,
  WebSocketHost,
  WebSocketPacketReceivedEventArgs
} from './services/socket';
import { WebServiceHost } from './services/web-services';
import { Log, XpPointsUtil } from './utils';
import GameSessionManager from './utils/GameSessionManager';
import { PacketType } from './utils/PacketCodec';

export default class ParadiseService {
  private static instance: ParadiseService;

  static get Instance(): ParadiseService {
    if (!this.instance) this.instance = new this(new ParadiseServiceSettings());

    return this.instance;
  }

  private runApp: boolean = true;
  private startTime: Date;

  ServiceSettings: ParadiseServiceSettings;
  SessionManager: GameSessionManager;

  private webServiceHost: WebServiceHost;
  private fileServerHost: FileServerHost;
  private pipeServer: PipeServer;

  private pipeClient: PipeClient;
  public get PipeClient(): PipeClient {
    return this.pipeClient;
  }

  private discordClient: DiscordClient;
  // private discordClient?: any;

  private socketHost: WebSocketHost;
  public get SocketHost(): WebSocketHost {
    return this.socketHost;
  }

  private readlineInterface: Interface;
  public get ReadlineInterface(): Interface {
    return this.readlineInterface;
  }

  private abortController: AbortController | null;
  public get AbortController(): AbortController | null {
    return this.abortController;
  }

  constructor(serviceSettings: ParadiseServiceSettings) {
    this.ServiceSettings = serviceSettings;
    this.SessionManager = new GameSessionManager(serviceSettings.GameplaySettings.GarbageCollectInterval);

    ParadiseService.instance = this;
  }

  async run({ serviceHost = true, prompt = true }: { serviceHost: boolean; prompt: boolean }): Promise<void> {
    this.startTime = new Date();

    ConsoleHelper.printConsoleHeader();

    Log.debug(`Using environment: ${Bun.env.NODE_ENV || 'development'}`);

    // #region Database Configuration
    try {
      Log.info('Connecting to database...');

      const dataSource = createDataSource(this.ServiceSettings.DatabaseSettings);

      try {
        await dataSource.initialize();
        // await dataSource.synchronize();
      } catch (error: any) {
        Log.error('Error while initializing database', error);
        process.exit(0);
      }

      Log.info('Database connected.');

      try {
        await ApplicationConfiguration.find();
      } catch {
        Log.fatal(
          `Database is not set up correctly. Please run "Paradise.WebServices${process.platform === 'win32' ? '.exe' : ''} seed" and try again.`
        );

        process.exit(1);
      }

      if (serviceHost) {
        Log.debug('Clearing stale profiles');
        await PublicProfile.delete({
          Name: '',
          Cmid: MoreThan(0)
        });

        Log.debug('Clearing active players');
        await ActivePlayer.clear();

        Log.debug('Clearing game rooms');
        await GameRoom.delete({
          IsPermanentGame: false
        });
      }
    } catch (error: any) {
      Log.fatal('Error while connecting to the database', error);
      process.exit(1);
    }
    // #endregion

    XpPointsUtil.Initialize();

    if (serviceHost) {
      // #region Web Service Host
      this.webServiceHost = new WebServiceHost(+this.ServiceSettings.WebServicePort);

      try {
        await this.webServiceHost.start();
      } catch (error: any) {
        Log.error(`Failed to start Web Service server. Is port ${this.webServiceHost.port} already in use?`);
      }
      // #endregion

      // #region File Server Host
      this.fileServerHost = new FileServerHost(+this.ServiceSettings.FileServerPort);

      try {
        await this.fileServerHost.start();
      } catch (error: any) {
        Log.error(`Failed to start File server. Is port ${this.fileServerHost.port} already in use?`);
      }
      // #endregion

      // #region Pipe Server
      this.pipeServer = new PipeServer();

      this.pipeServer.on('data', (e) => {
        Log.debug({ type: e.Type, typeName: PacketType[e.Type], data: e.Data });

        switch (e.Type) {
          case PacketType.OpenRoom:
            if (e.TargetSocketType !== ServerType.Game) return;
            this.socketHost.sendToGameServer(e.SocketId, PacketType.OpenRoom, e.Data);
            break;
          case PacketType.CloseRoom:
            if (e.TargetSocketType !== ServerType.Game) return;
            this.socketHost.sendToGameServer(e.SocketId, PacketType.CloseRoom, e.Data);
            break;
          case PacketType.BanPlayer:
            if (e.TargetSocketType !== ServerType.Comm) return;
            this.socketHost.sendToCommServer(PacketType.BanPlayer, e.Data);
            break;
          default:
            break;
        }
      });

      try {
        await this.pipeServer.start();
      } catch (error: any) {
        Log.error(`Failed to start Pipe server`, error);
      }
      // #endregion

      // #region Discord Bot
      if (this.ServiceSettings.DiscordSettings.Enabled) {
        this.discordClient = new DiscordClient();
        await this.discordClient.connect();

        if (!this.discordClient.isConnected) {
          this.discordClient = undefined as any;
        }
      }
      // #endregion

      // #region Web Socket
      this.socketHost = new WebSocketHost(+this.ServiceSettings.SocketPort);

      this.socketHost.on('ConnectionRejected', (e: WebSocketConnectionRejectedEventArgs) => {
        Log.warn(
          `[Socket] Rejecting ${ServerType[e.Socket.type]}Server(${e.Socket.identifier}) from ${e.Socket.remoteAddress}. Reason: ${e.Reason}`
        );
      });

      this.socketHost.on('ClientConnected', (e: WebSocketConnectedEventArgs) => {
        Log.info(
          `[Socket] ${ServerType[e.Socket.type]}Server(${e.Socket.identifier}) connected from ${e.Socket.remoteAddress}.`
        );
      });

      this.socketHost.on('ClientDisconnected', (e: WebSocketDisconnectedEventArgs) => {
        if (!e.Socket.identifier) return;

        Log.info(
          `[Socket] ${ServerType[e.Socket.type]}Server(${e.Socket.identifier}) disconnected. Reason: ${e.Reason ?? 'Connection closed'}`
        );
      });

      this.socketHost.on('PacketReceived', async (e: WebSocketPacketReceivedEventArgs) => {
        switch (e.PacketType) {
          case PacketType.Pong:
            try {
              await PhotonServer.update(e.Socket.Info.PhotonId, {
                LastResponseTime: e.Socket.LastResponseTime
              });
            } catch (error) {
              Log.error(
                `Failed to update LastResponseTime for Photon server with id ${e.Socket.Info.PhotonId}: No database entry`
              );
            }

            break;
          default:
            break;
        }
      });

      this.socketHost.on('DataReceived', async (e: WebSocketDataReceivedEventArgs) => {
        Log.debug({ type: e.Type, typeName: PacketType[e.Type], data: e.Data });

        switch (e.Type) {
          case PacketType.Command: {
            const cmd = e.Data as WebSocketCommand;

            switch (cmd.Command) {
              case 'link': {
                if (await this.discordClient?.isMemberLinked(cmd.Invoker.Cmid)) {
                  e.Socket.send(
                    PacketType.CommandOutput,
                    'Your profile has already been linked to Discord.',
                    true,
                    e.ConversationId
                  );
                  return;
                }

                const nonce = await this.discordClient?.beginLinkMember(cmd.Invoker.Cmid);
                e.Socket.send(
                  PacketType.CommandOutput,
                  `Your Discord link code is: ${nonce}.\nPlease send a DM to the Paradise Discord bot containing this code to complete the process.`,
                  true,
                  e.ConversationId
                );
                break;
              }
              default:
                await CommandHandler.handleCommand(
                  cmd.Command,
                  cmd.Arguments,
                  e.ConversationId,
                  undefined,
                  async (invoker) => {
                    await e.Socket.send(
                      PacketType.CommandOutput,
                      util.stripVTControlCharacters(invoker.output),
                      true,
                      e.ConversationId
                    );
                  },
                  async (invoker, error) => {
                    await e.Socket.send(
                      PacketType.CommandOutput,
                      util.stripVTControlCharacters(`${error ?? invoker?.output}`),
                      true,
                      e.ConversationId
                    );
                  },
                  cmd.Invoker
                );
                break;
            }

            break;
          }
          // Gets called once on WebSocket connection in case the service gets restarted
          case PacketType.ListPeers:
            for (const peer of e.Data) {
              await ActivePlayer.upsert(
                {
                  Cmid: peer.Cmid,
                  IPAddress: peer.RemoteIPAddress,
                  Channel: peer.Channel,
                  CommServerId: e.ServerType === ServerType.Comm ? e.Socket.Info.PhotonId : undefined,
                  GameServerId: e.ServerType === ServerType.Game ? e.Socket.Info.PhotonId : undefined
                },
                ['Cmid']
              );
            }

            break;
          // Gets called once on WebSocket connection in case the service gets restarted
          // Links existing game rooms to possibly existing Discord channels
          // Permanent game do not have Discord channels (yet? // TODO)
          case PacketType.ListRooms:
            for (const room of e.Data) {
              const [channelId, webhookUrl] = (await this.discordClient?.findOrCreateGameRoom(room)) || [null, null];

              await GameRoom.upsert(
                {
                  ...room,
                  PhotonServerId: e.Socket.Info.PhotonId,
                  ChannelId: channelId,
                  WebhookUrl: webhookUrl
                },
                ['Number']
              );
            }

            break;
          case PacketType.ChatMessage:
            await this.discordClient?.sendLobbyChatMessage(e.Data);

            break;
          case PacketType.RoomChatMessage: {
            const [message, roomInfo] = e.Data;

            this.discordClient?.sendGameRoomMessage(message, roomInfo);

            break;
          }
          case PacketType.PlayerJoined:
            await Promise.all([
              ActivePlayer.upsert(
                {
                  Cmid: e.Data.Cmid,
                  IPAddress: e.Data.RemoteIPAddress,
                  Channel: e.Data.Channel,
                  CommServerId: e.ServerType === ServerType.Comm ? e.Socket.Info.PhotonId : undefined,
                  GameServerId: e.ServerType === ServerType.Game ? e.Socket.Info.PhotonId : undefined
                },
                ['Cmid']
              ),
              this.discordClient?.sendPlayerJoinMessage(e.Data)
            ]);

            break;
          case PacketType.PlayerLeft:
            await Promise.all([
              e.ServerType === ServerType.Comm && ActivePlayer.delete(e.Data.Cmid),
              e.ServerType === ServerType.Game && ActivePlayer.update(e.Data.Cmid, { GameServerId: null }),
              this.discordClient?.sendPlayerLeftMessage(e.Data)
            ]);

            break;
          case PacketType.RoomOpened: {
            const [_, [channelId, webhookUrl] = [null, null]] = await Promise.all([
              GameRoom.insert({
                ...e.Data,
                Password: e.Data.IsPermanentGame ? e.Data.Password : undefined,
                PhotonServerId: e.Socket.Info.PhotonId
              }),
              this.discordClient?.findOrCreateGameRoom(e.Data),
              this.discordClient?.sendGameRoomCreatedMessage(e.Data)
            ]);

            if (channelId || webhookUrl) {
              await GameRoom.update(e.Data.Number, {
                ChannelId: channelId,
                WebhookUrl: webhookUrl
              });
            }

            break;
          }
          case PacketType.RoomClosed:
            await ActivePlayer.update({ GameRoomId: e.Data.Number }, { GameRoomId: null });

            await Promise.all([
              GameRoom.delete(e.Data.Number),
              this.discordClient?.sendGameRoomDestroyedMessage(e.Data),
              this.discordClient?.destroyGameRoom(e.Data)
            ]);

            break;
          case PacketType.PlayerJoinedRoom: {
            const [playerInfo, roomInfo] = e.Data;

            await Promise.all([
              ActivePlayer.upsert(
                {
                  Cmid: playerInfo.Cmid,
                  Channel: playerInfo.Channel,
                  GameServerId: e.Socket.Info.PhotonId,
                  GameRoomId: roomInfo.Number
                },
                ['Cmid']
              ),
              this.discordClient?.sendPlayerJoinedRoomMessage(playerInfo, roomInfo),
              this.discordClient?.grantRoomPermissions(playerInfo, roomInfo)
            ]);

            break;
          }
          case PacketType.PlayerLeftRoom: {
            const [playerInfo, roomInfo] = e.Data;

            await Promise.all([
              ActivePlayer.update(playerInfo.Cmid, { GameRoomId: null }),
              this.discordClient?.sendPlayerLeftRoomMessage(playerInfo, roomInfo),
              this.discordClient?.revokeRoomPermissions(playerInfo, roomInfo)
            ]);

            break;
          }
          case PacketType.RoundStarted:
            await this.discordClient?.sendRoundStartedMessage(e.Data);

            break;
          case PacketType.RoundEnded: {
            const [roomInfo, matchEndData, playerStatistics] = e.Data;

            await this.discordClient?.sendRoundEndedMessage(roomInfo, matchEndData, playerStatistics);

            break;
          }
          default:
            break;
        }
      });

      try {
        this.socketHost.start();
      } catch (error: any) {
        Log.error(`Failed to start WebSocket server. Is port ${this.socketHost.port} already in use?`);
      }
      // #endregion
    } else {
      this.pipeClient = new PipeClient();

      try {
        await this.pipeClient.connect();
      } catch (error: any) {
        Log.error(`Failed to connect to pipe at ${PipeServer.SOCKET_PATH}`, error);
        process.exit(1);
      }
    }

    if (prompt) {
      ConsoleHelper.printConsoleHeaderSubtitle();

      this.prompt();
    }
  }

  async teardown(): Promise<void> {
    this.runApp = false;

    this.webServiceHost?.stop();
    this.fileServerHost?.stop();
    this.pipeServer?.stop();
    this.discordClient?.disconnect();
    await this.socketHost?.stop();

    const runDuration = formatDuration(
      intervalToDuration({
        start: this.startTime,
        end: new Date()
      }),
      {
        delimiter: ', '
      }
    );

    Log.debug(`Server ran for ${runDuration || '0 seconds'}.`);
    process.stdout.write('\n');

    console.log('Bye.');
    setTimeout(() => {
      process.exit(0);
    }, 500);
  }

  private async prompt(): Promise<void> {
    this.readlineInterface = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    this.readlineInterface.on('SIGINT', () => {
      process.stdout.write('^C');

      if ((this.abortController && !this.abortController.signal.aborted) || this.readlineInterface.line.length) {
        this.abortController?.abort();

        if (this.readlineInterface.line.length) process.stdout.write('\n');

        this.readlineInterface.close();
        this.readlineInterface.removeAllListeners();

        // if (this.runApp) this.prompt();
      } else {
        this.readlineInterface.close();
        process.stdout.write('\n');

        this.teardown();
      }
    });

    this.readlineInterface?.question('> ', async (cmd) => {
      this.abortController = new AbortController();

      const args = CommandHandler.parseInput(cmd);
      if (args.length > 0) {
        await CommandHandler.handleCommand(
          args[0]!,
          args.slice(1),
          undefined,
          (output, inline) => {
            if (inline) {
              process.stdout.write(output);
            } else {
              console.log(output);
            }
          },
          (_) => {},
          (_, error) => {
            if (error) {
              console.error(error);
            }
          }
        );
      }

      this.readlineInterface.close();
      this.readlineInterface.removeAllListeners();

      this.abortController = null;

      if (this.runApp) this.prompt();
    });
  }
}
