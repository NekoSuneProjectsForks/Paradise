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

import { ContactRequestStatus } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
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

@Entity('ContactRequests')
export class ContactRequest extends BaseEntity {
  @PrimaryColumn('int')
  RequestId: number;

  @Column('int')
  InitiatorCmid: number;

  @ManyToOne(() => PublicProfile, (publicProfile) => publicProfile.ContactRequestsSent, {
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
  @JoinColumn({
    name: 'InitiatorCmid',
    referencedColumnName: 'Cmid',
    foreignKeyConstraintName: 'ContactRequests_ibfk_1'
  })
  Initiator: Relation<PublicProfile>;

  get InitiatorName(): string {
    return this.Initiator.Name;
  }

  @Column('int')
  ReceiverCmid: number;

  @ManyToOne(() => PublicProfile, (publicProfile) => publicProfile.ContactRequestsReceived, {
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
  @JoinColumn({
    name: 'ReceiverCmid',
    referencedColumnName: 'Cmid',
    foreignKeyConstraintName: 'ContactRequests_ibfk_2'
  })
  Receiver: Relation<PublicProfile>;

  @Column('text')
  InitiatorMessage: string;

  @Column('int', { default: ContactRequestStatus.Pending })
  Status: ContactRequestStatus;

  @CreateDateColumn()
  SentDate: Date;
}
