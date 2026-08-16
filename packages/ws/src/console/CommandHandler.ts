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

import { Log } from '@/utils';
import type { PublicProfile } from '@festivaldev/paradise-models';
import { MemberAccessLevel, PublicProfileView } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import commands, { CommandBlacklist } from './commands';
import type ConsoleCommand from './ConsoleCommand';
import type { CommandOutputArgs } from './ConsoleCommand';

interface ConsoleCommandConstructor {
  command: string;
  aliases: string[];
  description: string;

  get usageText(): string[];

  new (invocationId?: string, allowInteractive?: boolean): ConsoleCommand;
}

export default class CommandHandler {
  static get commands(): ConsoleCommandConstructor[] {
    return commands;
  }

  static get discordCommandBlacklist(): ConsoleCommandConstructor[] {
    return CommandBlacklist;
  }

  static parseInput(command: string): string[] {
    return (
      command.match(/[a-zA-Z0-9-_äÄöÖüÜ]+|"(?:\\"|[^"])+"/g)?.map((_) => (_.match(/".+"/g) ? _.slice(1, -1) : _)) ?? []
    );
  }

  static async handleCommand(
    command: string,
    args: string[],
    invocationId?: string,
    outputCallback?: (output: string, inline: boolean) => void,
    successCallback?: (invoker: ConsoleCommand) => void,
    errorCallback?: (invoker: ConsoleCommand | null, error?: string | null) => void,
    invokingUser?: PublicProfile | PublicProfileView
  ): Promise<string> {
    let allowInteractive = false;

    if (!invocationId) {
      invocationId = crypto.randomUUID();
      allowInteractive = true;
    }

    for (const commandObj of this.commands) {
      if (
        commandObj.command.localeCompare(command, undefined, { sensitivity: 'base' }) === 0 ||
        commandObj.aliases.find((alias) => alias.localeCompare(command, undefined, { sensitivity: 'base' }) === 0)
      ) {
        /* eslint-disable new-cap */
        const invoker = new commandObj(invocationId, allowInteractive);

        if (
          invokingUser &&
          invoker.minimumAccessLevel > MemberAccessLevel.Default &&
          invokingUser.AccessLevel < invoker.minimumAccessLevel
        ) {
          errorCallback?.(null, `${command}: Insufficient permissions.`);
          return invocationId!;
        }

        invoker.commandOutput = (sender: any, e: CommandOutputArgs) => {
          outputCallback?.(e.Text, e.Inline ?? false);
        };

        let result;
        try {
          result = await invoker.run(args);
        } catch (error: any) {
          if (error instanceof Error && (error.name === 'ExitPromptError' || error.name === 'AbortPromptError')) {
            return invocationId!;
          }

          Log.error(error);
          errorCallback?.(invoker);
          return invocationId!;
        }

        if (result === 0) {
          successCallback?.(invoker);
        } else {
          errorCallback?.(invoker);
        }

        return invocationId!;
      }
    }

    if (command.trim().length) {
      errorCallback?.(null, `${command}: Unknown command.`);
    }

    return invocationId!;
  }
}
