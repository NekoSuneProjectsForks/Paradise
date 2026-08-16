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

using log4net;
using Paradise.Realtime.Core;
using System;

namespace Paradise.Realtime.Server.Game {
	public enum GameStateId {
		None,
		MatchRunning,
		PregameLoadout,
		WaitingForPlayers,
		EndOfMatch,
		InGameShop,
		PrepareNextRound,
		AfterRound
	}

	public abstract class BaseMatchState : IState {
		protected static readonly ILog Log = LogManager.GetLogger(nameof(BaseMatchState));

		protected BaseGameRoom Room { get; private set; }

		public BaseMatchState(BaseGameRoom room) {
			Room = room ?? throw new ArgumentNullException(nameof(room));
		}

		public abstract void OnEnter();
		public abstract void OnExit();
		public abstract void OnResume();
		public abstract void OnUpdate();
	}
}
