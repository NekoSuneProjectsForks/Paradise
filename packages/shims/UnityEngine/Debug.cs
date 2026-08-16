using System;

namespace UnityEngine {
	public sealed class Debug {
		public static void Log(object message) {
			Console.WriteLine($"[LOG] {message}");
		}

		public static void LogError(object message) {
			Console.WriteLine($"[ERROR] {message}");
		}

		public static void LogWarning(object message) {
			Console.WriteLine($"[WARN] {message}");
		}
	}
}
