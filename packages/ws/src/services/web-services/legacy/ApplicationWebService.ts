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

import { ApiVersion } from '@/utils/enums';
import ParadiseService from '@/ParadiseService';
import { Map, PhotonServer, UserAccount } from '@festivaldev/paradise-models';
import type { PhotonView } from '@festivaldev/uberstrike-js/Cmune/Core/Models/Views';
import { BuildType, ChannelType, PhotonUsageType } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import type { MapView } from '@festivaldev/uberstrike-js/UberStrike/Core/Models/Views';
import {
  EnumProxy,
  Int32Proxy,
  ListProxy,
  StringProxy
} from '@festivaldev/uberstrike-js/UberStrike/Core/Serialization';
import {
  ApplicationViewProxy,
  AuthenticateApplicationViewProxy,
  BugViewProxy,
  MapViewProxy
} from '@festivaldev/uberstrike-js/UberStrike/Core/Serialization/Legacy';
import { DefinitionType, LocaleType, TutorialStepType } from '@festivaldev/uberstrike-js/UberStrike/Core/Types';
import { AuthenticateApplicationView } from '@festivaldev/uberstrike-js/UberStrike/DataCenter/Common/Entities';
import BaseWebService from '../BaseWebService';

export default class ApplicationWebService extends BaseWebService {
  static override get ServiceName(): string {
    return 'ApplicationWebService';
  }

  static override get ServiceVersion(): string {
    return ApiVersion.Legacy;
  }

  static supportedClientVersions: string[] = ['4.3.10'];
  static supportedClientChannels: ChannelType[] = [ChannelType.WindowsStandalone, ChannelType.OSXStandalone];

  static async GetPhotonServers(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const applicationView = ApplicationViewProxy.Deserialize(bytes);

      this.debugEndpointData({ applicationView });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('GetPhotonServers', e);
    }

