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

import { UberstrikeInventoryItem } from '@/utils/enums';
import { PlayerLoadout, PublicProfile } from '@festivaldev/paradise-models';
import { MemberAccessLevel } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import { AvatarType, LoadoutSlotType } from '@festivaldev/uberstrike-js/UberStrike/Core/Types';
import { Separator } from '@inquirer/prompts';
import chalk from 'chalk';
import Table from 'cli-table';
import { MoreThan } from 'typeorm';
import yoctoSpinner from 'yocto-spinner';
import ConsoleCommand from '../ConsoleCommand';
import ConsoleHelper from '../ConsoleHelper';

const LOADOUT_KEYS = [
  'Type',
  'Head',
  'Gloves',
  'UpperBody',
  'LowerBody',
  'Boots',
  'Face',
  'Webbing',
  'MeleeWeapon',
  'Weapon1',
  'Weapon2',
  'Weapon3',
  'QuickItem1',
  'QuickItem2',
  'QuickItem3',
  'FunctionalItem1',
  'FunctionalItem2',
  'FunctionalItem3'
];

const FORBIDDEN_SLOTS = [
  'LoadoutID',
  'Backpack',
  'Cmid',
  'Type',
  'Weapon1Mod1',
  'Weapon1Mod2',
  'Weapon1Mod3',
  'Weapon2Mod1',
  'Weapon2Mod2',
  'Weapon2Mod3',
  'Weapon3Mod1',
  'Weapon3Mod2',
  'Weapon3Mod3'
];

export default class LoadoutCommand extends ConsoleCommand {
  static override command: string = 'loadout';
  static override description: string = "Sets or resets a player's current loadout";
  static override get usageText(): string[] {
    return [
      `${this.command}: ${this.description}`,
      "  get <pattern>                Shows a player's current loadout.",
      '  set <pattern> <slot> <item>  Sets the specified loadout slot to a specific item.',
      "  reset <pattern>              Resets a players's loadout to the default."
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
      case 'get':
        return this.getLoadout(args);
      case 'set':
        return this.setLoadoutSlot(args);
      case 'reset':
        return this.resetLoadout(args);
      default:
        this.writeLine(`${LoadoutCommand.command}: unknown command ${cmd}\n`);
        return 2;
    }
  }

  // #region non-interactive
  private async getLoadout([pattern]: string[]) {
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

    const playerLoadout = await PlayerLoadout.findOne({ where: { Cmid: publicProfile.Cmid } });

    if (!playerLoadout) {
      this.writeLine(`Could not find player loadout.`);
      return 1;
    }

    return this.executeGetLoadout(publicProfile, playerLoadout);
  }

  private async setLoadoutSlot([pattern, slot, item]: string[]) {
    if (!pattern || !slot || !item) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const publicProfile = await PublicProfile.findProfile(pattern, {
      Loadout: true
    });

    if (publicProfile == null) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    if (FORBIDDEN_SLOTS.includes(slot) || !LoadoutSlotType[slot as keyof typeof LoadoutSlotType]) {
      this.writeLine('Invalid parameter: slot');
      return 1;
    }

    const itemId = isNaN(Number(item)) ? Number(UberstrikeInventoryItem[String(item) as any]) : Number(item);

    if (Number.isNaN(itemId)) {
      this.writeLine('Invalid parameter: item');
      return 1;
    }

    if (itemId !== 0 && !(await publicProfile.hasInventoryItem(itemId))) {
      this.writeLine(
        `Item "${UberstrikeInventoryItem[itemId]}" is not in inventory of player "${publicProfile.Name}".`
      );
      return 1;
    }

    return this.executeSetLoadoutSlot(publicProfile, slot, itemId);
  }

  private async resetLoadout([pattern]: string[]) {
    if (!pattern) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const publicProfile = await PublicProfile.findProfile(pattern, {
      Loadout: true
    });

    if (!publicProfile) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    return this.executeResetLoadout(publicProfile);
  }
  // #endregion

  // #region interactive
  private async runInteractive() {
    const task = await ConsoleHelper.select({
      message: 'Choose a task:',
      choices: [
        {
          name: 'Show loadout',
          value: 'get',
          description: "Shows a player's current loadout."
        },
        {
          name: 'Set loadout slot',
          value: 'set',
          description: 'Sets a specific loadout slot to an item.'
        },
        {
          name: 'Reset loadout',
          value: 'reset',
          description: "Resets a player's loadout to default."
        },
        new Separator(),
        {
          name: 'Cancel',
          value: null
        }
      ]
    });

    switch (task) {
      case 'get':
        return this.getLoadoutInteractive();
      case 'set':
        return this.setLoadoutSlotInteractive();
      case 'reset':
        return this.resetLoadoutInteractive();
      case null:
        return 0;
      default:
        this.writeLine(`${LoadoutCommand.command}: unknown command ${task}\n`);
        return 2;
    }
  }

  private async getLoadoutInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
        Loadout: true
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

    const playerLoadout = await PlayerLoadout.findOne({ where: { Cmid: publicProfile.Cmid } });

    if (!playerLoadout) {
      this.writeLine(`Could not find player loadout.`);
      return 1;
    }

