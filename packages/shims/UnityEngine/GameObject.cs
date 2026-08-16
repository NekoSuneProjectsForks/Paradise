namespace UnityEngine {
	public sealed class GameObject : Object {
		private string name;

		public GameObject(string name) {
			this.name = name;
		}

		public T AddComponent<T>() where T : Component, new() {
			return new T();
		}

		public static GameObject Find(string name) {
			return null;
		}
	}
}
