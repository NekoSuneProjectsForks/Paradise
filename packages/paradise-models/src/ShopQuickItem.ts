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

import type { QuickItemLogic } from '@festivaldev/uberstrike-js/UberStrike/Core/Types';
import { Column, Entity, OneToMany, type Relation } from 'typeorm';
import { ShopItem } from './ShopItem';
import { ShopItemPrice } from './ShopItemPrice';

@Entity('ShopQuickItems')
export class ShopQuickItem extends ShopItem {
  @Column('int', { nullable: true })
  UsesPerLife: number | null;

  @Column('int', { nullable: true })
  UsesPerRound: number | null;

  @Column('int', { nullable: true })
  UsesPerGame: number | null;

  @Column('int', { nullable: true })
  CoolDownTime: number | null;

  @Column('int', { nullable: true })
  WarmUpTime: number | null;

  @Column('int', { nullable: true })
  MaxOwnableAmount: number | null;

  @Column('int', { nullable: true })
  BehaviourType: QuickItemLogic | null;

  @OneToMany(() => ShopItemPrice, (price) => price.QuickItem)
  Prices: Relation<ShopItemPrice[]>;

  get IsForSale(): boolean {
    return this.Prices?.length > 0;
  }
}
