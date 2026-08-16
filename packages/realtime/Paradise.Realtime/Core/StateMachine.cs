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
using System;
using System.Collections.Generic;

namespace Paradise.Realtime.Core {
	public class StateMachine<T> where T : struct, IConvertible {
		private static readonly ILog Log = LogManager.GetLogger(nameof(StateMachine<T>));

		public event Action<T> OnChanged;
		public readonly EventHandler Events = new EventHandler();
		private readonly Dictionary<T, IState> registeredStates = new Dictionary<T, IState>();
		private readonly Stack<T> stateStack = new Stack<T>();

		private IState CurrentState {
			get {
				return GetState(CurrentStateId);
			}
		}

		public T CurrentStateId {
			get {
				return (stateStack.Count <= 0) ? default : stateStack.Peek();
			}
		}

		public bool ContainsState(T stateId) {
			return registeredStates.ContainsKey(stateId);
		}

		public IState GetState(T stateId) {
			registeredStates.TryGetValue(stateId, out var result);
			return result;
		}

		public void PopAllStates() {
			while (stateStack.Count > 0) {
				PopState(false);
			}
			OnChanged?.Invoke(default);
		}

		public void PopState(bool resume = false) {
			if (stateStack.Count != 0) {
				CurrentState?.OnExit();
				stateStack.Pop();
				if (resume && stateStack.Count != 0) {
					CurrentState.OnResume();
				}
				if (OnChanged != null && stateStack.Count > 0) {
					OnChanged(stateStack.Peek());
				}
			}
		}

		public void PushState(T stateId) {
			if (ContainsState(stateId)) {
				if (!stateStack.Contains(stateId)) {
					stateStack.Push(stateId);
					GetState(stateId).OnEnter();
					OnChanged?.Invoke(stateId);
				}
			} else {
				Console.WriteLine("Unsupported state of type: " + stateId);
			}
		}

		public void RegisterState(T stateId, IState state) {
			if (!registeredStates.ContainsKey(stateId)) {
				registeredStates.Add(stateId, state);
				return;
			}
			throw new Exception("StateMachine::RegisterState - state [" + stateId + "] already exists in the current registry");
		}

		public void Reset() {
			PopAllStates();
			stateStack.Clear();
			registeredStates.Clear();
			Events.Clear();
			OnChanged?.Invoke(default);
		}

		public void ResetState() {
			PopAllStates();
			stateStack.Clear();
			OnChanged?.Invoke(default);
		}

		public void SetState(T stateId) {
			if (ContainsState(stateId)) {
				if (!stateId.Equals(CurrentStateId)) {
					PopAllStates();
					stateStack.Push(stateId);
					GetState(stateId)?.OnEnter();
					OnChanged?.Invoke(stateId);
				}
				return;
			}
			throw new Exception("Unsupported state of type: " + stateId);
		}

		public void Update() {
			CurrentState?.OnUpdate();
		}
	}
}
