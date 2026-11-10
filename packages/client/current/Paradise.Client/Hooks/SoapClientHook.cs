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
using log4net;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Xml;
using UberStrike.WebService.Unity;
using UnityEngine;

namespace Paradise.Client {
	/// <summary>
	/// Allows for renaming web service prefixes/suffixes.
	/// </summary>
	[HarmonyPatch("UberStrike.WebService.Unity.SoapClient")]
	public static class SoapClientHook {
		private static readonly ILog Log = LogManager.GetLogger(nameof(SoapClientHook));

		private static ICryptographyPolicy CryptoPolicy = new RijndaelCryptographyPolicy();
		private static int RequestId = 0;

		[HarmonyPatch("UberStrike.WebService.Unity.SoapClient", "MakeRequest"), HarmonyPrefix]
		public static bool MakeRequest_Prefix(string interfaceName, ref string serviceName, string methodName, ref byte[] data, Action<byte[]> requestCallback, Action<Exception> exceptionHandler) {
			serviceName = Regex.Replace(serviceName, @"^UberStrike\.DataCenter\.WebService\.CWS\.", ParadiseClient.Settings.WebServicePrefix);
			serviceName = Regex.Replace(serviceName, @"Contract\.svc$", ParadiseClient.Settings.WebServiceSuffix);

			if (ParadiseClient.Settings.EncryptWebServiceTraffic) {
				if (!string.IsNullOrEmpty(Configuration.EncryptionPassPhrase) && !string.IsNullOrEmpty(Configuration.EncryptionInitVector)) {
					data = CryptoPolicy.RijndaelEncrypt(data, Configuration.EncryptionPassPhrase, Configuration.EncryptionInitVector);
				}
			}

			return true;
		}

