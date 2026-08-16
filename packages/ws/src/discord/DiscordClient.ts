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

import { CommandHandler } from '@/console';
import ParadiseService from '@/ParadiseService';
import { RealtimeError, WebSocketChatMessage } from '@/services/socket';
import { Log } from '@/utils';
import { PacketType } from '@/utils/PacketCodec';
import { DiscordUser, GameRoom, Map, PublicProfile } from '@festivaldev/paradise-models';
import { GAME_FLAGS } from '@festivaldev/uberstrike-js';
import { MemberAccessLevel } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import {
  AchievementType,
  StatsCollection,
  type CommActorInfo,
  type EndOfMatchData,
  type GameActorInfo,
  type GameRoomData
} from '@festivaldev/uberstrike-js/UberStrike/Core/Models';
import { GameModeType } from '@festivaldev/uberstrike-js/UberStrike/Core/Types';
import chalk from 'chalk';
import Table from 'cli-table';
import crypto from 'crypto';
import { formatDuration, intervalToDuration } from 'date-fns';
import {
  ActivityType,
  CategoryChannel,
  ChannelType,
  Client,
  Colors,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  GuildMember,
  Message,
  Partials,
  WebhookClient,
  type TextChannel
} from 'discord.js';
import { In, IsNull, MoreThan, Not } from 'typeorm';
import util from 'util';
import type DiscordSettings from './DiscordSettings';

export default class DiscordClient {
  private discordSettings: DiscordSettings;
  private discordClient: Client;

  private lobbyChatClient?: WebhookClient;
  private playerAnnouncementClient?: WebhookClient;
  private gameRoomAnnouncementClient?: WebhookClient;
  private errorLogClient?: WebhookClient;

  private roomChatChannels: { [key: string]: TextChannel } = {};
  private roomChatClients: { [key: string]: WebhookClient } = {};
  private roomChatCreationPromises: { [key: string]: any } = {};
  private roomChatMap: { [key: string]: number } = {};

  async connect(): Promise<void> {
    if (this.discordClient) return;

    this.discordSettings = ParadiseService.Instance.ServiceSettings.DiscordSettings;

    const botToken = this.discordSettings.BotToken?.trim();
    if (!botToken) {
      Log.warn('Discord integration is enabled but no bot token is configured. Skipping...');
      return;
    }

    Log.info('Connecting to Discord...');

    this.discordClient = new Client({
      intents: [
        // #region AllUnprivileged
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildExpressions,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.AutoModerationConfiguration,
        GatewayIntentBits.AutoModerationExecution,
        // #endregion
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
      ],
      partials: [Partials.Channel, Partials.Message]
    });

    const loginPromise = new Promise<void>((resolve, reject) => {
      this.discordClient.once(Events.ClientReady, (e) => {
        this.onReady(e);

        resolve();
      });

      this.discordClient.once(Events.Error, reject);
    });

    this.discordClient.on(Events.MessageCreate, this.onMessageCreate.bind(this));

    try {
      await this.discordClient.login(botToken);
      await loginPromise;
    } catch (error: any) {
      Log.error('Failed to connect to Discord.');
      Log.error(error);

      try {
        await this.discordClient.destroy();
      } catch {}

      this.discordClient = undefined as any;

      return;
    }

    if (this.discordSettings.Integrations.LobbyChat && this.discordSettings.WebHooks.LobbyChat?.trim().length) {
      this.lobbyChatClient = new WebhookClient({ url: this.discordSettings.WebHooks.LobbyChat });
    }

    if (
      (this.discordSettings.Integrations.PlayerJoinAnnouncements ||
        this.discordSettings.Integrations.PlayerLeaveAnnouncements) &&
      this.discordSettings.WebHooks.PlayerAnnouncements?.trim().length
    ) {
      this.playerAnnouncementClient = new WebhookClient({ url: this.discordSettings.WebHooks.PlayerAnnouncements });
    }

    if (
      (this.discordSettings.Integrations.RoomOpenAnnouncements ||
        this.discordSettings.Integrations.RoomCloseAnnouncements) &&
      this.discordSettings.WebHooks.RoomAnnouncements?.trim().length
    ) {
      this.gameRoomAnnouncementClient = new WebhookClient({ url: this.discordSettings.WebHooks.RoomAnnouncements });
    }

    if (this.discordSettings.Integrations.ErrorLog && this.discordSettings.WebHooks.ErrorLog?.trim().length) {
      this.errorLogClient = new WebhookClient({ url: this.discordSettings.WebHooks.ErrorLog });
    }
  }

