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

namespace Paradise.Realtime.Core {
	public class Countdown {
		private readonly FixedTimer timer;

		public bool IsEnabled {
			get => timer.IsEnabled;
			set => timer.IsEnabled = value;
		}

		public int Count { get; private set; }
		public int StartCount { get; }
		public int EndCount { get; }

		public Countdown(ILoop loop, int startCount, int endCount) {
			if (startCount <= endCount)
				throw new ArgumentOutOfRangeException();

			StartCount = startCount;
			EndCount = endCount;
			timer = new FixedTimer(loop, 1000f);
			Reset();
		}

		public event Action Completed;
		public event Action<int> Counted;

		public void Start() {
			timer.Start();
			/* Count first value on Start. */
			DoCountdown();
		}

		public void Stop() => timer.Stop();

		public void Reset() {
			Count = StartCount;
			timer.Reset();
		}

		public void Restart() {
			Reset();
			Start();
		}

		public void Tick() {
			while (timer.Tick())
				DoCountdown();
		}

		private void DoCountdown() {
			Counted?.Invoke(Count);
			var newCount = Count - 1;

			if (newCount < EndCount) {
				Stop();
				Completed?.Invoke();
			} else {
				Count = newCount;
			}
		}
	}
}
