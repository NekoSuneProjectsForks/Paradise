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

import DiscordClient from '@/discord/DiscordClient';
import ParadiseService from '@/ParadiseService';
import { PacketType } from '@/utils/PacketCodec';
import { GameRoom, Map, MapSettings, PhotonServer } from '@festivaldev/paradise-models';
import { GAME_FLAGS } from '@festivaldev/uberstrike-js';
import { MemberAccessLevel, PhotonUsageType } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import { ConnectionAddress, GameRoomData } from '@festivaldev/uberstrike-js/UberStrike/Core/Models';
import { GameModeType } from '@festivaldev/uberstrike-js/UberStrike/Core/Types';
import { Separator } from '@inquirer/prompts';
import chalk from 'chalk';
import Table from 'cli-table';
import { FindOperator, Like } from 'typeorm';
import yoctoSpinner from 'yocto-spinner';
import ConsoleCommand from '../ConsoleCommand';
import ConsoleHelper from '../ConsoleHelper';

export default class RoomsCommand extends ConsoleCommand {
  static override command: string = 'rooms';
  static override aliases: string[] = ['room'];
  static override description: string = 'List and manage game rooms.';
  static override get usageText(): string[] {
    return [
      `${this.command}: ${this.description}`,
      '  list            List all rooms that are currently open.',
      '  close <roomId>  Close an open room if it exists.'
    ];
  }

  override minimumAccessLevel: MemberAccessLevel = MemberAccessLevel.Moderator;

  override async run([cmd, ...args]: string[]) {
    if (!cmd && this.allowInteractive) return this.runInteractive();

    if (!cmd) {
      this.printUsage();
      return 2;
    }

    switch (cmd.toLocaleLowerCase()) {
      case 'ls':
      case 'list':
        return this.listRooms();
      case 'create':
        return this.createRoom();
      case 'close':
        return this.closeRoom(args);
      default:
        this.writeLine(`${RoomsCommand.command}: unknown command ${cmd}\n`);
        return 2;
    }
  }

  // #region non-interactive
  private async listRooms() {
    const photonServers = await PhotonServer.find({
      where: {
        UsageType: PhotonUsageType.All
      },
      relations: {
        Rooms: {
          Players: {
            PublicProfile: true
          },
          Map: true
        }
      }
    });

    return this.executeListRooms(photonServers);
  }

  private async createRoom() {
    this.writeLine('This command can only be executed in interactive mode');
    return 1;
  }

  private async closeRoom([pattern]: string[]) {
    if (!pattern) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const gameRoom = await GameRoom.findOne({
      where: [
        {
          Number: Like(pattern) as any as FindOperator<number>
        },
        {
          Name: Like(`%${pattern}%`)
        }
      ],
      relations: {
        PhotonServer: true
      }
    });

    if (!gameRoom) {
      this.writeLine(`Could not find any room matching "${pattern}".`);
      return 1;
    }

    return this.executeCloseRoom(gameRoom);
  }
  // #endregion

  // #region interactive
  private async runInteractive() {
    this.writeLine('Press Ctrl+C to cancel.');

    const task = await ConsoleHelper.select({
      message: 'Choose a task:',
      choices: [
        {
          name: 'List rooms',
          value: 'list',
          description: 'List all rooms that are currently open.'
        },
        {
          name: 'Create room',
          value: 'create',
          description: 'Create a new permament room.'
        },
        {
          name: 'Close room',
          value: 'close',
          description: 'Close an open room if it exists.'
        },
        new Separator(),
        {
          name: 'Cancel',
          value: null
        }
      ]
    });

    switch (task) {
      case 'list':
        return this.listRooms();
      case 'create':
        return this.createRoomInteractive();
      case 'close':
        return this.closeRoomInteractive();
      case null:
        return 0;
      default:
        this.writeLine(`${RoomsCommand.command}: unknown command ${task}\n`);
        return 2;
    }
  }