  get isConnected(): boolean {
    return !!this.discordClient?.isReady();
  }

  async disconnect(): Promise<void> {
    await this.discordClient.user?.setStatus('invisible');
  }

  // #region Callbacks
  private async onReady(readyClient: Client<boolean>): Promise<void> {
    Log.info(`Connected to Discord as "${readyClient.user?.tag}".`);
    await readyClient.user!.setPresence({
      activities: [
        {
          name: 'Paradise Web Services',
          type: ActivityType.Playing
        }
      ],
      status: 'online'
    });
  }

  private async onMessageCreate(message: Message): Promise<void> {
    if (message.author.bot || message.webhookId) return;

    if (message.channel.isDMBased()) {
      let discordUser = await this.getDiscordUserFromDiscordId(message.author.id);

      if (discordUser) {
        await message.reply('Your Discord profile has already been linked to UberStrike.');
        return;
      }

      discordUser = await DiscordUser.findOne({ where: { Nonce: message.cleanContent } });

      if (!discordUser) {
        await message.reply(
          'Your Discord profile could not be linked to UberStrike.\nPlease make sure to enter a valid link code.'
        );
        return;
      }

      try {
        DiscordUser.update(discordUser.Cmid, {
          DiscordUserId: message.author.id,
          Nonce: null,
          Completed: true
        });

        await message.reply('Your Discord profile has been successfully linked to UberStrike!');
      } catch (error: any) {
        await message.reply(`Failed to link your Discord profile to UberStrike: ${error.message}`);
      }
    } else if (message.channel.isTextBased()) {
      if (
        this.discordSettings.Integrations.Commands &&
        this.discordSettings.CommandPrefix &&
        message.channel.id === this.discordSettings.CommandChannelId &&
        message.cleanContent.startsWith(this.discordSettings.CommandPrefix) &&
        message.cleanContent.length > this.discordSettings.CommandPrefix.length
      ) {
        const discordUser = await this.getDiscordUserFromDiscordId(message.author.id);

        if (!discordUser) {
          await message.reply(
            'Please link your Discord profile to UberStrike using `?link` in the ingame Lobby chat in order to execute commands.'
          );
          return;
        }

        const publicProfile = await PublicProfile.findOne({ where: { Cmid: discordUser.Cmid } });

        if (!publicProfile || publicProfile.AccessLevel === MemberAccessLevel.Default) {
          // await message.reply('You're not allowed to run commands.');
          return;
        }

        const cmd = message.cleanContent.substring(this.discordSettings.CommandPrefix.length);
        const args = CommandHandler.parseInput(cmd);

        if (args.length > 0) {
          switch (args[0]!.toLocaleLowerCase()) {
            case 'clear':
            case 'c': {
              await message.reply('Working on it...');

              let messages = await message.channel.bulkDelete(100);

              while (messages.size > 0) {
                messages = await message.channel.bulkDelete(100);
              }
              break;
            }
            case 'help':
            case 'h':
              this.printDiscordHelp(message, args.slice(1));
              break;
            default: {
              const isBlacklisted = !!CommandHandler.discordCommandBlacklist.find(
                (command) => command.command === args[0]! || command.aliases.includes(args[0]!)
              );

              if (isBlacklisted) {
                Log.debug(`Attempting to execute blacklisted command "${args[0]}" via Discord`);
                break;
              }

              await CommandHandler.handleCommand(
                args[0]!,
                args.slice(1),
                message.id,
                undefined,
                async (invoker) => {
                  await message.reply(util.stripVTControlCharacters(`\`\`\`${invoker.output}\`\`\``));
                },
                async (invoker, error) => {
                  await message.reply(util.stripVTControlCharacters(`\`\`\`❗ ${error ?? invoker?.output}\`\`\``));
                },
                publicProfile
              );
              break;
            }
          }
        }
      } else if (
        this.discordSettings.Integrations.LobbyChat &&
        message.channel.id === this.discordSettings.ChatChannelId
      ) {
        const discordUser = await this.getDiscordUserFromDiscordId(message.author.id);

        if (!discordUser) {
          await message.reply(
            'Your message could not be delivered to the Lobby chat.\nPlease link your Discord profile to UberStrike using `?link` in the ingame Lobby chat.'
          );
          return;
        }

        const publicProfile = await PublicProfile.findOne({ where: { Cmid: discordUser.Cmid } });

        await ParadiseService.Instance.SocketHost.sendToCommServer(
          PacketType.ChatMessage,
          new WebSocketChatMessage({
            Cmid: discordUser.Cmid,
            Name: `[Discord] ${publicProfile?.Name || message.author.displayName}`,
            Message: message.cleanContent
          })
        );
      } else if (this.roomChatMap[message.channel.id]) {
        const discordUser = await this.getDiscordUserFromDiscordId(message.author.id);

        if (!discordUser) {
          await message.reply(
            'Your message could not be delivered to the game chat.\nPlease link your Discord profile to UberStrike using `?link` in the ingame Lobby chat.'
          );
          return;
        }

        const publicProfile = await PublicProfile.findOne({ where: { Cmid: discordUser.Cmid } });

        const room = await GameRoom.findOne({
          where: { Number: this.roomChatMap[message.channel.id] },
          relations: { PhotonServer: true }
        });
        if (!room) {
          await message.reply(
            'Your message could not be delivered to the game chat.\nThis room does not exist anymore.'
          );
          return;
        }

        if (!room.PhotonServer) return;

        await ParadiseService.Instance.SocketHost.sendToGameServer(
          room.PhotonServer.Guid!,
          PacketType.ChatMessage,
          new WebSocketChatMessage({
            Cmid: discordUser.Cmid,
            Name: `[Discord] ${publicProfile?.Name || message.author.displayName}`,
            Message: message.cleanContent,
            RoomNumber: room.Number
          })
        );
      }
    }
  }
  // #endregion