    return null;
  }

  static async GetMyIP(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      this.debugEndpointData({});

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('GetMyIP', e);
    }

    return null;
  }

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
        const [configuredGameServers, commServer] = await Promise.all([
          PhotonServer.find({
            where: {
              UsageType: PhotonUsageType.All,
              Enabled: true,
              ApiVersion: ApiVersion.Legacy
            }
          }),
          PhotonServer.findOne({
            where: {
              UsageType: PhotonUsageType.CommServer,
              Enabled: true,
              ApiVersion: ApiVersion.Legacy
            },
            order: {
              MinLatency: 'ASC'
            }
          })
        ]);

        // The directory is a discovery source, not a replacement for the legacy
        // AuthenticateApplication protocol. Only verified, fresh, compatible
        // public game records are adapted to the PhotonView shape the client expects.
        const directoryUrl =
          ParadiseService.Instance.ServiceSettings.CommunityDirectory.Url ||
          'https://paradise-directory.nekosunevr.co.uk/';
        let gameServers: PhotonView[] = configuredGameServers as PhotonView[];
        try {
          const directoryResponse = await fetch(new URL('/api/community/servers', directoryUrl), {
            signal: AbortSignal.timeout(
              Math.max(250, Math.min(10000, ParadiseService.Instance.ServiceSettings.CommunityDirectory.RequestTimeout || 2500))
            ),
            headers: { Accept: 'application/json' }
          });
          if (!directoryResponse.ok) {
            throw new Error(`directory returned HTTP ${directoryResponse.status}`);
          }

          const directoryPayload = (await directoryResponse.json()) as {
            servers?: Array<{
              id?: string;
              name?: string;
              address?: string;
              port?: number;
              region?: string;
              protocol_version?: string;
              status?: string;
              usage_type?: string;
            }>;
          };
          if (!Array.isArray(directoryPayload.servers)) {
            throw new Error('directory response did not contain a servers array');
          }

          gameServers = directoryPayload.servers
            .filter((server) =>
              server.status === 'online' &&
              server.usage_type === 'game' &&
              server.protocol_version === '4.3.10' &&
              typeof server.id === 'string' &&
              typeof server.name === 'string' &&
              typeof server.address === 'string' &&
              Number.isInteger(server.port) &&
              (server.port as number) > 0 &&
              (server.port as number) <= 65535
            )
            .map((server, index) => ({
              PhotonId: Number.parseInt((server.id as string).replaceAll('-', '').slice(-7), 16) || index + 1,
              Guid: server.id as string,
              // Game clients connect to the public endpoint; server credentials remain private.
              Passphrase: '',
              IP: server.address as string,
              Port: server.port as number,
              Name: server.name as string,
              Enabled: true,
              ApiVersion: ApiVersion.Legacy,
              Region: Number.parseInt(server.region || '', 10) || 0,
              UsageType: PhotonUsageType.All,
              MinLatency: null,
              LastResponseTime: null
            }) as PhotonView[];
        } catch (error) {
          // Keep existing local configuration available during directory outages.
          // A successful empty list is authoritative and must not expose unverified rows.
          console.warn('[Directory] Could not load community servers; using configured Paradise servers.', error);
        }

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

  static async RecordException(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const cmid = Int32Proxy.Deserialize(bytes);
      const buildType = EnumProxy.Deserialize<BuildType>(bytes);
      const channelType = EnumProxy.Deserialize<ChannelType>(bytes);
      const buildNumber = StringProxy.Deserialize(bytes);
      const logString = StringProxy.Deserialize(bytes);
      const stackTrace = StringProxy.Deserialize(bytes);
      const exceptionData = StringProxy.Deserialize(bytes);

      this.debugEndpointData({
        cmid,
        buildType,
        channelType,
        buildNumber,
        logString,
        stackTrace,
        exceptionData
      });

      // throw new Error('Not Implemented');
      return outputStream;
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('RecordException', e);
    }

    return null;
  }

  static async RecordExceptionUnencrypted(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const buildType = EnumProxy.Deserialize<BuildType>(bytes);
      const channelType = EnumProxy.Deserialize<ChannelType>(bytes);
      const buildNumber = StringProxy.Deserialize(bytes);
      const errorType = StringProxy.Deserialize(bytes);
      const errorMessage = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ buildType, channelType, buildNumber, errorType, errorMessage });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('RecordExceptionUnencrypted', e);
    }

    return null;
  }

  static async RecordTutorialStep(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const cmid = Int32Proxy.Deserialize(bytes);
      const step = EnumProxy.Deserialize<TutorialStepType>(bytes);

      this.debugEndpointData({ cmid, step });

      await UserAccount.update(cmid, {
        TutorialStep: step
      });

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (e) {
      this.handleEndpointError('RecordTutorialStep', e);
    }

    return null;
  }

  static async ReportBug(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const bugView = BugViewProxy.Deserialize(bytes);

      this.debugEndpointData({ bugView });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('ReportBug', e);
    }

    return null;
  }

  static async GetLiveFeed(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      this.debugEndpointData({});

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('GetLiveFeed', e);
    }

    return null;
  }

  static async GetMaps(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const appVersion = StringProxy.Deserialize(bytes);
      const locale = EnumProxy.Deserialize<LocaleType>(bytes);
      const definition = EnumProxy.Deserialize<DefinitionType>(bytes);

      this.debugEndpointData({ appVersion, locale, definition });

      if (ApplicationWebService.supportedClientVersions.includes(appVersion)) {
        const maps = await Map.find({ relations: { Settings: true } }).then((maps) =>
          // Legacy maps always have a filename because they're loose files in the game folder
          maps.filter((map) => map.FileName?.[appVersion] !== undefined)
        );

        const mapData: MapView[] = maps.reduce((acc: any[], cur: Map) => {
          acc.push({
            ...cur,
            SceneName: cur.SceneName[appVersion] || cur.SceneName.default,
            FileName: cur.FileName?.[appVersion],
            Settings: cur.Settings.reduce((acc: { [key: number]: any }, cur) => {
              acc[cur.GameModeType!] = {
                ...cur,
                MapId: undefined,
                GameModeType: undefined
              };

              return acc;
            }, {})
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

  static async GetItemAssetBundles(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const appVersion = StringProxy.Deserialize(bytes);
      const definition = EnumProxy.Deserialize<DefinitionType>(bytes);

      this.debugEndpointData({ appVersion, definition });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('GetItemAssetBundles', e);
    }

    return null;
  }

  static async SetLevelVersion(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const id = Int32Proxy.Deserialize(bytes);
      const version = Int32Proxy.Deserialize(bytes);
      const md5Hash = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ id, version, md5Hash });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('SetLevelVersion', e);
    }

    return null;
  }

  static async GetPhotonServerName(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const applicationVersion = StringProxy.Deserialize(bytes);
      const ipAddress = StringProxy.Deserialize(bytes);
      const port = Int32Proxy.Deserialize(bytes);

      this.debugEndpointData({ applicationVersion, ipAddress, port });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('GetPhotonServerName', e);
    }

    return null;
  }

  static async IsAlive(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      this.debugEndpointData({});

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('IsAlive', e);
    }

    return null;
  }
}
