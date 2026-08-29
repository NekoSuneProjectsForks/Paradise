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
import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn, type Relation } from 'typeorm';
import { GameRoom } from './GameRoom';
import { PhotonServer } from './PhotonServer';
import { PublicProfile } from './PublicProfile';

@Entity('ActivePlayers')
export class ActivePlayer extends BaseEntity {
  @PrimaryColumn('int')
  Cmid: number;

  @Column('varchar', { nullable: true })
  IPAddress: string | null;

  @Column('int')
  Channel: ChannelType;

  @Column('int', { nullable: true })
  CommServerId: number | null;

  @ManyToOne(() => PhotonServer, (photonServer) => photonServer.CommPeers, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'CommServerId',
    referencedColumnName: 'PhotonId',
    foreignKeyConstraintName: 'ActivePlayers_ibfk_2'
  })
  CommServer: PhotonServer | null;

  @Column('int', { nullable: true })
  GameServerId: number | null;

  @ManyToOne(() => PhotonServer, (photonServer) => photonServer.GamePeers, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'GameServerId',
    referencedColumnName: 'PhotonId',
    foreignKeyConstraintName: 'ActivePlayers_ibfk_3'
  })
  GameServer: PhotonServer | null;

  @Column('int', { nullable: true })
  GameRoomId: number | null;

  @ManyToOne(() => GameRoom, (gameRoom) => gameRoom.Players, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'GameRoomId', referencedColumnName: 'Number', foreignKeyConstraintName: 'ActivePlayers_ibfk_4' })
  GameRoom: Relation<GameRoom> | null;

  @OneToOne(() => PublicProfile, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'Cmid', referencedColumnName: 'Cmid', foreignKeyConstraintName: 'ActivePlayers_ibfk_1' })
  PublicProfile: Relation<PublicProfile>;
}
