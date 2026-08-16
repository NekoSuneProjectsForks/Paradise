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

import { GroupColor, GroupFontStyle, GroupType } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import {
  And,
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  FindOperator,
  JoinColumn,
  Like,
  MoreThan,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
  type FindOptionsRelations,
  type Relation
} from 'typeorm';
import { ClanMember } from './ClanMember';
import { GroupInvitation } from './GroupInvitation';
import { PublicProfile } from './PublicProfile';

@Entity('Clans')
export class Clan extends BaseEntity {
  @PrimaryColumn('int')
  GroupId: number;

  @Column('varchar', { nullable: true })
  Description: string | null;

  @Column('varchar', { length: 25, unique: true })
  Name: string;

  @Column('varchar', { length: 25 })
  Motto: string;

  @Column('varchar', { nullable: true })
  Address: string | null;

  @CreateDateColumn()
  FoundingDate: Date;

  @Column('varchar', { nullable: true })
  Picture: string | null;

  @Column('int', { default: GroupType.Clan })
  Type: GroupType;

  @UpdateDateColumn()
  LastUpdated: Date;

  @Column('varchar', { length: 5, unique: true })
  Tag: string;

  @Column('int', { nullable: true })
  MembersLimit: number | null;

  @Column('int', { default: GroupColor.Black })
  ColorStyle: GroupColor;

  @Column('int', { default: GroupFontStyle.Normal })
  FontStyle: GroupFontStyle;

  @Column('int')
  ApplicationId: number;

  @Column('int', { unique: true })
  OwnerCmid: number;

  @OneToOne(() => PublicProfile, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'OwnerCmid', referencedColumnName: 'Cmid' })
  Owner: Relation<PublicProfile>;

  get OwnerName(): string {
    return this.Owner.Name;
  }

  @OneToMany(() => ClanMember, (clanMember) => clanMember.Group)
  @JoinColumn({ name: 'GroupId', referencedColumnName: 'GroupId' })
  Members: Relation<ClanMember[]>;

  get MembersCount(): number {
    return this.Members.length;
  }

  @OneToMany(() => GroupInvitation, (groupInvitation) => groupInvitation.Group)
  @JoinColumn({ name: 'GroupId', referencedColumnName: 'GroupId' })
  Invitations: Relation<GroupInvitation[]>;

  static async findClan(searchString: string, relations: FindOptionsRelations<Clan> = {}): Promise<Clan | null> {
    return Clan.findOne({
      where: [
        {
          GroupId: And(MoreThan(0), Like(`%${searchString.toLocaleLowerCase()}%` as any as FindOperator<number>))
        },
        {
          GroupId: MoreThan(0),
          Name: Like(`%${searchString.toLocaleLowerCase()}%`)
        },
        {
          GroupId: MoreThan(0),
          Tag: Like(`%${searchString.toLocaleLowerCase()}%`)
        },
        {
          GroupId: MoreThan(0),
          Owner: {
            Name: Like(`%${searchString.toLocaleLowerCase()}%`)
          }
        }
      ],
      relations: {
        Owner: true,
        Members: {
          PublicProfile: true
        },
        ...relations
      },
      order: {
        Name: 'ASC'
      }
    });
  }

  static async findClanByName(searchString: string, relations: FindOptionsRelations<Clan> = {}): Promise<Clan | null> {
    return Clan.findOne({
      where: {
        GroupId: MoreThan(0),
        Name: Like(`%${searchString.toLocaleLowerCase()}%`)
      },
      relations: {
        Owner: true,
        Members: {
          PublicProfile: true
        },
        ...relations
      },
      order: {
        Name: 'ASC'
      }
    });
  }

  static async findClanByTag(searchString: string, relations: FindOptionsRelations<Clan> = {}): Promise<Clan | null> {
    return Clan.findOne({
      where: {
        GroupId: MoreThan(0),
        Tag: Like(`%${searchString.toLocaleLowerCase()}%`)
      },
      relations: {
        Owner: true,
        Members: {
          PublicProfile: true
        },
        ...relations
      },
      order: {
        Name: 'ASC'
      }
    });
  }

  static async findClans(searchString?: string, relations: FindOptionsRelations<Clan> = {}): Promise<Clan[]> {
    return Clan.find({
      where:
        (searchString && [
          {
            GroupId: And(MoreThan(0), Like(`%${searchString.toLocaleLowerCase()}%` as any as FindOperator<number>))
          },
          {
            GroupId: MoreThan(0),
            Name: Like(`%${searchString.toLocaleLowerCase()}%`)
          },
          {
            GroupId: MoreThan(0),
            Tag: Like(`%${searchString.toLocaleLowerCase()}%`)
          },
          {
            GroupId: MoreThan(0),
            Owner: {
              Name: Like(`%${searchString.toLocaleLowerCase()}%`)
            }
          }
        ]) ||
        undefined,
      relations: {
        Owner: true,
        Members: {
          PublicProfile: true
        },
        ...relations
      },
      order: {
        Name: 'ASC'
      }
    });
  }
}
