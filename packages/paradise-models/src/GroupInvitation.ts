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

import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { Clan } from './Clan';
import { PublicProfile } from './PublicProfile';

@Entity('GroupInvitations')
export class GroupInvitation extends BaseEntity {
  @Column('int')
  InviterCmid: number;

  @ManyToOne(() => PublicProfile, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'InviterCmid',
    referencedColumnName: 'Cmid',
    foreignKeyConstraintName: 'GroupInvitations_ibfk_1'
  })
  Inviter: Relation<PublicProfile>;

  get InviterName(): string {
    return this.Inviter.Name;
  }

  @Column('int')
  GroupId: number;

  @ManyToOne(() => Clan, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'GroupId', referencedColumnName: 'GroupId', foreignKeyConstraintName: 'GroupInvitations_ibfk_2' })
  Group: Relation<Clan>;

  get GroupName(): string {
    return this.Group.Name;
  }

  get GroupTag(): string {
    return this.Group.Tag;
  }

  @PrimaryColumn('int')
  GroupInvitationId: number;

  @Column('int')
  InviteeCmid: number;

  @ManyToOne(() => PublicProfile, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'InviteeCmid',
    referencedColumnName: 'Cmid',
    foreignKeyConstraintName: 'GroupInvitations_ibfk_3'
  })
  Invitee: Relation<PublicProfile>;

  get InviteeName(): string {
    return this.Invitee.Name;
  }

  @Column('text')
  Message: string;
}