  private async createRoomInteractive() {
    const gameServers = await PhotonServer.find({
      where: {
        UsageType: PhotonUsageType.All
      },
      relations: {
        Rooms: true
      }
    });

    const gameServer = await ConsoleHelper.search({
      message: 'Select a Photon server:',
      source: async (term) =>
        gameServers
          .filter(
            (server) =>
              !term ||
              server.Name.toLocaleLowerCase().includes(term.toLocaleLowerCase()) ||
              String(server.PhotonId).toLocaleLowerCase().includes(term.toLocaleLowerCase())
          )
          .map((server) => ({
            name: `${server.Name} (${server.PhotonId})`,
            value: server,
            disabled: !server.Enabled && '[disabled]'
          }))
    });

    const roomName = await ConsoleHelper.promptText({
      message: 'Enter a room name:',
      required: true,
      validate: (value: string) => {
        if (value.length > 18) return 'Room name must not be longer than 18 characters.';

        if (gameServer.Rooms.find((room) => room.Name.toLocaleLowerCase() === value.toLocaleLowerCase()))
          return 'A room with this name already exists';

        return true;
      }
    });

    const password = await ConsoleHelper.promptPassword({
      message: 'Enter a password (empty for none):'
    });

    const maps = await Map.find({
      relations: {
        Settings: true
      }
    });

    const map = await ConsoleHelper.select({
      message: 'Select a map:',
      choices: maps.map((map) => ({
        name: map.DisplayName,
        value: map
      }))
    });

    const mapSettings = (await ConsoleHelper.select({
      message: 'Select a game mode:',
      choices: Object.entries(GameModeType)
        .filter(([key]) => key !== '0' && !isNaN(Number(key)))
        .map(([key, value]) => {
          const settings = map.Settings.find((settings) => settings.GameModeType === Number(key));
          return {
            name: DiscordClient.getGamemodeName(Number(key)),
            value: settings,
            disabled: !settings && '[not supported]'
          };
        })
    })) as MapSettings;

    const playerLimit = await ConsoleHelper.promptNumber({
      message: `Max Players (min: ${mapSettings.PlayersMin}, max: ${mapSettings.PlayersMax}):`,
      min: mapSettings.PlayersMin,
      max: mapSettings.PlayersMax,
      defaultValue: mapSettings.PlayersCurrent
    });

    const timeLimit = await ConsoleHelper.promptNumber({
      message: `Time Limit (min: ${mapSettings.TimeMin}, max: ${mapSettings.TimeMax}):`,
      min: mapSettings.TimeMin,
      max: mapSettings.TimeMax,
      defaultValue: mapSettings.TimeCurrent
    });

    const killLimit = await ConsoleHelper.promptNumber({
      message: `Max Kills (min: ${mapSettings.KillsMin}, max: ${mapSettings.KillsMax}):`,
      min: mapSettings.KillsMin,
      max: mapSettings.KillsMax,
      defaultValue: mapSettings.KillsCurrent
    });

    const gameFlags = await ConsoleHelper.checkbox({
      message: 'Select Mods:',
      choices: [
        {
          name: ' Low Gravity',
          value: GAME_FLAGS.LowGravity
        },
        {
          name: ' No Armor',
          value: GAME_FLAGS.NoArmor
        },
        {
          name: ' Quick Switch',
          value: GAME_FLAGS.QuickSwitch,
          checked: true
        },
        {
          name: ' Melee Only',
          value: GAME_FLAGS.MeleeOnly
        }
      ]
    });

    return this.executeCreateRoom(
      gameServer,
      roomName,
      password,
      map.MapId,
      mapSettings.GameModeType,
      playerLimit!,
      timeLimit!,
      killLimit!,
      gameFlags
    );
  }

  private async closeRoomInteractive() {
    const gameServers = await PhotonServer.find({
      where: {
        UsageType: PhotonUsageType.All
      },
      relations: {
        Rooms: true
      }
    });

    const gameServer = await ConsoleHelper.search({
      message: 'Select a Photon server:',
      source: async (term) =>
        gameServers
          .filter(
            (server) =>
              !term ||
              server.Name.toLocaleLowerCase().includes(term.toLocaleLowerCase()) ||
              String(server.PhotonId).toLocaleLowerCase().includes(term.toLocaleLowerCase())
          )
          .map((server) => ({
            name: `${server.Name} (${server.PhotonId})`,
            value: server,
            disabled: !server.Enabled && '[disabled]'
          }))
    });

    const gameRoom = await ConsoleHelper.search({
      message: 'Select a room to close:',
      source: async (term) =>
        gameServer.Rooms.filter(
          (room) =>
            !term ||
            room.Name.toLocaleLowerCase().includes(term.toLocaleLowerCase()) ||
            String(room.Number).toLocaleLowerCase().includes(term.toLocaleLowerCase())
        ).map((room) => ({
          name: `${room.Name} (${room.Number})`,
          value: room
        }))
    });

    return this.executeCloseRoom(gameRoom, gameServer);
  }
  // #endregion

