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
import { PacketType } from '@/utils/PacketCodec';
import { ActivePlayer, Clan, ClanMember, PublicProfile } from '@festivaldev/paradise-models';
import { GroupPosition, MemberAccessLevel } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import { Separator } from '@inquirer/prompts';
import chalk from 'chalk';
import Table from 'cli-table';
import { MoreThan } from 'typeorm';
import yoctoSpinner from 'yocto-spinner';
import ConsoleCommand from '../ConsoleCommand';
import ConsoleHelper from '../ConsoleHelper';

export default class PlayersCommand extends ConsoleCommand {
  static override command: string = 'players';
  static override aliases: string[] = ['player', 'p'];
  static override description: string = 'List and manage players.';
  static override get usageText(): string[] {
    return [
      `${this.command}: ${this.description}`,
      '  list              Lists all players that are currently online.',
      '  list-all          Lists all known players.',
      '  search <pattern>  Searches players by name, CMID, Steam ID or E-Mail address.',
      '  delete <pattern>  Deletes a player by name, CMID, Steam ID or E-Mail address.'
    ];
  }

  override minimumAccessLevel: MemberAccessLevel = MemberAccessLevel.Moderator;

  override async run([cmd, pattern]: string[]) {
    if (!cmd && this.allowInteractive) return this.runInteractive();

    if (!cmd) {
      this.printUsage();
      return 2;
    }

    switch (cmd.toLocaleLowerCase()) {
      case 'ls':
      case 'list':
        return this.listOnlinePlayers();
      case 'list-all':
        return this.listKnownPlayers();
      case 'search':
        return this.searchPlayer(pattern);
      case 'rm':
      case 'del':
      case 'delete':
        return this.deletePlayer(pattern);
      default:
        this.writeLine(`${PlayersCommand.command}: unknown command ${cmd}\n`);
        return 2;
    }
  }

  // #region non-interactive
  private async listOnlinePlayers() {
    const connectedPeers = await ActivePlayer.find({
      relations: {
        PublicProfile: {
          SteamMember: true,
          UserAccount: true
        }
      }
    });

    return this.executeListOnlinePlayers(connectedPeers);
  }

