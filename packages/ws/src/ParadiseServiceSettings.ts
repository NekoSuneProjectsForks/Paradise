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

import type { PhotonServer } from '@festivaldev/paradise-models';
import { YAML } from 'bun';
import fs from 'fs';
import path from 'path';
import type { DatabaseSettings } from './Database';
import DiscordSettings from './discord/DiscordSettings';
import { Log, LogLevel } from './utils';

export type LokiSettings = {
  Enabled: boolean;
  Server: string;
  ServiceName: string;
};

export type LogSettings = {
  LogToConsole: boolean;
  LogToFile: boolean;

  LogPath: string;
  LogName: string;
  MaxFileSize: string;
  MaxRetention: string;
  LogLevel: keyof typeof LogLevel;

  LokiSettings: LokiSettings;
};

export type GameplaySettings = {
  GarbageCollectInterval: number;
  ShopFreeStaffItems: boolean;
  ShopRefundFactor: number;
};

export class ParadiseServiceSettings {
  ApplicationId: number = 1;

  Hostname: string = '127.0.0.1';

  WebServicePort: number = 8080;
  FileServerPort: number = 8081;
  SocketPort: number = 8082;

  DatabaseSettings: DatabaseSettings = {
    Type: 'sqlite',
    Filename: 'paradise.sqlite'
  };

  LogSettings: LogSettings = {
    LogToConsole: true,
    LogToFile: true,

    LogPath: 'logs',
    LogName: 'Paradise.WebServices-%DATE%.log',
    MaxFileSize: '512k',
    MaxRetention: '14d',
    LogLevel: 'INFO',

    LokiSettings: {
      Enabled: false,
      Server: 'http://127.0.0.1:3100',
      ServiceName: 'paradise'
    }
  };

  GameplaySettings: GameplaySettings = {
    GarbageCollectInterval: 300, // 5 minutes
    ShopFreeStaffItems: false,
    ShopRefundFactor: 0.75
  };

  WebServicePrefix: string = 'UberStrike.DataCenter.WebService.CWS.';
  WebServiceSuffix: string = 'Contract.svc';
  EncryptionInitVector: string = 'aaaaBBBBccccDDDD'; // Must be 16 characters
  EncryptionPassPhrase: string = 'mysupersecretpassphrase';
  PhotonServers: Partial<PhotonServer>[] = [];

  FileServerRoot: string = 'wwwroot';

  /**
   * @deprecated Use a reverse proxy to provide SSL encryption
   */
  EnableSSL: boolean = false;

  /**
   * @deprecated Use a reverse proxy to provide SSL encryption
   */
  SSLCertificateName: string = '';

  DiscordSettings: DiscordSettings = new DiscordSettings();

  constructor(filename: string = 'paradise.yml') {
    const settingsPath = path.join(process.cwd(), filename);

    if (!fs.existsSync(settingsPath)) {
      Log.warn(`No config file found at "${settingsPath}", using default config.`);
      return;
    }

    Log.debug(`Using config file at "${settingsPath}"`);

    try {
      const settings = YAML.parse(fs.readFileSync(settingsPath, 'utf-8'));

      Object.assign(this, settings);
    } catch (error: any) {
      Log.error('There was an error parsing the settings file.', error);
    }

    if (this.EncryptionInitVector.length !== 16) {
      Log.error(`EncryptionInitVector must be exactly 16 characters. (Current: ${this.EncryptionInitVector.length})`);
    }

    if (this.EnableSSL) {
      Log.warn('The "EnableSSL" setting is deprecated and will be removed in a future release.');
    }
    if (this.SSLCertificateName) {
      Log.warn('The "SSLCertificateName" setting is deprecated and will be removed in a future release.');
    }
  }
}
