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

import { BundleCategoryType, type ChannelType } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import { BaseEntity, Column, Entity, OneToMany, PrimaryColumn, type Relation } from 'typeorm';
import { ShopBundleItem } from './ShopBundleItem';

@Entity('ShopBundles')
export class ShopBundle extends BaseEntity {
  @PrimaryColumn('int')
  Id: number;

  @Column('int')
  ApplicationId: number;

  @Column('varchar')
  Name: string;

  @Column('varchar', { nullable: true })
  ImageUrl: string | null;

  @Column('varchar', { nullable: true })
  IconUrl: string | null;

  @Column('text', { nullable: true })
  Description: string | null;

  @Column('tinyint', { default: false })
  IsOnSale: boolean;

  @Column('tinyint', { default: false })
  IsPromoted: boolean;

  @Column('int', { default: 0, nullable: true })
  USDPrice: number | null;

  @Column('int', { nullable: true })
  USDPromoPrice: number | null;

  @Column('int', { default: 0 })
  Credits: number;

  @Column('int', { default: 0 })
  Points: number;

  @Column('int', { default: BundleCategoryType.None })
  Category: BundleCategoryType;

  @Column('json', { default: '[]' })
  Availability: ChannelType[];

  @Column('varchar', { nullable: true })
  PromotionTag: string | null;

  @Column('varchar', { nullable: true })
  MacAppStoreUniqueId: string | null;

  @Column('varchar', { nullable: true })
  IosAppStoreUniqueId: string | null;

  @Column('varchar', { nullable: true })
  AndroidStoreUniqueId: string | null;

  @Column('tinyint', { default: false })
  IsDefault: boolean;

  @OneToMany(() => ShopBundleItem, (shopBundleItem) => shopBundleItem.Bundle)
  BundleItemViews: Relation<ShopBundleItem[]>;
}
