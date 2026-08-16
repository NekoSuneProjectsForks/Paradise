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
import { CurrencyDeposit, MemberWallet, PublicProfile } from '@festivaldev/paradise-models';
import { ChannelType, PaymentProviderType } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import { Separator } from '@inquirer/prompts';
import chalk from 'chalk';
import Table from 'cli-table';
import crypto from 'crypto';
import { MoreThan } from 'typeorm';
import yoctoSpinner from 'yocto-spinner';
import ConsoleCommand from '../ConsoleCommand';
import ConsoleHelper from '../ConsoleHelper';

export default class WalletCommand extends ConsoleCommand {
  static override command: string = 'wallet';
  static override description: string = "Manages credits and points in a player's wallet.";
  static override get usageText(): string[] {
    return [
      `${this.command}: ${this.description}`,
      "  info <pattern>               Shows the current status of a player's wallet.",
      '  points',
      "    add <pattern> <amount>     Adds the specified amount of points to a players's wallet.",
      "    set <pattern> <amount>     Set the points of a players's wallet to the specified amount.",
      "    remove <pattern> <amount>  Removes the specified amount of points from a players's wallet.",
      '  credits',
      "    add <pattern> <amount>     Adds the specified amount of credits to a players's wallet.",
      "    set <pattern> <amount>     Set the credits of a players's wallet to the specified amount.",
      "    remove <pattern> <amount>  Removes the specified amount of credits from a players's wallet."
    ];
  }

  override async run([cmd, ...args]: string[]) {
    if (!cmd && this.allowInteractive) return this.runInteractive();

    if (!cmd) {
      this.printUsage();
      return 2;
    }

    switch (cmd.toLocaleLowerCase()) {
      case 'info':
        return this.showWalletInfo(args);
      case 'points':
        return this.handlePointsCommand(args);
      case 'credits':
        return this.handleCreditsCommand(args);
      default:
        this.writeLine(`${WalletCommand.command}: unknown command ${cmd}\n`);
        return 2;
    }
  }

  // #region non-interactive
  private async showWalletInfo([pattern]: string[]) {
    if (!pattern) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const playerProfiles = await PublicProfile.findProfiles(pattern, {
      MemberWallet: true
    });

    if (!playerProfiles.length) {
      this.writeLine(`Could not find any player matching "${pattern}".`);
      return 1;
    }

    return this.executeShowWalletInfo(playerProfiles);
  }

  private async handlePointsCommand([cmd, name, amount]: string[]) {
    if (!cmd) {
      this.printUsage();
      return 2;
    }

    switch (cmd.toLocaleLowerCase()) {
      case 'add':
        return this.addPoints(name, amount);
      case 'set':
        return this.setPoints(name, amount);
      case 'remove':
        return this.removePoints(name, amount);
      default:
        this.writeLine(`${WalletCommand.command}: unknown command ${cmd}\n`);
        return 2;
    }
  }

  private async addPoints(pattern?: string, amount?: string) {
    if (!pattern || !amount) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const publicProfile = await PublicProfile.findProfile(pattern, {
      MemberWallet: true
    });

    if (!publicProfile) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    if (isNaN(Number(amount))) {
      this.writeLine('Invalid parameter: amount');
      return 1;
    }

    const points = Math.abs(Number(amount));

    return this.executeAddPoints(publicProfile, points);
  }

  private async setPoints(pattern?: string, amount?: string) {
    if (!pattern || !amount) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const publicProfile = await PublicProfile.findProfile(pattern, {
      MemberWallet: true
    });

    if (!publicProfile) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    if (isNaN(Number(amount))) {
      this.writeLine('Invalid parameter: amount');
      return 1;
    }

    const points = Math.abs(Number(amount));

    return this.executeSetPoints(publicProfile, points);
  }

  private async removePoints(pattern?: string, amount?: string) {
    if (!pattern || !amount) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const publicProfile = await PublicProfile.findProfile(pattern, {
      MemberWallet: true
    });

    if (!publicProfile) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    if (isNaN(Number(amount))) {
      this.writeLine('Invalid parameter: amount');
      return 1;
    }

    const points = Math.abs(Number(amount));

    return this.executeRemovePoints(publicProfile, points);
  }

  private async handleCreditsCommand([cmd, name, amount]: string[]) {
    if (!cmd) {
      this.printUsage();
      return 2;
    }

    switch (cmd.toLocaleLowerCase()) {
      case 'add':
        return this.addCredits(name, amount);
      case 'set':
        return this.setCredits(name, amount);
      case 'remove':
        return this.removeCredits(name, amount);
      default:
        this.writeLine(`${WalletCommand.command}: unknown command ${cmd}\n`);
        return 2;
    }
  }

