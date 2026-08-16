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

import XpPointsUtil from '@/utils/XpPointsUtil';
import { PlayerStatistics, PublicProfile } from '@festivaldev/paradise-models';
import { MemberAccessLevel } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import { Separator } from '@inquirer/prompts';
import chalk from 'chalk';
import Table from 'cli-table';
import { MoreThan } from 'typeorm';
import yoctoSpinner from 'yocto-spinner';
import ConsoleCommand from '../ConsoleCommand';
import ConsoleHelper from '../ConsoleHelper';

export default class XpCommand extends ConsoleCommand {
  static override command: string = 'xp';
  static override description: string = "Increases or decreases a player's experience points (XP).";
  static override get usageText(): string[] {
    return [
      `${this.command}: ${this.description}`,
      '  info <pattern>           Shows the current experience and level of a player.',
      "  give <pattern> <amount>  Adds the specified amount of experience to increase a player's level.",
      "  set <pattern> <amount>   Sets a player's experience to the specified amount.",
      "  take <pattern> <amount>  Removes the specified amount of experience to decrease a player's level."
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
      case 'info':
        return this.printPlayerXp(args);
      case 'add':
      case 'give':
        return this.addXp(args);
      case 'set':
        return this.setXp(args);
      case 'take':
      case 'remove':
        return this.removeXp(args);
      default:
        this.writeLine(`${XpCommand.command}: unknown command ${cmd}\n`);
        return 2;
    }
  }

  // #region non-interactive
  private async printPlayerXp([pattern]: string[]) {
    if (!pattern) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const publicProfile = await PublicProfile.findProfile(pattern, {
      Statistics: true
    });

    if (!publicProfile) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    return this.executePrintPlayerXp(publicProfile);
  }

  private async addXp([pattern, amount]: string[]) {
    if (!pattern || !amount) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const publicProfile = await PublicProfile.findProfile(pattern, {
      Statistics: true
    });

    if (!publicProfile) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    if (isNaN(Number(amount))) {
      this.writeLine('Invalid parameter: amount');
      return 1;
    }

    const xpAmount = Math.abs(Number(amount));

    return this.executeAddXp(publicProfile, xpAmount);
  }

  private async setXp([pattern, amount]: string[]) {
    if (!pattern || !amount) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const publicProfile = await PublicProfile.findProfile(pattern, {
      Statistics: true
    });

    if (!publicProfile) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    if (isNaN(Number(amount))) {
      this.writeLine('Invalid parameter: amount');
      return 1;
    }

    const xpAmount = Math.abs(Number(amount));

    return this.executeSetXp(publicProfile, xpAmount);
  }

  private async removeXp([pattern, amount]: string[]) {
    if (!pattern || !amount) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const publicProfile = await PublicProfile.findProfile(pattern, {
      Statistics: true
    });

    if (!publicProfile) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    if (isNaN(Number(amount))) {
      this.writeLine('Invalid parameter: amount');
      return 1;
    }

    const xpAmount = Math.abs(Number(amount));

    return this.executeRemoveXp(publicProfile, xpAmount);
  }
  // #endregion

  // #region interactive
  private async runInteractive() {
    const task = await ConsoleHelper.select({
      message: 'Choose a task:',
      choices: [
        {
          name: 'Show player XP',
          value: 'info',
          description: 'Shows the current experience and level of a player.'
        },
        {
          name: 'Add XP',
          value: 'add',
          description: "Adds the specified amount of experience to increase a player's level."
        },
        {
          name: 'Set XP',
          value: 'set',
          description: "Sets a player's experience to the specified amount."
        },
        {
          name: 'Remove XP',
          value: 'remove',
          description: "Removes the specified amount of experience to decrease a player's level."
        },
        new Separator(),
        {
          name: 'Cancel',
          value: null
        }
      ]
    });

    switch (task) {
      case 'info':
        return this.printPlayerXpInteractive();
      case 'add':
        return this.addXpInteractive();
      case 'set':
        return this.setXpInteractive();
      case 'remove':
        return this.removeXpInteractive();
      case null:
        return 0;
      default:
        this.writeLine(`${XpCommand.command}: unknown command ${task}\n`);
        return 2;
    }
  }

  private async printPlayerXpInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
        Statistics: true
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

    return this.executePrintPlayerXp(publicProfile);
  }

  private async addXpInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
        Statistics: true
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

    const amount = await ConsoleHelper.promptNumber({
      message: 'Enter the amount of XP to add:',
      required: true
    });

    return this.executeAddXp(publicProfile, amount!);
  }

  private async setXpInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
        Statistics: true
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

    const amount = await ConsoleHelper.promptNumber({
      message: 'Enter the amount of XP:',
      required: true
    });

    return this.executeSetXp(publicProfile, amount!);
  }

  private async removeXpInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
        Statistics: true
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

    const amount = await ConsoleHelper.promptNumber({
      message: 'Enter the amount of XP to remove:',
      required: true,
      validate: (value) => (value !== undefined && !isNaN(value!) && value > 0) || 'Invalid amount'
    });

    return this.executeRemoveXp(publicProfile, amount!);
  }
  // #endregion

  // #region executors
  private async executePrintPlayerXp(publicProfile: PublicProfile) {
    const table = new Table({
      head: [chalk.white.bold('Username'), chalk.white.bold('Cmid'), chalk.white.bold('XP'), chalk.white.bold('Level')],
      rows: [
        [
          publicProfile.Name,
          String(publicProfile.Cmid),
          String(publicProfile.Statistics!.Xp),
          String(XpPointsUtil.GetLevelForXp(publicProfile.Statistics!.Xp))
        ]
      ]
    });

    this.writeLine(table.toString());

    return 0;
  }

  private async executeAddXp(publicProfile: PublicProfile, amount: number) {
    const spinner = yoctoSpinner({ text: 'Adding XP...' }).start();

    try {
      const newXp = publicProfile.Statistics!.Xp + amount;
      const result = await PlayerStatistics.save({
        Cmid: publicProfile.Cmid,
        Xp: newXp,
        Level: XpPointsUtil.GetLevelForXp(newXp)
      });

      spinner.stop();

      this.writeLine(`Successfully added ${amount} XP to player (total: ${result.Xp}, level: ${result.Level})`);
    } catch (error: any) {
      spinner.stop();

      this.writeLine(error);
      return 1;
    }

    return 0;
  }

  private async executeSetXp(publicProfile: PublicProfile, amount: number) {
    const spinner = yoctoSpinner({ text: 'Setting XP...' }).start();

    try {
      const result = await PlayerStatistics.save({
        Cmid: publicProfile.Cmid,
        Xp: amount,
        Level: XpPointsUtil.GetLevelForXp(amount)
      });

      spinner.stop();

      this.writeLine(`Successfully set player XP to ${amount} (level: ${result.Level})`);
    } catch (error: any) {
      spinner.stop();

      this.writeLine(error);
      return 1;
    }

    return 0;
  }

  private async executeRemoveXp(publicProfile: PublicProfile, amount: number) {
    const spinner = yoctoSpinner({ text: 'Removing XP...' }).start();

    try {
      const newXp = publicProfile.Statistics!.Xp - amount;
      const result = await PlayerStatistics.save({
        Cmid: publicProfile.Cmid,
        Xp: newXp,
        Level: XpPointsUtil.GetLevelForXp(newXp)
      });

      spinner.stop();

      this.writeLine(`Successfully removed ${amount} XP from player (total: ${result.Xp}, level: ${result.Level})`);
    } catch (error: any) {
      spinner.stop();

      this.writeLine(error);
      return 1;
    }

    return 0;
  }
  // #endregion
}
