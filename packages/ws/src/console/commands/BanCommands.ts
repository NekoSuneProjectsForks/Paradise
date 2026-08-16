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
import { ModerationFlag } from '@/utils/enums';
import { PacketType } from '@/utils/PacketCodec';
import { ModerationAction, PublicProfile } from '@festivaldev/paradise-models';
import { MemberAccessLevel } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import { Separator } from '@inquirer/prompts';
import chalk from 'chalk';
import Table from 'cli-table';
import { add, format } from 'date-fns';
import { MoreThan } from 'typeorm';
import yoctoSpinner from 'yocto-spinner';
import ConsoleCommand from '../ConsoleCommand';
import ConsoleHelper from '../ConsoleHelper';

export class BanCommand extends ConsoleCommand {
  static override command: string = 'ban';
  static override description: string = 'Bans a player, either for a specified duration or permanently.';
  static override get usageText(): string[] {
    return [
      `${this.command}: ${this.description}`,
      '  <pattern> <reason> [minutes]  Bans a player with a reason for a given duration (0 = permanent)',
      '  list                          List currently banned players.'
    ];
  }

  override minimumAccessLevel: MemberAccessLevel = MemberAccessLevel.Moderator;

  override async run([cmd, ...args]: string[]) {
    if (!cmd && this.allowInteractive) return this.runInteractive();

    switch (cmd?.toLocaleLowerCase()) {
      case 'ls':
      case 'list':
        return this.listBannedPlayers();
      default:
        return this.banPlayer([cmd, ...args].filter(Boolean));
    }
  }

  // #region non-interactive
  private async listBannedPlayers() {
    const bannedPlayers = await PublicProfile.find({
      where: {
        ModerationActionsReceived: {
          ModerationFlag: ModerationFlag.Banned,
          ExpireTime: MoreThan(new Date())
        }
      },
      relations: {
        ModerationActionsReceived: true
      },
      order: {
        ModerationActionsReceived: {
          ExpireTime: 'ASC'
        }
      }
    });

    if (!bannedPlayers.length) {
      this.writeLine('There are currently no banned players.');
      return 0;
    }

    const table = new Table({
      head: [
        chalk.white.bold('Username'),
        chalk.white.bold('Cmid'),
        chalk.white.bold('Expires'),
        chalk.white.bold('Reason')
      ],
      rows: bannedPlayers.map((profile) => [
        profile.Name,
        String(profile.Cmid),
        String(profile.ModerationActionsReceived[0].ExpireTime?.toISOString()),
        String(profile.ModerationActionsReceived[0].Reason)
      ])
    });

    this.writeLine(table.toString());

    return 0;
  }

  private async banPlayer([pattern, reason, duration = '0']: string[]) {
    if (!pattern || !reason) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const publicProfile = await PublicProfile.findProfile(pattern);

    if (!publicProfile) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    const minutes = Number(duration);

    if (
      await ModerationAction.findOne({
        where: {
          ModerationFlag: ModerationFlag.Banned,
          ExpireTime: MoreThan(new Date()),
          TargetCmid: publicProfile.Cmid
        }
      })
    ) {
      this.writeLine(`Player "${publicProfile.Name}" is already banned.`);
      return 1;
    }

    return this.executeBanPlayer(publicProfile, reason, minutes);
  }
  // #endregion

  // #region interactive
  private async runInteractive() {
    const task = await ConsoleHelper.select({
      message: 'Choose a task:',
      choices: [
        {
          name: 'Ban player',
          value: 'ban',
          description: 'Bans a player, either for a specified duration or permanently.'
        },
        {
          name: 'List banned players',
          value: 'list',
          description: 'List currently banned players.'
        },
        new Separator(),
        {
          name: 'Cancel',
          value: null
        }
      ]
    });

    switch (task) {
      case 'ban':
        return this.banPlayerInteractive();
      case 'list':
        return this.listBannedPlayers();
      case null:
        return 0;
      default:
        this.writeLine(`${BanCommand.command}: unknown command ${task}\n`);
        return 2;
    }
  }

  private async banPlayerInteractive() {
    const players = await PublicProfile.find({
      where: { Cmid: MoreThan(0) },
      relations: { ModerationActionsReceived: true }
    });

    const publicProfile = await ConsoleHelper.search({
      message: 'Select a player to ban:',
      source: async () =>
        players.map((player) => {
          const currentBan = player.ModerationActionsReceived.find(
            (action) =>
              action.ModerationFlag === ModerationFlag.Banned && (!action.ExpireTime || action.ExpireTime > new Date())
          );

          return {
            name: `${player.Name} (${player.Cmid})`,
            value: player,
            disabled:
              !!currentBan &&
              `[banned ${currentBan.ExpireTime ? `until ${format(currentBan.ExpireTime, 'yyyy-MM-dd HH:mm:ss')}` : 'permanently'}]`
          };
        })
    });

    const minutes = await ConsoleHelper.promptNumber({
      message: 'Enter ban duration in minutes (0 = permanent):',
      defaultValue: 0
    });

    const reason = await ConsoleHelper.promptText({
      message: 'Enter a ban reason (optional):'
    });

    return this.executeBanPlayer(publicProfile, reason, minutes);
  }
  // #endregion

