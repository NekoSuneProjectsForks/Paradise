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

import { AvatarType } from '@festivaldev/uberstrike-js/UberStrike/Core/Types';
import { BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryColumn, type Relation } from 'typeorm';
import { PublicProfile } from './PublicProfile';
import type { UberstrikeInventoryItem } from './enums';

@Entity('PlayerLoadouts')
export class PlayerLoadout extends BaseEntity {
  // [key: string]: any;

  @Column('int', { nullable: true })
  LoadoutId: number | null;

  @Column('int', { nullable: true })
  Backpack: number | null;

  @Column('int', { nullable: true })
  Boots: UberstrikeInventoryItem | null;

  @PrimaryColumn('int')
  Cmid: number;

  @Column('int', { nullable: true })
  Face: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  FunctionalItem1: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  FunctionalItem2: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  FunctionalItem3: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  Gloves: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  Head: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  LowerBody: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  MeleeWeapon: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  QuickItem1: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  QuickItem2: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  QuickItem3: UberstrikeInventoryItem | null;

  @Column('int', { default: AvatarType.LutzRavinoff, nullable: true })
  Type: AvatarType | null;

  @Column('int', { nullable: true })
  UpperBody: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  Weapon1: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  Weapon1Mod1: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  Weapon1Mod2: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  Weapon1Mod3: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  Weapon2: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  Weapon2Mod1: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  Weapon2Mod2: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  Weapon2Mod3: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  Weapon3: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  Weapon3Mod1: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  Weapon3Mod2: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  Weapon3Mod3: UberstrikeInventoryItem | null;

  @Column('int', { nullable: true })
  Webbing: UberstrikeInventoryItem | null;

  @Column('varchar', { nullable: true })
  SkinColor: string | null;

  @OneToOne(() => PublicProfile, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'Cmid', referencedColumnName: 'Cmid', foreignKeyConstraintName: 'PlayerLoadouts_ibfk_1' })
  PublicProfile: Relation<PublicProfile>;
}
