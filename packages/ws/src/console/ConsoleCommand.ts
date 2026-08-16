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

import { MemberAccessLevel } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';

export type CommandOutputArgs = {
  InvocationId?: string;
  Text: string;
  Inline?: boolean;
};

export default abstract class ConsoleCommand {
  static readonly command: string = '';
  static readonly aliases: string[] = [];
  static readonly description: string = '';

  static get usageText(): string[] {
    return [`${this.command}: ${this.description}`];
  }

  minimumAccessLevel: MemberAccessLevel = MemberAccessLevel.Admin;

  invocationId?: string;
  allowInteractive: boolean;

  constructor(invocationId?: string, allowInteractive: boolean = false) {
    this.invocationId = invocationId;
    this.allowInteractive = allowInteractive;
  }

  abstract run(args: string[]): Promise<number>;

  commandOutput: (sender: any, args: CommandOutputArgs) => void;

  private readonly outputBuffer: string[] = [];

  get output(): string {
    return this.outputBuffer.join('\n');
  }

  clearOutputBuffer(): void {
    this.outputBuffer.length = 0;
  }

  writeLine(text: string): void {
    this.outputBuffer.push(text);

    this.commandOutput?.(this, {
      InvocationId: this.invocationId,
      Text: text
    });
  }

  write(text: string): void {
    if (this.outputBuffer.length > 0) {
      this.outputBuffer[this.outputBuffer.length - 1] = this.outputBuffer[this.outputBuffer.length - 1]!.concat(
        '',
        text
      );
    } else {
      this.outputBuffer.push(text);
    }

    this.commandOutput?.(this, {
      InvocationId: this.invocationId,
      Text: text,
      Inline: true
    });
  }

  printUsage(): void {
    for (const line of (this.constructor as typeof ConsoleCommand).usageText) {
      this.writeLine(line);
    }
  }
}
