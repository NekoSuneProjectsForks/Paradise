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

import type { GameModeType } from '@festivaldev/uberstrike-js/UberStrike/Core/Types';
import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { Map } from './Map';

@Entity('MapSettings')
export class MapSettings extends BaseEntity {
  @PrimaryColumn('int')
  MapId: number;

  @PrimaryColumn('int')
  GameModeType: GameModeType;

  @Column('int')
  KillsMin: number;

  @Column('int')
  KillsMax: number;

  @Column('int')
  KillsCurrent: number;

  @Column('int')
  PlayersMin: number;

  @Column('int')
  PlayersMax: number;

  @Column('int')
  PlayersCurrent: number;

  @Column('int')
  TimeMin: number;

  @Column('int')
  TimeMax: number;

  @Column('int')
  TimeCurrent: number;

  @ManyToOne(() => Map, (map) => map.Settings, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'MapId', referencedColumnName: 'MapId', foreignKeyConstraintName: 'MapSettings_ibfk_1' })
  Map: Relation<Map>;
}
