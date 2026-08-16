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

import { Log } from '@/utils';
import PacketCodec, { PacketType, PayloadType } from '@/utils/PacketCodec';
import { EnumProxy, StringProxy } from '@festivaldev/uberstrike-js/UberStrike/Core/Serialization';
import type { Socket } from 'net';
import net from 'net';
import { ServerType } from '../socket';
import PipeServer from './PipeServer';

export default class PipeClient {
  private client: Socket | undefined;

  get isConnected(): boolean {
    return this.client?.readyState === 'open';
  }

  async connect() {
    return new Promise<void>((resolve, reject) => {
      this.client = net.connect({ path: PipeServer.SOCKET_PATH }, () => {
        console.log('open');
        resolve();
      });

      // this.client.setKeepAlive(true, 5000);

      this.client.on('open', () => {
        console.log('open');
      });

      this.client.on('error', (error) => {
        reject(error);
      });

      this.client.on('end', () => {
        console.log('Disconnected from server');
      });
    });
  }

  async sendBytes(bytes: Buffer | number[] | Uint8Array) {
    if (!this.isConnected) {
      try {
        await this.connect();
      } catch (error) {
        Log.error(`Failed to connect to pipe at ${PipeServer.SOCKET_PATH}`, error);
        return;
      }
    }

    try {
      Log.debug(`[Pipe] sending ${bytes.length} bytes to client`);
      Log.debug(Array.from(bytes, (byte) => byte).join(','));

      if (bytes instanceof Buffer || bytes instanceof Uint8Array) {
        this.client?.write(bytes);
      } else {
        this.client?.write(Buffer.from(bytes));
      }
    } catch {}
  }

  async sendPacket(type: PacketType) {
    const bytes: number[] = [];

    EnumProxy.Serialize<PayloadType>(bytes, PayloadType.Raw);
    EnumProxy.Serialize<PacketType>(bytes, type);

    this.sendBytes(bytes);
  }

  async send(type: PacketType, payload: any, oneWay: boolean = true, conversationId: string | null = null) {
    const bytes = PacketCodec.encode(type, payload, null, oneWay, conversationId);
    if (!bytes) return;

    return this.sendBytes(bytes);
  }

  async sendToCommServer(type: PacketType, payload: any, oneWay: boolean = true, conversationId: string | null = null) {
    const bytes = PacketCodec.encode(type, payload, null, oneWay, conversationId);
    if (!bytes) return;

    EnumProxy.Serialize<ServerType>(bytes, ServerType.Comm);

    return this.sendBytes(bytes);
  }

  async sendToGameServer(
    guid: string,
    type: PacketType,
    payload: any,
    oneWay: boolean = true,
    conversationId: string | null = null
  ) {
    const bytes = PacketCodec.encode(type, payload, null, oneWay, conversationId);
    if (!bytes) return;

    EnumProxy.Serialize<ServerType>(bytes, ServerType.Game);
    StringProxy.Serialize(bytes, guid);

    return this.sendBytes(bytes);
  }

  async sendToGameServers(type: PacketType, payload: any) {
    const bytes = PacketCodec.encode(type, payload, null, true, null);
    if (!bytes) return;

    EnumProxy.Serialize<ServerType>(bytes, ServerType.Game);
    StringProxy.Serialize(bytes, '*');

    return this.sendBytes(bytes);
  }
}
