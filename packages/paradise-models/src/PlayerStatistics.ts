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

import type {
  PlayerPersonalRecordStatisticsView,
  PlayerWeaponStatisticsView
} from '@festivaldev/uberstrike-js/UberStrike/DataCenter/Common/Entities';
import { BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryColumn, type Relation } from 'typeorm';
import { PublicProfile } from './PublicProfile';

@Entity('PlayerStatistics')
export class PlayerStatistics extends BaseEntity {
  @PrimaryColumn('int')
  Cmid: number;

  @Column('int', { nullable: true })
  Splats: number | null;

  @Column('int', { nullable: true })
  Splatted: number | null;

  @Column('bigint', { nullable: true })
  Shots: bigint | null;

  @Column('bigint', { nullable: true })
  Hits: bigint | null;

  @Column('int', { nullable: true })
  Headshots: number | null;

  @Column('int', { nullable: true })
  Nutshots: number | null;

  @Column('int', { default: 0 })
  Xp: number;

  @Column('int', { nullable: true })
  Points: number | null;

  @Column('int', { default: 0 })
  Level: number;

  @Column('int', { nullable: true })
  TimeSpentInGame: number;

  @Column('json', { default: '{}' })
  PersonalRecord: PlayerPersonalRecordStatisticsView;

  @Column('json', { default: '{}' })
  WeaponStatistics: PlayerWeaponStatisticsView;

  @OneToOne(() => PublicProfile, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'Cmid', referencedColumnName: 'Cmid', foreignKeyConstraintName: 'PlayerStatistics_ibfk_1' })
  PublicProfile: Relation<PublicProfile>;
}
