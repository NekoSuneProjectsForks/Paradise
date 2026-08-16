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

import type { RijndaelCryptoProvider, WebSocketChatMessage } from '@/services/socket';
import type { ChannelType } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import type {
  EndOfMatchData,
  GameActorInfo,
  GameRoomData,
  StatsCollection
} from '@festivaldev/uberstrike-js/UberStrike/Core/Models';
import {
  ArrayProxy,
  BooleanProxy,
  ByteProxy,
  DictionaryProxy,
  EndOfMatchDataProxy,
  EnumProxy,
  GameActorInfoProxy,
  GameRoomDataProxy,
  Int32Proxy,
  ListProxy,
  StatsCollectionProxy,
  StringProxy
} from '@festivaldev/uberstrike-js/UberStrike/Core/Serialization';
import Log from './Log';

export enum PayloadType {
  Raw,
  Serialized
}

export enum PacketType {
  MagicBytes = 1,
  ClientInfo,
  ConnectionStatus,

  Ping,
  Pong,

  Command,
  CommandOutput,
  Monitoring,
  Error,

  ListPeers,
  ListRooms,

  ChatMessage,
  RoomChatMessage,
  PlayerList,
  PlayerJoined,
  PlayerLeft,
  RoomOpened,
  RoomClosed,
  PlayerJoinedRoom,
  PlayerLeftRoom,
  RoundStarted,
  RoundEnded,

  OpenRoom,
  CloseRoom,
  BanPlayer
}

export default class PacketCodec {
  static encode(
    type: PacketType,
    data: any,
    cryptoProvider: RijndaelCryptoProvider | null = null,
    oneWay: boolean = false,
    conversationId: string | null = null
  ) {
    let encrypted = false;

    const payloadBytes: number[] = [];

    switch (type) {
      case PacketType.MagicBytes:
      case PacketType.Ping:
      case PacketType.Pong:
        break;
      case PacketType.ClientInfo:
      case PacketType.ConnectionStatus:
        StringProxy.Serialize(payloadBytes, JSON.stringify(data));

        break;
      case PacketType.Command:
      case PacketType.Error:
      case PacketType.ChatMessage:
        encrypted = true;

        StringProxy.Serialize(payloadBytes, JSON.stringify(data));

        break;
      case PacketType.RoomChatMessage: {
        encrypted = true;

        const [message, metadata]: [WebSocketChatMessage, GameRoomData] = data;

        StringProxy.Serialize(payloadBytes, JSON.stringify(message));
        GameRoomDataProxy.Serialize(payloadBytes, metadata);

        break;
      }
      case PacketType.CommandOutput:
        encrypted = true;

        StringProxy.Serialize(payloadBytes, data);

        break;
      case PacketType.Monitoring:
      case PacketType.BanPlayer:
        encrypted = true;

        DictionaryProxy.Serialize<string, any>(payloadBytes, data, StringProxy.Serialize, (stream, instance) => {
          StringProxy.Serialize(stream, JSON.stringify(instance ?? ''));
        });

        break;
      case PacketType.ListPeers:
        encrypted = true;

        ListProxy.Serialize<Record<string, any>>(payloadBytes, data, (stream, instance) => {
          DictionaryProxy.Serialize<string, any>(stream, instance, StringProxy.Serialize, (stream, instance) => {
            StringProxy.Serialize(stream, JSON.stringify(instance));
          });
        });

        break;
      case PacketType.ListRooms: {
        encrypted = true;

        ListProxy.Serialize<GameRoomData>(payloadBytes, data, GameRoomDataProxy.Serialize);

        break;
      }
      case PacketType.PlayerJoined:
      case PacketType.PlayerLeft: {
        encrypted = true;

        Int32Proxy.Serialize(payloadBytes, data.Actor.Cmid);
        StringProxy.Serialize(payloadBytes, data.RemoteIPAddress.toString());
        Int32Proxy.Serialize(payloadBytes, data.RemotePort);
        EnumProxy.Serialize<ChannelType>(payloadBytes, data.Actor.ActorInfo.Channel);

        break;
      }
      case PacketType.RoomOpened:
      case PacketType.RoomClosed:
        encrypted = true;

        GameRoomDataProxy.Serialize(payloadBytes, data);

        break;
      case PacketType.PlayerJoinedRoom:
      case PacketType.PlayerLeftRoom: {
        encrypted = true;

        const [actorInfo, metadata]: [GameActorInfo, GameRoomData] = data;

        GameActorInfoProxy.Serialize(payloadBytes, actorInfo);
        GameRoomDataProxy.Serialize(payloadBytes, metadata);

        break;
      }
      case PacketType.RoundStarted: {
        encrypted = true;

        GameRoomDataProxy.Serialize(payloadBytes, data);

        break;
      }
      case PacketType.RoundEnded: {
        encrypted = true;

        const [metadata, matchData, playerStats]: [GameRoomData, EndOfMatchData, Record<number, StatsCollection>] =
          data;

        GameRoomDataProxy.Serialize(payloadBytes, metadata);
        EndOfMatchDataProxy.Serialize(payloadBytes, matchData);
        DictionaryProxy.Serialize<number, StatsCollection>(
          payloadBytes,
          playerStats,
          Int32Proxy.Serialize,
          StatsCollectionProxy.Serialize
        );

        break;
      }
      case PacketType.OpenRoom: {
        encrypted = true;

        const [metadata, password]: [GameRoomData, string] = data;
        GameRoomDataProxy.Serialize(payloadBytes, metadata);
        StringProxy.Serialize(payloadBytes, password);

        break;
      }
      case PacketType.CloseRoom:
        encrypted = true;

        Int32Proxy.Serialize(payloadBytes, data);

        break;
      default:
        Log.warn(`Rejecting to encode payload of type ${PacketType[type]}(${type}): Unknown type.`);

        return null;
    }

    const outputBytes: number[] = [];

    EnumProxy.Serialize<PayloadType>(outputBytes, PayloadType.Serialized);
    EnumProxy.Serialize<PacketType>(outputBytes, type);
    BooleanProxy.Serialize(outputBytes, cryptoProvider !== null && encrypted);

    if (cryptoProvider !== null && encrypted) {
      ArrayProxy.Serialize(outputBytes, [...cryptoProvider.encrypt(Buffer.from(payloadBytes))], ByteProxy.Serialize);
    } else {
      ArrayProxy.Serialize(outputBytes, [...payloadBytes], ByteProxy.Serialize);
    }

    BooleanProxy.Serialize(outputBytes, oneWay);
    StringProxy.Serialize(outputBytes, conversationId ?? crypto.randomUUID());

    return outputBytes;
  }