  // #region Messages
  async logError(error: Error | RealtimeError): Promise<void> {
    if (!this.discordSettings.Integrations.ErrorLog) return;

    if (error instanceof Error) {
      await this.errorLogClient?.send({
        avatarURL: this.discordClient.user!.avatarURL() ?? undefined,
        username: 'UberStrike',
        content: `\`\`\`${error.message}\r\n${error.stack}\`\`\``
      });
    } else if (error instanceof RealtimeError) {
      await this.errorLogClient?.send({
        avatarURL: this.discordClient.user!.avatarURL() ?? undefined,
        username: 'UberStrike',
        content: `\`\`\`${error.ExceptionType}: ${error.Message}\r\n${error.StackTrace}\`\`\``
      });
    }
  }

  async sendLobbyChatMessage(message: WebSocketChatMessage): Promise<void> {
    if (!this.discordSettings.Integrations.LobbyChat) return;
    if (!this.discordSettings.ChatChannelId) return;

    await this.lobbyChatClient?.send({
      avatarURL: await this.getUserAvatarURL(message.Cmid),
      username: `[Lobby] ${(await this.getUserDisplayName(message.Cmid)) ?? message.Name}`,
      content: message.Message.replace(/(_|\*|~|`|\||\\)/g, '\\$1')
    });
  }

  async sendGameRoomMessage(message: WebSocketChatMessage, metadata: GameRoomData): Promise<void> {
    if (!this.discordSettings.Integrations.RoomChats) return;

    if (this.roomChatCreationPromises[metadata.Number]) {
      await this.roomChatCreationPromises[metadata.Number];
    }

    if (!this.roomChatChannels[metadata.Number] || !this.roomChatClients[metadata.Number]) return;

    await this.roomChatClients[metadata.Number]?.send({
      avatarURL: await this.getUserAvatarURL(message.Cmid),
      username: `[Game] ${(await this.getUserDisplayName(message.Cmid)) ?? message.Name}`,
      content: message.Message.replace(/(_|\*|~|`|\||\\)/g, '\\$1')
    });
  }

