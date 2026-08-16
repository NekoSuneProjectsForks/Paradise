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
import { ItemTransaction, PlayerInventoryItem, PlayerLoadout, PublicProfile } from '@festivaldev/paradise-models';
import { BuyingDurationType, MemberAccessLevel } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import { Separator } from '@inquirer/prompts';
import chalk from 'chalk';
import Table from 'cli-table';
import { MoreThan } from 'typeorm';
import yoctoSpinner from 'yocto-spinner';
import ConsoleCommand from '../ConsoleCommand';
import ConsoleHelper from '../ConsoleHelper';

export default class InventoryCommand extends ConsoleCommand {
  static override command: string = 'inventory';
  static override aliases: string[] = ['inv'];
  static override description: string = "Adds or removes items from a player's inventory.";
  static override get usageText(): string[] {
    return [
      `${this.command}: ${this.description}`,
      '  list <pattern>                    Lists all items in a players inventory',
      "  give <pattern> <item> [<amount>]  Adds the specified item to a player's inventory.",
      "  take <pattern> <item>             Removes the specified item from a player's inventory."
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
      case 'list':
      case 'ls':
        return this.listInventory(args);
      case 'add':
      case 'give':
        return this.addToInventory(args);
      case 'rm':
      case 'remove':
      case 'take':
        return this.removeFromInventory(args);
      default:
        this.writeLine(`${InventoryCommand.command}: unknown command ${cmd}\n`);
        return 2;
    }
  }

  // #region non-interactive
  private async listInventory([pattern]: string[]) {
    if (!pattern) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const publicProfiles = await PublicProfile.findProfiles(pattern, {
      InventoryItems: true
    });

    if (!publicProfiles.length) {
      this.writeLine(`Could not find player(s) matching ${pattern}.`);
      return 1;
    }

    for (const publicProfile of publicProfiles) {
      this.executeListInventory(publicProfile);
    }

    return 0;
  }

  private async addToInventory([pattern, item, amount]: string[]) {
    if (!pattern || !item) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const publicProfile = await PublicProfile.findProfile(pattern);

    if (publicProfile == null) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    const itemId = isNaN(Number(item)) ? Number(UberstrikeInventoryItem[String(item) as any]) : Number(item);

    if (Number.isNaN(itemId)) {
      this.writeLine('Invalid parameter: item');
      return 1;
    }

    if (!UberstrikeInventoryItem[itemId]) {
      this.writeLine(`Unknown item "${itemId}.`);

      return 1;
    }

    if (await publicProfile.hasInventoryItem(itemId)) {
      this.writeLine(
        `Item "${UberstrikeInventoryItem[itemId]}" is already in inventory of player "${publicProfile.Name}".`
      );
      return 1;
    }

    const itemAmount = !isNaN(Number(amount)) ? Number(amount) : -1;

    return this.executeAddToInventory(publicProfile, itemId, itemAmount);
  }

  private async removeFromInventory([pattern, item]: string[]) {
    if (!pattern) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const publicProfile = await PublicProfile.findProfile(pattern);

    if (publicProfile == null) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    const itemId = isNaN(Number(item)) ? Number(UberstrikeInventoryItem[String(item) as any]) : Number(item);

    if (Number.isNaN(itemId)) {
      this.writeLine('Invalid parameter: item');
      return 1;
    }

    if (!(await publicProfile.hasInventoryItem(itemId))) {
      this.writeLine(
        `Item "${UberstrikeInventoryItem[itemId]}" is not in inventory of player "${publicProfile.Name}".`
      );
      return 1;
    }

    return this.executeRemoveFromInventory(publicProfile, itemId);
  }
  // #endregion