  private async addCredits(pattern?: string, amount?: string) {
    if (!pattern || !amount) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const publicProfile = await PublicProfile.findProfile(pattern, {
      MemberWallet: true
    });

    if (!publicProfile) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    if (isNaN(Number(amount))) {
      this.writeLine('Invalid parameter: amount');
      return 1;
    }

    const credits = Math.abs(Number(amount));

    return this.executeAddCredits(publicProfile, credits);
  }

  private async setCredits(pattern?: string, amount?: string) {
    if (!pattern || !amount) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const publicProfile = await PublicProfile.findProfile(pattern, {
      MemberWallet: true
    });

    if (!publicProfile) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    if (isNaN(Number(amount))) {
      this.writeLine('Invalid parameter: amount');
      return 1;
    }

    const credits = Math.abs(Number(amount));

    return this.executeSetCredits(publicProfile, credits);
  }

  private async removeCredits(pattern?: string, amount?: string) {
    if (!pattern || !amount) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const publicProfile = await PublicProfile.findProfile(pattern, {
      MemberWallet: true
    });

    if (!publicProfile) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    if (isNaN(Number(amount))) {
      this.writeLine('Invalid parameter: amount');
      return 1;
    }

    const credits = Math.abs(Number(amount));

    return this.executeRemoveCredits(publicProfile, credits);
  }
  // #endregion

  // #region interactive
  private async runInteractive() {
    const task = await ConsoleHelper.select({
      message: 'Choose a task:',
      choices: [
        {
          name: 'Show wallet info',
          value: 'info',
          description: "Shows the current status of a player's wallet."
        },
        new Separator(),
        {
          name: 'Add points',
          value: 'points-add',
          description: "Adds the specified amount of points to a players's wallet."
        },
        {
          name: 'Set points',
          value: 'points-set',
          description: "Set the points of a players's wallet to the specified amount."
        },
        {
          name: 'Remove points',
          value: 'points-remove',
          description: "Removes the specified amount of points from a players's wallet."
        },
        new Separator(),
        {
          name: 'Add credits',
          value: 'credits-add',
          description: "Adds the specified amount of credits to a players's wallet."
        },
        {
          name: 'Set credits',
          value: 'credits-set',
          description: "Set the credits of a players's wallet to the specified amount."
        },
        {
          name: 'Remove credits',
          value: 'credits-remove',
          description: "Removes the specified amount of credits from a players's wallet."
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
        return this.showWalletInfoInteractive();
      case 'points-add':
        return this.addPointsInteractive();
      case 'points-set':
        return this.setPointsInteractive();
      case 'points-remove':
        return this.removePointsInteractive();
      case 'credits-add':
        return this.addCreditsInteractive();
      case 'credits-set':
        return this.setCreditsInteractive();
      case 'credits-remove':
        return this.removeCreditsInteractive();
      case null:
        return 0;
      default:
        this.writeLine(`${WalletCommand.command}: unknown command ${task}\n`);
        return 2;
    }
  }

  private async showWalletInfoInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
        MemberWallet: true
      }
    });

    const publicProfile = await ConsoleHelper.search({
      message: 'Select a player:',
      source: async (term) =>
        players
          .filter((player) => !term || player.Name.toLocaleLowerCase().includes(term.toLocaleLowerCase()))
          .map((player) => ({
            name: `${player.Name} (${player.Cmid})`,
            description: `Points: ${player.MemberWallet?.Points ?? 0}, Credits: ${player.MemberWallet?.Credits ?? 0}`,
            value: player
          }))
    });

