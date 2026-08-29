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
  PrimaryGeneratedColumn,
  type Relation
} from 'typeorm';
import type { ModerationFlag } from './enums';
import { PublicProfile } from './PublicProfile';

@Entity('ModerationActions')
export class ModerationAction extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int')
  ModerationFlag: ModerationFlag;

  @Column('int')
  SourceCmid: number;

  @ManyToOne(() => PublicProfile, (publicProfile) => publicProfile.ModerationActionsIssued, {
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
  @JoinColumn({
    name: 'SourceCmid',
    referencedColumnName: 'Cmid',
    foreignKeyConstraintName: 'ModerationActions_ibfk_1'
  })
  Source: Relation<PublicProfile>;

  get SourceName(): string {
    return this.Source.Name;
  }

  @Column()
  TargetCmid: number;

  @ManyToOne(() => PublicProfile, (publicProfile) => publicProfile.ModerationActionsReceived, {
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
  @JoinColumn({
    name: 'TargetCmid',
    referencedColumnName: 'Cmid',
    foreignKeyConstraintName: 'ModerationActions_ibfk_2'
  })
  Target: Relation<PublicProfile>;

  get TargetName(): string {
    return this.Target.Name;
  }

  @CreateDateColumn()
  ActionDate: Date;

  @Column('datetime', { nullable: true })
  ExpireTime: Date | null;

  @Column('text')
  Reason: string;
}
