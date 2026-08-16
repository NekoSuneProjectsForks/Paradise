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

import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation
} from 'typeorm';
import { PublicProfile } from './PublicProfile';

@Entity('PrivateMessages')
export class PrivateMessage extends BaseEntity {
  @PrimaryColumn('int')
  PrivateMessageId: number;

  @Column('int')
  FromCmid: number;

  @ManyToOne(() => PublicProfile, (publicProfile) => publicProfile.PrivateMessagesSent, {
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'FromCmid', referencedColumnName: 'Cmid' })
  From: Relation<PublicProfile>;

  get FromName(): string {
    return this.From.Name;
  }

  @Column('int')
  ToCmid: number;

  @ManyToOne(() => PublicProfile, (publicProfile) => publicProfile.PrivateMessagesReceived, {
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'ToCmid', referencedColumnName: 'Cmid' })
  To: Relation<PublicProfile>;

  @CreateDateColumn()
  DateSent: Date;

  @Column('text')
  ContentText: string;

  @Column('tinyint', { default: false })
  IsRead: boolean;

  @Column('tinyint', { default: false })
  HasAttachment: boolean;

  @Column('tinyint', { default: false })
  IsDeletedBySender: boolean;

  @Column('tinyint', { default: false })
  IsDeletedByReceiver: boolean;
}