  async sendPlayerJoinMessage(player: CommActorInfo): Promise<void> {
    if (!this.discordSettings.Integrations.PlayerJoinAnnouncements) return;
    if (this.discordSettings.AnnouncementBlacklist.includes(player.Cmid.toString())) return;

    const publicProfile = await PublicProfile.findOne({
      where: {
        Cmid: player.Cmid
      },
      relations: {
        SteamMember: true
      }
    });

    if (!publicProfile || !publicProfile.SteamMember) return;

    const embed = new EmbedBuilder({
      title: 'Player connected',
      description: `${(await this.getUserDisplayName(player.Cmid)) ?? publicProfile.Name} has joined the game.`,
      color: Colors.Green
    });

    embed.addFields(
      { name: 'Ingame Name', value: publicProfile.Name, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: 'CMID', value: player.Cmid.toString(), inline: true },
      { name: 'SteamID64', value: publicProfile.SteamMember.SteamId.toString(), inline: false },
      { name: 'Machine ID', value: publicProfile.SteamMember.MachineId ?? '' },
      { name: 'Rank', value: MemberAccessLevel[publicProfile.AccessLevel] }
    );

    try {
      await this.playerAnnouncementClient?.send({
        avatarURL: this.discordClient.user!.avatarURL() ?? undefined,
        username: 'UberStrike',
        embeds: [embed]
      });
    } catch (error: any) {
      Log.error(error.toString(), error.rawError);
    }
  }

  async sendPlayerLeftMessage(player: CommActorInfo): Promise<void> {
    if (!this.discordSettings.Integrations.PlayerLeaveAnnouncements) return;
    if (this.discordSettings.AnnouncementBlacklist.includes(player.Cmid.toString())) return;

    const publicProfile = await PublicProfile.findOne({
      where: {
        Cmid: player.Cmid
      }
    });

    if (!publicProfile) return;

    const embed = new EmbedBuilder({
      title: 'Player disconnected',
      description: `${(await this.getUserDisplayName(player.Cmid)) ?? publicProfile.Name} has left the game.`,
      color: Colors.Red
    });

    try {
      await this.playerAnnouncementClient?.send({
        avatarURL: this.discordClient.user!.avatarURL() ?? undefined,
        username: 'UberStrike',
        embeds: [embed]
      });
    } catch (error: any) {
      Log.error(error.toString(), error.rawError);
    }
  }

  async sendGameRoomCreatedMessage(metadata: GameRoomData): Promise<void> {
    if (!this.discordSettings.Integrations.RoomOpenAnnouncements) return;

    const mapInfo = await Map.findOne({
      where: {
        MapId: metadata.MapID
      }
    });

    if (!mapInfo) return;

    const embed = new EmbedBuilder({
      title: 'Game Room created',
      image: {
        url: `https://static.paradise.festival.tf/images/maps/${mapInfo?.SceneName.default}.jpg`
      },
      footer: {
        text: `Room ID: ${metadata.Number}`
      }
    });

    embed.addFields(
      { name: 'Room Name', value: metadata.Name },
      { name: 'Map', value: mapInfo.DisplayName, inline: true },
      { name: 'Gamemode', value: DiscordClient.getGamemodeName(metadata.GameMode), inline: true },
      { name: 'Player Limit', value: metadata.PlayerLimit.toString(), inline: true },
      { name: 'Time Limit', value: `${metadata.TimeLimit / 60} min`, inline: true },
      { name: 'Kill/Round Limit', value: metadata.KillLimit.toString(), inline: true },
      { name: 'Game Modifiers', value: DiscordClient.getGameFlags(metadata.GameFlags) },
      { name: 'Requires Password', value: metadata.IsPasswordProtected ? 'Yes' : 'No', inline: true },
      { name: 'Minimum Level', value: metadata.LevelMin > 0 ? metadata.LevelMin.toString() : 'None', inline: true },
      { name: 'Maximum Level', value: metadata.LevelMax > 0 ? metadata.LevelMax.toString() : 'None', inline: true },
      {
        name: 'Join this game',
        value: `\`uberstrike://connect/${metadata.Server.ConnectionString}/${metadata.Number}\``
      }
    );

    try {
      await this.gameRoomAnnouncementClient?.send({
        avatarURL: this.discordClient.user!.avatarURL() ?? undefined,
        username: 'UberStrike',
        embeds: [embed]
      });
    } catch (error: any) {
      Log.error(error.toString(), error.rawError);
    }
  }