    return this.executeShowWalletInfo([publicProfile]);
  }

  private async addPointsInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
        MemberWallet: true
      }
    });

    const publicProfile = await ConsoleHelper.search({
      message: 'Select a player:',
      source: async (term) =>
        players
          .filter((player) => !term || player.Name.toLocaleLowerCase().includes(term.toLocaleLowerCase()))
          .map((player) => ({
            name: `${player.Name} (${player.Cmid})`,
            description: `Points: ${player.MemberWallet?.Points ?? 0}, Credits: ${player.MemberWallet?.Credits ?? 0}`,
            value: player
          }))
    });

    const amount = await ConsoleHelper.promptNumber({
      message: 'Enter the amount of points:',
      required: true
    });

    return this.executeAddPoints(publicProfile, Math.abs(amount!));
  }

  private async setPointsInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
        MemberWallet: true
      }
    });

    const publicProfile = await ConsoleHelper.search({
      message: 'Select a player:',
      source: async (term) =>
        players
          .filter((player) => !term || player.Name.toLocaleLowerCase().includes(term.toLocaleLowerCase()))
          .map((player) => ({
            name: `${player.Name} (${player.Cmid})`,
            description: `Points: ${player.MemberWallet?.Points ?? 0}, Credits: ${player.MemberWallet?.Credits ?? 0}`,
            value: player
          }))
    });

    const amount = await ConsoleHelper.promptNumber({
      message: 'Enter the amount of points:',
      required: true
    });

    return this.executeSetPoints(publicProfile, Math.abs(amount!));
  }

  private async removePointsInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
        MemberWallet: true
      }
    });

    const publicProfile = await ConsoleHelper.search({
      message: 'Select a player:',
      source: async (term) =>
        players
          .filter((player) => !term || player.Name.toLocaleLowerCase().includes(term.toLocaleLowerCase()))
          .map((player) => ({
            name: `${player.Name} (${player.Cmid})`,
            description: `Points: ${player.MemberWallet?.Points ?? 0}, Credits: ${player.MemberWallet?.Credits ?? 0}`,
            value: player
          }))
    });

    const amount = await ConsoleHelper.promptNumber({
      message: 'Enter the amount of points:',
      required: true
    });

    return this.executeRemovePoints(publicProfile, Math.abs(amount!));
  }

  private async addCreditsInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
        MemberWallet: true
      }
    });

    const publicProfile = await ConsoleHelper.search({
      message: 'Select a player:',
      source: async (term) =>
        players
          .filter((player) => !term || player.Name.toLocaleLowerCase().includes(term.toLocaleLowerCase()))
          .map((player) => ({
            name: `${player.Name} (${player.Cmid})`,
            description: `Points: ${player.MemberWallet?.Points ?? 0}, Credits: ${player.MemberWallet?.Credits ?? 0}`,
            value: player
          }))
    });

    const amount = await ConsoleHelper.promptNumber({
      message: 'Enter the amount of credits:',
      required: true
    });

    return this.executeAddCredits(publicProfile, Math.abs(amount!));
  }

  private async setCreditsInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
        MemberWallet: true
      }
    });

    const publicProfile = await ConsoleHelper.search({
      message: 'Select a player:',
      source: async (term) =>
        players
          .filter((player) => !term || player.Name.toLocaleLowerCase().includes(term.toLocaleLowerCase()))
          .map((player) => ({
            name: `${player.Name} (${player.Cmid})`,
            description: `Points: ${player.MemberWallet?.Points ?? 0}, Credits: ${player.MemberWallet?.Credits ?? 0}`,
            value: player
          }))
    });

    const amount = await ConsoleHelper.promptNumber({
      message: 'Enter the amount of credits:',
      required: true
    });

    return this.executeSetCredits(publicProfile, Math.abs(amount!));
  }

  private async removeCreditsInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
        MemberWallet: true
      }
    });

    const publicProfile = await ConsoleHelper.search({
      message: 'Select a player:',
      source: async (term) =>
        players
          .filter((player) => !term || player.Name.toLocaleLowerCase().includes(term.toLocaleLowerCase()))
          .map((player) => ({
            name: `${player.Name} (${player.Cmid})`,
            description: `Points: ${player.MemberWallet?.Points ?? 0}, Credits: ${player.MemberWallet?.Credits ?? 0}`,
            value: player
          }))
    });

    const amount = await ConsoleHelper.promptNumber({
      message: 'Enter the amount of credits:',
      required: true
    });

    return this.executeRemoveCredits(publicProfile, Math.abs(amount!));
  }
  // #endregion

  // #region executors
  private async executeShowWalletInfo(playerProfiles: PublicProfile[]) {
    const table = new Table({
      head: [
        chalk.white.bold('Username'),
        chalk.white.bold('Cmid'),
        chalk.white.bold('Points'),
        chalk.white.bold('Credits')
      ],
      rows: playerProfiles.map((profile) => [
        profile.Name,
        String(profile.Cmid),
        String(profile.MemberWallet!.Points),
        String(profile.MemberWallet!.Credits)
      ])
    });

    this.writeLine(table.toString());

    return 0;
  }

  private async executeAddPoints(publicProfile: PublicProfile, points: number) {
    const spinner = yoctoSpinner({ text: 'Adding points...' }).start();

    try {
      await MemberWallet.update(publicProfile.Cmid, {
        Points: publicProfile.MemberWallet!.Points + points
      });

      await CurrencyDeposit.insert({
        CreditsDepositId: Math.randomInt(),
        Points: points,
        CurrencyLabel: 'USD',
        Cmid: publicProfile.Cmid,
        IsAdminAction: true,
        PaymentProviderId: PaymentProviderType.Cmune,
        TransactionKey: crypto.randomBytes(32).toString('hex'),
        ApplicationId: ParadiseService.Instance.ServiceSettings.ApplicationId,
        ChannelId: ChannelType.Steam
      });

      spinner.stop();

      this.writeLine(`Successfully added ${points} point(s) to wallet of player "${publicProfile.Name}".`);
    } catch (error: any) {
      spinner.stop();

      this.writeLine(error);
      return 1;
    }

    return 0;
  }

  private async executeSetPoints(publicProfile: PublicProfile, points: number) {
    const spinner = yoctoSpinner({ text: 'Setting points...' }).start();

    try {
      await MemberWallet.update(publicProfile.Cmid, {
        Points: points
      });

      spinner.stop();

      this.writeLine(`Successfully set points to ${points} in wallet of player "${publicProfile.Name}".`);
    } catch (error: any) {
      spinner.stop();

      this.writeLine(error);
      return 1;
    }

    return 0;
  }

  private async executeRemovePoints(publicProfile: PublicProfile, points: number) {
    const spinner = yoctoSpinner({ text: 'Removing points...' }).start();

    try {
      await MemberWallet.update(publicProfile.Cmid, {
        Points: publicProfile.MemberWallet!.Points - points
      });

      await CurrencyDeposit.insert({
        CreditsDepositId: Math.randomInt(),
        Points: points * -1,
        CurrencyLabel: 'USD',
        Cmid: publicProfile.Cmid,
        IsAdminAction: true,
        PaymentProviderId: PaymentProviderType.Cmune,
        TransactionKey: crypto.randomBytes(32).toString('hex'),
        ApplicationId: ParadiseService.Instance.ServiceSettings.ApplicationId,
        ChannelId: ChannelType.Steam
      });

      spinner.stop();

      this.writeLine(`Successfully removed ${points} point(s) from wallet of player "${publicProfile.Name}".`);
    } catch (error: any) {
      spinner.stop();

      this.writeLine(error);
      return 1;
    }

    return 0;
  }

  private async executeAddCredits(publicProfile: PublicProfile, credits: number) {
    const spinner = yoctoSpinner({ text: 'Adding credits...' }).start();

    try {
      await MemberWallet.update(publicProfile.Cmid, {
        Credits: publicProfile.MemberWallet!.Credits + credits
      });

      await CurrencyDeposit.insert({
        CreditsDepositId: Math.randomInt(),
        Credits: credits,
        CurrencyLabel: 'USD',
        Cmid: publicProfile.Cmid,
        IsAdminAction: true,
        PaymentProviderId: PaymentProviderType.Cmune,
        TransactionKey: crypto.randomBytes(32).toString('hex'),
        ApplicationId: ParadiseService.Instance.ServiceSettings.ApplicationId,
        ChannelId: ChannelType.Steam
      });

      spinner.stop();

      this.writeLine(`Successfully added ${credits} credit(s) to wallet of player "${publicProfile.Name}".`);
    } catch (error: any) {
      spinner.stop();

      this.writeLine(error);
      return 1;
    }

    return 0;
  }

  private async executeSetCredits(publicProfile: PublicProfile, credits: number) {
    const spinner = yoctoSpinner({ text: 'Settings credits...' }).start();

    try {
      await MemberWallet.update(publicProfile.Cmid, {
        Credits: credits
      });

      spinner.stop();

      this.writeLine(`Successfully set credits to ${credits} in wallet of player "${publicProfile.Name}".`);
    } catch (error: any) {
      spinner.stop();

      this.writeLine(error);
      return 1;
    }

    return 0;
  }

  private async executeRemoveCredits(publicProfile: PublicProfile, credits: number) {
    const spinner = yoctoSpinner({ text: 'Removing credits...' }).start();

    try {
      await MemberWallet.update(publicProfile.Cmid, {
        Credits: publicProfile.MemberWallet!.Credits - credits
      });

      await CurrencyDeposit.insert({
        CreditsDepositId: Math.randomInt(),
        Credits: credits * -1,
        CurrencyLabel: 'USD',
        Cmid: publicProfile.Cmid,
        IsAdminAction: true,
        PaymentProviderId: PaymentProviderType.Cmune,
        TransactionKey: crypto.randomBytes(32).toString('hex'),
        ApplicationId: ParadiseService.Instance.ServiceSettings.ApplicationId,
        ChannelId: ChannelType.Steam
      });

      spinner.stop();

      this.writeLine(`Successfully removed ${credits} credit(s) from wallet of player "${publicProfile.Name}".`);
    } catch (error: any) {
      spinner.stop();

      this.writeLine(error);
      return 1;
    }

    return 0;
  }
  // #endregion
}
