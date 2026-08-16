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

import { Clan, ClanMember, PublicProfile } from '@festivaldev/paradise-models';
import { GroupPosition, GroupType } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import { Separator } from '@inquirer/prompts';
import chalk from 'chalk';
import Table from 'cli-table';
import { MoreThan } from 'typeorm';
import yoctoSpinner from 'yocto-spinner';
import ConsoleCommand from '../ConsoleCommand';
import ConsoleHelper from '../ConsoleHelper';

export default class ClanCommand extends ConsoleCommand {
  static override command: string = 'clan';
  static override aliases: string[] = ['clans'];
  static override description: string = 'Managed clans.';
  static override get usageText(): string[] {
    return [];
  }

  override async run([cmd, ...args]: string[]) {
    if (!cmd && this.allowInteractive) return this.runInteractive();

    if (!cmd) {
      this.printUsage();
      return 2;
    }

    switch (cmd.toLocaleLowerCase()) {
      case 'ls':
      case 'list':
        return this.listClans();
      case 'members':
        return this.listClanMembers(args);
      case 'promote':
        return this.promoteClanMember(args);
      case 'demote':
        return this.demoteClanMember(args);
      case 'create':
        return this.createClan(args);
      case 'update':
        return this.updateClan(args as any);
      case 'delete':
        return this.deleteClan(args);
      case 'transfer':
        return this.transferClan(args[0], args[1]);
      default:
        this.writeLine(`${ClanCommand.command}: unknown command ${cmd}\n`);
        return 2;
    }
  }

  // #region non-interactive
  private async listClans() {
    const clans = await Clan.find({ relations: { Members: true, Owner: true } });

    if (!clans?.length) {
      this.writeLine('There are currently no clans.');
      return 0;
    }

    const table = new Table({
      head: [
        chalk.white.bold('GroupId'),
        chalk.white.bold('Name'),
        chalk.white.bold('Tag'),
        chalk.white.bold('Motto'),
        chalk.white.bold('Owner'),
        chalk.white.bold('Members')
      ],
      rows: clans.map((clan) => [
        String(clan.GroupId),
        clan.Name,
        clan.Tag,
        clan.Motto,
        clan.OwnerName,
        String(clan.MembersCount)
      ])
    });

    this.writeLine(table.toString());

    return 0;
  }

  private async listClanMembers([pattern]: string[]) {
    if (!pattern) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const clan = await Clan.findClan(pattern);

    if (clan == null) {
      this.writeLine(`Could not find clan matching ${pattern}.`);
      return 1;
    }

    return this.executeListClanMembers(clan);
  }

  private async promoteClanMember([pattern, position]: string[]) {
    if (!pattern || !position) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const targetProfile = await PublicProfile.findProfile(pattern, { ClanMember: true });

    if (targetProfile == null) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    if (targetProfile.ClanMember == null) {
      this.writeLine('Player is not member of any clan.');
      return 1;
    }

    const groupPosition =
      !Number.isNaN(position) && Object.values(GroupPosition).includes(Number(position))
        ? (Number(position) as GroupPosition)
        : undefined;

    if (
      groupPosition === undefined ||
      groupPosition === GroupPosition.Member ||
      targetProfile.ClanMember.Position === groupPosition ||
      targetProfile.ClanMember.Position === GroupPosition.Leader
    ) {
      this.writeLine('Invalid parameter: level');
      return 1;
    }

    return this.executeUpdateClanPosition(targetProfile, groupPosition);
  }

  private async demoteClanMember([pattern]: string[]) {
    if (!pattern) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const targetProfile = await PublicProfile.findProfile(pattern, { ClanMember: true });

    if (targetProfile == null) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    if (targetProfile.ClanMember == null) {
      this.writeLine('Player is not member of any clan.');
      return 1;
    }

    if (targetProfile.ClanMember.Position === GroupPosition.Leader) {
      this.writeLine('Cannot demote the clan leader.');
      return 1;
    }

    return this.executeUpdateClanPosition(targetProfile, GroupPosition.Member);
  }

