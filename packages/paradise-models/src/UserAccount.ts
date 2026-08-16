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

import type { ChannelType } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import { TutorialStepType } from '@festivaldev/uberstrike-js/UberStrike/Core/Types';
import { BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryColumn, type Relation } from 'typeorm';
import { PublicProfile } from './PublicProfile';

@Entity('UserAccounts')
export class UserAccount extends BaseEntity {
  @PrimaryColumn('int')
  Cmid: number;

  @Column('varchar')
  EmailAddress: string;

  @Column('varchar')
  Password: string;

  @Column('int')
  Channel: ChannelType;

  @Column('varchar', { nullable: true })
  Locale: String | null;

  @Column('int', { default: TutorialStepType.MouseLook })
  TutorialStep: TutorialStepType;

  @OneToOne(() => PublicProfile, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'Cmid', referencedColumnName: 'Cmid' })
  PublicProfile: Relation<PublicProfile>;
}
