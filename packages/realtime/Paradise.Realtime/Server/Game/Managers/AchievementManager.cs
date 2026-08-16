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

using System;
using System.Collections.Generic;
using System.Linq;
using UberStrike.Core.Models;

namespace Paradise.Realtime.Server.Game {
	public class AchievementManager {
		private BaseGameRoom room;

		public AchievementManager(BaseGameRoom room) {
			this.room = room;
		}

		public Dictionary<AchievementType, Tuple<int, ushort>> GetAchievements() {
			return new Dictionary<AchievementType, Tuple<int, ushort>> {
				[AchievementType.MostValuable] = GetMostValuable().FirstOrDefault(),
				[AchievementType.MostAggressive] = GetMostAggressive().FirstOrDefault(),
				[AchievementType.SharpestShooter] = GetSharpestShooter().FirstOrDefault(),
				[AchievementType.TriggerHappy] = GetMostTriggerHappy().FirstOrDefault(),
				[AchievementType.HardestHitter] = GetHardestHitter().FirstOrDefault(),
				[AchievementType.CostEffective] = GetCostEffective().FirstOrDefault()
			};
		}

		// Most Valuable (Highest KD)
		public List<Tuple<int, ushort>> GetMostValuable() {
			var players = room.Players
				.Select(_ => new Tuple<int, ushort>(_.Actor.Cmid, Convert.ToUInt16(room.StatisticsManager.GetKillDeathRatio(_) * 10)))
				.OrderByDescending(_ => _.Item2)
				.Where(_ => _.Item2 > 0)
				.ToList();

			return players;
		}

		// Most Aggressive (Most Kills Total)
		public List<Tuple<int, ushort>> GetMostAggressive() {
			var players = room.Players
				.Select(_ => new Tuple<int, ushort>(_.Actor.Cmid, (ushort)room.StatisticsManager.GetKills(_)))
				.OrderByDescending(_ => _.Item2)
				.Where(_ => _.Item2 > 0)
				.ToList();

			return players;
		}

		// Sharpest Shooter (Most Critical Hits)
		public List<Tuple<int, ushort>> GetSharpestShooter() {
			var players = room.Players
				.Select(_ => new Tuple<int, ushort>(_.Actor.Cmid, (ushort)(room.StatisticsManager.GetHeadshots(_) + room.StatisticsManager.GetNutshots(_))))
				.OrderByDescending(_ => _.Item2)
				.Where(_ => _.Item2 > 0)
				.ToList();

			return players;
		}

		// Most Trigger Happy (Highest Killstreak)
		public List<Tuple<int, ushort>> GetMostTriggerHappy() {
			var players = room.Players
				.Select(_ => new Tuple<int, ushort>(_.Actor.Cmid, (ushort)room.StatisticsManager.GetBestPerLifeStatistics(_).GetKills()))
				.OrderByDescending(_ => _.Item2)
				.Where(_ => _.Item2 > 0)
				.ToList();

			return players;
		}

		// Hardest Hitter (Highest Damage Dealt)
		public List<Tuple<int, ushort>> GetHardestHitter() {
			var players = room.Players
				.Select(_ => new Tuple<int, ushort>(_.Actor.Cmid, (ushort)room.StatisticsManager.GetMatchStatistics(_).GetDamageDealt()))
				.OrderByDescending(_ => _.Item2)
				.Where(_ => _.Item2 > 0)
				.ToList();

			return players;
		}

		// Cost Effective (Highest Accuracy)
		public List<Tuple<int, ushort>> GetCostEffective() {
			var players = room.Players
				.Select(_ => new Tuple<int, ushort>(_.Actor.Cmid, Convert.ToUInt16(room.StatisticsManager.GetAccuracy(_) * 10)))
				.OrderByDescending(_ => _.Item2)
				.Where(_ => _.Item2 > 0)
				.ToList();

			return players;
		}
	}
}