  static decode<T>(
    bytes: number[],
    cryptoProvider: RijndaelCryptoProvider | null = null
  ): [T, PacketType, boolean, string] | null {
    const type = EnumProxy.Deserialize<PacketType>(bytes);
    const encrypted = BooleanProxy.Deserialize(bytes);
    let data = Buffer.from(ArrayProxy.Deserialize(bytes, ByteProxy.Deserialize));

    const oneWay = BooleanProxy.Deserialize(bytes);
    const conversationId = StringProxy.Deserialize(bytes);

    if (encrypted) {
      if (!cryptoProvider) {
        Log.error('Failed to decrypt encrypted payload: No crypto provider.');

        return null;
      }

      try {
        data = cryptoProvider.decrypt(data);
      } catch (error: any) {
        Log.error('Failed to decrypt encrypted payload:', error);

        return null;
      }
    }

    const payloadBytes = [...data];
    let result: any;

    switch (type) {
      case PacketType.MagicBytes:
      case PacketType.Ping:
      case PacketType.Pong:
        break;
      case PacketType.ClientInfo:
      case PacketType.ConnectionStatus:
      case PacketType.Command:
      case PacketType.Error:
      case PacketType.ChatMessage:
        result = JSON.parse(StringProxy.Deserialize(payloadBytes));

        break;
      case PacketType.CommandOutput:
        result = StringProxy.Deserialize(payloadBytes);

        break;
      case PacketType.RoomChatMessage:
        result = [JSON.parse(StringProxy.Deserialize(payloadBytes)), GameRoomDataProxy.Deserialize(payloadBytes)];

        break;
      case PacketType.Monitoring:
      case PacketType.BanPlayer:
        result = DictionaryProxy.Deserialize<string, any>(payloadBytes, StringProxy.Deserialize, (stream) => {
          return JSON.parse(StringProxy.Deserialize(stream));
        });

        break;
      case PacketType.ListPeers:
        result = ListProxy.Deserialize<Record<string, any>>(payloadBytes, (stream) => {
          return DictionaryProxy.Deserialize<string, any>(stream, StringProxy.Deserialize, (stream) => {
            return JSON.parse(StringProxy.Deserialize(stream));
          });
        });

        break;
      case PacketType.ListRooms:
        result = ListProxy.Deserialize<GameRoomData>(payloadBytes, GameRoomDataProxy.Deserialize);

        break;
      case PacketType.PlayerJoined:
      case PacketType.PlayerLeft:
        result = {
          Cmid: Int32Proxy.Deserialize(payloadBytes),
          RemoteIPAddress: StringProxy.Deserialize(payloadBytes),
          RemotePort: Int32Proxy.Deserialize(payloadBytes),
          Channel: EnumProxy.Deserialize<ChannelType>(payloadBytes)
        };

        break;
      case PacketType.RoomOpened:
      case PacketType.RoomClosed:
        result = GameRoomDataProxy.Deserialize(payloadBytes);

        break;
      case PacketType.PlayerJoinedRoom:
      case PacketType.PlayerLeftRoom:
        result = [GameActorInfoProxy.Deserialize(payloadBytes), GameRoomDataProxy.Deserialize(payloadBytes)];

        break;
      case PacketType.RoundStarted:
        result = GameRoomDataProxy.Deserialize(payloadBytes);

        break;
      case PacketType.RoundEnded:
        result = [
          GameRoomDataProxy.Deserialize(payloadBytes),
          EndOfMatchDataProxy.Deserialize(payloadBytes),
          DictionaryProxy.Deserialize<number, StatsCollection>(
            bytes,
            Int32Proxy.Deserialize,
            StatsCollectionProxy.Deserialize
          )
        ];

        break;
      case PacketType.OpenRoom:
        result = [GameRoomDataProxy.Deserialize(payloadBytes), StringProxy.Deserialize(payloadBytes)];

        break;
      case PacketType.CloseRoom:
        result = Int32Proxy.Deserialize(payloadBytes);

        break;
      default:
        Log.warn(`Rejecting to decode payload of type ${PacketType[type]}(${type}): Unknown type.`);

        return null;
    }

    return [result as T, type, oneWay, conversationId];
  }
}
