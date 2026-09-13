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
import { program } from 'commander';
import path from 'path';
import seedrandom from 'seedrandom';
import ParadiseService from './ParadiseService';
import { ParadiseServiceSettings, type LogSettings } from './ParadiseServiceSettings';
import runSeed from './seed/seed';
import { Log, LogLevel, UpdateGenerator } from './utils';

const r = seedrandom(String(new Date().getTime()));

// #region Extensions
// eslint-disable-next-line no-extend-native
Array.prototype.writeTo = function (byteArray: number[]) {
  for (const _ of this) {
    byteArray.push(_);
  }
};

Math.clamp = function (value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
};

Math.randomInt = function (min = 1, max = 2147483647) {
  return Math.floor(r() * (max - min) + min);
};
// #endregion

program
  .name('paradise')
  .description(packageJson.description)
  .version(packageJson.version)
  .helpOption('--help', 'Displays this help text')
  .helpCommand(false)
  .option('--settings-file <PATH>', 'Specify the settings file to use')
  .option('--log-level <LEVEL>', 'Set the log level', (value: string) => {
    if (!isNaN(Number(value)) && value in LogLevel) return Number(value);
    if (value.toUpperCase() in LogLevel) return LogLevel[value.toUpperCase() as keyof typeof LogLevel];

    return -1;
  })
  .option('--debug', 'Enable debug mode')
  .option('--console', 'Disables all services and enables console mode for managing a Web Services instance.')
  .option('--service', 'Disables console prompts for use as a background service.')
  .addHelpText('after', '\nRun without any parameters to launch the Web Services.')
  .action(async ({ logLevel, debug, settingsFile, console: consoleMode = false, service = false }, command) => {
    process.stdout.write('\x1bc');

    const settings = new ParadiseServiceSettings(settingsFile);

    Log.setupLog(settings.LogSettings);

    if (logLevel >= 0) Log.maxLogLevel = logLevel;
    if (debug) Log.maxLogLevel = LogLevel.DEBUG;

    const paradiseService = new ParadiseService(settings);

    paradiseService.run({
      serviceHost: !consoleMode || service,
      prompt: !service || consoleMode
    });
  });

program
  .command('gen-updates')
  .description('Generates YAML definitions for automatic game updates')
  // .option('--fallback', 'Generate fallback definitions for pre-v2 update clients')
  .action((options, command) => {
    Log.setupLog({
      LogToConsole: true,
      LogToFile: false,
      LokiSettings: {
        Enabled: false
      }
    } as LogSettings);

    UpdateGenerator.generate(path.join(process.cwd(), 'wwwroot/updates/v2'));
  });

program
  .command('seed')
  .description('Initializes the database using the default schema and inserts base data.')
  .option('--reset', 'Resets the database to default values.')
  .option('--economy', 'Adds realistic pricing to shop items.')
  .action(async ({ reset, economy }) => {
    const { settingsFile } = program.opts();

    runSeed(new ParadiseServiceSettings(settingsFile), reset, economy);
  });

program.parse();
