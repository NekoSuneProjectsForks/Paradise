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

import { EmailAddressStatus, MemberAccessLevel } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import {
  And,
  BaseEntity,
  Column,
  Entity,
  FindOperator,
  IsNull,
  Like,
  MoreThan,
  OneToMany,
  OneToOne,
  Or,
  PrimaryColumn,
  type FindOptionsRelations,
  type Relation
} from 'typeorm';
import { ActivePlayer } from './ActivePlayer';
import { Clan } from './Clan';
import { ClanMember } from './ClanMember';
import { ContactRequest } from './ContactRequest';
import { CurrencyDeposit } from './CurrencyDeposit';
import { DiscordUser } from './DiscordUser';
import { GameSession } from './GameSession';
import { GroupInvitation } from './GroupInvitation';
import { ItemTransaction } from './ItemTransaction';
import { MemberWallet } from './MemberWallet';
import { ModerationAction } from './ModerationAction';
import { PlayerInventoryItem } from './PlayerInventoryItem';
import { PlayerLoadout } from './PlayerLoadout';
import { PlayerMachine } from './PlayerMachine';
import { PlayerStatistics } from './PlayerStatistics';
import { PointDeposit } from './PointDeposit';
import { PrivateMessage } from './PrivateMessage';
import { SteamMember } from './SteamMember';
import { UserAccount } from './UserAccount';

@Entity('PublicProfiles')
export class PublicProfile extends BaseEntity {
  @PrimaryColumn('int')
  Cmid: number;

  @Column('varchar', { length: 18 })
  Name: string;

  @Column('tinyint', { default: false })
  IsChatDisabled: boolean;

  @Column('int', { default: MemberAccessLevel.Default })
  AccessLevel: MemberAccessLevel;

  // @Column('varchar', { length: 5, nullable: true })
  // GroupTag: string | null;
  get GroupTag(): string | null {
    return this.Clan?.Tag ?? null;
  }

  @Column('datetime')
  LastLoginDate: Date;

  @Column('int', { default: EmailAddressStatus.Verified })
  EmailAddressStatus: EmailAddressStatus;

  @Column('varchar', { nullable: true })
  FacebookId: string | null;

  // #region Relations
  @OneToOne(() => ActivePlayer, (activePlayer) => activePlayer.PublicProfile)
  ActivePlayer?: Relation<ActivePlayer | null>;

  @OneToOne(() => Clan, (clan) => clan.Owner)
  Clan?: Relation<Clan | null>;

  @OneToOne(() => ClanMember, (clanMember) => clanMember.PublicProfile)
  ClanMember?: Relation<ClanMember | null>;

  @OneToMany(() => ContactRequest, (contactRequest) => contactRequest.Initiator)
  ContactRequestsSent: Relation<ContactRequest[]>;

  @OneToMany(() => ContactRequest, (contactRequest) => contactRequest.Receiver)
  ContactRequestsReceived: Relation<ContactRequest[]>;

  @OneToMany(() => CurrencyDeposit, (currencyDeposit) => currencyDeposit.PublicProfile)
  CurrencyDeposits: Relation<CurrencyDeposit[]>;

  @OneToOne(() => DiscordUser, (discordUser) => discordUser.PublicProfile)
  DiscordUser?: Relation<DiscordUser | null>;

  @OneToMany(() => GameSession, (gameSession) => gameSession.PublicProfile)
  GameSessions: Relation<GameSession[]>;

  @OneToMany(() => GroupInvitation, (groupInvitation) => groupInvitation.Inviter)
  GroupInvitationsSent: Relation<GroupInvitation[]>;

  @OneToMany(() => GroupInvitation, (groupInvitation) => groupInvitation.Invitee)
  GroupInvitationsReceived: Relation<GroupInvitation[]>;

  @OneToMany(() => ItemTransaction, (itemTransaction) => itemTransaction.PublicProfile)
  ItemTransactions: Relation<ItemTransaction[]>;

  @OneToOne(() => MemberWallet, (memberWallet) => memberWallet.PublicProfile)
  MemberWallet?: Relation<MemberWallet | null>;

