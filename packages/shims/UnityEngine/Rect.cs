namespace UnityEngine {
	public struct Rect {
		private float m_XMin;
		private float m_YMin;
		private float m_Width;
		private float m_Height;

		public Rect(float left, float top, float width, float height) {
			this.m_XMin = left;
			this.m_YMin = top;
			this.m_Width = width;
			this.m_Height = height;
		}
	}
}
