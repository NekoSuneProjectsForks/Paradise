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

using System.Linq;
using System.Net;

namespace Paradise.Client {
	internal struct HttpResponse {
		public string ProtocolVersion;
		public HttpStatusCode StatusCode;
		public string StatusDescription;
		public string StatusText;
	}

	internal class HTTPStatusParser {
		public static HttpResponse ParseHeader(string statusHeader) {
			var headerItems = statusHeader.Split(' ');

			return new HttpResponse() {
				ProtocolVersion = headerItems[0],
				StatusCode = (HttpStatusCode)int.Parse(headerItems[1]),
				StatusDescription = string.Join(" ", headerItems.Skip(2).Take(headerItems.Count() - 2).ToArray()),
				StatusText = statusHeader
			};
		}
	}
}
