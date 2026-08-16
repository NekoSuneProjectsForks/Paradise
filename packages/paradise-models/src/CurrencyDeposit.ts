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

import { PaymentProviderType, type ChannelType } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
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
import { ShopBundle } from './ShopBundle';

@Entity('CurrencyDeposits')
export class CurrencyDeposit extends BaseEntity {
  @PrimaryColumn('int')
  CreditsDepositId: number;

  @CreateDateColumn()
  DepositDate: Date;

  @Column('int', { default: 0 })
  Credits: number;

  @Column('int', { default: 0 })
  Points: number;

  @Column('decimal', { default: 0 })
  Cash: number;

  @Column('varchar', { nullable: true })
  CurrencyLabel: string | null;

  @Column('int')
  Cmid: number;

  @Column('tinyint', { default: false })
  IsAdminAction: boolean;

  @Column('int', { default: PaymentProviderType.Unknown })
  PaymentProviderId: PaymentProviderType;

  @Column('varchar')
  TransactionKey: string;

  @Column('int')
  ApplicationId: number;

  @Column('int')
  ChannelId: ChannelType;

  @Column('decimal', { default: 0 })
  UsdAmount: number;

  @Column('int', { nullable: true })
  BundleId: number | null;

  @ManyToOne(() => ShopBundle, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'BundleId', referencedColumnName: 'Id' })
  Bundle: Relation<ShopBundle | null>;

  get BundleName(): string {
    return this.Bundle?.Name ?? 'Unknown';
  }

  @ManyToOne(() => PublicProfile, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'Cmid', referencedColumnName: 'Cmid' })
  PublicProfile: Relation<PublicProfile>;
}
