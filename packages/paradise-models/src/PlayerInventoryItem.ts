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

import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { PublicProfile } from './PublicProfile';
import type { UberstrikeInventoryItem } from './enums';

@Entity('PlayerInventoryItems')
export class PlayerInventoryItem extends BaseEntity {
  @PrimaryColumn('int')
  Cmid: number;

  @PrimaryColumn('int')
  ItemId: UberstrikeInventoryItem;

  @Column('datetime', { nullable: true })
  ExpirationDate: Date | null;

  @Column('int', { default: 0 })
  AmountRemaining: number;

  @ManyToOne(() => PublicProfile, (publicProfile) => publicProfile.InventoryItems, {
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'Cmid', referencedColumnName: 'Cmid' })
  PublicProfile: Relation<PublicProfile>;
}
