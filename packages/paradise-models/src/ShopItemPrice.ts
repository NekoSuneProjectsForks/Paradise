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
  BuyingDurationType,
  PackType,
  UberStrikeCurrencyType
} from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { ShopFunctionalItem } from './ShopFunctionalItem';
import { ShopGearItem } from './ShopGearItem';
import { ShopQuickItem } from './ShopQuickItem';
import { ShopWeaponItem } from './ShopWeaponItem';

@Entity('ShopItemPrices')
export class ShopItemPrice extends BaseEntity {
  @PrimaryColumn('int')
  ID: number;

  @Column('int', { default: 0 })
  Price: number;

  @PrimaryColumn('int', { default: UberStrikeCurrencyType.None })
  Currency: UberStrikeCurrencyType;

  @Column('int', { default: 0 })
  Discount: number;

  @Column('int', { default: 1 })
  Amount: number;

  @Column('int', { default: PackType.One })
  PackType: PackType;

  @PrimaryColumn('int', { default: BuyingDurationType.None })
  Duration: BuyingDurationType;

  @Column('int', { nullable: true })
  FunctionalItemID: number | null;

  @ManyToOne(() => ShopFunctionalItem, (item) => item.Prices, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'FunctionalItemID', referencedColumnName: 'ID' })
  FunctionalItem?: Relation<ShopFunctionalItem>;

  @Column('int', { nullable: true })
  GearItemID: number | null;

  @ManyToOne(() => ShopGearItem, (item) => item.Prices, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'GearItemID', referencedColumnName: 'ID' })
  GearItem?: Relation<ShopGearItem>;

  @Column({ nullable: true })
  QuickItemID: number | null;

  @ManyToOne(() => ShopQuickItem, (item) => item.Prices, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'QuickItemID', referencedColumnName: 'ID' })
  QuickItem?: Relation<ShopQuickItem>;

  @Column({ nullable: true })
  WeaponItemID: number | null;

  @ManyToOne(() => ShopWeaponItem, (item) => item.Prices, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'WeaponItemID', referencedColumnName: 'ID' })
  WeaponItem?: Relation<ShopWeaponItem>;
}
