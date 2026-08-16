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
using System.Runtime.CompilerServices;

namespace Paradise.Realtime.Core {
	public abstract class BaseTimer : ITimer {
		private float interval;
		protected ILoop Loop { get; }

		public BaseTimer(ILoop loop, TimeSpan interval) : this(loop, (float)interval.TotalMilliseconds) { }

		protected BaseTimer(ILoop loop, float interval) {
			ThrowInterval(interval, nameof(interval));
			Loop = loop ?? throw new ArgumentNullException(nameof(loop));
			this.interval = interval;
			Reset();
		}

		public bool IsEnabled { get; set; }

		public float Interval {
			get => interval;
			set {
				ThrowInterval(value, nameof(value));
				Reset();
				interval = value;
			}
		}

		public event Action Elapsed;
		public void Start() => IsEnabled = true;
		public void Stop() => IsEnabled = false;

		public void Restart() {
			Reset();
			Start();
		}

		public abstract void Reset();
		public abstract bool Tick();

		protected void OnElapsed() {
			Elapsed?.Invoke();
		}

		[MethodImpl(MethodImplOptions.NoInlining)]
		private static void ThrowInterval(float value, string paramName) {
			if (value <= 0) {
				throw new ArgumentOutOfRangeException(paramName, "Interval cannot be less or equal to 0.");
			}
		}
	}
}
