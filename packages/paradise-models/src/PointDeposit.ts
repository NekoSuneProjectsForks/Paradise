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

import type { PointsDepositType } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
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

@Entity('PointDeposits')
export class PointDeposit extends BaseEntity {
  @PrimaryColumn('int')
  PointDepositId: number;

  @CreateDateColumn()
  DepositDate: Date;

  @Column('int', { default: 0 })
  Points: number;

  @Column('int', { default: 0 })
  Cmid: number;

  @Column('tinyint', { default: false })
  IsAdminAction: boolean;

  @Column('int')
  DepositType: PointsDepositType;

  @ManyToOne(() => PublicProfile, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'Cmid', referencedColumnName: 'Cmid', foreignKeyConstraintName: 'PointDeposits_ibfk_1' })
  PublicProfile: Relation<PublicProfile>;
}
