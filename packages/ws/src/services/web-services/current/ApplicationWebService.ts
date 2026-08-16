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
import { ApiVersion } from '@/utils/enums';
import { ApplicationConfiguration, Map, PhotonServer } from '@festivaldev/paradise-models';
import type { PhotonView } from '@festivaldev/uberstrike-js/Cmune/Core/Models/Views';
import { ChannelType, PhotonUsageType } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import { ApplicationConfigurationView, MapView } from '@festivaldev/uberstrike-js/UberStrike/Core/Models/Views';
import {
  ApplicationConfigurationViewProxy,
  AuthenticateApplicationViewProxy,
  EnumProxy,
  ListProxy,
  MapViewProxy,
  MatchStatsProxy,
  StringProxy
} from '@festivaldev/uberstrike-js/UberStrike/Core/Serialization';
import type { DefinitionType } from '@festivaldev/uberstrike-js/UberStrike/Core/Types';
import { AuthenticateApplicationView } from '@festivaldev/uberstrike-js/UberStrike/DataCenter/Common/Entities';
import BaseWebService from '../BaseWebService';

export default class ApplicationWebService extends BaseWebService {
  static override get ServiceName(): string {
    return 'ApplicationWebService';
  }

  static override get ServiceVersion(): string {
    return ApiVersion.Current;
  }

  static supportedClientVersions: string[] = ['4.7.1'];
  static supportedClientChannels: ChannelType[] = [ChannelType.Steam];

  static async AuthenticateApplication(data: number[], outputStream: number[]): Promise<number[] | null> {
    const bytes = data;

    try {
      const clientVersion = StringProxy.Deserialize(bytes);
      const channelType = EnumProxy.Deserialize<ChannelType>(bytes);
      const publicKey = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ clientVersion, channelType, publicKey });

      if (!ApplicationWebService.supportedClientChannels.includes(channelType)) {
        AuthenticateApplicationViewProxy.Serialize(
          outputStream,
          new AuthenticateApplicationView({
            IsEnabled: false
          })
        );
      } else {
        const [gameServers, commServer] = await Promise.all([
          PhotonServer.find({ where: { UsageType: PhotonUsageType.All, Enabled: true } }),
          PhotonServer.findOne({
            where: {
              UsageType: PhotonUsageType.CommServer,
              Enabled: true
            },
            order: {
              MinLatency: 'ASC'
            }
          })
        ]);

        AuthenticateApplicationViewProxy.Serialize(
          outputStream,
          new AuthenticateApplicationView({
            IsEnabled: true,
            GameServers: gameServers as PhotonView[],
            CommServer: commServer as PhotonView,
            WarnPlayer: !ApplicationWebService.supportedClientVersions.includes(clientVersion),
            EncryptionInitVector: this.EncryptionInitVector,
            EncryptionPassPhrase: this.EncryptionPassPhrase
          })
        );
      }

      return outputStream;
    } catch (e) {
      this.handleEndpointError('AuthenticateApplication', e);
    }

    return null;
  }

  static async GetConfigurationData(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const clientVersion = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ clientVersion });

      if (ApplicationWebService.supportedClientVersions.includes(clientVersion)) {
        const applicationConfiguration = await ApplicationConfiguration.findOne({
          where: {
            ApplicationId: ParadiseService.Instance.ServiceSettings.ApplicationId
          }
        });

        ApplicationConfigurationViewProxy.Serialize(
          outputStream,
          new ApplicationConfigurationView({ ...applicationConfiguration! })
        );
      }

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (e) {
      this.handleEndpointError('GetConfigurationData', e);
    }

    return null;
  }

  static async GetMaps(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const clientVersion = StringProxy.Deserialize(bytes);
      const clientType = EnumProxy.Deserialize<DefinitionType>(bytes);

      this.debugEndpointData({ clientVersion, clientType });

      if (ApplicationWebService.supportedClientVersions.includes(clientVersion)) {
        const maps = await Map.find({ relations: { Settings: true } }).then((maps) =>
          // Maps with an empty file name are "embedded" in the client and don't require a filename to load
          maps.filter((map) => map.FileName?.[clientVersion] !== undefined && !map.FileName?.[clientVersion].length)
        );

        const mapData: MapView[] = maps.reduce((acc: any[], cur: Map) => {
          acc.push({
            ...cur,
            SceneName: cur.SceneName[clientVersion] || cur.SceneName.default,
            FileName: cur.FileName?.[clientVersion]
          });

          return acc;
        }, []);

        ListProxy.Serialize(outputStream, mapData, MapViewProxy.Serialize);
      }

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (e) {
      this.handleEndpointError('GetMaps', e);
    }

    return null;
  }

  static async SetMatchScore(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const clientVersion = StringProxy.Deserialize(bytes);
      const scoringView = MatchStatsProxy.Deserialize(bytes);
      const serverAuthentication = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ clientVersion, scoringView, serverAuthentication });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('SetMatchScore', e);
    }

    return null;
  }
}
