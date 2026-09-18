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
import { Log, LogChannel, LogLevel } from '@/utils';
import { ApiVersion } from '@/utils/enums';
import {
  GameRoom,
  ItemTransaction,
  Map,
  MapSettings,
  MemberWallet,
  PlayerInventoryItem,
  PlayerMachine,
  PublicProfile
} from '@festivaldev/paradise-models';
import { BuyItemResult, type ChannelType } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import { ConnectionAddress, GameRoomData } from '@festivaldev/uberstrike-js/UberStrike/Core/Models';
import type { ParadiseMapView } from '@festivaldev/uberstrike-js/UberStrike/Core/Models/Views';
import {
  DictionaryProxy,
  EnumProxy,
  GameRoomDataProxy,
  Int32Proxy,
  Int64Proxy,
  ListProxy,
  ParadiseMapViewProxy,
  StringProxy
} from '@festivaldev/uberstrike-js/UberStrike/Core/Serialization';
import { DefinitionType } from '@festivaldev/uberstrike-js/UberStrike/Core/Types';
import BaseWebService from '../BaseWebService';
import ApplicationWebService from './ApplicationWebService';

export default class ParadiseWebService extends BaseWebService {
  static override get ServiceName(): string {
    return 'ParadiseWebService';
  }

  static override get ServiceVersion(): string {
    return ApiVersion.Current;
  }

