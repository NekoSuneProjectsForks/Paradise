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

import { Column, Entity, OneToMany, type Relation } from 'typeorm';
import { ShopItem } from './ShopItem';
import { ShopItemPrice } from './ShopItemPrice';

@Entity('ShopWeaponItems')
export class ShopWeaponItem extends ShopItem {
  @Column('int', { nullable: true })
  AccuracySpread: number | null;

  @Column('int', { nullable: true })
  CombatRange: number | null;

  @Column('int', { nullable: true })
  CriticalStrikeBonus: number | null;

  @Column('int', { nullable: true })
  DamageKnockback: number | null;

  @Column('int', { nullable: true })
  DamagePerProjectile: number | null;

  @Column('int', { nullable: true })
  DefaultZoomMultiplier: number | null;

  @Column('tinyint', { nullable: true })
  HasAutomaticFire: boolean;

  @Column('int', { nullable: true })
  MaxAmmo: number | null;

  @Column('int', { nullable: true })
  MaxZoomMultiplier: number | null;

  @Column('int', { nullable: true })
  MinZoomMultiplier: number | null;

  @Column('int', { nullable: true })
  MissileBounciness: number | null;

  @Column('int', { nullable: true })
  MissileForceImpulse: number | null;

  @Column('int', { nullable: true })
  MissileTimeToDetonate: number | null;

  @Column('int', { nullable: true })
  ProjectileSpeed: number | null;

  @Column('int', { nullable: true })
  ProjectilesPerShot: number | null;

  @Column('int', { nullable: true })
  RateOfFire: number | null;

  @Column('int', { nullable: true })
  RecoilKickback: number | null;

  @Column('int', { nullable: true })
  RecoilMovement: number | null;

  @Column('int', { nullable: true })
  SecondaryActionReticle: number | null;

  @Column('int', { nullable: true })
  SplashRadius: number | null;

  @Column('int', { nullable: true })
  StartAmmo: number | null;

  @Column('int', { nullable: true })
  Tier: number | null;

  @Column('int', { nullable: true })
  WeaponSecondaryAction: number | null;

  @OneToMany(() => ShopItemPrice, (price) => price.WeaponItem)
  Prices: Relation<ShopItemPrice[]>;

  get IsForSale(): boolean {
    return this.Prices?.length > 0;
  }
}
