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

using Cmune.DataCenter.Common.Entities;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using UberStrike.Core.Models;
using UberStrike.Core.Models.Views;

namespace Paradise.Realtime.Server.Game {
	[JsonObject(MemberSerialization.OptIn)]
	public partial class GameActor {
		public GamePeer Peer { get; private set; }
		public GameActorInfo ActorInfo { get; private set; }

		public PlayerMovement Movement { get; private set; }
		public DamageEvent Damage { get; private set; } = new DamageEvent();
		public UberStrikeItemWeaponView CurrentWeapon;

		[JsonProperty]
		public int Cmid => ActorInfo.Cmid;
		[JsonProperty]
		public string Name => ActorInfo.PlayerName;
		[JsonProperty]
		public MemberAccessLevel AccessLevel => ActorInfo.AccessLevel;

		public GameActorInfoDelta Delta => ActorInfo.Delta;

		public TeamID Team {
			get { return ActorInfo.TeamID; }
			set { ActorInfo.TeamID = value; }
		}

		public SpawnPoint CurrentSpawnPoint;
		public List<SpawnPoint> PreviousSpawnPoints = new List<SpawnPoint>();

		public DateTime LastRespawnTime = DateTime.UtcNow;
		public DateTime LastTeamSwitchTime = DateTime.UtcNow;
		public DateTime NextRespawnTime = DateTime.MinValue;

		public bool UpdatePosition;

		public GameActor(GamePeer peer, GameActorInfo actorInfo) {
			Peer = peer ?? throw new ArgumentNullException(nameof(peer));
			ActorInfo = actorInfo ?? throw new ArgumentNullException(nameof(actorInfo));

			Movement = new PlayerMovement {
				Number = actorInfo.PlayerId
			};

			ActorInfo.Delta.Id = actorInfo.PlayerId;
		}
	}
}
