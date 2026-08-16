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
import PacketCodec, { PayloadType } from '@/utils/PacketCodec';
import { EnumProxy, StringProxy } from '@festivaldev/uberstrike-js/UberStrike/Core/Serialization';
import EventEmitter from 'events';
import fs from 'fs';
import type { Server } from 'net';
import net from 'net';
import os from 'os';
import { ServerType } from '../socket';

export default class PipeServer extends EventEmitter {
  private server: Server | undefined;

  get Server(): Server | undefined {
    return this.server;
  }

  static get SOCKET_PATH() {
    return os.platform() === 'win32' ? `\\\\.\\pipe\\paradise-ws` : '/tmp/paradise-ws.sock';
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        Log.error('Cannot start more than one Pipe.');
        return reject();
      }

      Log.info('Starting Pipe...');

      if (os.platform() !== 'win32' && fs.existsSync(PipeServer.SOCKET_PATH)) {
        fs.unlinkSync(PipeServer.SOCKET_PATH);
      }

      this.server = net.createServer((socket) => {
        Log.debug(`[Pipe] new pipe connection`);

        socket.on('data', (data) => {
          try {
            Log.debug(`[Pipe] received ${data.length} from client`);
            Log.debug(Array.from(data, (byte) => byte).join(','));

            const inputBytes = [...data];

            const payloadType = EnumProxy.Deserialize<PayloadType>(inputBytes);
            if (payloadType !== PayloadType.Serialized) return;

            const [payloadObj, packetType, oneWay, conversationId] = PacketCodec.decode(inputBytes, null) ?? [];

            let targetSocketType;
            let socketId;

            if (inputBytes.length) {
              targetSocketType = EnumProxy.Deserialize<ServerType>(inputBytes);
            }

            if (inputBytes.length) {
              socketId = StringProxy.Deserialize(inputBytes);
            }

            if (!payloadObj || !conversationId) return;

            this.emit('data', {
              Type: packetType,
              Data: payloadObj,
              TargetSocketType: targetSocketType,
              SocketId: socketId
            });
          } catch (error: any) {
            Log.error(error);
          }
        });

        socket.on('end', (...props) => {
          Log.debug(`[Pipe] pipe connection closed`);
          this.emit('end');
        });
      });

      this.server.listen(PipeServer.SOCKET_PATH, () => {
        Log.info(`Pipe server listening on ${PipeServer.SOCKET_PATH}`);
        resolve();
      });
    });
  }

  stop(): void {
    if (!this.server) {
      return;
    }

    Log.info('Stopping Pipe...');

    if (os.platform() !== 'win32' && fs.existsSync(PipeServer.SOCKET_PATH)) {
      fs.unlinkSync(PipeServer.SOCKET_PATH);
    }

    this.server = undefined;
  }
}