  // #region interactive
  private async runInteractive() {
    const task = await ConsoleHelper.select({
      message: 'Choose a task:',
      choices: [
        {
          name: 'List inventory',
          value: 'list',
          description: "Lists all items in a player's inventory"
        },
        {
          name: 'Add item to inventory',
          value: 'add',
          description: "Adds an item to a player's inventory"
        },
        {
          name: 'Remove item from inventory',
          value: 'remove',
          description: "Removes an item from a player's inventory"
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
        return this.listInventoryInteractive();
      case 'add':
        return this.addToInventoryInteractive();
      case 'remove':
        return this.removeFromInventoryInteractive();
      case null:
        return 0;
      default:
        this.writeLine(`${InventoryCommand.command}: unknown command ${task}\n`);
        return 2;
    }
  }

  private async listInventoryInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
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

    return this.executeListInventory(publicProfile);
  }

  private async addToInventoryInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
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

    const inventoryItems = publicProfile.InventoryItems.map((item) => item.ItemId);

    const itemId = await ConsoleHelper.search({
      message: 'Select an item to add:',
      source: async (term) =>
        Object.entries(UberstrikeInventoryItem)
          .filter(([key]) => !isNaN(Number(key)))
          .map(([key, value]) => [Number(key), String(value)] as const)
          .filter(
            ([key, value]) =>
              !term ||
              String(key).toLocaleLowerCase().includes(term.toLocaleLowerCase()) ||
              value.toLocaleLowerCase().includes(term.toLocaleLowerCase())
          )
          .map(([key, value]) => ({
            name: `${key}: ${value}`,
            value: key,
            disabled: inventoryItems.includes(Number(key)) && '[owned]'
          }))
    });

    if (await publicProfile.hasInventoryItem(itemId)) {
      this.writeLine(
        `Item "${UberstrikeInventoryItem[itemId]}" is already in inventory of player "${publicProfile.Name}".`
      );
      return 1;
    }

    const amount = await ConsoleHelper.promptNumber({
      message: 'Enter amount:',
      defaultValue: -1,
      required: false
    });

    return this.executeAddToInventory(publicProfile, itemId, amount !== undefined ? amount : -1);
  }

  private async removeFromInventoryInteractive() {
    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
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

    const item = await ConsoleHelper.search({
      message: 'Select an item to remove:',
      source: async () =>
        publicProfile.InventoryItems.filter((invItem) => !invItem.ExpirationDate || invItem.ExpirationDate > new Date())
          .sort((a, b) => a.ItemId - b.ItemId)
          .map((item) => ({
            name: `${item.ItemId}: ${UberstrikeInventoryItem[item.ItemId]}`,
            value: item
          }))
    });

    if (!(await publicProfile.hasInventoryItem(item.ItemId))) {
      this.writeLine(
        `Item "${UberstrikeInventoryItem[item.ItemId]}" is not in inventory of player "${publicProfile.Name}".`
      );
      return 1;
    }

    return this.executeRemoveFromInventory(publicProfile, item.ItemId);
  }
  // #endregion

  // #region executors
  private async executeListInventory(publicProfile: PublicProfile) {
    this.writeLine(`Inventory of player "${publicProfile.Name}":`);

    const table = new Table({
      head: [chalk.white.bold('ID'), chalk.white.bold('Name')],
      rows: publicProfile.InventoryItems.filter((item) => !item.ExpirationDate || item.ExpirationDate > new Date())
        .sort((a, b) => a.ItemId - b.ItemId)
        .map((item) => [String(item.ItemId), String(UberstrikeInventoryItem[item.ItemId])])
    });

    this.writeLine(table.toString());

    return 0;
  }

  private async executeAddToInventory(publicProfile: PublicProfile, itemId: number, itemAmount: number) {
    const spinner = yoctoSpinner({ text: 'Adding item to inventory...' }).start();

    try {
      await PlayerInventoryItem.insert({
        Cmid: publicProfile.Cmid,
        ItemId: itemId,
        AmountRemaining: itemAmount
      });

      await ItemTransaction.insert({
        WithdrawalId: Math.randomInt(),
        Cmid: publicProfile.Cmid,
        ItemId: itemId,
        Duration: BuyingDurationType.Permanent,
        IsAdminAction: true
      });

      spinner.stop();

      this.writeLine(
        `Item "${UberstrikeInventoryItem[itemId]}"${itemAmount > 0 ? ` (${itemAmount})` : ''} added to inventory of player "${publicProfile.Name}".`
      );
    } catch (error: any) {
      spinner.stop();

      this.writeLine(error);
      return 1;
    }

    return 0;
  }

  private async executeRemoveFromInventory(publicProfile: PublicProfile, itemId: number) {
    const spinner = yoctoSpinner({ text: 'Removing item from inventory...' }).start();

    try {
      await PlayerInventoryItem.delete({
        Cmid: publicProfile.Cmid,
        ItemId: itemId
      });

      const playerLoadout = await PlayerLoadout.findOne({ where: { Cmid: publicProfile.Cmid } });

      if (playerLoadout) {
        await PlayerLoadout.update(playerLoadout.Cmid, {
          Head: playerLoadout.Head === itemId ? UberstrikeInventoryItem.None : playerLoadout.Head,
          Gloves: playerLoadout.Gloves === itemId ? UberstrikeInventoryItem.None : playerLoadout.Gloves,
          UpperBody: playerLoadout.UpperBody === itemId ? UberstrikeInventoryItem.None : playerLoadout.UpperBody,
          LowerBody: playerLoadout.LowerBody === itemId ? UberstrikeInventoryItem.None : playerLoadout.LowerBody,
          Boots: playerLoadout.Boots === itemId ? UberstrikeInventoryItem.None : playerLoadout.Boots,
          Face: playerLoadout.Face === itemId ? UberstrikeInventoryItem.None : playerLoadout.Face,
          Webbing: playerLoadout.Webbing === itemId ? UberstrikeInventoryItem.None : playerLoadout.Webbing,
          MeleeWeapon: playerLoadout.MeleeWeapon === itemId ? UberstrikeInventoryItem.None : playerLoadout.MeleeWeapon,
          Weapon1: playerLoadout.Weapon1 === itemId ? UberstrikeInventoryItem.None : playerLoadout.Weapon1,
          Weapon2: playerLoadout.Weapon2 === itemId ? UberstrikeInventoryItem.None : playerLoadout.Weapon2,
          Weapon3: playerLoadout.Weapon3 === itemId ? UberstrikeInventoryItem.None : playerLoadout.Weapon3,
          QuickItem1: playerLoadout.QuickItem1 === itemId ? UberstrikeInventoryItem.None : playerLoadout.QuickItem1,
          QuickItem2: playerLoadout.QuickItem2 === itemId ? UberstrikeInventoryItem.None : playerLoadout.QuickItem2,
          QuickItem3: playerLoadout.QuickItem3 === itemId ? UberstrikeInventoryItem.None : playerLoadout.QuickItem3,
          FunctionalItem1:
            playerLoadout.FunctionalItem1 === itemId ? UberstrikeInventoryItem.None : playerLoadout.FunctionalItem1,
          FunctionalItem2:
            playerLoadout.FunctionalItem2 === itemId ? UberstrikeInventoryItem.None : playerLoadout.FunctionalItem2,
          FunctionalItem3:
            playerLoadout.FunctionalItem3 === itemId ? UberstrikeInventoryItem.None : playerLoadout.FunctionalItem3
        } as PlayerLoadout);
      }

      spinner.stop();

      this.writeLine(
        `Item "${UberstrikeInventoryItem[itemId]}" removed from inventory of player "${publicProfile.Name}".`
      );
    } catch (error: any) {
      spinner.stop();

      this.writeLine(error);
      return 1;
    }

    return 0;
  }
  // #endregion
}
