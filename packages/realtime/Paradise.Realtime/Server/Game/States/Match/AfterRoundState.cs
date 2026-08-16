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
using System;
using System.Collections.Generic;
using System.Linq;
using UberStrike.Core.Models;

namespace Paradise.Realtime.Server.Game {
	internal class AfterRoundState : BaseMatchState {
		public AfterRoundState(BaseGameRoom room) : base(room) { }

		public override void OnEnter() {
			var mvps = new List<StatsSummary>();

			try {
				mvps = Room.StatisticsManager.GetMostValuablePlayers();
			} catch (Exception ex) {
				Log.Error("Failed to compute most-valuable-players", ex);
			}

			var timeInGameSeconds = Room.RoundDurations.Count > 0
				? (int)Room.RoundDurations.Aggregate((sum, duration) => sum.Add(duration)).TotalSeconds
				: 0;

			var matchData = new EndOfMatchData() {
				MostValuablePlayers = mvps,
				MatchGuid = Room.MetaData.Guid,
				TimeInGameMinutes = timeInGameSeconds
			};

			GameServerApplication.Instance.SocketClient?.SendSync(PacketType.RoundEnded, (Room.MetaData, matchData, Room.StatisticsManager.GetPlayerStatistics()));

			var r = new Random((int)DateTime.UtcNow.Ticks);

			foreach (var player in Room.Players) {
                try {
                    Room.StatisticsManager.ResetCurrentLifeStatistics(player);

                    var playerMatchData = new EndOfMatchData {
                        PlayerStatsTotal = Room.StatisticsManager.GetMatchStatistics(player),
                        PlayerStatsBestPerLife = Room.StatisticsManager.GetBestPerLifeStatistics(player),
                        MostEffecientWeaponId = 0,
                        MostValuablePlayers = matchData.MostValuablePlayers,
                        MatchGuid = matchData.MatchGuid,
                        HasWonMatch = Room.IsTeamGame ? player.Actor.Team == Room.WinningTeam : player.Actor.Cmid == Room.WinningCmid,
                        TimeInGameMinutes = matchData.TimeInGameMinutes
                    };

                    Room.StatisticsManager.CalculateXp(playerMatchData);
                    Room.StatisticsManager.CalculatePoints(playerMatchData);

                    try {
                        UserWebServiceClient.Instance.DepositPoints(new PointDepositView {
                        	Cmid = player.Actor.Cmid,
                        	DepositDate = DateTime.UtcNow,
                        	DepositType = PointsDepositType.Game,
                        	PointDepositId = r.Next(1, int.MaxValue),
                        	Points = playerMatchData.PlayerStatsTotal.Points,
                        }, player.AuthToken);

                        Room.StatisticsManager.SaveStatistics(player, playerMatchData);
                    } catch (Exception ex) {
                        Log.Error($"Failed to persist match results for cmid {player.Actor.Cmid}", ex);
                    }

                    player.GameEventSender.SendMatchEnd(playerMatchData);
                    player.State.SetState(PlayerStateId.Overview);
                } catch (Exception ex) {
					Log.Error($"Error finalising match for cmid {player.Actor.Cmid}", ex);
				}
			}

			foreach (var peer in Room.Peers) {
				foreach (var player in Room.Players) {
					if (player.Actor.Cmid.CompareTo(peer.Actor.Cmid) == 0)
						continue;

					player.GameEventSender.SendPlayerLeftGame(peer.Actor.Cmid);
				}
			}

			Room.Reset();
		}

		public override void OnExit() {
		}

		public override void OnResume() {
		}

		public override void OnUpdate() {
		}
	}
}
