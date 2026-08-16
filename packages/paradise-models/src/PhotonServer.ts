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

import type { PhotonUsageType, RegionType } from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import {
  BaseEntity,
  Column,
  Entity,
  FindOperator,
  Like,
  OneToMany,
  PrimaryColumn,
  type FindOptionsRelations,
  type Relation
} from 'typeorm';
import { ActivePlayer } from './ActivePlayer';
import { GameRoom } from './GameRoom';

@Entity('PhotonServers')
export class PhotonServer extends BaseEntity {
  @PrimaryColumn('int')
  PhotonId: number;

  @Column('varchar', { length: 36 })
  Guid: string;

  @Column('varchar')
  Passphrase: string;

  @Column('varchar')
  IP: string;

  @Column('int')
  Port: number;

  @Column('varchar')
  Name: string;

  @Column('tinyint', { default: true })
  Enabled: boolean;

  @Column('varchar')
  ApiVersion: string;

  @Column('int')
  Region: RegionType;

  @Column('int')
  UsageType: PhotonUsageType;

  @Column('int', { nullable: true })
  MinLatency: number | null;

  @Column('datetime', { nullable: true })
  LastResponseTime: Date | null;

  @OneToMany(() => ActivePlayer, (activePlayer) => activePlayer.CommServer)
  CommPeers: Relation<ActivePlayer[]>;

  @OneToMany(() => ActivePlayer, (activePlayer) => activePlayer.GameServer)
  GamePeers: Relation<ActivePlayer[]>;

  @OneToMany(() => GameRoom, (gameRoom) => gameRoom.PhotonServer)
  Rooms: Relation<GameRoom[]>;

  static async findServer(
    searchString: string,
    relations: FindOptionsRelations<PhotonServer> = {}
  ): Promise<PhotonServer | null> {
    return PhotonServer.findOne({
      where: [
        {
          PhotonId: Like(`${searchString}` as any as FindOperator<number>)
        },
        {
          Name: Like(`%${searchString}%`)
        }
      ],
      relations: {
        ...relations
      }
    });
  }
}
