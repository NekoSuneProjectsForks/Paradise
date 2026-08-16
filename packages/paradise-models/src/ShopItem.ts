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

import { ItemShopHighlightType, type UberstrikeItemClass } from '@festivaldev/uberstrike-js/UberStrike/Core/Types';
import { BaseEntity, Column, PrimaryColumn } from 'typeorm';

export class ShopItem extends BaseEntity {
  @PrimaryColumn('int')
  ID: number;

  @Column('varchar')
  Name: string;

  @Column('varchar', { nullable: true })
  PrefabName: string | null;

  @Column('text', { nullable: true })
  Description: string | null;

  @Column('int')
  ItemClass: UberstrikeItemClass;

  @Column('int', { default: 0 })
  LevelLock: number;

  @Column('int', { nullable: true })
  MaxDurationDays: number | null;

  @Column('tinyint', { default: false })
  IsConsumable: boolean;

  @Column('int', { default: ItemShopHighlightType.None })
  ShopHighlightType: ItemShopHighlightType;

  @Column('json', { default: '{}' })
  CustomProperties: { [key: string]: any };

  @Column('json', { default: '{}' })
  ItemProperties: { [key: string]: any };
}
