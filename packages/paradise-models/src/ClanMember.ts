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

import { GroupPosition } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  type Relation
} from 'typeorm';
import { Clan } from './Clan';
import { PublicProfile } from './PublicProfile';

@Entity('ClanMembers')
export class ClanMember extends BaseEntity {
  @PrimaryColumn('int')
  Cmid: number;

  @Column('int')
  GroupId: number;

  @Column('int', { default: GroupPosition.Member })
  Position: GroupPosition;

  @CreateDateColumn()
  JoiningDate: Date;

  @Column('datetime')
  Lastlogin: Date;

  @ManyToOne(() => Clan, (clan) => clan.Members, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'GroupId' })
  Group: Relation<Clan>;

  @OneToOne(() => PublicProfile, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'Cmid', referencedColumnName: 'Cmid' })
  PublicProfile: Relation<PublicProfile>;

  get Name(): string {
    return this.PublicProfile.Name;
  }
}
