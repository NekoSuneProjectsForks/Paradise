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

import type { LogSettings } from '@/ParadiseServiceSettings';
import chalk from 'chalk';
import util from 'util';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import LokiTransport from 'winston-loki';

export enum LogLevel {
  NONE,
  FATAL,
  ERROR,
  WARN,
  OK,
  INFO,
  DEBUG
}

const logger = winston.createLogger({
  level: Bun.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG',
  levels: Object.keys(LogLevel)
    .filter((key) => !(parseInt(key, 10) >= 0))
    .reduce((acc: any, cur: any) => {
      acc[cur] = LogLevel[cur];
      return acc;
    }, {})
});

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.printf(
      ({ timestamp, level, message }) =>
        `[${timestamp}] [${level}] ${level.indexOf('FATAL') >= 0 ? chalk.red(message) : message}`
    )
  )
});

logger.add(consoleTransport);

winston.addColors({
  NONE: '',
  OK: 'green',
  INFO: 'blue',
  WARN: 'yellow',
  ERROR: 'red',
  FATAL: 'redBG white',
  DEBUG: 'magenta'
});

export default class Log {
  private static _maxLogLevel: LogLevel | undefined = LogLevel.INFO;

  static set maxLogLevel(level: LogLevel | undefined) {
    console.log('set level', level);
    this._maxLogLevel = level;
  }

  static setupLogging(settings: LogSettings) {
    if (settings.LogLevel) {
      this._maxLogLevel = LogLevel[settings.LogLevel];
    }

    consoleTransport.silent = !settings.LogToConsole;

    if (settings.LogToFile) {
      logger.add(
        new DailyRotateFile({
          filename: 'Paradise.WebServices-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '512k',
          maxFiles: '10d',
          dirname: settings.LogPath ?? 'logs',
          createSymlink: true,
          symlinkName: 'Paradise.WebServices.log',
          options: {
            flags: 'w'
          },
          auditFile: './logs/.audit.json',
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
            winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] [${level}] ${message}`)
          )
        })
      );
    }

    if (settings.LokiSettings.Enabled) {
      logger.add(
        new LokiTransport({
          labels: {
            service_name: settings.LokiSettings.ServiceName
          },
          host: settings.LokiSettings.Server
        })
      );
    }
  }

  /**
   * Print a success message to stdout.
   *
   * @param message The message to print to stdout
   *
   * @example
   * ```ts
   * import { Log } from "@/utils";
   *
   * Log.success("Hello world.") // [1970-01-01 01:00:00.000] [OK] Hello world.
   * ```
   */
  static success(message: any): void {
    this.write(message, LogLevel.OK);
  }

  /**
   * Print an informative message to stdout.
   *
   * @param message The message to print to stdout
   *
   * @example
   * ```ts
   * import { Log } from "@/utils";
   *
   * Log.info("This is an info text.") // [1970-01-01 01:00:00.000] [INFO] This is an info text.
   * ```
   */
  static info(message: any): void {
    this.write(message, LogLevel.INFO);
  }

  /**
   * Print a warning message to stdout.
   *
   * @param message The message to print to stdout
   *
   * @example
   * ```ts
   * import { Log } from "@/utils";
   *
   * Log.warn("I have a bad feeling about this.") // [1970-01-01 01:00:00.000] [WARN] I have a bad feeling about this.
   * ```
   */
  static warn(message: any): void {
    this.write(message, LogLevel.WARN);
  }

  /**
   * Print an error message to stdout.
   *
   * @param message The message to print to stdout
   *
   * @example
   * ```ts
   * import { Log } from "@/utils";
   *
   * Log.error("Oh fiddlesticks, what now?") // [1970-01-01 01:00:00.000] [ERROR] Oh fiddlesticks, what now?
   * ```
   */
  static error(message: string | any, error?: any): void {
    if (message instanceof Error) {
      this.write(message.message, LogLevel.ERROR);

      if (message.stack) this.write(message.stack, LogLevel.DEBUG);
    } else if (error && error instanceof Error) {
      this.write(`${message}: ${error.message}`, LogLevel.ERROR);

      if (error.stack) this.write(error.stack, LogLevel.DEBUG);
    } else {
      this.write(message, LogLevel.ERROR);
    }
  }

  /**
   * Print a fatal error message to stdout.
   *
   * @param message The message to print to stdout
   *
   * @example
   * ```ts
   * import { Log } from "@/utils";
   *
   * Log.fatal("He's dead, Jim.") // [1970-01-01 01:00:00.000] [FATAL] He's dead, Jim.
   * ```
   */
  static fatal(message: string | any, error?: any): void {
    if (message instanceof Error) {
      this.write(message.message, LogLevel.FATAL);

      if (message.stack) this.write(message.stack, LogLevel.DEBUG);
    } else if (error && error instanceof Error) {
      this.write(`${message}: ${error.message}`, LogLevel.FATAL);

      if (error.stack) this.write(error.stack, LogLevel.DEBUG);
    } else {
      this.write(message, LogLevel.FATAL);
    }
  }

  /**
   * Print a debug message to stdout.
   *
   * @param message The message to print to stdout
   *
   * @example
   * ```ts
   * import { Log } from "@/utils";
   *
   * Log.debug("You're not supposed to be here.") // [1970-01-01 01:00:00.000] [DEBUG] You're not supposed to be here.
   * ```
   */
  static debug(message: any): void {
    this.write(message, LogLevel.DEBUG);
  }

  private static write(message: any, level: LogLevel = LogLevel.INFO): void {
    if (
      this._maxLogLevel === undefined ||
      level <= this._maxLogLevel ||
      (level === LogLevel.DEBUG && Bun.env.DEBUG === '1')
    ) {
      if (message instanceof Object) {
        logger.log(LogLevel[level], JSON.stringify(message, null, 2));
      } else {
        logger.log(LogLevel[level], message);
      }
    }
  }

  static inspect(object: any): void {
    console.log(
      util.inspect(object, {
        showHidden: false,
        depth: null,
        colors: true,
        sorted: true,
        compact: false
      })
    );
  }
}
