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

using Paradise.Realtime.Server;
using Paradise.WebServices.Contracts;
using System.Collections.Generic;
using System.IO;
using UberStrike.Core.Models;
using UberStrike.Core.Serialization;

namespace Paradise.Realtime {
	public class ParadiseWebServiceClient : BaseWebServiceClient<IParadiseWebServiceContract> {
		public static readonly ParadiseWebServiceClient Instance;

		static ParadiseWebServiceClient() {
			Instance = new ParadiseWebServiceClient(
				masterHostname: BaseRealtimeApplication.Instance.Configuration.MasterHostname,
				port: BaseRealtimeApplication.Instance.Configuration.WebServicePort,
				serviceEndpoint: BaseRealtimeApplication.Instance.Configuration.WebServiceEndpoint,
				webServicePrefix: BaseRealtimeApplication.Instance.Configuration.WebServicePrefix,
				webServiceSuffix: BaseRealtimeApplication.Instance.Configuration.WebServiceSuffix
			);
		}

		public ParadiseWebServiceClient(string masterHostname, int port, string serviceEndpoint, string webServicePrefix, string webServiceSuffix) : base(masterHostname, port, serviceEndpoint, $"{webServicePrefix}ParadiseWebService{webServiceSuffix}") {}

		public (List<GameRoomData> rooms, Dictionary<int, string> passwords) GetPermanentGameRooms(int photonId) {
			using (var bytes = new MemoryStream()) {
				Int32Proxy.Serialize(bytes, photonId);

				var result = Service.GetPermanentGameRooms(bytes.ToArray());

				using (var inputStream = new MemoryStream(result)) {
					var rooms = ListProxy<GameRoomData>.Deserialize(inputStream, GameRoomDataProxy.Deserialize);
					var passwords = DictionaryProxy<int, string>.Deserialize(inputStream, Int32Proxy.Deserialize, StringProxy.Deserialize);

					return ( rooms, passwords );
				}
			}
		}
	}
}
