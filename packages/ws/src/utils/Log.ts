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
import winston, { type Logger as WinstonLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import LokiTransport from 'winston-loki';

export enum LogLevel {
  FATAL = 1,
  ERROR,
  WARN,
  OK,
  INFO,
  DEBUG
}

export enum LogChannel {
  Console = 1 << 0,
  File = 1 << 1,
  Loki = 1 << 2
}

const DEFAULT_CHANNELS: LogChannel = LogChannel.Console | LogChannel.File | LogChannel.Loki;

export default class Log {
  private static consoleLogger: WinstonLogger | undefined;
  private static fileLogger: WinstonLogger | undefined;
  private static lokiLogger: WinstonLogger | undefined;

  static maxLogLevel: LogLevel = LogLevel.INFO;

  static get Console(): WinstonLogger | undefined {
    return this.consoleLogger;
  }

  static get File(): WinstonLogger | undefined {
    return this.fileLogger;
  }

  static get Loki(): WinstonLogger | undefined {
    return this.lokiLogger;
  }

  static {
    winston.addColors({
      FATAL: 'redBG white',
      ERROR: 'red',
      WARN: 'yellow',
      OK: 'green',
      INFO: 'blue',
      DEBUG: 'magenta'
    });
  }

  static setupLog(settings: LogSettings) {
    if (settings.LogLevel) {
      this.maxLogLevel = LogLevel[settings.LogLevel];
    }

    const levels = Object.keys(LogLevel)
      .filter((key) => isNaN(Number(key)))
      .reduce(
        (acc: Record<string, number>, cur) => ({
          ...acc,
          [cur]: LogLevel[cur as keyof typeof LogLevel]
        }),
        {}
      );

    if (settings.LogToConsole) {
      this.consoleLogger = winston.createLogger({
        level: Bun.env.DEBUG === '1' ? 'DEBUG' : LogLevel[this.maxLogLevel],
        levels,
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
              winston.format.printf(
                ({ timestamp, level, message }) =>
                  `[${timestamp}] [${level}] ${level.indexOf('FATAL') >= 0 ? chalk.red(message) : message}`
              )
            )
          })
        ]
      });
    }

    if (settings.LogToFile) {
      this.fileLogger = winston.createLogger({
        level: Bun.env.DEBUG === '1' ? 'DEBUG' : LogLevel[this.maxLogLevel],
        levels,
        transports: [
          new DailyRotateFile({
            filename: settings.LogName ?? 'Paradise.WebServices-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: settings.MaxFileSize ?? '512k',
            maxFiles: settings.MaxRetention ?? '14d',
            dirname: settings.LogPath ?? 'logs',
            createSymlink: true,
            symlinkName: 'Paradise.WebServices.log',
            options: {
              flags: 'a' // Open for append
            },
            auditFile: './logs/.audit.json',
            format: winston.format.combine(
              winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
              winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] [${level}] ${message}`)
            )
          })
        ]
      });
    }

    if (settings.LokiSettings.Enabled) {
      this.lokiLogger = winston.createLogger({
        level: Bun.env.DEBUG === '1' ? 'DEBUG' : LogLevel[this.maxLogLevel],
        levels,
        transports: [
          new LokiTransport({
            host: settings.LokiSettings.Server,
            labels: {
              service_name: settings.LokiSettings.ServiceName
            },
            format: winston.format.combine(
              winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
              winston.format.printf(({ timestamp, level, message }) => String(message))
            )
          })
        ]
      });
    }
  }

  static write(
    message: any,
    level: LogLevel = LogLevel.INFO,
    channel: LogChannel = LogChannel.Console | LogChannel.File
  ) {
    if ((channel & LogChannel.Console) === LogChannel.Console && this.consoleLogger) {
      this.write_internal(message, level, this.consoleLogger);
    }

    if ((channel & LogChannel.File) === LogChannel.File && this.fileLogger) {
      this.write_internal(message, level, this.fileLogger);
    }

    if ((channel & LogChannel.Loki) === LogChannel.Loki && this.lokiLogger) {
      this.write_internal(message, level, this.lokiLogger);
    }
  }

  private static write_internal(message: any, level: LogLevel = LogLevel.INFO, logger: WinstonLogger): void {
    if (message instanceof Object) {
      logger.log(LogLevel[level], JSON.stringify(message, null, 2));
    } else {
      logger.log(LogLevel[level], message);
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
      this.write(message.message, LogLevel.FATAL, DEFAULT_CHANNELS);

      if (message.stack) this.write(message.stack, LogLevel.DEBUG, DEFAULT_CHANNELS);
    } else if (error && error instanceof Error) {
      this.write(`${message}: ${error.message}`, LogLevel.FATAL, DEFAULT_CHANNELS);

      if (error.stack) this.write(error.stack, LogLevel.DEBUG, DEFAULT_CHANNELS);
    } else {
      this.write(message, LogLevel.FATAL, DEFAULT_CHANNELS);
    }
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
      this.write(message.message, LogLevel.ERROR, DEFAULT_CHANNELS);

      if (message.stack) this.write(message.stack, LogLevel.DEBUG, DEFAULT_CHANNELS);
    } else if (error && error instanceof Error) {
      this.write(`${message}: ${error.message}`, LogLevel.ERROR, DEFAULT_CHANNELS);

      if (error.stack) this.write(error.stack, LogLevel.DEBUG, DEFAULT_CHANNELS);
    } else {
      this.write(message, LogLevel.ERROR, DEFAULT_CHANNELS);
    }
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
    this.write(message, LogLevel.WARN, DEFAULT_CHANNELS);
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
    this.write(message, LogLevel.OK, DEFAULT_CHANNELS);
  }

  // #region Log Functions
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
    this.write(message, LogLevel.INFO, DEFAULT_CHANNELS);
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
    this.write(message, LogLevel.DEBUG, DEFAULT_CHANNELS);
  }
  // #endregion

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