  @OneToMany(() => ModerationAction, (moderationAction) => moderationAction.Source)
  ModerationActionsIssued: Relation<ModerationAction[]>;

  @OneToMany(() => ModerationAction, (moderationAction) => moderationAction.Target)
  ModerationActionsReceived: Relation<ModerationAction[]>;

  @OneToMany(() => PlayerInventoryItem, (inventoryItem) => inventoryItem.PublicProfile)
  InventoryItems: Relation<PlayerInventoryItem[]>;

  @OneToOne(() => PlayerLoadout, (playerLoadout) => playerLoadout.PublicProfile)
  Loadout?: Relation<PlayerLoadout | null>;

  @OneToMany(() => PlayerMachine, (machine) => machine.PublicProfile)
  Machines: Relation<PlayerMachine[]>;

  @OneToOne(() => PlayerStatistics, (playerStatistics) => playerStatistics.PublicProfile)
  Statistics?: Relation<PlayerStatistics | null>;

  @OneToMany(() => PointDeposit, (pointDeposit) => pointDeposit.PublicProfile)
  PointDeposits: Relation<PointDeposit[]>;

  @OneToMany(() => PrivateMessage, (privateMessage) => privateMessage.From)
  PrivateMessagesSent: Relation<PrivateMessage[]>;

  @OneToMany(() => PrivateMessage, (privateMessage) => privateMessage.To)
  PrivateMessagesReceived: Relation<PrivateMessage[]>;

  @OneToOne(() => SteamMember, (steamMember) => steamMember.PublicProfile)
  SteamMember?: Relation<SteamMember | null>;

  @OneToOne(() => UserAccount, (userAccount) => userAccount.PublicProfile)
  UserAccount?: Relation<UserAccount | null>;
  // #endregion

  static async findProfile(
    searchString: string,
    relations: FindOptionsRelations<PublicProfile> = {}
  ): Promise<PublicProfile | null> {
    return PublicProfile.findOne({
      where: [
        {
          Cmid: And(MoreThan(0), Like(`%${searchString.toLocaleLowerCase()}%` as any as FindOperator<number>))
        },
        {
          Cmid: MoreThan(0),
          Name: Like(`%${searchString.toLocaleLowerCase()}%`)
        },
        {
          Cmid: MoreThan(0),
          SteamMember: {
            SteamId: Like(`%${searchString.toLocaleLowerCase()}%`)
          }
        },
        {
          Cmid: MoreThan(0),
          UserAccount: {
            EmailAddress: Like(`%${searchString.toLocaleLowerCase()}%`)
          }
        }
      ],
      relations: {
        ActivePlayer: true,
        SteamMember: true,
        UserAccount: true,
        ...relations
      },
      order: {
        Name: 'ASC'
      }
    });
  }

  static async findProfiles(
    searchString?: string,
    relations: FindOptionsRelations<PublicProfile> = {}
  ): Promise<PublicProfile[]> {
    return PublicProfile.find({
      where:
        (searchString && [
          {
            Cmid: And(MoreThan(0), Like(`%${searchString.toLocaleLowerCase()}%` as any as FindOperator<number>))
          },
          {
            Cmid: MoreThan(0),
            Name: Like(`%${searchString.toLocaleLowerCase()}%`)
          },
          {
            Cmid: MoreThan(0),
            SteamMember: {
              SteamId: Like(`%${searchString.toLocaleLowerCase()}%`)
            }
          },
          {
            Cmid: MoreThan(0),
            UserAccount: {
              EmailAddress: Like(`%${searchString.toLocaleLowerCase()}%`)
            }
          }
        ]) ||
        undefined,
      relations: {
        ActivePlayer: true,
        SteamMember: true,
        UserAccount: true,
        ...relations
      },
      order: {
        Name: 'ASC'
      }
    });
  }

  async hasInventoryItem(itemId: number): Promise<boolean> {
    const item = await PlayerInventoryItem.findOne({
      where: {
        Cmid: this.Cmid,
        ItemId: itemId,
        ExpirationDate: Or(IsNull(), MoreThan(new Date()))
      }
    });

    return item != null;
  }
}
