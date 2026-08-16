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

import * as entities from '@festivaldev/paradise-models';
import path from 'path';
import sqlWasm from 'sql.js/dist/sql-wasm.wasm';
import { DataSource } from 'typeorm';
import { Log } from './utils';

export type DatabaseSettings =
  | {
      Type: 'sqlite';
      Filename: string;
    }
  | {
      Type: 'mysql' | 'mariadb';
      Server: string;
      Port: number;
      DatabaseName: string;
      Username?: string;
      Password?: string;
    };

export const createDataSource = (dbSettings: DatabaseSettings) => {
  Log.debug(
    [
      `Type:${dbSettings.Type}`,
      dbSettings.Type === 'sqlite' && `Database:${path.join(process.cwd(), dbSettings.Filename)}`,
      ...(dbSettings.Type !== 'sqlite'
        ? [
            `Auth:'${dbSettings.Username}'@'${dbSettings.Server}:${dbSettings.Port}'`,
            `(using password: ${dbSettings.Password?.length! > 0 ? 'YES' : 'NO'})`
          ]
        : [])
    ]
      .filter(Boolean)
      .join(' ')
  );

  switch (dbSettings.Type) {
    case 'mysql':
    case 'mariadb':
      return new DataSource({
        type: dbSettings.Type,
        host: dbSettings.Server,
        port: dbSettings.Port,
        database: dbSettings.DatabaseName,
        username: dbSettings.Username,
        password: dbSettings.Password,
        entities,
        timezone: 'Z'
      });
    case 'sqlite':
      return new DataSource({
        type: 'sqljs',
        autoSave: true,
        location: path.isAbsolute(dbSettings.Filename)
          ? dbSettings.Filename
          : path.join(process.cwd(), dbSettings.Filename),
        entities,
        sqlJsConfig: {
          locateFile: () => sqlWasm
        }
      });
    default:
      throw new Error('Unsupported database type');
  }
};