  private async listKnownPlayers() {
    const playerProfiles = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
        ActivePlayer: true,
        SteamMember: true,
        UserAccount: true
      },
      order: {
        Name: 'ASC'
      }
    });
    const connectedPeers = await ActivePlayer.find();

    return this.executeListKnownPlayers(playerProfiles, connectedPeers);
  }

  private async searchPlayer(pattern?: string) {
    if (!pattern) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const playerProfiles = await PublicProfile.findProfiles(pattern);

    if (!playerProfiles.length) {
      this.writeLine(`Could not find any player matching "${pattern}".`);
      return 1;
    }

    return this.executeSearchPlayer(playerProfiles);
  }

  private async deletePlayer(pattern?: string) {
    if (!pattern) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const publicProfile = await PublicProfile.findProfile(pattern, {
      Clan: {
        Members: true
      }
    });

    if (!publicProfile) {
      this.writeLine(`Could not find any player matching "${pattern}".`);
      return 1;
    }

    return this.executeDeletePlayer(publicProfile);
  }
  // #endregion

  // #region interactive
  private async runInteractive() {
    const task = await ConsoleHelper.select({
      message: 'Choose a task:',
      choices: [
        {
          name: 'List online players',
          value: 'list',
          description: 'Lists all players that are currently online.'
        },
        {
          name: 'List all known players',
          value: 'list-all',
          description: 'Lists all known players.'
        },
        {
          name: 'Delete player',
          value: 'delete',
          description: 'Deletes a player by name, CMID, Steam ID or E-Mail address.'
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
        return this.listOnlinePlayers();
      case 'list-all':
        return this.listKnownPlayers();
      case 'delete':
        return this.deletePlayerInteractive();
      case null:
        return 0;
      default:
        this.writeLine(`${PlayersCommand.command}: unknown command ${task}\n`);
        return 2;
    }
  }

  private async deletePlayerInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
        Clan: {
          Members: true
        }
      }
    });

    const publicProfile = await ConsoleHelper.search({
      message: 'Select a player:',
      source: async (term) =>
        players
          .filter((player) => !term || player.Name.toLocaleLowerCase().includes(term.toLocaleLowerCase()))
          .map((player) => ({
            name: `${player.Name} (${player.Cmid})`,
            value: player
          }))
    });

    return this.executeDeletePlayer(publicProfile);
  }
  // #endregion

  // #region executors
  private async executeListOnlinePlayers(connectedPeers: ActivePlayer[]) {
    if (!connectedPeers?.length) {
      this.writeLine('There are currently no players online.\n');
      return 0;
    }

    this.writeLine(`Players currently online: ${connectedPeers.length}\n`);

    const table = new Table({
      head: [
        chalk.white.bold('Username'),
        chalk.white.bold('Cmid'),
        chalk.white.bold('SteamID64'),
        chalk.white.bold('Email'),
        chalk.white.bold('Rank')
      ],
      rows: connectedPeers.map((peer) => [
        peer.PublicProfile.Name,
        String(peer.PublicProfile.Cmid),
        String(peer.PublicProfile.SteamMember?.SteamId ?? 'N/A'),
        String(peer.PublicProfile.UserAccount?.EmailAddress ?? 'N/A'),
        String(MemberAccessLevel[peer.PublicProfile.AccessLevel])
      ])
    });

    this.writeLine(table.toString());
    return 0;
  }

  private async executeListKnownPlayers(playerProfiles: PublicProfile[], connectedPeers: ActivePlayer[]) {
    this.writeLine(`Players currently online: ${connectedPeers.length}\n`);

    const table = new Table({
      head: [
        chalk.white.bold('Username'),
        chalk.white.bold('Cmid'),
        chalk.white.bold('SteamID64'),
        chalk.white.bold('Email'),
        chalk.white.bold('Rank'),
        chalk.white.bold('Online')
      ],
      rows: playerProfiles.map((profile) => [
        profile.Name,
        String(profile.Cmid),
        String(profile.SteamMember?.SteamId ?? 'N/A'),
        String(profile.UserAccount?.EmailAddress ?? 'N/A'),
        String(MemberAccessLevel[profile.AccessLevel]),
        (profile.ActivePlayer && 'Yes') || 'No'
      ])
    });

    this.writeLine(table.toString());
    return 0;
  }

  private async executeSearchPlayer(playerProfiles: PublicProfile[]) {
    const table = new Table({
      head: [
        chalk.white.bold('Username'),
        chalk.white.bold('Cmid'),
        chalk.white.bold('SteamID64'),
        chalk.white.bold('Email'),
        chalk.white.bold('Rank'),
        chalk.white.bold('Online')
      ],
      rows: playerProfiles.map((profile) => {
        return [
          profile.Name,
          String(profile.Cmid),
          String(profile.SteamMember?.SteamId ?? 'N/A'),
          String(profile.UserAccount?.EmailAddress ?? 'N/A'),
          String(MemberAccessLevel[profile.AccessLevel]),
          (profile.ActivePlayer && 'Yes') || 'No'
        ];
      })
    });

    this.writeLine(table.toString());
    return 0;
  }

  private async executeDeletePlayer(publicProfile: PublicProfile) {
    if (
      (this.allowInteractive &&
        (await ConsoleHelper.confirm({
          message: `Are you sure you want to delete the player "${publicProfile.Name}"?`
        }))) ||
      !this.allowInteractive
    ) {
      const spinner = yoctoSpinner({ text: 'Deleting player...' }).start();

      try {
        if (publicProfile.Clan) {
          this.writeLine('Player owns a clan, finding next player to move ownership to.');

          const filteredMembers = publicProfile.Clan.Members.filter((_) => _.Cmid !== publicProfile.Cmid).sort(
            (a, b) => a.Position - b.Position
          );

          if (filteredMembers.length && filteredMembers[0]) {
            this.writeLine(`New clan owner: ${filteredMembers[0].Name}`);

            await Clan.update(publicProfile.Clan.GroupId, {
              OwnerCmid: filteredMembers[0].Cmid
            });

            await ClanMember.update(filteredMembers[0].Cmid, {
              Position: GroupPosition.Leader
            });
          } else {
            this.writeLine('Found no new clan owner, deleting clan.');

            await Clan.remove(publicProfile.Clan);
          }
        }

        await (ParadiseService.Instance.SocketHost ?? ParadiseService.Instance.PipeClient)?.sendToCommServer(
          PacketType.BanPlayer,
          {
            TargetCmid: publicProfile.Cmid,
            Duration: 0,
            ExpireTime: new Date('9999-12-31T23:59:59.999Z'),
            Reason: 'Your account has been deleted.'
          }
        );

        await PublicProfile.remove(publicProfile);

        spinner.stop();

        this.writeLine(`Successfully deleted player "${publicProfile.Name}".`);
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
