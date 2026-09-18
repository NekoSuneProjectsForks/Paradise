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

using Cmune.DataCenter.Common.Entities;
using HarmonyLib;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using UberStrike.Core.Models.Views;
using UberStrike.Core.Serialization;
using UberStrike.Core.Types;
using UnityEngine;

namespace Paradise.Client {
	public static class ParadiseWebServiceClient {
		public static string WebServiceName => "ParadiseWebService";
		public static string ContractName => "IParadiseWebServiceContract";

		#region
		private static readonly MonoBehaviour Mono = Traverse.Create(AccessTools.TypeByName("UberStrike.WebService.Unity.MonoInstance")).Property<MonoBehaviour>("Mono").Value;
		private static readonly MethodInfo MakeRequest_impl = AccessTools.TypeByName("UberStrike.WebService.Unity.SoapClient").GetMethod("MakeRequest", BindingFlags.Public | BindingFlags.Static);
		#endregion

		public static Coroutine GetCustomMaps(string clientVersion, DefinitionType clientType, Action<List<ParadiseMapView>> callback, Action<Exception> handler) {
			using (MemoryStream memoryStream = new MemoryStream()) {
				StringProxy.Serialize(memoryStream, clientVersion);
				EnumProxy<DefinitionType>.Serialize(memoryStream, clientType);

				return Mono.StartCoroutine(MakeRequest(
					ContractName,
					$"{ParadiseClient.Settings.WebServicePrefix}{WebServiceName}{ParadiseClient.Settings.WebServiceSuffix}",
					MethodBase.GetCurrentMethod().Name,
					memoryStream.ToArray(),
					(byte[] data) => {
						callback?.Invoke(ListProxy<ParadiseMapView>.Deserialize(new MemoryStream(data), ParadiseMapViewProxy.Deserialize));
					},
					handler
				));
			}
		}

		public static Coroutine RecordPlayerMachineData() {
			if (!ParadiseClient.Settings.AllowTelemetry || Application.platform != RuntimePlatform.WindowsPlayer)
				return null;

			using (MemoryStream memoryStream = new MemoryStream()) {
				var machineInfo = OSInfoProvider.GetMachineInfo();
				var cpuInfo = OSInfoProvider.GetCPUInfo();
				var gpuInfo = OSInfoProvider.GetGPUInfo();

				StringProxy.Serialize(memoryStream, PlayerPrefs.GetString("Version"));
				StringProxy.Serialize(memoryStream, ParadiseConstants.Version);
				StringProxy.Serialize(memoryStream, ParadiseConstants.Build);
				Int32Proxy.Serialize(memoryStream, PlayerDataManager.Cmid);
				StringProxy.Serialize(memoryStream, machineInfo.UUID);
				StringProxy.Serialize(memoryStream, machineInfo.Vendor);
				StringProxy.Serialize(memoryStream, machineInfo.Model);
				StringProxy.Serialize(memoryStream, SystemInfo.deviceType.ToString());
				StringProxy.Serialize(memoryStream, machineInfo.OperatingSystem);
				StringProxy.Serialize(memoryStream, cpuInfo.Vendor);
				StringProxy.Serialize(memoryStream, cpuInfo.Model);
				Int32Proxy.Serialize(memoryStream, cpuInfo.Cores);
				Int32Proxy.Serialize(memoryStream, cpuInfo.Threads);
				Int64Proxy.Serialize(memoryStream, cpuInfo.Memory);
				StringProxy.Serialize(memoryStream, gpuInfo.Vendor);
				StringProxy.Serialize(memoryStream, gpuInfo.Model);
				StringProxy.Serialize(memoryStream, gpuInfo.VendorId);
				StringProxy.Serialize(memoryStream, gpuInfo.DeviceId);
				Int64Proxy.Serialize(memoryStream, gpuInfo.Memory);
				StringProxy.Serialize(memoryStream, gpuInfo.DriverVersion);

				return Mono.StartCoroutine(MakeRequest(
					ContractName,
					$"{ParadiseClient.Settings.WebServicePrefix}{WebServiceName}{ParadiseClient.Settings.WebServiceSuffix}",
					MethodBase.GetCurrentMethod().Name,
					memoryStream.ToArray(),
					null,
					null
				));
			}
		}

		public static Coroutine RecordException(int cmid, ChannelType channel, string version, string paradiseVersion, string paradiseBuild, string exceptionMessage, string stackTrace, string exceptionData, Action callback) {
			if (!ParadiseClient.Settings.AllowTelemetry)
				return null;

			using (MemoryStream memoryStream = new MemoryStream()) {
				Int32Proxy.Serialize(memoryStream, cmid);
				EnumProxy<ChannelType>.Serialize(memoryStream, channel);
				StringProxy.Serialize(memoryStream, version);
				StringProxy.Serialize(memoryStream, paradiseVersion);
				StringProxy.Serialize(memoryStream, paradiseBuild);
				StringProxy.Serialize(memoryStream, exceptionMessage);
				StringProxy.Serialize(memoryStream, stackTrace);
				StringProxy.Serialize(memoryStream, exceptionData);

				return Mono.StartCoroutine(MakeRequest(
					ContractName,
					$"{ParadiseClient.Settings.WebServicePrefix}{WebServiceName}{ParadiseClient.Settings.WebServiceSuffix}",
					MethodBase.GetCurrentMethod().Name,
					memoryStream.ToArray(),
					null,
					null
				));
			}
		}

		public static Coroutine RemoveItemFromInventory(int itemId, string authToken, Action<int> callback, Action<Exception> handler) {
			using (MemoryStream memoryStream = new MemoryStream()) {
				Int32Proxy.Serialize(memoryStream, itemId);
				StringProxy.Serialize(memoryStream, authToken);

				return Mono.StartCoroutine(MakeRequest(
					ContractName,
					$"{ParadiseClient.Settings.WebServicePrefix}{WebServiceName}{ParadiseClient.Settings.WebServiceSuffix}",
					MethodBase.GetCurrentMethod().Name,
					memoryStream.ToArray(),
					(byte[] data) => {
						callback?.Invoke(Int32Proxy.Deserialize(new MemoryStream(data)));
					},
					handler
				));
			}
		}

		private static IEnumerator MakeRequest(string interfaceName, string serviceName, string methodName, byte[] data, Action<byte[]> requestCallback, Action<Exception> exceptionHandler) {
			return (IEnumerator)MakeRequest_impl.Invoke(null, new object[] { interfaceName, serviceName, methodName, data, requestCallback, exceptionHandler });
		}
	}
}
