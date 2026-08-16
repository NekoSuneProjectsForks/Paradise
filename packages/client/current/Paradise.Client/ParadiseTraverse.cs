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

using HarmonyLib;
using System;
using System.CodeDom;

namespace Paradise.Client {
	public class ParadiseTraverse<T> {
		public T Instance { get; private set; }
		protected readonly Traverse traverse;

		public ParadiseTraverse(Type type) {
			traverse = Traverse.Create(type);
		}

		public ParadiseTraverse(T instance) {
			traverse = Traverse.Create(instance);
			Instance = instance;
		}

		public static ParadiseTraverse<T> Create() {
			return new ParadiseTraverse<T>(typeof(T));
		}

		public static ParadiseTraverse<T> Create(T instance) {
			return new ParadiseTraverse<T>(instance);
		}



		public TField GetField<TField>(string fieldName) {
			return traverse.Field<TField>(fieldName).Value;
		}

		public void SetField(string fieldName, object value) {
			traverse.Field(fieldName).SetValue(value);
		}

		public TProperty GetProperty<TProperty>(string propertyName) {
			return traverse.Property<TProperty>(propertyName).Value;
		}

		public void SetProperty(string propertyName, object value) {
			traverse.Property(propertyName).SetValue(value);
		}

		public object InvokeMethod(string methodName, params object[] parameters) {
			return InvokeMethod<object>(methodName, parameters);
		}

		public TReturn InvokeMethod<TReturn>(string methodName, params object[] parameters) {
			return (TReturn)traverse.Method(methodName, parameters).GetValue();
		}


		public static TField GetField<TField>(object instance, string fieldName) {
			if (instance == null)
				throw new NullReferenceException("Instance cannot be null!");

			return (TField)AccessTools.Field(instance.GetType(), fieldName).GetValue(instance);
		}

		public static void SetField(object instance, string fieldName, object value) {
			if (instance == null)
				throw new NullReferenceException("Instance cannot be null!");

			AccessTools.Field(instance.GetType(), fieldName).SetValue(instance, value);
		}

		public static TProperty GetProperty<TProperty>(object instance, string propertyName) {
			if (instance == null)
				throw new NullReferenceException("Instance cannot be null!");

			return (TProperty)AccessTools.Property(instance.GetType(), propertyName).GetValue(instance, null);
		}

		public static void SetProperty(object instance, string propertyName, object value) {
			if (instance == null)
				throw new NullReferenceException("Instance cannot be null!");

			AccessTools.Property(instance.GetType(), propertyName).SetValue(instance, value, null);
		}

		public static object InvokeMethod(object instance, string methodName, params object[] parameters) {
			return InvokeMethod<object>(instance, methodName, parameters);
		}

		public static TReturn InvokeMethod<TReturn>(object instance, string methodName, params object[] parameters) {
			if (instance == null)
				throw new NullReferenceException("Instance cannot be null!");

			return (TReturn)AccessTools.Method(instance.GetType(), methodName).Invoke(instance, parameters);
		}
	}

	public class ParadiseTraverse : ParadiseTraverse<object> {
		public ParadiseTraverse(Type type) : base(type) { }
		public ParadiseTraverse(object instance) : base(instance) { }

		public static ParadiseTraverse Create(Type type) {
			return new ParadiseTraverse(type);
		}

		public static new ParadiseTraverse Create(object instance) {
			return new ParadiseTraverse(instance);
		}
	}
}
