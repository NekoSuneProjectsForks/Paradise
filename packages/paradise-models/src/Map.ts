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

import { BaseEntity, Column, Entity, OneToMany, PrimaryColumn, type Relation } from 'typeorm';
import { MapSettings } from './MapSettings';

@Entity('Maps')
export class Map extends BaseEntity {
  @PrimaryColumn('int')
  MapId: number;

  @Column('varchar')
  DisplayName: string;

  @Column('text')
  Description: string;

  @Column('json', { default: '{}' })
  SceneName: { [key: string]: any };

  @Column('tinyint')
  IsBlueBox: boolean;

  @Column('int', { nullable: true })
  RecommendedItemId: number | null;

  @Column('int', { nullable: true })
  SupportedGameModes: number | null;

  @Column('int', { nullable: true })
  SupportedItemClass: number | null;

  @Column('int', { nullable: true })
  MaxPlayers: number | null;

  @Column('json', { default: '{}' })
  FileName: { [key: string]: any };

  @OneToMany(() => MapSettings, (mapSettings) => mapSettings.Map)
  Settings: Relation<MapSettings[]>;
}