  // #region executors
  private async executeListRooms(photonServers: PhotonServer[]) {
    if (!photonServers.length) {
      this.writeLine('No Photon server registered.');
      return 1;
    }

    for (const server of photonServers) {
      if (!server.Rooms.length) {
        this.writeLine(`${server.Name}: No open game rooms.`);
      } else {
        this.writeLine(`Open rooms on "${server.Name}": ${server.Rooms.length}`);

        const table = new Table({
          head: [
            chalk.white.bold('ID'),
            chalk.white.bold('Name'),
            chalk.white.bold('Password'),
            chalk.white.bold('Map'),
            chalk.white.bold('Players'),
            chalk.white.bold('Game Mode'),
            chalk.white.bold('Time Limit'),
            chalk.white.bold('Kill Limit'),
            chalk.white.bold('Req. Level'),
            chalk.white.bold('Permanent')
          ],
          rows: server.Rooms.map((room) => [
            String(room.Number),
            room.Name,
            room.IsPasswordProtected ? 'Yes' : 'No',
            room.Map.DisplayName,
            `${room.Players.length}/${room.PlayerLimit}`,
            String(GameModeType[room.GameMode]),
            `${room.TimeLimit / 60}min`,
            String(room.KillLimit),
            `Min: ${room.LevelMin}, Max: ${room.LevelMax}`,
            room.IsPermanentGame ? 'Yes' : 'No'
          ])
        });

        this.writeLine(table.toString());
      }
    }

    return 0;
  }

  private async executeCreateRoom(
    photonServer: PhotonServer,
    roomName: string,
    password: string,
    mapId: number,
    gameModeType: GameModeType,
    playerLimit: number,
    timeLimit: number,
    killLimit: number,
    gameFlags: GAME_FLAGS[]
  ) {
    const spinner = yoctoSpinner({ text: 'Creating room...' }).start();

    try {
      const gameRoom = await GameRoom.save(
        GameRoom.create({
          Number: Math.randomInt(),
          PhotonServerId: photonServer.PhotonId,
          Name: roomName,
          IsPasswordProtected: !!password,
          GameMode: gameModeType,
          PlayerLimit: playerLimit,
          TimeLimit: timeLimit,
          KillLimit: killLimit,
          GameFlags: gameFlags.reduce((acc, cur) => acc & cur),
          MapID: mapId,
          IsPermanentGame: true,
          Password: password
        })
      );

      spinner.stop();

      this.writeLine(`Successfully created room "${roomName}" (${gameRoom.Number}).`);

      await (ParadiseService.Instance.SocketHost ?? ParadiseService.Instance.PipeClient)?.sendToGameServer(
        photonServer.Guid,
        PacketType.OpenRoom,
        [
          new GameRoomData({
            Name: roomName,
            Server: new ConnectionAddress(photonServer.IP, photonServer.Port),
            Number: gameRoom.Number,
            IsPasswordProtected: !!password,
            PlayerLimit: playerLimit,
            TimeLimit: timeLimit,
            KillLimit: killLimit,
            GameFlags: gameFlags.reduce((acc, cur) => acc & cur),
            MapID: mapId,
            GameMode: gameModeType,
            IsPermanentGame: true
          }),
          password
        ]
      );
    } catch (error: any) {
      spinner.stop();

      this.writeLine(error);
      return 1;
    }

    return 0;
  }

  private async executeCloseRoom(gameRoom: GameRoom, photonServer?: PhotonServer) {
    if (
      (this.allowInteractive &&
        (await ConsoleHelper.confirm({
          message: `Are you sure you want to close the room "${gameRoom.Name}" (${gameRoom.Number})?`
        }))) ||
      !this.allowInteractive
    ) {
      const spinner = yoctoSpinner({ text: 'Closing room...' }).start();

      try {
        await GameRoom.delete(gameRoom.Number);

        await (ParadiseService.Instance.SocketHost ?? ParadiseService.Instance.PipeClient)?.sendToGameServer(
          photonServer?.Guid ?? gameRoom.PhotonServer.Guid,
          PacketType.CloseRoom,
          gameRoom.Number
        );

        // await new Promise((resolve) => setTimeout(resolve, 500));

        spinner.stop();
      } catch (error: any) {
        spinner.stop();

        this.writeLine(error.message);
        return 1;
      }
    }

    return 0;
  }
  // #endregion
}