  // #region executors
  private async executeBanPlayer(publicProfile: PublicProfile, reason?: string, minutes: number = 0) {
    const permaBan = Number.isNaN(minutes) || minutes === 0;

    if (
      (this.allowInteractive &&
        (await ConsoleHelper.confirm({
          message: `Are you sure you want to ban player "${publicProfile.Name}" ${permaBan ? 'permanently' : `for ${minutes} minute(s)`}?`
        }))) ||
      !this.allowInteractive
    ) {
      const spinner = yoctoSpinner({ text: 'Banning player...' }).start();

      try {
        const expireTime = permaBan ? undefined : add(new Date(), { minutes });

        await ModerationAction.insert({
          ModerationFlag: ModerationFlag.Banned,
          SourceCmid: 0,
          TargetCmid: publicProfile.Cmid,
          ExpireTime: permaBan ? new Date('9999-12-31T23:59:59.999Z') : expireTime,
          Reason: reason
        });

        await (ParadiseService.Instance.SocketHost ?? ParadiseService.Instance.PipeClient)?.sendToCommServer(
          PacketType.BanPlayer,
          {
            TargetCmid: publicProfile.Cmid,
            Duration: minutes,
            ExpireTime: expireTime,
            Reason: reason
          }
        );

        spinner.stop();

        if (permaBan) {
          this.writeLine(`Player "${publicProfile.Name}" has been banned permanently. (reason: ${reason})`);
        } else {
          this.writeLine(
            `Player "${publicProfile.Name}" has been banned for ${minutes} minute(s). (reason: ${reason})`
          );
        }
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

export class UnbanCommand extends ConsoleCommand {
  static override command: string = 'unban';
  static override description: string = 'Unbans a player.';
  static override get usageText(): string[] {
    return [`${this.command}: ${this.description}`, '  <pattern>  Unbans a player matching the pattern.'];
  }

  override minimumAccessLevel: MemberAccessLevel = MemberAccessLevel.Moderator;

  override async run([cmd, ...args]: string[]) {
    if (!cmd && this.allowInteractive) return this.runInteractive();

    return this.unbanPlayer([cmd, ...args].filter(Boolean));
  }

  // #region non-interactive
  private async unbanPlayer([pattern]: string[]) {
    if (!pattern) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const publicProfile = await PublicProfile.findProfile(pattern);

    if (!publicProfile) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    if (
      !(await ModerationAction.findOne({
        where: {
          ModerationFlag: ModerationFlag.Banned,
          ExpireTime: MoreThan(new Date()),
          TargetCmid: publicProfile.Cmid
        }
      }))
    ) {
      this.writeLine(`Player "${publicProfile.Name}" is not currently banned.`);
      return 1;
    }

    return this.executeUnbanPlayer(publicProfile);
  }
  // #endregion

  // #region interactive
  private async runInteractive() {
    const players = await PublicProfile.find({
      where: { Cmid: MoreThan(0) },
      relations: { ModerationActionsReceived: true }
    });

    const bannedPlayers = players.filter((player) =>
      player.ModerationActionsReceived.some(
        (action) =>
          action.ModerationFlag === ModerationFlag.Banned && (!action.ExpireTime || action.ExpireTime > new Date())
      )
    );

    if (!bannedPlayers.length) {
      this.writeLine('There are currently no banned players.');
      return 0;
    }

    const publicProfile = await ConsoleHelper.search({
      message: 'Select a player to unban:',
      source: async () =>
        bannedPlayers.map((player) => {
          const currentBan = player.ModerationActionsReceived.find(
            (action) =>
              action.ModerationFlag === ModerationFlag.Banned && (!action.ExpireTime || action.ExpireTime > new Date())
          );

          return {
            name: `${player.Name} (${player.Cmid})`,
            value: player,
            description: `Banned ${currentBan?.ExpireTime ? `until ${format(currentBan.ExpireTime, 'yyyy-MM-dd HH:mm:ss')}` : 'permanently'}`
          };
        })
    });

    return this.executeUnbanPlayer(publicProfile);
  }
  // #endregion

  // #region executors
  private async executeUnbanPlayer(publicProfile: PublicProfile) {
    if (
      (this.allowInteractive &&
        (await ConsoleHelper.confirm({
          message: `Are you sure you want to unban player "${publicProfile.Name}"?`
        }))) ||
      !this.allowInteractive
    ) {
      const spinner = yoctoSpinner({ text: 'Unbanning player...' }).start();

      try {
        await ModerationAction.update(
          {
            ModerationFlag: ModerationFlag.Banned,
            TargetCmid: publicProfile.Cmid,
            ExpireTime: MoreThan(new Date())
          },
          {
            ExpireTime: new Date(0)
          }
        );

        spinner.stop();

        this.writeLine(`Player "${publicProfile.Name}" has been unbanned successfully.`);
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
