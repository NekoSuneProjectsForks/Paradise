using System;

namespace UnityEngine {
	public struct Vector3 {
		public const float kEpsilon = 1E-05f;

		public float x;
		public float y;
		public float z;

		public float this[int index] {
			get {
				switch (index) {
					case 0:
						return this.x;
					case 1:
						return this.y;
					case 2:
						return this.z;
					default:
						throw new IndexOutOfRangeException("Invalid Vector3 index!");
				}
			}

			set {
				switch (index) {
					case 0:
						this.x = value;
						break;
					case 1:
						this.y = value;
						break;
					case 2:
						this.z = value;
						break;
					default:
						throw new IndexOutOfRangeException("Invalid Vector3 index!");
				}
			}
		}

		public Vector3 normalized => Vector3.Normalize(this);
		public float magnitude => Mathf.Sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
		public float sqrMagnitude => this.x * this.x + this.y * this.y + this.z * this.z;

		public static Vector3 zero => new Vector3(0f, 0f, 0f);
		public static Vector3 one => new Vector3(1f, 1f, 1f);
		public static Vector3 forward => new Vector3(0f, 0f, 1f);
		public static Vector3 back => new Vector3(0f, 0f, -1f);
		public static Vector3 up => new Vector3(0f, 1f, 0f);
		public static Vector3 down => new Vector3(0f, -1f, 0f);
		public static Vector3 left => new Vector3(-1f, 0f, 0f);
		public static Vector3 right => new Vector3(1f, 0f, 0f);

		[Obsolete("Use Vector3.forward instead.")]
		public static Vector3 fwd => new Vector3(0f, 0f, 1f);

		public Vector3(float x, float y, float z) {
			this.x = x;
			this.y = y;
			this.z = z;
		}

		public Vector3(float x, float y) {
			this.x = x;
			this.y = y;
			this.z = 0f;
		}

		public static Vector3 Lerp(Vector3 from, Vector3 to, float t) {
			t = Mathf.Clamp01(t);

			return new Vector3(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, from.z + (to.z - from.z) * t);
		}

		public static Vector3 MoveTowards(Vector3 current, Vector3 target, float maxDistanceDelta) {
			Vector3 vector = target - current;
			float magnitude = vector.magnitude;

			if (magnitude <= maxDistanceDelta || magnitude == 0f) {
				return target;
			}

			return current + vector / magnitude * maxDistanceDelta;
		}

		public void Set(float new_x, float new_y, float new_z) {
			this.x = new_x;
			this.y = new_y;
			this.z = new_z;
		}

		public static Vector3 Scale(Vector3 a, Vector3 b) => new Vector3(a.x * b.x, a.y * b.y, a.z * b.z);

		public void Scale(Vector3 scale) {
			this.x *= scale.x;
			this.y *= scale.y;
			this.z *= scale.z;
		}

		public static Vector3 Cross(Vector3 lhs, Vector3 rhs) => new Vector3(lhs.y * rhs.z - lhs.z * rhs.y, lhs.z * rhs.x - lhs.x * rhs.z, lhs.x * rhs.y - lhs.y * rhs.x);

		public override int GetHashCode() => this.x.GetHashCode() ^ (this.y.GetHashCode() << 2) ^ (this.z.GetHashCode() >> 2);

		public override bool Equals(object other) {
			if (!(other is Vector3)) {
				return false;
			}

			Vector3 vector = (Vector3)other;

			return this.x.Equals(vector.x) && this.y.Equals(vector.y) && this.z.Equals(vector.z);
		}

		public static Vector3 Reflect(Vector3 inDirection, Vector3 inNormal) => -2f * Vector3.Dot(inNormal, inDirection) * inNormal + inDirection;

		public static Vector3 Normalize(Vector3 value) {
			float num = Vector3.Magnitude(value);

			if (num > 1E-05f) {
				return value / num;
			}

			return Vector3.zero;
		}

