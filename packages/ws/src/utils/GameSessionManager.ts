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

import { GameSession, SteamMember, UserAccount } from '@festivaldev/paradise-models';
import { ChannelType, type PublicProfileView } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import { add } from 'date-fns';
import { LessThan, MoreThan } from 'typeorm';

export const SESSION_EXPIRE_HOURS: number = 12;

export default class GameSessionManager {
  private static GarbageCollector: ReturnType<typeof setInterval>;
  private seed: bigint = BigInt(new Date().getTime());

  constructor(garbageCollectInterval: number = 300) {
    if (!GameSessionManager.GarbageCollector) {
      GameSessionManager.GarbageCollector = setInterval(
        () =>
          GameSession.delete({
            ExpireTime: LessThan(new Date())
          }),
        garbageCollectInterval * 1000
      );
    }
  }

  async findOrCreateSession(
    profile: PublicProfileView,
    machineId: string,
    userAccount: UserAccount
  ): Promise<GameSession> {
    const expireTime = add(new Date(), { hours: SESSION_EXPIRE_HOURS });

    const session = await GameSession.findOne({
      where: {
        Cmid: profile.Cmid,
        ExpireTime: MoreThan(new Date())
      }
    });

    if (session) {
      return GameSession.save({
        SessionId: session.SessionId,
        ExpireTime: expireTime
      });
    }

    return GameSession.save(
      GameSession.create({
        SessionId: this.createSessionId(profile.Cmid, userAccount.Channel),
        Cmid: profile.Cmid,
        Channel: userAccount.Channel,
        MachineId: machineId,
        ExpireTime: expireTime
      })
    );
  }

  async findOrCreateSessionForSteamUser(
    profile: PublicProfileView,
    machineId: string,
    steamMember: SteamMember
  ): Promise<GameSession> {
    const expireTime = add(new Date(), { hours: SESSION_EXPIRE_HOURS });

    const session = await GameSession.findOne({
      where: {
        Cmid: profile.Cmid,
        ExpireTime: MoreThan(new Date())
      }
    });

    if (session) {
      return GameSession.save({
        SessionId: session.SessionId,
        ExpireTime: expireTime
      });
    }

    return GameSession.save(
      GameSession.create({
        SessionId: this.createSessionIdForSteamUser(profile.Cmid, BigInt(steamMember.SteamId)),
        Cmid: profile.Cmid,
        Channel: ChannelType.Steam,
        MachineId: machineId,
        ExpireTime: expireTime
      })
    );
  }

  async findSessionByPlayerId(id: number): Promise<GameSession | null> {
    const session = await GameSession.findOne({
      where: {
        Cmid: id,
        ExpireTime: MoreThan(new Date())
      }
    });

    return session;
  }

  async findSessionForSteamUser(sessionId: string): Promise<GameSession | null> {
    return this.findSessionByPlayerId(GameSession.getCmidFromSessionId(sessionId));
  }

  private createSessionId(cmid: number, channel: ChannelType): string {
    const sessionId: Buffer = Buffer.alloc(24);

    const { seed } = this;
    this.seed = (seed + 1n) & 0xffffffffffffffn;

    sessionId.writeInt32LE(cmid);
    sessionId.writeInt32LE(channel, 4);
    sessionId.writeBigInt64LE(BigInt(new Date().getTime()), 8);
    sessionId.writeBigInt64LE(seed, 16);

    return sessionId.toBase64();
  }

  private createSessionIdForSteamUser(cmid: number, steamId: bigint): string {
    const sessionId: Buffer = Buffer.alloc(24);

    const { seed } = this;
    this.seed = (seed + 1n) & 0xffffffffffffffn;

    sessionId.writeInt32LE(cmid);
    sessionId.writeInt32LE(ChannelType.Steam, 4);
    sessionId.writeBigInt64LE(steamId, 8);
    sessionId.writeBigInt64LE(seed, 16);

    return sessionId.toBase64();
  }
}
