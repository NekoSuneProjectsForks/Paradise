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

namespace Paradise.Realtime.Core {
	public sealed class FixedTimer : BaseTimer {
		private float accumulatedTime;
		private float tickTime;

		public FixedTimer(ILoop loop, float interval) : base(loop, interval) {
			/* Space. */
		}

		public override void Reset() {
			tickTime = 0;
			accumulatedTime = 0;
			IsEnabled = false;
		}

		public override bool Tick() {
			if (!IsEnabled)
				return false;

			/* Check if Tick() was called in the same ILoop.Tick() call. */
			if (tickTime != Loop.Time) {
				tickTime = Loop.Time;
				accumulatedTime += Loop.DeltaTime;
			}

			if (accumulatedTime >= Interval) {
				OnElapsed();
				accumulatedTime -= Interval;

				return true;
			}

			return false;
		}
	}
}