		public void Normalize() {
			float num = Vector3.Magnitude(this);

			if (num > 1E-05f) {
				this /= num;
			} else {
				this = Vector3.zero;
			}
		}

		public override string ToString() => string.Format("({0:F1}, {1:F1}, {2:F1})", new object[] { this.x, this.y, this.z });

		public string ToString(string format) => string.Format("({0}, {1}, {2})", new object[] {
			this.x.ToString(format),
			this.y.ToString(format),
			this.z.ToString(format)
		});

		public static float Dot(Vector3 lhs, Vector3 rhs) => lhs.x * rhs.x + lhs.y * rhs.y + lhs.z * rhs.z;

		public static Vector3 Project(Vector3 vector, Vector3 onNormal) {
			float num = Vector3.Dot(onNormal, onNormal);

			if (num < 1E-45f) {
				return Vector3.zero;
			}

			return onNormal * Vector3.Dot(vector, onNormal) / num;
		}

		public static Vector3 ProjectOnPlane(Vector3 vector, Vector3 planeNormal) => vector - Vector3.Project(vector, planeNormal);

		[Obsolete("Use Vector3.ProjectOnPlane instead.")]
		public static Vector3 Exclude(Vector3 excludeThis, Vector3 fromThat) => fromThat - Vector3.Project(fromThat, excludeThis);

		public static float Angle(Vector3 from, Vector3 to) => Mathf.Acos(Mathf.Clamp(Vector3.Dot(from.normalized, to.normalized), -1f, 1f)) * 57.29578f;

		public static float Distance(Vector3 a, Vector3 b) {
			Vector3 vector = new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);

			return Mathf.Sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
		}

		public static Vector3 ClampMagnitude(Vector3 vector, float maxLength) {
			if (vector.sqrMagnitude > maxLength * maxLength) {
				return vector.normalized * maxLength;
			}

			return vector;
		}

		public static float Magnitude(Vector3 a) => Mathf.Sqrt(a.x * a.x + a.y * a.y + a.z * a.z);

		public static float SqrMagnitude(Vector3 a) => a.x * a.x + a.y * a.y + a.z * a.z;

		public static Vector3 Min(Vector3 lhs, Vector3 rhs) => new Vector3(Mathf.Min(lhs.x, rhs.x), Mathf.Min(lhs.y, rhs.y), Mathf.Min(lhs.z, rhs.z));
		public static Vector3 Max(Vector3 lhs, Vector3 rhs) => new Vector3(Mathf.Max(lhs.x, rhs.x), Mathf.Max(lhs.y, rhs.y), Mathf.Max(lhs.z, rhs.z));

		[Obsolete("Use Vector3.Angle instead. AngleBetween uses radians instead of degrees and was deprecated for this reason")]
		public static float AngleBetween(Vector3 from, Vector3 to) => Mathf.Acos(Mathf.Clamp(Vector3.Dot(from.normalized, to.normalized), -1f, 1f));

		public static Vector3 operator +(Vector3 a, Vector3 b) => new Vector3(a.x + b.x, a.y + b.y, a.z + b.z);
		public static Vector3 operator -(Vector3 a, Vector3 b) => new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
		public static Vector3 operator -(Vector3 a) => new Vector3(-a.x, -a.y, -a.z);
		public static Vector3 operator *(Vector3 a, float d) => new Vector3(a.x * d, a.y * d, a.z * d);
		public static Vector3 operator *(float d, Vector3 a) => new Vector3(a.x * d, a.y * d, a.z * d);
		public static Vector3 operator /(Vector3 a, float d) => new Vector3(a.x / d, a.y / d, a.z / d);
		public static bool operator ==(Vector3 lhs, Vector3 rhs) => Vector3.SqrMagnitude(lhs - rhs) < 9.9999994E-11f;
		public static bool operator !=(Vector3 lhs, Vector3 rhs) => Vector3.SqrMagnitude(lhs - rhs) >= 9.9999994E-11f;
	}
}
