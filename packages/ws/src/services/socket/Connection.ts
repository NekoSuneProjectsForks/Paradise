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
import { EnumProxy } from '@festivaldev/uberstrike-js/UberStrike/Core/Serialization';
import type { ServerWebSocket, ServerWebSocketSendStatus } from 'bun';
import type { WebSocketData } from './Host';
import type RijndaelCryptoProvider from './RijndaelCryptoProvider';
import { ServerType, WebSocketState, type WebSocketInfo } from './WebSocket';

const PING_TIMEOUT = 3;
const PING_INTERVAL = 10;

export default class WebSocketConnection {
  ConnectionId: string;
  Socket: ServerWebSocket<WebSocketData>;
  Info: WebSocketInfo;
  CryptoProvider: RijndaelCryptoProvider;
  DisconnectReason: string;
  LastResponseTime: Date;

  private sendTask?: Promise<void>;
  private receiveTask?: Promise<void>;

  private pingTask?: ReturnType<typeof setInterval>;
  private pingDisconnectTask?: ReturnType<typeof setTimeout>;

  constructor(params: Partial<WebSocketConnection> = {}) {
    Object.assign(this, params);
  }

  private state: WebSocketState = WebSocketState.Disconnected;
  get connectionState(): WebSocketState {
    return this.state;
  }

  get remoteAddress(): string | undefined {
    return this.Socket.remoteAddress ?? 'undefined';
  }

  get identifier(): string {
    return this.Info.SocketId;
  }

  get type(): ServerType {
    return this.Info.Type;
  }

  get isConnected(): boolean {
    return this.Socket.readyState === WebSocket.OPEN;
  }

  async sendBytes(bytes: Buffer | number[] | Uint8Array): Promise<ServerWebSocketSendStatus> {
    if (!this.isConnected) return 0;

    try {
      this.state = WebSocketState.Sending;

      Log.debug(`[Socket] sending ${bytes.length} bytes to client at ${this.Socket.remoteAddress}`);
      Log.debug(Array.from(bytes, (byte) => byte).join(','));

      let result;

      if (bytes instanceof Buffer || bytes instanceof Uint8Array) {
        result = this.Socket.sendBinary(bytes);
      } else {
        result = this.Socket.sendBinary(Buffer.from(bytes));
      }

      this.state = WebSocketState.Connected;
      return result;
    } catch {
      return 0;
    }
  }

  async sendPacket(type: PacketType): Promise<ServerWebSocketSendStatus> {
    const bytes: number[] = [];

    EnumProxy.Serialize<PayloadType>(bytes, PayloadType.Raw);
    EnumProxy.Serialize<PacketType>(bytes, type);

    return this.sendBytes(bytes);
  }

  async send(type: PacketType, payload: any, oneWay: boolean = true, conversationId: string | null = null) {
    const bytes = PacketCodec.encode(type, payload, this.CryptoProvider, oneWay, conversationId);

    if (bytes) {
      return this.sendBytes(bytes);
    }
  }

  onOpen(): void {
    this.pingTask = setInterval(() => {
      this.sendPacket(PacketType.Ping);

      this.pingDisconnectTask = setTimeout(() => {
        this.Socket.close();
      }, PING_TIMEOUT * 1000);
    }, PING_INTERVAL * 1000);
  }

  onClose(): void {
    clearInterval(this.pingTask);
  }

  resetPingTimeout(): void {
    this.LastResponseTime = new Date();

    clearTimeout(this.pingDisconnectTask);
  }
}
