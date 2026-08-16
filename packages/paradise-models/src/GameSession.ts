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

import type { ChannelType } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import { add } from 'date-fns';
import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { PublicProfile } from './PublicProfile';
import { SteamMember } from './SteamMember';

export const SESSION_EXPIRE_HOURS: number = 12;

@Entity('GameSessions')
export class GameSession extends BaseEntity {
  @PrimaryColumn('varchar')
  SessionId: string;

  @Column('int')
  Cmid: number;

  @Column('int')
  Channel: ChannelType;

  @Column('varchar', { nullable: true })
  MachineId: string | null;

  @Column('datetime', { nullable: true })
  ExpireTime: Date | null;

  @ManyToOne(() => PublicProfile, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'Cmid', referencedColumnName: 'Cmid' })
  PublicProfile: Relation<PublicProfile>;

  extendExpireTime(): void {
    GameSession.update(this.SessionId, {
      ExpireTime: add(new Date(), { hours: SESSION_EXPIRE_HOURS })
    });
  }

  get Profile(): Promise<PublicProfile | null> {
    return PublicProfile.findOne({ where: { Cmid: this.Cmid } });
  }

  get SteamMember(): Promise<SteamMember | null> {
    return SteamMember.findOne({ where: { Cmid: this.Cmid } });
  }

  static getCmidFromSessionId(sessionId: string): number {
    if (!sessionId.trim().length) return -1;
    return Buffer.from([...Buffer.from(sessionId, 'base64')].slice(0, 4)).readInt32LE();
  }

  static getSteamIdFromSessionId(sessionId: string): string {
    if (!sessionId.trim().length) return String(-1n);
    return String(Buffer.from([...Buffer.from(sessionId, 'base64')].slice(4, 8)).readBigUint64LE());
  }
}
