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

import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('ApplicationConfiguration')
export class ApplicationConfiguration extends BaseEntity {
  @PrimaryColumn('int')
  ApplicationId: number;

  @Column('json')
  XpRequiredPerLevel: { [key: string]: number };

  @Column('int')
  MaxLevel: number;

  @Column('int')
  MaxXp: number;

  @Column('int')
  XpKill: number;

  @Column('int')
  XpSmackdown: number;

  @Column('int')
  XpHeadshot: number;

  @Column('int')
  XpNutshot: number;

  @Column('int')
  XpPerMinuteLoser: number;

  @Column('int')
  XpPerMinuteWinner: number;

  @Column('int')
  XpBaseLoser: number;

  @Column('int')
  XpBaseWinner: number;

  @Column('int')
  PointsKill: number;

  @Column('int')
  PointsSmackdown: number;

  @Column('int')
  PointsHeadshot: number;

  @Column('int')
  PointsNutshot: number;

  @Column('int')
  PointsPerMinuteLoser: number;

  @Column('int')
  PointsPerMinuteWinner: number;

  @Column('int')
  PointsBaseLoser: number;

  @Column('int')
  PointsBaseWinner: number;
}
