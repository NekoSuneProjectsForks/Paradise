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
import { PrivateMessage, PublicProfile, UserAccount } from '@festivaldev/paradise-models';
import { MessageThreadView } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import { Int32Proxy, ListProxy, StringProxy } from '@festivaldev/uberstrike-js/UberStrike/Core/Serialization';
import { MessageThreadViewProxy } from '@festivaldev/uberstrike-js/UberStrike/Core/Serialization/Legacy';
import BaseWebService from '../BaseWebService';

export default class PrivateMessageWebService extends BaseWebService {
  static override get ServiceName(): string {
    return 'PrivateMessageWebService';
  }

  static override get ServiceVersion(): string {
    return ApiVersion.Legacy;
  }

  static async GetAllMessageThreadsForUser_1(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const cmid = Int32Proxy.Deserialize(bytes);

      this.debugEndpointData({ cmid });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('GetAllMessageThreadsForUser_1', e);
    }

    return null;
  }

  static async GetAllMessageThreadsForUser_2(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const cmid = Int32Proxy.Deserialize(bytes);
      const pageNumber = Int32Proxy.Deserialize(bytes);

      this.debugEndpointData({ cmid, pageNumber });

      const userAccount = await UserAccount.findOne({ where: { Cmid: cmid } });

      if (userAccount) {
        const messages = (
          await PrivateMessage.find({
            where: [
              {
                FromCmid: userAccount.Cmid
              },
              {
                ToCmid: userAccount.Cmid
              }
            ]
          })
        ).reduce((acc: any, curr: PrivateMessage) => {
          const threadId = [curr.FromCmid, curr.ToCmid].sort().join(',');

          if (!acc[threadId]) {
            acc[threadId] = [];
          }

          acc[threadId].push(curr);
          return acc;
        }, {});

        const threads: MessageThreadView[] = [];

        for (const messageGroup of Object.values(messages)) {
          const filteredMessages = (messageGroup as any).filter(
            (_: PrivateMessage) =>
              (_.FromCmid === userAccount.Cmid && !_.IsDeletedBySender) ||
              (_.ToCmid === userAccount.Cmid && !_.IsDeletedByReceiver)
          );

          if (filteredMessages.length) {
            const message = filteredMessages[filteredMessages.length - 1];

            const otherCmid = message.FromCmid !== userAccount.Cmid ? message.FromCmid : message.ToCmid;
            const otherProfile = await PublicProfile.findOne({ where: { Cmid: otherCmid } });

            if (otherProfile) {
              threads.push(
                new MessageThreadView({
                  ThreadId: otherCmid,
                  ThreadName: otherProfile.Name,
                  MessageCount: filteredMessages.length,
                  LastMessagePreview: message.ContentText,
                  LastUpdate: message.DateSent,
                  HasNewMessages: filteredMessages.some(
                    (_: PrivateMessage) => _.ToCmid === userAccount.Cmid && !_.IsRead
                  )
                })
              );
            }
          }
        }

        ListProxy.Serialize<MessageThreadView>(outputStream, threads, MessageThreadViewProxy.Serialize);
      }

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (e) {
      this.handleEndpointError('GetAllMessageThreadsForUser_2', e);
    }

    return null;
  }

  static async GetThreadMessages(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const threadViewerCmid = Int32Proxy.Deserialize(bytes);
      const otherCmid = Int32Proxy.Deserialize(bytes);
      const pageNumber = Int32Proxy.Deserialize(bytes);

      this.debugEndpointData({ threadViewerCmid, otherCmid, pageNumber });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('GetThreadMessages', e);
    }

    return null;
  }

  static async SendMessage(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const senderCmid = Int32Proxy.Deserialize(bytes);
      const receiverCmid = Int32Proxy.Deserialize(bytes);
      const content = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ senderCmid, receiverCmid, content });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('SendMessage', e);
    }

    return null;
  }

  static async GetMessageWithId(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const messageId = Int32Proxy.Deserialize(bytes);
      const requesterCmid = Int32Proxy.Deserialize(bytes);

      this.debugEndpointData({ messageId, requesterCmid });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('GetMessageWithId', e);
    }

    return null;
  }

  static async MarkThreadAsRead(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const threadViewerCmid = Int32Proxy.Deserialize(bytes);
      const otherCmid = Int32Proxy.Deserialize(bytes);

      this.debugEndpointData({ threadViewerCmid, otherCmid });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('MarkThreadAsRead', e);
    }

    return null;
  }

  static async DeleteThread(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const threadViewerCmid = Int32Proxy.Deserialize(bytes);
      const otherCmid = Int32Proxy.Deserialize(bytes);

      this.debugEndpointData({ threadViewerCmid, otherCmid });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('DeleteThread', e);
    }

    return null;
  }
}