		[HarmonyPatch("UberStrike.WebService.Unity.SoapClient", "MakeRequest"), HarmonyPostfix]
		public static IEnumerator MakeRequest_Postfix(IEnumerator value, string interfaceName, string serviceName, string methodName, byte[] data, Action<byte[]> requestCallback, Action<Exception> exceptionHandler) {
			var requestId = RequestId++;

			var byteArray = Encoding.UTF8.GetBytes($"<s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\"><s:Body><{methodName} xmlns=\"http://tempuri.org/\"><data>{Convert.ToBase64String(data)}</data></{methodName}></s:Body></s:Envelope>");

			var headers = new Dictionary<string, string> {
				{ "SOAPAction", $"\"http://tempuri.org/{interfaceName}/{methodName}\"" },
				{ "Content-type", "text/xml; charset=utf-8" }
			};

			var doc = new XmlDocument();
			var startTime = Time.realtimeSinceStartup;

			LogRequest(requestId, startTime, data.Length, interfaceName, serviceName, methodName);

			yield return new WaitForEndOfFrame();

			if (WebServiceStatistics.IsEnabled) {
				WebServiceStatistics.RecordWebServiceBegin(methodName, byteArray.Length);
			}

			byte[] returnData = null;

			var url = Configuration.WebserviceBaseUrl + serviceName;
			byte[] responseBytes;
			string responseText;
			string responseError;
			bool responseDone;

			if (WinHttp.ShouldUse(url)) {
				// Unity 4.6's WWW / Mono can't do TLS 1.2+; Windows' WinHTTP can (see WinHttp.cs).
				WinHttp.Response result = null;
				var worker = new Thread(() => result = WinHttp.Send("POST", url, byteArray, headers));
				worker.IsBackground = true;
				worker.Start();
				while (worker.IsAlive) {
					yield return null;
				}

				responseBytes = result?.Body ?? new byte[0];
				responseText = Encoding.UTF8.GetString(responseBytes).TrimStart('\uFEFF');
				responseError = result == null ? "WinHTTP: no response" : result.Error;
				responseDone = true;
			} else {
				using (var request = new WWW(url, byteArray, headers)) {
					yield return request;

					responseBytes = request.bytes ?? new byte[0];
					responseText = request.text ?? string.Empty;
					responseError = request.error;
					responseDone = request.isDone;
				}
			}

			{
				if (WebServiceStatistics.IsEnabled) {
					WebServiceStatistics.RecordWebServiceEnd(methodName, responseBytes.Length, responseDone && string.IsNullOrEmpty(responseError));
				}

				try {
					if (Configuration.SimulateWebservicesFail) {
						throw new Exception($"Simulated Webservice fail when calling {interfaceName}/{methodName}");
					}

					if (!responseDone || !string.IsNullOrEmpty(responseError)) {
						LogResponse(requestId, Time.realtimeSinceStartup, responseError, Time.time - startTime, 0);

						throw new Exception(string.Concat(new string[] {
							responseError,
							"\nWWW Url: ",
							Configuration.WebserviceBaseUrl,
							"\nService: ",
							serviceName,
							"\nMethod: ",
							methodName
						}));
					}

					if (!string.IsNullOrEmpty(responseText)) {
						try {
							doc.LoadXml(responseText);

							var result = doc.GetElementsByTagName(methodName + "Result");

							if (result.Count <= 0) {
								LogResponse(requestId, Time.realtimeSinceStartup, responseText, Time.time - startTime, 0);

								throw new Exception($"WWW Request to {Configuration.WebserviceBaseUrl}{serviceName} failed with content {responseText}");
							}

							returnData = Convert.FromBase64String(result[0].InnerXml);

							if (returnData.Length == 0) {
								LogResponse(requestId, Time.realtimeSinceStartup, responseText, Time.time - startTime, 0);

								throw new Exception($"WWW Request to {Configuration.WebserviceBaseUrl}{serviceName} failed with content {responseText}");
							}

							LogResponse(requestId, Time.realtimeSinceStartup, "OK", Time.realtimeSinceStartup - startTime, responseBytes.Length);
						} catch {
							LogResponse(requestId, Time.time, responseText, Time.realtimeSinceStartup - startTime, 0);

							throw new Exception($"Error reading XML return for method call {interfaceName}/{methodName}: {responseText}");
						}
					}

					if (requestCallback != null) {
						if (ParadiseClient.Settings.EncryptWebServiceTraffic && !string.IsNullOrEmpty(Configuration.EncryptionPassPhrase) && !string.IsNullOrEmpty(Configuration.EncryptionInitVector)) {
							requestCallback(CryptoPolicy.RijndaelDecrypt(returnData, Configuration.EncryptionPassPhrase, Configuration.EncryptionInitVector));
						} else {
							requestCallback(returnData);
						}
					}
				} catch (Exception ex) {
					ParadiseWebServiceClient.RecordException(PlayerDataManager.Cmid, ApplicationDataManager.Channel, ApplicationDataManager.Version, ParadiseConstants.Version, ParadiseConstants.Build, ex.Message, ex.StackTrace, DebugLogMessages.Console.ToHTML(), () => { });
					if (exceptionHandler != null) {
						exceptionHandler(ex);
					} else {
						Debug.LogError("SoapClient Unhandled Exception: " + ex.Message + "\n" + ex.StackTrace);
					}
				}
			}

			yield break;
		}

		private static void LogRequest(int id, float time, int sizeBytes, string interfaceName, string serviceName, string methodName) {
			AccessTools.TypeByName("UberStrike.WebService.Unity.SoapClient").GetMethod("LogRequest", BindingFlags.NonPublic | BindingFlags.Static).Invoke(null, new object[] { id, time, sizeBytes, interfaceName, serviceName, methodName });

			string text = ((float)sizeBytes / 1000f).ToString();
			Log.Debug($"[REQ] ID:{id} Time:{time:N2} Size:{text:N2}Kb Service:{serviceName} Interface:{interfaceName} Method:{methodName}");
		}

		private static void LogResponse(int id, float time, string message, float duration, int sizeBytes) {
			AccessTools.TypeByName("UberStrike.WebService.Unity.SoapClient").GetMethod("LogResponse", BindingFlags.NonPublic | BindingFlags.Static).Invoke(null, new object[] { id, time, message, duration, sizeBytes });

			string text = ((float)sizeBytes / 1000f).ToString();
			Log.Debug($"[RSP] ID:{id} Time:{time:N2} Size:{text:N2}Kb Duration:{duration:N2}s Status:{message}");
		}
	}
}
