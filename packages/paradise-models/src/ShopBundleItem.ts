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

import type { BuyingDurationType } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { ShopBundle } from './ShopBundle';
import type { UberstrikeInventoryItem } from './enums';

@Entity('ShopBundleItems')
export class ShopBundleItem extends BaseEntity {
  @PrimaryColumn('int')
  id: number;

  @Column('int')
  BundleId: number;

  @ManyToOne(() => ShopBundle, (shopBundle) => shopBundle.BundleItemViews, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'BundleId', referencedColumnName: 'Id' })
  Bundle: Relation<ShopBundle>;

  @Column('int')
  ItemId: UberstrikeInventoryItem;

  @Column('int', { default: 1 })
  Amount: number;

  @Column('int')
  Duration: BuyingDurationType;
}