  static async GetCustomMaps(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const clientVersion = StringProxy.Deserialize(bytes);
      const clientType = EnumProxy.Deserialize<DefinitionType>(bytes);

      this.debugEndpointData({ clientVersion, clientType });

      if (ApplicationWebService.supportedClientVersions.includes(clientVersion)) {
        const maps = await Map.find().then((mapList) =>
          mapList.filter((map) => map.FileName?.[clientVersion] !== undefined && map.FileName?.[clientVersion].length)
        );

        const mapSettings = await MapSettings.find();

        const mapData: ParadiseMapView[] = maps.reduce((acc: any[], cur: Map) => {
          acc.push({
            ...cur,
            SceneName: cur.SceneName[clientVersion] || cur.SceneName.default,
            FileName: cur.FileName?.[clientVersion],
            Settings: mapSettings
              .filter((_) => _.MapId === cur.MapId)
              .reduce((acc: { [key: number]: any }, cur) => {
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

        ListProxy.Serialize(outputStream, mapData, ParadiseMapViewProxy.Serialize);
      }

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (e) {
      this.handleEndpointError('GetCustomMaps', e);
    }

    return null;
  }

  static async RecordPlayerMachineData(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const clientVersion = StringProxy.Deserialize(bytes);
      const paradiseVersion = StringProxy.Deserialize(bytes);
      const paradiseBuild = StringProxy.Deserialize(bytes);
      const cmid = Int32Proxy.Deserialize(bytes);
      const systemIdentifer = StringProxy.Deserialize(bytes);
      const systemVendor = StringProxy.Deserialize(bytes);
      const systemModel = StringProxy.Deserialize(bytes);
      const systemDeviceType = StringProxy.Deserialize(bytes);
      const systemOperatingSystem = StringProxy.Deserialize(bytes);
      const systemProcessorVendor = StringProxy.Deserialize(bytes);
      const systemProcessorModel = StringProxy.Deserialize(bytes);
      const systemCoreCount = Int32Proxy.Deserialize(bytes);
      const systemThreadCount = Int32Proxy.Deserialize(bytes);
      const systemMemory = Int64Proxy.Deserialize(bytes);
      const gpuVendor = StringProxy.Deserialize(bytes);
      const gpuModel = StringProxy.Deserialize(bytes);
      const gpuVendorId = StringProxy.Deserialize(bytes);
      const gpuDeviceId = StringProxy.Deserialize(bytes);
      const gpuMemory = Int64Proxy.Deserialize(bytes);
      const gpuDriverVersion = StringProxy.Deserialize(bytes);

      this.debugEndpointData({
        clientVersion,
        paradiseVersion,
        paradiseBuild,
        cmid,
        systemIdentifer,
        systemVendor,
        systemModel,
        systemDeviceType,
        systemOperatingSystem,
        systemProcessorVendor,
        systemProcessorModel,
        systemCoreCount,
        systemThreadCount,
        systemMemory,
        gpuVendor,
        gpuModel,
        gpuVendorId,
        gpuDeviceId,
        gpuMemory,
        gpuDriverVersion
      });

      await PlayerMachine.save({
        Cmid: cmid,
        SystemIdentifier: systemIdentifer,
        SystemVendor: systemVendor,
        SystemModel: systemModel,
        SystemDeviceType: systemDeviceType,
        SystemOperatingSystem: systemOperatingSystem,
        SystemProcessorVendor: systemProcessorVendor,
        SystemProcessorModel: systemProcessorModel,
        SystemCoreCount: systemCoreCount,
        SystemThreadCount: systemThreadCount,
        SystemMemory: systemMemory,
        GPUVendor: gpuVendor,
        GPUModel: gpuModel,
        GPUVendorID: gpuVendorId,
        GPUDeviceID: gpuDeviceId,
        GPUMemory: gpuMemory,
        GPUDriverVersion: gpuDriverVersion,
        ClientVersion: clientVersion,
        ParadiseVersion: paradiseVersion,
        ParadiseBuild: paradiseBuild
      });

      Int32Proxy.Serialize(outputStream, 0);

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (e) {
      this.handleEndpointError('RecordPlayerMachineData', e);
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
      const channel = EnumProxy.Deserialize<ChannelType>(bytes);
      const version = StringProxy.Deserialize(bytes);
      const paradiseVersion = StringProxy.Deserialize(bytes);
      const paradiseBuild = StringProxy.Deserialize(bytes);
      const exceptionMessage = StringProxy.Deserialize(bytes);
      const stackTrace = StringProxy.Deserialize(bytes);
      const exceptionData = StringProxy.Deserialize(bytes);

      this.debugEndpointData({
        cmid,
        channel,
        version,
        paradiseVersion,
        paradiseBuild,
        exceptionMessage,
        stackTrace,
        exceptionData
      });

      Log.write(
        { cmid, channel, version, paradiseVersion, paradiseBuild, exceptionMessage, stackTrace, exceptionData },
        LogLevel.ERROR,
        LogChannel.Console | LogChannel.File | LogChannel.Loki
      );

      Int32Proxy.Serialize(outputStream, 0);

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (e) {
      this.handleEndpointError('RecordException', e);
    }

    return null;
  }

  static async RemoveItemFromInventory(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const itemId = Int32Proxy.Deserialize(bytes);
      const authToken = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ itemId, authToken });

      const session = await ParadiseService.Instance.SessionManager.findSessionForSteamUser(authToken);
      if (session) {
        const steamMember = await session.SteamMember;

        if (!steamMember) {
          Int32Proxy.Serialize(outputStream, BuyItemResult.InvalidMember);
        } else {
          const publicProfile = await PublicProfile.findOne({ where: { Cmid: steamMember.Cmid } });

          if (!publicProfile) {
            Int32Proxy.Serialize(outputStream, BuyItemResult.InvalidMember);
          } else {
            const transaction = await ItemTransaction.findOne({ where: { Cmid: publicProfile.Cmid, ItemId: itemId } });
            const item = await PlayerInventoryItem.findOne({ where: { Cmid: publicProfile.Cmid, ItemId: itemId } });

            if (!transaction && !item) {
              Int32Proxy.Serialize(outputStream, BuyItemResult.InvalidData);
              // eslint-disable-next-line no-else-return
            } else if (!transaction && item) {
              // Allow removing items added by the "inventory" command
              await PlayerInventoryItem.delete({
                Cmid: publicProfile.Cmid,
                ItemId: itemId
              });

              Int32Proxy.Serialize(outputStream, BuyItemResult.OK);
            } else {
              const memberWallet = await MemberWallet.findOne({ where: { Cmid: publicProfile.Cmid } });
              if (memberWallet) {
                await MemberWallet.update(memberWallet.Cmid, {
                  Credits:
                    memberWallet.Credits! +
                    Math.round(
                      transaction!.Credits! *
                        (ParadiseService.Instance.ServiceSettings.GameplaySettings.ShopRefundFactor ?? 0.75)
                    ),
                  Points:
                    memberWallet.Points! +
                    Math.round(
                      transaction!.Points! *
                        (ParadiseService.Instance.ServiceSettings.GameplaySettings.ShopRefundFactor ?? 0.75)
                    )
                });
              }

              await ItemTransaction.delete(transaction!.WithdrawalId);
              await PlayerInventoryItem.delete({
                Cmid: item!.Cmid,
                ItemId: item!.ItemId
              });

              Int32Proxy.Serialize(outputStream, BuyItemResult.OK);
            }
          }
        }
      }

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (error) {
      this.handleEndpointError('RemoveItemFromInventory', error);
    }

    return null;
  }

  static async GetPermanentGameRooms(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const photonId = Int32Proxy.Deserialize(bytes);

      this.debugEndpointData({ photonId });

      const gameRooms = await GameRoom.find({
        where: {
          PhotonServerId: photonId,
          IsPermanentGame: true
        },
        relations: {
          PhotonServer: true
        }
      });

      ListProxy.Serialize<GameRoomData>(
        outputStream,
        gameRooms.map((room) => ({
          ...room,
          Server: new ConnectionAddress(`${room.PhotonServer.IP}:${room.PhotonServer.Port}`)
        })) as any as GameRoomData[],
        GameRoomDataProxy.Serialize
      );
      DictionaryProxy.Serialize<number, string>(
        outputStream,
        gameRooms.reduce((acc, cur) => {
          acc[cur.Number] = cur.Password;

          return acc;
        }, {} as any),
        Int32Proxy.Serialize,
        StringProxy.Serialize
      );

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (error) {
      this.handleEndpointError('GetPermanentGameRooms', error);
    }

    return null;
  }
}
