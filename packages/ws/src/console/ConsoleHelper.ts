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

import packageJson from '@/../package.json';
import ParadiseService from '@/ParadiseService';
import {
  checkbox as checkboxPrompt,
  confirm as confirmPrompt,
  input,
  number,
  password,
  search as searchPrompt,
  select as selectPrompt,
  Separator
} from '@inquirer/prompts';
import chalk from 'chalk';

type Choice<T> = {
  value: T;
  name?: string;
  description?: string;
  short?: string;
  checked?: boolean;
  disabled?: boolean | string;
};

export default class ConsoleHelper {
  static printConsoleHeader(): void {
    console.log(`Paradise Web Services [Version ${packageJson.version}]`);
    console.log(`(c) 2017, 2022-${new Date().getFullYear()} Team FESTIVAL. All rights reserved.`);
    console.log(`Made with \u2665 using Bun ${Bun.version}.\n`);
  }

  static printConsoleHeaderSubtitle(): void {
    console.log('\r\nType "help" (or "h") to see available commands.');
  }

  static async confirm({
    message,
    defaultValue = false
  }: {
    message: string;
    defaultValue?: boolean;
  }): Promise<boolean> {
    return confirmPrompt(
      {
        message,
        default: defaultValue,
        theme: ConsoleHelper.defaultInquirerTheme as any
      },
      {
        signal: ParadiseService.Instance.AbortController?.signal
      }
    );
  }

  static async promptText({
    message,
    defaultValue,
    required = false,
    validate
  }: {
    message: string;
    defaultValue?: string;
    required?: boolean;
    validate?: (value: string) => boolean | string | Promise<boolean | string>;
  }): Promise<string> {
    return input(
      {
        message,
        default: defaultValue,
        required,
        validate,
        theme: this.defaultInquirerTheme as any
      },
      {
        signal: ParadiseService.Instance.AbortController?.signal
      }
    );
  }

  static async promptNumber({
    message,
    defaultValue,
    min,
    max,
    required = false,
    validate
  }: {
    message: string;
    defaultValue?: number;
    min?: number;
    max?: number;
    required?: boolean;
    validate?: (value: number | undefined) => boolean | string | Promise<boolean | string>;
  }): Promise<number | undefined> {
    return number(
      {
        message,
        default: defaultValue,
        min,
        max,
        required,
        validate,
        theme: this.defaultInquirerTheme as any
      },
      {
        signal: ParadiseService.Instance.AbortController?.signal
      }
    );
  }

  static async promptPassword({
    message,
    validate
  }: {
    message: string;
    validate?: (value: string) => boolean | string | Promise<boolean | string>;
  }): Promise<string> {
    return password(
      {
        message,
        mask: true,
        validate,
        theme: this.defaultInquirerTheme as any
      },
      {
        signal: ParadiseService.Instance.AbortController?.signal
      }
    );
  }

  static async select<T>({
    message,
    defaultValue,
    choices
  }: {
    message: string;
    defaultValue?: T;
    choices: (Choice<T> | Separator)[];
  }): Promise<T> {
    return selectPrompt(
      {
        message,
        default: defaultValue,
        choices,
        loop: false,
        theme: this.defaultInquirerTheme as any
      },
      {
        signal: ParadiseService.Instance.AbortController?.signal
      }
    );
  }

  static async checkbox<T>({
    message,
    choices
  }: {
    message: string;
    defaultValue?: T;
    choices: (Separator | T | Choice<T>)[];
  }): Promise<T[]> {
    return checkboxPrompt(
      {
        message,
        choices,
        loop: false,
        theme: this.defaultInquirerTheme as any
      },
      {
        signal: ParadiseService.Instance.AbortController?.signal
      }
    );
  }

  static async search<T>({
    message,
    defaultValue,
    source
  }: {
    message: string;
    defaultValue?: T;
    source: (term: string | void) => Promise<(Choice<T> | Separator)[]>;
  }): Promise<T> {
    return searchPrompt(
      {
        message,
        default: defaultValue,
        source,
        theme: this.defaultInquirerTheme as any
      },
      {
        signal: ParadiseService.Instance.AbortController?.signal
      }
    );
  }

  static get defaultInquirerTheme() {
    return {
      prefix: {
        done: `\r\u001b[1A\u001b[K${chalk.green('✔')}`
      },
      style: {
        // message: (text: string, status: 'idle' | 'done' | 'loading') =>
        //   (status === 'idle' && chalk.bold(text)) || undefined,
        // answer: () => '',
        keysHelpTip: () => undefined
      }
    };
  }
}