  async sendGameRoomDestroyedMessage(metadata: GameRoomData): Promise<void> {
    if (!this.discordSettings.Integrations.RoomCloseAnnouncements) return;

    const embed = new EmbedBuilder({
      title: 'Game Room closed',
      footer: {
        text: `Room ID: ${metadata.Number}`
      }
    });

    try {
      embed.addFields(
        { name: 'Room Name', value: metadata.Name },
        { name: 'Map', value: await this.getDisplayNameForMapID(metadata.MapID), inline: true },
        { name: 'Gamemode', value: DiscordClient.getGamemodeName(metadata.GameMode), inline: true }
      );

      await this.gameRoomAnnouncementClient?.send({
        avatarURL: this.discordClient.user!.avatarURL() ?? undefined,
        username: 'UberStrike',
        embeds: [embed]
      });
    } catch (error: any) {
      Log.error(error.toString(), error.rawError);
    }
  }

  async sendPlayerJoinedRoomMessage(player: GameActorInfo, metadata: GameRoomData): Promise<void> {
    if (!this.discordSettings.Integrations.PlayerJoinedRoomAnnouncements) return;

    if (this.roomChatCreationPromises[metadata.Number]) {
      await this.roomChatCreationPromises[metadata.Number];
    }

    if (!this.roomChatChannels[metadata.Number] || !this.roomChatClients[metadata.Number]) return;

    await this.roomChatClients[metadata.Number]?.send({
      avatarURL: this.discordClient.user!.avatarURL() ?? undefined,
      username: 'UberStrike',
      content: `-# _${(await this.getUserDisplayName(player.Cmid)) ?? player.PlayerName} has joined the room._`
    });
  }

  async sendPlayerLeftRoomMessage(player: GameActorInfo, metadata: GameRoomData): Promise<void> {
    if (!this.discordSettings.Integrations.PlayerLeftRoomAnnouncements) return;

    if (this.roomChatCreationPromises[metadata.Number]) {
      await this.roomChatCreationPromises[metadata.Number];
    }

    if (!this.roomChatChannels[metadata.Number] || !this.roomChatClients[metadata.Number]) return;

    await this.roomChatClients[metadata.Number]?.send({
      avatarURL: this.discordClient.user!.avatarURL() ?? undefined,
      username: 'UberStrike',
      content: `-# _${(await this.getUserDisplayName(player.Cmid)) ?? player.PlayerName} has left the room._`
    });
  }

  async sendRoundStartedMessage(metadata: GameRoomData): Promise<void> {
    if (!this.discordSettings.Integrations.RoundStartAnnouncements) return;

    if (this.roomChatCreationPromises[metadata.Number]) {
      await this.roomChatCreationPromises[metadata.Number];
    }

    if (!this.roomChatChannels[metadata.Number] || !this.roomChatClients[metadata.Number]) return;

    try {
      await this.roomChatClients[metadata.Number]?.send({
        avatarURL: this.discordClient.user!.avatarURL() ?? undefined,
        username: 'UberStrike',
        content: '# Round started\nThe game will start soon.'
      });
    } catch (error: any) {
      Log.error(error.toString(), error.rawError);
    }
  }

