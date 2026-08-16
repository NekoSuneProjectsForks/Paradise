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

namespace Paradise.Realtime.Core {
	public class EventHandler {
		public static readonly EventHandler Global = new EventHandler();
		private Dictionary<Type, IEventContainer> eventContainer = new Dictionary<Type, IEventContainer>();

		public void AddListener<T>(Action<T> callback) {
			IEventContainer eventContainer;

			if (!this.eventContainer.TryGetValue(typeof(T), out eventContainer)) {
				eventContainer = new EventContainer<T>();
				this.eventContainer.Add(typeof(T), eventContainer);
			}

			var eventContainer2 = eventContainer as EventContainer<T>;

			if (eventContainer2 != null) {
				eventContainer2.AddCallbackMethod(callback);
			}
		}

		public void Clear() {
			eventContainer.Clear();
		}

		public void Fire(object message) {
			IEventContainer eventContainer;

			if (this.eventContainer.TryGetValue(message.GetType(), out eventContainer)) {
				eventContainer.CastEvent(message);
			}
		}

		public void RemoveListener<T>(Action<T> callback) {
			IEventContainer eventContainer;

			if (this.eventContainer.TryGetValue(typeof(T), out eventContainer)) {
				var eventContainer2 = eventContainer as EventContainer<T>;

				if (eventContainer2 != null) {
					eventContainer2.RemoveCallbackMethod(callback);
				}
			}
		}

		private class EventContainer<T> : IEventContainer {
			private Dictionary<string, Action<T>> _dictionary = new Dictionary<string, Action<T>>();

			public void CastEvent(object m) {
				if (Sender != null) {
					Sender((T)m);
				}
			}

			public void AddCallbackMethod(Action<T> callback) {
				var callbackMethodId = GetCallbackMethodId(callback);

				if (!_dictionary.ContainsKey(callbackMethodId)) {
					_dictionary.Add(callbackMethodId, callback);
					Sender = (Action<T>)Delegate.Combine(Sender, callback);
				}
			}

			private string GetCallbackMethodId(Action<T> callback) {
				var text = callback.Method.DeclaringType.FullName + callback.Method.Name;

				if (callback.Target != null) {
					text += callback.Target.GetHashCode().ToString();
				}

				return text;
			}

			public void RemoveCallbackMethod(Action<T> callback) {
				if (_dictionary.Remove(GetCallbackMethodId(callback))) {
					Sender = (Action<T>)Delegate.Remove(Sender, callback);
				}
			}

			public event Action<T> Sender;
		}

		private interface IEventContainer {
			void CastEvent(object m);
		}
	}
}
