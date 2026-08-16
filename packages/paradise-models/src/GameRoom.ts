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

import type { GAME_FLAGS } from '@festivaldev/uberstrike-js';
import type { GameModeType } from '@festivaldev/uberstrike-js/UberStrike/Core/Types';
import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, type Relation } from 'typeorm';
import { ActivePlayer } from './ActivePlayer';
import { Map } from './Map';
import { PhotonServer } from './PhotonServer';

@Entity('GameRooms')
export class GameRoom extends BaseEntity {
  @PrimaryColumn('int')
  Number: number;

  // @Column('varchar', { nullable: true })
  // ServerIp: string | null;

  // @Column('varchar', { nullable: true })
  // ServerPort: number | null;

  @Column('int')
  PhotonServerId: number;

  @ManyToOne(() => PhotonServer, (photonServer) => photonServer.Rooms, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'PhotonServerId', referencedColumnName: 'PhotonId' })
  PhotonServer: Relation<PhotonServer>;

  @Column('varchar', { length: 18 })
  Name: string;

  // Only used for permanent games
  @Column('varchar', { nullable: true })
  Password: string | null;

  @Column('tinyint', { default: false })
  IsPasswordProtected: boolean;

  @Column('int')
  GameMode: GameModeType;

  @Column('int')
  PlayerLimit: number;

  @OneToMany(() => ActivePlayer, (activePlayer) => activePlayer.GameRoom)
  Players: Relation<ActivePlayer[]>;

  @Column('int')
  TimeLimit: number;

  @Column('int')
  KillLimit: number;

  @Column('int')
  GameFlags: GAME_FLAGS;

  @Column('int')
  MapID: number;

  @ManyToOne(() => Map, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'MapID', referencedColumnName: 'MapId' })
  Map: Relation<Map>;

  @Column('int', { default: 0 })
  LevelMin: number;

  @Column('int', { default: 0 })
  LevelMax: number;

  @Column('tinyint', { default: false })
  IsPermanentGame: boolean;

  // Discord Channel ID
  @Column('varchar', { nullable: true })
  ChannelId: string | null;

  // Discord Webhook URL
  @Column('varchar', { nullable: true })
  WebhookUrl: string | null;
}
