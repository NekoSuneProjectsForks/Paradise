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
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UberStrike.Core.Serialization;
using UberStrike.Realtime.Client;
using UnityEngine;

namespace Paradise.Client {
	/// <summary>
	/// <br>Makes the game send pickup positions alongside respawn times</br>
	/// </summary>
	[HarmonyPatch(typeof(GameRoomOperations))]
	public static class GameRoomOperationsHook {
		[HarmonyPatch("SendPowerUpRespawnTimes"), HarmonyPrefix]
		public static bool SendPowerUpRespawnTimes_Prefix(GameRoomOperations __instance, List<ushort> respawnTimes) {
			var __id = ParadiseTraverse.GetField<byte>(__instance, "__id");
			var sendOperation = ParadiseTraverse.GetField<RemoteProcedureCall>(__instance, "sendOperation");

			var pickupItems = (Dictionary<int, PickupItem>)AccessTools.Field(typeof(PickupItem), "_instances").GetValue(null);
			var positions = pickupItems.Select(_ => _.Value.transform.position).ToList();

			using (MemoryStream memoryStream = new MemoryStream()) {
				ListProxy<ushort>.Serialize(memoryStream, respawnTimes, new ListProxy<ushort>.Serializer<ushort>(UInt16Proxy.Serialize));
				ListProxy<Vector3>.Serialize(memoryStream, positions, Vector3Proxy.Serialize);

				Dictionary<byte, object> customOpParameters = new Dictionary<byte, object> {
					{
						__id,
						memoryStream.ToArray()
					}
				};

				sendOperation?.Invoke(3, customOpParameters, true, 0, false);
			}

			return false;
		}
	}
}