  private async createClan([name, tag, motto, pattern]: string[]) {
    if (!(name && tag && motto && pattern)) {
      this.printUsage();
      return 2;
    }

    if (name.length > 25) {
      this.writeLine('Clan name must not be longer than 25 characters.');
      return 2;
    }

    if (tag.length > 5) {
      this.writeLine('Clan tag must not be longer than 5 characters.');
      return 2;
    }

    if (motto.length > 25) {
      this.writeLine('Clan motto must not be longer than 25 characters.');
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const results = await Promise.all([Clan.findClan(name), Clan.findClan(tag)]);

    if (results.some((result) => result !== null)) {
      this.writeLine(`A clan with the name "${name}" or tag "${tag}" already exists.`);
      return 1;
    }

    const publicProfile = await PublicProfile.findProfile(pattern);

    if (!publicProfile) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    const existingClan = await Clan.findOne({ where: { OwnerCmid: publicProfile.Cmid } });

    if (existingClan) {
      this.writeLine(`Player "${publicProfile.Name}" already owns a clan.`);
      return 1;
    }

    const existingClanMember = await ClanMember.findOne({ where: { Cmid: publicProfile.Cmid } });

    if (existingClanMember) {
      this.writeLine(`Player "${publicProfile.Name}" is already member of a clan.`);
      return 1;
    }

    return this.executeCreateClan(name, tag, motto, publicProfile);
  }

  private async updateClan([pattern, attribute, text]: [string, 'name' | 'tag' | 'motto', string]) {
    if (!pattern) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const clan = await Clan.findClan(pattern);

    if (!clan) {
      this.writeLine(`Could not find any clan matching "${pattern}".`);
      return 1;
    }

    switch (attribute) {
      case 'name': {
        if (text === clan.Name) return 0;

        if (text.length > 25) {
          this.writeLine('Clan name must not be longer than 25 characters.');
          return 2;
        }

        const existingClan = await Clan.findClanByName(text);

        if (existingClan && existingClan.GroupId !== clan.GroupId) {
          this.writeLine(`A clan with the name "${text}" already exists.`);
          return 1;
        }

        try {
          await Clan.update(clan.GroupId, {
            Name: text
          });

          this.writeLine(`Successfully renamed clan "${clan.Name}" to "${text}".`);
        } catch (error: any) {
          this.writeLine(error);
          return 1;
        }

        break;
      }
      case 'tag': {
        if (text === clan.Tag) return 0;

        if (text.length > 5) {
          this.writeLine('Clan tag must not be longer than 5 characters.');
          return 2;
        }

        const existingClan = await Clan.findClanByTag(text);

        if (existingClan && existingClan.GroupId !== clan.GroupId) {
          this.writeLine(`A clan with the tag "${text}" already exists.`);
          return 1;
        }

        try {
          await Clan.update(clan.GroupId, {
            Tag: text
          });

          this.writeLine(`Successfully updated tag of clan "${clan.Name}" to "${text}".`);
        } catch (error: any) {
          this.writeLine(error);
          return 1;
        }

        break;
      }
      case 'motto': {
        if (text === clan.Motto) return 0;

        if (text.length > 25) {
          this.writeLine('Clan motto must not be longer than 25 characters.');
          return 2;
        }

        try {
          await Clan.update(clan.GroupId, {
            Motto: text
          });

          this.writeLine(`Successfully updated motto of clan "${clan.Name}" to "${text}".`);
        } catch (error: any) {
          this.writeLine(error);
          return 1;
        }

        break;
      }
      default:
        return 1;
    }

    return 0;
  }

  private async deleteClan([pattern]: string[]) {
    if (!pattern) {
      this.printUsage();
      return 2;
    }

    if (pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const clan = await Clan.findClan(pattern);

    if (!clan) {
      this.writeLine(`Could not find any clan matching "${pattern}".`);
      return 1;
    }

    return this.executeDeleteClan(clan);
  }

  private async transferClan(groupId: string, pattern: string) {
    if (!groupId || !pattern) {
      this.printUsage();
      return 2;
    }

    if (groupId.length < 3 || pattern.length < 3) {
      this.writeLine('Search pattern must contain at least 3 characters.');
      return 2;
    }

    const clan = await Clan.findClan(groupId);

    if (!clan) {
      this.writeLine(`Could not find any clan matching "${pattern}".`);
      return 1;
    }

    const publicProfile = await PublicProfile.findProfile(pattern, {
      ClanMember: true
    });

    if (!publicProfile) {
      this.writeLine(`Could not find player matching ${pattern}.`);
      return 1;
    }

    const existingClan = await Clan.findOne({ where: { OwnerCmid: publicProfile.Cmid } });

    if (existingClan && existingClan.GroupId !== clan.GroupId) {
      this.writeLine(`Player "${publicProfile.Name}" is already a member of another clan.`);
      return 1;
    }

    const existingClanMember = await ClanMember.findOne({ where: { Cmid: publicProfile.Cmid } });

    if (!existingClanMember || existingClanMember.GroupId !== clan.GroupId) {
      this.writeLine(`Player "${publicProfile.Name}" is not a member of this clan.`);
      return 1;
    }

    if (clan.OwnerCmid === publicProfile.Cmid) return 0;

    return this.executeTransferOwnership(clan, publicProfile);
  }
  // #endregion

  // #region interactive
  private async runInteractive() {
    const task = await ConsoleHelper.select({
      message: 'Choose a task:',
      choices: [
        {
          name: 'List clans',
          value: 'list',
          description: 'List all known clans.'
        },
        {
          name: 'List clan members',
          value: 'members',
          description: 'List all members of a given clan.'
        },
        {
          name: 'Manage clan members',
          value: 'manage',
          description: 'Promote or demote clan members, or kick them from a clan.'
        },
        {
          name: 'Transfer ownership',
          value: 'transfer',
          description: 'Sets a new clan owner.'
        },
        new Separator(),
        {
          name: 'Create clan',
          value: 'create',
          description: 'Create a new clan.'
        },
        {
          name: 'Edit clan',
          value: 'update',
          description: 'Update clan data.'
        },
        {
          name: 'Delete clan',
          value: 'delete',
          description: 'Deletes a clan.'
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
        return this.listClans();
      case 'members':
        return this.listMembersInteractive();
      case 'create':
        return this.createClanInteractive();
      case 'manage':
        return this.manageClanMemberInteractive();
      case null:
        return 0;
      default:
        this.writeLine(`${ClanCommand.command}: unknown command ${task}\n`);
        return 2;
    }
  }

  private async listMembersInteractive() {
    const clans = await Clan.find({
      relations: {
        Members: {
          PublicProfile: true
        },
        Owner: true
      }
    });

    const clan = await ConsoleHelper.search({
      message: 'Select a clan:',
      source: async (term) =>
        clans
          .filter(
            (clan) =>
              !term ||
              clan.Name.toLocaleLowerCase().includes(term.toLocaleLowerCase()) ||
              clan.Tag.toLocaleLowerCase().includes(term.toLocaleLowerCase())
          )
          .map((clan) => {
            return {
              name: `[${clan.Tag}] ${clan.Name} (${clan.GroupId})`,
              value: clan
            };
          })
    });

    return this.executeListClanMembers(clan);
  }

  private async createClanInteractive() {
    const name = await ConsoleHelper.promptText({
      message: 'Enter a clan name (max. 25 characters):',
      required: true,
      validate: async (value) => {
        if (value.length > 25) {
          return 'Clan name must not be longer than 25 characters.';
        }

        const existingClan = await Clan.findOne({
          where: {
            GroupId: MoreThan(0),
            Name: value
          }
        });

        if (existingClan) return `A clan with the name "${value}" already exists.`;

        return true;
      }
    });

    const tag = await ConsoleHelper.promptText({
      message: 'Enter a clan tag (max. 5 characters):',
      required: true,
      validate: async (value) => {
        if (value.length > 5) {
          return 'Clan tag must not be longer than 5 characters.';
        }

        const existingClan = await Clan.findOne({
          where: {
            GroupId: MoreThan(0),
            Tag: value
          }
        });

        if (existingClan) return `A clan with the tag "${value}" already exists.`;

        return true;
      }
    });

    const motto = await ConsoleHelper.promptText({
      message: 'Enter a clan motto (max. 25 characters):',
      required: true,
      validate: async (value) => {
        if (value.length > 25) {
          return 'Clan motto must not be longer than 25 characters.';
        }

        return true;
      }
    });

    const players = await PublicProfile.find({
      where: {
        Cmid: MoreThan(0)
      },
      relations: {
        Clan: true,
        ClanMember: true
      }
    });

    const publicProfile = await ConsoleHelper.search({
      message: 'Select a clan owner:',
      source: async () =>
        players.map((player) => {
          return {
            name: `${player.Name} (${player.Cmid})`,
            value: player,
            disabled:
              player.Clan || player.ClanMember
                ? `[${(player.Clan && 'already owns a clan') || (player.ClanMember && 'already a clan member')}]`
                : false
          };
        })
    });

    return this.executeCreateClan(name, tag, motto, publicProfile);
  }

  private async manageClanMemberInteractive() {
    const clans = await Clan.find({
      relations: {
        Members: {
          PublicProfile: true
        },
        Owner: true
      }
    });

    const clan = await ConsoleHelper.search({
      message: 'Select a clan:',
      source: async (term) =>
        clans
          .filter(
            (clan) =>
              !term ||
              clan.Name.toLocaleLowerCase().includes(term.toLocaleLowerCase()) ||
              clan.Tag.toLocaleLowerCase().includes(term.toLocaleLowerCase())
          )
          .map((clan) => {
            return {
              name: `[${clan.Tag}] ${clan.Name} (${clan.GroupId})`,
              value: clan
            };
          })
    });

    const targetProfile = await ConsoleHelper.search({
      message: 'Select a clan member:',
      source: async (term) =>
        clan.Members.filter(
          (member) => !term || member.Name.toLocaleLowerCase().includes(term.toLocaleLowerCase())
        ).map((member) => {
          return {
            name: `${member.Name} (${member.Cmid})`,
            value: member
          };
        })
    });

    const action = await ConsoleHelper.select({
      message: 'Select an action:',
      choices: [
        {
          name: 'Promote',
          value: 'promote',
          disabled: targetProfile.Position === GroupPosition.Leader && '[Clan leader]'
        },
        {
          name: 'Demote',
          value: 'demote',
          disabled: targetProfile.Position === GroupPosition.Leader && '[Clan leader]'
        },
        {
          name: 'Kick from clan',
          value: 'kick'
          // disabled: targetProfile.Position === GroupPosition.Leader && '[Clan leader]'
        }
      ]
    });

    switch (action) {
      case 'promote':
        return this.promoteMemberInteractive(targetProfile.PublicProfile, targetProfile.Position);
      case 'demote':
        return this.demoteMemberInteractive(targetProfile.PublicProfile);
      default:
        this.writeLine(`Unknown action "${action}".`);

        return 1;
    }
  }

  private async promoteMemberInteractive(publicProfile: PublicProfile, currentPosition: GroupPosition) {
    const groupPosition = await ConsoleHelper.select({
      message: 'Select a group position:',
      choices: Object.entries(GroupPosition)
        .filter(([key]) => !Number.isNaN(Number(key)))
        .map(([key, value]) => ({
          name: `${key}: ${value}`,
          value: value as GroupPosition,
          disabled: Number(key) === currentPosition || Number(key) === GroupPosition.Leader
        }))
    });

    return this.executeUpdateClanPosition(publicProfile, groupPosition);
  }

  private async demoteMemberInteractive(publicProfile: PublicProfile) {
    return this.executeUpdateClanPosition(publicProfile, GroupPosition.Member);
  }
  // #endregion

  // #region executors
  private async executeListClanMembers(clan: Clan) {
    const clanTable = new Table({
      head: [
        chalk.white.bold('GroupId'),
        chalk.white.bold('Name'),
        chalk.white.bold('Tag'),
        chalk.white.bold('Motto'),
        chalk.white.bold('Owner'),
        chalk.white.bold('Members')
      ],
      rows: [[String(clan.GroupId), clan.Name, clan.Tag, clan.Motto, clan.OwnerName, String(clan.MembersCount)]]
    });

    this.writeLine(clanTable.toString());

    this.writeLine(`\nClan members:`);

    const membersTable = new Table({
      head: [
        chalk.white.bold('Cmid'),
        chalk.white.bold('Name'),
        chalk.white.bold('Position'),
        chalk.white.bold('Joined'),
        chalk.white.bold('Last Login')
      ],
      rows: clan.Members.map((member) => [
        String(member.Cmid),
        member.Name,
        String(GroupPosition[member.Position]),
        member.JoiningDate.toISOString(),
        member.Lastlogin.toISOString()
      ])
    });

    this.writeLine(membersTable.toString());
    return 0;
  }

  private async executeUpdateClanPosition(targetProfile: PublicProfile, groupPosition: GroupPosition) {
    const spinner = yoctoSpinner({ text: 'Updating clan member...' }).start();

    try {
      await ClanMember.update(targetProfile.Cmid, {
        Position: groupPosition
      });

      spinner.stop();

      this.writeLine(
        `Member position of player "${targetProfile.Name}" has been set successfully: ${GroupPosition[groupPosition]}(${groupPosition})`
      );
    } catch (error: any) {
      spinner.stop();

      this.writeLine(error);
      return 1;
    }

    return 0;
  }

  private async executeCreateClan(name: string, tag: string, motto: string, owner: PublicProfile) {
    const spinner = yoctoSpinner({ text: 'Creating clan...' }).start();

    try {
      const clan = await Clan.save(
        Clan.create({
          GroupId: Math.randomInt(),
          Name: name,
          Motto: motto,
          FoundingDate: new Date(),
          Type: GroupType.Clan,
          LastUpdated: new Date(),
          Tag: tag,
          MembersLimit: 12,
          ApplicationId: 1,
          OwnerCmid: owner.Cmid
        })
      );

      await ClanMember.insert({
        GroupId: clan.GroupId,
        Cmid: owner.Cmid,
        Name: owner.Name,
        Position: GroupPosition.Leader,
        JoiningDate: new Date(),
        Lastlogin: owner.LastLoginDate
      });

      spinner.stop();

      this.writeLine(`Successfully created clan "${clan.Name}".`);
    } catch (error: any) {
      spinner.stop();

      this.writeLine(error);
      return 1;
    }

    return 0;
  }

  private async executeDeleteClan(clan: Clan) {
    if (
      await ConsoleHelper.confirm({
        message: `Are you sure you want to delete the clan "${clan.Name}"?`
      })
    ) {
      const spinner = yoctoSpinner({ text: 'Deleting clan...' }).start();

      try {
        await Clan.remove(clan);

        spinner.stop();

        this.writeLine(`Successfully deleted clan "${clan.Name}".`);
      } catch (error: any) {
        spinner.stop();

        this.writeLine(error);
        return 1;
      }
    }

    return 0;
  }

  private async executeTransferOwnership(clan: Clan, newLeader: PublicProfile) {
    if (
      await ConsoleHelper.confirm({
        message: `Are you sure you want to ownership of clan "${clan.Name}" to "${newLeader.Name}"?`
      })
    ) {
      const spinner = yoctoSpinner({ text: 'Transferring clan ownership...' }).start();

      try {
        const leader = await ClanMember.findOne({
          where: {
            GroupId: clan.GroupId,
            Position: GroupPosition.Leader
          }
        });

        await Clan.update(clan.GroupId, {
          OwnerCmid: newLeader.Cmid
        });

        // Probably not the best idea to switch membership positions
        // If anyone has a better idea, please contribute
        if (leader) {
          await ClanMember.update(leader.Cmid, {
            Position: newLeader.ClanMember!.Position
          });
        }

        await ClanMember.update(newLeader.Cmid, {
          Position: GroupPosition.Leader
        });

        spinner.stop();

        this.writeLine(`Successfully transferred ownership of clan "${clan.Name}" to player "${newLeader.Name}".`);
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
