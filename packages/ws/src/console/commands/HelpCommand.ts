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

import CommandHandler from '../CommandHandler';
import ConsoleCommand from '../ConsoleCommand';

export default class HelpCommand extends ConsoleCommand {
  static override command: string = 'help';
  static override aliases: string[] = ['h'];
  static override description: string = 'Shows this help text.';

  override async run([command]: string[]) {
    if (command) {
      const commandObj = CommandHandler.commands.find(
        (_) =>
          _.command.localeCompare(command, undefined, { sensitivity: 'base' }) === 0 ||
          _.aliases.some((_) => _.localeCompare(command, undefined, { sensitivity: 'base' }) === 0)
      );

      if (commandObj) {
        for (const line of commandObj.usageText) {
          this.writeLine(line);
        }
      }
    } else {
      const cmdLength = Math.max(...CommandHandler.commands.map((cmd) => cmd.command.length));
      const descriptionLength = Math.max(...CommandHandler.commands.map((cmd) => cmd.description.length));

      this.writeLine('Use "help <command>" to get help for a specific command.');
      this.writeLine('Available commands:\n');

      for (const commandObj of CommandHandler.commands.toSorted((a, b) =>
        a.command.localeCompare(b.command, undefined, { sensitivity: 'base' })
      )) {
        this.writeLine(
          `  ${commandObj.command.padEnd(cmdLength + 2, ' ')}${commandObj.description.padEnd(descriptionLength + 2, ' ')}${commandObj.aliases.length ? `(Alias${commandObj.aliases.length > 1 ? 'es' : ''}: ${commandObj.aliases.join(', ')})` : ''}`
        );
      }
    }

    return 0;
  }
}
