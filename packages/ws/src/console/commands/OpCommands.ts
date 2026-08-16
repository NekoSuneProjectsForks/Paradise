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

import { PublicProfile } from '@festivaldev/paradise-models';
import { MemberAccessLevel } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import { MoreThan } from 'typeorm';
import yoctoSpinner from 'yocto-spinner';
import ConsoleCommand from '../ConsoleCommand';
import ConsoleHelper from '../ConsoleHelper';

export class DeopCommand extends ConsoleCommand {
  static override command: string = 'deop';
  static override description: string = "Resets a player's permission level.";
  static override get usageText(): string[] {
    return [`${this.command}: ${this.description}`, `Usage: ${this.command} <pattern>`];
  }

  override async run([pattern]: string[]) {
    if (!pattern && this.allowInteractive) return this.runInteractive();

    if (!pattern) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const targetProfile = await PublicProfile.findProfile(pattern);

    if (targetProfile == null) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    if (targetProfile.AccessLevel === MemberAccessLevel.Default) {
      this.writeLine('Invalid data.');
      return 1;
    }

    return this.executeDeop(targetProfile);
  }

  private async runInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      }
    });

    const targetProfile = await ConsoleHelper.search({
      message: 'Select a player:',
      source: async (term) =>
        players
          .filter((player) => !term || player.Name.toLocaleLowerCase().includes(term.toLocaleLowerCase()))
          .map((player) => ({
            name: `${player.Name} (${player.Cmid})`,
            value: player,
            description: `Level: ${MemberAccessLevel[player.AccessLevel]}`,
            disabled: player.AccessLevel === MemberAccessLevel.Default && '[No permissions]'
          }))
    });

    if (targetProfile.AccessLevel === MemberAccessLevel.Default) {
      this.writeLine('Invalid data.');
      return 1;
    }

    return this.executeDeop(targetProfile);
  }

  private async executeDeop(targetProfile: PublicProfile) {
    if (
      await ConsoleHelper.confirm({
        message: `Are you sure you want to reset the permission level of player "${targetProfile.Name}"?`
      })
    ) {
      const spinner = yoctoSpinner({ text: 'Resetting loadout...' }).start();

      try {
        await PublicProfile.update(targetProfile.Cmid, {
          AccessLevel: MemberAccessLevel.Default
        });

        spinner.stop();

        this.writeLine(`Permission level of player "${targetProfile.Name}" has been reset successfully.`);
      } catch (error: any) {
        spinner.stop();

        this.writeLine(error);
        return 1;
      }
    }

    return 0;
  }
}

export class OpCommand extends ConsoleCommand {
  static override command: string = 'op';
  static override description: string = "Sets a player's permission level.";
  static override get usageText(): string[] {
    const lines: any[] = [`${this.command}: ${this.description}`, `Usage: ${this.command} <pattern> <level>`];

    const values: string[] = [];
    for (const key in Object.keys(MemberAccessLevel)) {
      if (!isNaN(Number(key)) && MemberAccessLevel[key]) {
        values.push(`${key} = ${MemberAccessLevel[key]}`);
      }
    }

    lines.push(`Available levels: ${values.join('; ')}`);

    return lines;
  }

  override async run([pattern, level]: string[]) {
    if (!pattern && this.allowInteractive) return this.runInteractive();

    if (!pattern || !level) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const targetProfile = await PublicProfile.findProfile(pattern);

    if (targetProfile == null) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    const accessLevel =
      !Number.isNaN(level) && Object.values(MemberAccessLevel).includes(Number(level))
        ? (Number(level) as MemberAccessLevel)
        : undefined;

    if (
      accessLevel === undefined ||
      accessLevel === MemberAccessLevel.Default ||
      targetProfile.AccessLevel === accessLevel
    ) {
      this.writeLine('Invalid parameter: level');
      return 1;
    }

    return this.executeOp(targetProfile, accessLevel);
  }

  private async runInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      }
    });

    const targetProfile = await ConsoleHelper.search({
      message: 'Select a player:',
      source: async (term) =>
        players
          .filter((player) => !term || player.Name.toLocaleLowerCase().includes(term.toLocaleLowerCase()))
          .map((player) => ({
            name: `${player.Name} (${player.Cmid})`,
            description: `Level: ${MemberAccessLevel[player.AccessLevel]}`,
            value: player
          }))
    });

    const accessLevel = await ConsoleHelper.select({
      message: 'Select access level:',
      choices: Object.entries(MemberAccessLevel)
        .filter(([key]) => !isNaN(Number(key)))
        .map(([key, value]) => [Number(key), value] as const)
        .map(([key, value]) => ({
          name: `${key}: ${value}`,
          value: value as MemberAccessLevel,
          disabled: (targetProfile.AccessLevel === key && '[current]') || (key === 0 && '[disabled]')
        }))
    });

    if (targetProfile.AccessLevel === accessLevel) {
      this.writeLine('Invalid parameter: level');
      return 1;
    }

    return this.executeOp(targetProfile, accessLevel);
  }

  private async executeOp(targetProfile: PublicProfile, accessLevel: MemberAccessLevel) {
    const spinner = yoctoSpinner({ text: 'Setting permission level...' }).start();

    try {
      await PublicProfile.update(targetProfile.Cmid, {
        AccessLevel: accessLevel
      });

      spinner.stop();

      this.writeLine(
        `Permission level of player "${targetProfile.Name}" has been set successfully: ${MemberAccessLevel[accessLevel]} (${accessLevel})`
      );
    } catch (error: any) {
      spinner.stop();

      this.writeLine(error);
      return 1;
    }

    return 0;
  }
}