  async sendRoundEndedMessage(
    metadata: GameRoomData,
    matchData: EndOfMatchData,
    playerStatistics: { [key: string]: StatsCollection }
  ): Promise<void> {
    if (!this.discordSettings.Integrations.RoundEndAnnouncements) return;

    if (this.roomChatCreationPromises[metadata.Number]) {
      await this.roomChatCreationPromises[metadata.Number];
    }

    if (!this.roomChatChannels[metadata.Number] || !this.roomChatClients[metadata.Number]) return;

    const gameDuration = intervalToDuration({
      start: 0,
      end: matchData.TimeInGameMinutes * 1000
    });

    const players = await PublicProfile.find({
      where: {
        Cmid: In(Object.keys(playerStatistics))
      }
    });

    const playerMap: { [key: string]: string } = players.reduce(
      (acc, cur) => ({
        ...acc,
        [String(cur.Cmid)]: cur.Name
      }),
      {}
    );

    const sortedStatistics = Object.entries(playerStatistics)
      .sort(([, a], [, b]) => b.GetKills() - a.GetKills())
      .slice(0, 5)
      .filter(Boolean);

    const playerTable = new Table({
      head: [
        chalk.white.bold('Player Name'),
        chalk.white.bold('Kills'),
        chalk.white.bold('Deaths'),
        chalk.white.bold('KDR'),
        chalk.white.bold('Shots'),
        chalk.white.bold('Hits'),
        chalk.white.bold('Damage Done'),
        chalk.white.bold('Damage Received')
      ],
      rows: sortedStatistics.map(([cmid, stats]) => [
        playerMap[cmid]!,
        String(stats.GetKills()),
        String(stats.Deaths + stats.Suicides),
        String((stats.GetKills() / Math.max(stats.Deaths + stats.Suicides, 1)).toFixed(2)),
        String(stats.GetShots()),
        String(stats.GetHits()),
        String(stats.GetDamageDealt()),
        String(stats.DamageReceived)
      ])
    });

    const achievements = Object.values(AchievementType)
      .filter((value): value is AchievementType => typeof value === 'number' && value !== AchievementType.None)
      .map((achievement) => {
        const player = matchData.MostValuablePlayers.find((p) => achievement in p.Achievements);

        if (!player) {
          return null;
        }

        return {
          achievement,
          player: player.Name,
          value: player.Achievements[achievement]
        };
      })
      // .filter(Boolean)
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    const achievementTable = new Table({
      rows: achievements.map(({ achievement, player, value }) => [
        DiscordClient.getAchievementName(achievement),
        player,
        String(value)
      ])
    });

    try {
      await this.roomChatClients[metadata.Number]?.send({
        avatarURL: this.discordClient.user!.avatarURL() ?? undefined,
        username: 'UberStrike',
        content: `# Round ended
A round has ended after ${formatDuration(gameDuration)}.
### Top ${Math.min(sortedStatistics.length, 5)} Players
${util.stripVTControlCharacters(`\`\`\`${playerTable.toString()}\`\`\``)}
### Achievements
${util.stripVTControlCharacters(`\`\`\`${achievementTable.toString()}\`\`\``)}`
      });
    } catch (error: any) {
      Log.error(error.toString(), error.rawError);
    }
  }
  // #endregion

  // #region Member Management
  public async isMemberLinked(cmid: number): Promise<boolean> {
    const link = await DiscordUser.findOne({
      where: {
        Cmid: cmid,
        DiscordUserId: Not(IsNull()),
        Completed: true
      }
    });

    return !!link;
  }

  public async beginLinkMember(cmid: number): Promise<string | null> {
    if (await this.isMemberLinked(cmid)) return null;

    let link = await DiscordUser.findOne({
      where: {
        Cmid: cmid,
        Nonce: Not(IsNull()),
        Completed: false
      }
    });

    if (link) return link.Nonce;

    const nonce = crypto.randomBytes(4).toString('hex');
    link = await DiscordUser.save(
      DiscordUser.create({
        Cmid: cmid,
        Nonce: nonce
      })
    );

    return link.Nonce;
  }

  async getDiscordUserFromCmid(cmid: number): Promise<DiscordUser | null> {
    return DiscordUser.findOne({
      where: {
        Cmid: cmid,
        DiscordUserId: Not(IsNull())
      }
    });
  }

  async getDiscordUserFromDiscordId(discordUserId: string): Promise<DiscordUser | null> {
    return DiscordUser.findOne({
      where: {
        Cmid: MoreThan(0),
        DiscordUserId: discordUserId
      }
    });
  }

  async getGuildMemberFromCmid(cmid: number): Promise<GuildMember | null> {
    const discordUser = await this.getDiscordUserFromCmid(cmid);

    if (discordUser && discordUser.DiscordUserId) {
      const guild = await this.discordClient.guilds.fetch(this.discordSettings.GuildId);

      if (!guild) return null;

      return guild.members.fetch(discordUser.DiscordUserId);
    }

    return null;
  }
  // #endregion

  // #region Room Management
  async findOrCreateGameRoom(metadata: GameRoomData): Promise<[string | null, string | null]> {
    if (!this.discordSettings.Integrations.RoomChats) return [null, null];

    let _resolve: Function | undefined;
    this.roomChatCreationPromises[metadata.Number] = new Promise<void>((resolve, reject) => {
      _resolve = resolve;
    });

    const category: CategoryChannel = (await this.discordClient.channels.fetch(
      this.discordSettings.RoomChatCategory
    )) as CategoryChannel;

    if (!category) {
      Log.error(
        `Failed to create a channel for room ${metadata.Number}: No category for id ${this.discordSettings.RoomChatCategory}`
      );
      return [null, null];
    }

    let channel: TextChannel = category.children.cache.find(
      (_) => _.name.localeCompare(`${metadata.Name}-${metadata.Number}`, 'en', { sensitivity: 'base' }) === 0
    ) as TextChannel;

    if (!channel) {
      channel = (await category.children.create({
        name: `${metadata.Name}-${metadata.Number}`,
        type: ChannelType.GuildText
      })) as TextChannel;

      channel.permissionOverwrites.create(
        channel.guild.roles.cache.find((_) => _.name === 'Bot')!,
        {
          ViewChannel: true
        }
      );
      channel.permissionOverwrites.create(channel.guild.roles.everyone, { ViewChannel: false });
    }

    this.roomChatChannels[metadata.Number] = channel;
    this.roomChatMap[channel.id] = metadata.Number;

    let webhook = (await channel.fetchWebhooks())?.first();

    if (!webhook) {
      webhook = await channel.createWebhook({
        name: 'UberStrike',
        avatar: this.discordClient.user!.avatarURL()
      });
    }

    this.roomChatClients[metadata.Number] = new WebhookClient({ id: webhook.id, token: webhook.token! });

    _resolve?.();
    delete this.roomChatCreationPromises[metadata.Number];

    return [channel.id, this.roomChatClients[metadata.Number].url];
  }

  async destroyGameRoom(metadata: GameRoomData): Promise<void> {
    if (!this.discordSettings.Integrations.RoomChats) return;

    await this.roomChatChannels[metadata.Number]?.delete();
    delete this.roomChatChannels[metadata.Number];
    delete this.roomChatClients[metadata.Number];
  }

  async grantRoomPermissions(playerInfo: GameActorInfo, metadata: GameRoomData): Promise<void> {
    if (!this.discordSettings.Integrations.RoomChats) return;

    if (this.roomChatCreationPromises[metadata.Number]) {
      await this.roomChatCreationPromises[metadata.Number];
    }

    const discordUser = await this.getDiscordUserFromCmid(playerInfo.Cmid);
    if (!discordUser || !discordUser.DiscordUserId) return;

    try {
      const discordMember = await this.roomChatChannels[metadata.Number]?.guild.members.fetch(
        discordUser.DiscordUserId
      );
      if (!discordMember) return;

      this.roomChatChannels[metadata.Number]?.permissionOverwrites.create(discordMember, { ViewChannel: true });
    } catch (error: any) {
      Log.error(error.toString(), error.rawError);
    }
  }

  async revokeRoomPermissions(playerInfo: GameActorInfo, metadata: GameRoomData): Promise<void> {
    if (!this.discordSettings.Integrations.RoomChats) return;

    if (this.roomChatCreationPromises[metadata.Number]) {
      await this.roomChatCreationPromises[metadata.Number];
    }

    const discordUser = await DiscordUser.findOne({ where: { Cmid: playerInfo.Cmid } });
    if (!discordUser || !discordUser.DiscordUserId) return;

    try {
      const discordMember = await this.roomChatChannels[metadata.Number]?.guild.members.fetch(
        discordUser.DiscordUserId
      );
      if (!discordMember) return;

      this.roomChatChannels[metadata.Number]?.permissionOverwrites.delete(discordMember);
    } catch (error: any) {
      Log.error(error.toString(), error.rawError);
    }
  }
  // #endregion

  // #region Helpers
  private async printDiscordHelp(message: Message, [command]: string[]) {
    const filteredCommands = CommandHandler.commands.filter(
      (command) => !CommandHandler.discordCommandBlacklist.includes(command)
    );

    const lines = [];

    if (command) {
      const commandObj = filteredCommands.find(
        (_) =>
          _.command.localeCompare(command, undefined, { sensitivity: 'base' }) === 0 ||
          _.aliases.some((_) => _.localeCompare(command, undefined, { sensitivity: 'base' }) === 0)
      );
      if (commandObj) {
        for (const line of commandObj.usageText) {
          lines.push(line);
        }
      }
    } else {
      const cmdLength = Math.max(...filteredCommands.map((cmd) => cmd.command.length));
      const descriptionLength = Math.max(...filteredCommands.map((cmd) => cmd.description.length));

      lines.push('Use "help <command>" to get help for a specific command.');
      lines.push('Available commands:\n');

      for (const commandObj of filteredCommands.toSorted((a, b) =>
        a.command.localeCompare(b.command, undefined, { sensitivity: 'base' })
      )) {
        lines.push(
          `  ${commandObj.command.padEnd(cmdLength + 2, ' ')}${commandObj.description.padEnd(descriptionLength + 2, ' ')}${commandObj.aliases.length ? `(Alias${commandObj.aliases.length > 1 ? 'es' : ''}: ${commandObj.aliases.join(', ')})` : ''}`
        );
      }
    }

    if (lines.length) {
      await message.reply(`\`\`\`${lines.join('\r\n')}\`\`\``);
    }
  }

  private async getDisplayNameForMapID(mapId: number): Promise<string> {
    const map = await Map.findOne({ where: { MapId: mapId } });

    return map?.DisplayName ?? 'Unknown Map';
  }

  private async getSceneNameForMapID(mapId: number): Promise<string> {
    const map = await Map.findOne({ where: { MapId: mapId } });

    return map?.SceneName.default ?? 'Default';
  }

  private async getUserDisplayName(cmid: number): Promise<string | undefined> {
    const [publicProfile, guildMember] = await Promise.all([
      PublicProfile.findOne({ where: { Cmid: cmid } }),
      this.getGuildMemberFromCmid(cmid)
    ]);

    return guildMember?.nickname || guildMember?.user.globalName || guildMember?.user.username || publicProfile?.Name;
  }

  private async getUserAvatarURL(cmid: number): Promise<string | undefined> {
    const guildMember = await this.getGuildMemberFromCmid(cmid);

    return guildMember?.displayAvatarURL();
  }

  public static getGamemodeName(gameMode: GameModeType): string {
    switch (gameMode) {
      case GameModeType.DeathMatch:
        return 'Deathmatch';
      case GameModeType.TeamDeathMatch:
        return 'Team Deathmatch';
      case GameModeType.EliminationMode:
        return 'Team Elimination';
      default:
        return 'Unknown Game Mode';
    }
  }

  public static getGameFlags(gameFlags: number): string {
    return (Object.values(GAME_FLAGS).filter(Number) as number[])
      .filter((flag) => (gameFlags & flag) === flag)
      .map((flag) => {
        switch (flag) {
          case GAME_FLAGS.None:
            return 'None';
          case GAME_FLAGS.LowGravity:
            return 'Low Gravity';
          case GAME_FLAGS.NoArmor:
            return 'No Armor';
          case GAME_FLAGS.QuickSwitch:
            return 'Quick Switch';
          case GAME_FLAGS.MeleeOnly:
            return 'Meelee Only';
          default:
            return null;
        }
      })
      .filter(Boolean)
      .join(', ');
  }

  public static getAchievementName(achievement: AchievementType): string {
    switch (achievement) {
      case AchievementType.MostValuable:
        return 'Most Valuable';
      case AchievementType.MostAggressive:
        return 'Most Aggressive';
      case AchievementType.SharpestShooter:
        return 'Sharpest Shooter';
      case AchievementType.TriggerHappy:
        return 'Trigger Happy';
      case AchievementType.HardestHitter:
        return 'Hardest Hitter';
      case AchievementType.CostEffective:
        return 'Cost Effective';
      default:
        return 'Unknown Achivement';
    }
  }
  // #endregion
}