    return this.executeGetLoadout(publicProfile, playerLoadout);
  }

  private async setLoadoutSlotInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
        Loadout: true,
        InventoryItems: true
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

    const slot = await ConsoleHelper.select({
      message: 'Select a loadout slot:',
      choices: Object.entries(LoadoutSlotType)
        .filter(([key]) => !isNaN(Number(key)))
        .filter(([key]) => !FORBIDDEN_SLOTS.includes(key))
        .map(([key, value]) => ({
          name: `${value} (${key})`,
          value: value as string
        }))
    });

    const itemInput = await ConsoleHelper.promptText({
      message: 'Enter item name or ID (0 to clear):',
      required: true,
      validate: async (value) => {
        const itemId = isNaN(Number(value)) ? Number(UberstrikeInventoryItem[String(value) as any]) : Number(value);
        if (Number.isNaN(itemId)) return 'Invalid item name or ID';
        if (itemId !== 0 && !(await publicProfile.hasInventoryItem(itemId))) {
          return `Item "${UberstrikeInventoryItem[itemId]}" is not in inventory of player "${publicProfile.Name}".`;
        }
        return true;
      }
    });

    const itemId = isNaN(Number(itemInput))
      ? Number(UberstrikeInventoryItem[String(itemInput) as any])
      : Number(itemInput);

    return this.executeSetLoadoutSlot(publicProfile, slot, itemId);
  }

  private async resetLoadoutInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
        Loadout: true
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

    const confirmed = await ConsoleHelper.confirm({
      message: `Are you sure you want to reset the loadout of player "${publicProfile.Name}"?`,
      defaultValue: false
    });

    if (!confirmed) {
      return 0;
    }

    return this.executeResetLoadout(publicProfile);
  }
  // #endregion

  // #region executors
  private async executeGetLoadout(publicProfile: PublicProfile, playerLoadout: PlayerLoadout) {
    this.writeLine(`Inventory of player "${publicProfile.Name}":`);

    const table = new Table({
      rows: LOADOUT_KEYS.map((key) => {
        if (key === 'Type' && playerLoadout[key]) return { [chalk.white.bold(key)]: AvatarType[playerLoadout[key]] };
        return {
          [chalk.white.bold(key)]: (playerLoadout as any)[key]
            ? String(UberstrikeInventoryItem[(playerLoadout as any)[key]])
            : chalk.gray.italic('(empty)')
        };
      })
    });

    this.writeLine(table.toString());
    return 0;
  }

  private async executeSetLoadoutSlot(publicProfile: PublicProfile, slot: string, itemId: number) {
    const spinner = yoctoSpinner({ text: 'Setting loadout slot...' }).start();

    try {
      const slotId = !isNaN(Number(slot)) ? LoadoutSlotType[slot as keyof typeof LoadoutSlotType] : slot;
      await PlayerLoadout.update(publicProfile.Loadout!.Cmid, {
        [String(slotId)]: itemId
      } as any as PlayerLoadout);

      spinner.stop();

      this.writeLine(
        `Slot "${slotId}" of player "${publicProfile.Name}" has been set to "${itemId === 0 ? 'NULL' : UberstrikeInventoryItem[itemId]}".`
      );
    } catch (error: any) {
      spinner.stop();

      this.writeLine(error);
      return 1;
    }

    return 0;
  }

  private async executeResetLoadout(publicProfile: PublicProfile) {
    if (
      await ConsoleHelper.confirm({
        message: `Are you sure you want to reset the loadout of player "${publicProfile.Name}"?`
      })
    ) {
      const spinner = yoctoSpinner({ text: 'Resetting loadout...' }).start();

      try {
        await PlayerLoadout.update(publicProfile.Loadout!.Cmid, {
          Type: AvatarType.LutzRavinoff,
          Head: UberstrikeInventoryItem.None,
          Gloves: UberstrikeInventoryItem.None,
          UpperBody: UberstrikeInventoryItem.None,
          LowerBody: UberstrikeInventoryItem.None,
          Boots: UberstrikeInventoryItem.None,
          Face: UberstrikeInventoryItem.None,
          Webbing: UberstrikeInventoryItem.None,
          MeleeWeapon: UberstrikeInventoryItem.TheSplatbat,
          Weapon1: UberstrikeInventoryItem.MachineGun,
          Weapon2: UberstrikeInventoryItem.ShotGun,
          Weapon3: UberstrikeInventoryItem.SniperRifle,
          QuickItem1: UberstrikeInventoryItem.None,
          QuickItem2: UberstrikeInventoryItem.None,
          QuickItem3: UberstrikeInventoryItem.None,
          FunctionalItem1: UberstrikeInventoryItem.None,
          FunctionalItem2: UberstrikeInventoryItem.None,
          FunctionalItem3: UberstrikeInventoryItem.None
        } as PlayerLoadout);

        spinner.stop();

        this.writeLine(`Successfully reset loadout of player "${publicProfile.Name}".`);
      } catch (error: any) {
        spinner.stop();

        this.writeLine(error);
        return 1;
      }
    }

    return 0;
  }
  // #endregion
}
