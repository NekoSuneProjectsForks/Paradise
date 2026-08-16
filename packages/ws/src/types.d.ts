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

interface Array<T> {
  writeTo(stream: Array<T>): void;
}

interface Math {
  clamp(value, min, max): number;
  randomInt(min?, max?): number;
}

// #region Updates
type UpdateCatalog = {
  version: string;
  build: string;
  channel: 'stable' | 'beta';
  platforms: Record<string, UpdatePlatformDefinition>;
};

type UpdatePlatformDefinition = {
  platform: string;
  files: UpdateFile[];
  removedFiles: UpdateFile[];
};

type UpdateFile = {
  filename: string;
  description: string;
  localPath: string;
  remotePath: string;
  filesize: number;
  md5sum: string;
  sha256: string;
  sha512: string;
  optional: boolean;
};
// #endregion

declare module 'sql.js/dist/sql-wasm.wasm' {
  const wasmPath: string;
  export default wasmPath;
}
