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

import ParadiseService from '@/ParadiseService';
import { Log, RijndaelCryptographyPolicy } from '@/utils';

export default abstract class BaseWebService {
  static get ServiceName(): string | undefined {
    return undefined;
  }

  static get ServiceVersion(): string | undefined {
    return undefined;
  }

  static get ServiceInterface(): string | undefined {
    if (!this.ServiceName?.length) return undefined;

    return `I${this.ServiceName}Contract`;
  }

  static readonly CryptoPolicy = new RijndaelCryptographyPolicy();

  static get EncryptionPassPhrase(): string {
    return ParadiseService.Instance.ServiceSettings.EncryptionPassPhrase;
  }

  static get EncryptionInitVector(): string {
    return ParadiseService.Instance.ServiceSettings.EncryptionInitVector;
  }

  protected static debugEndpointData(data: any): void {
    if (!Object.keys(data).length) return;

    Log.debug(
      `\n\
${Object.entries(data)
  .map(([key, value]) => `  [${typeof value}] ${key} = ${typeof value === 'string' ? `"${value}"` : value}`)
  .join('\n')}`
    );
  }

  protected static handleEndpointError(serviceMethod: string, error: any): void {
    Log.error(`Failed to handle ${this.ServiceName}(${this.ServiceVersion}):${serviceMethod}: ${error.message}`, error);
  }

  static isEncrypted(data: number[]): boolean {
    try {
      this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector);
      return true;
    } catch {
      return false;
    }
  }
}
