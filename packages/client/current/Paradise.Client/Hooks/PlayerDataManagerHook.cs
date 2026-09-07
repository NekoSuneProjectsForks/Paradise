using Cmune.DataCenter.Common.Entities;
using HarmonyLib;
using System;
using System.Collections;
using UberStrike.DataCenter.Common.Entities;
using UberStrike.WebService.Unity;
using UnityEngine;

namespace Paradise.Client {
	/// <summary>
	/// Reduces the delay for updating the loadout in the Web Service database
	/// </summary>
	[HarmonyPatch(typeof(PlayerDataManager))]
	public static class PlayerDataManagerHook {
		private static float loadoutUpdateDelay = 2.0f;

		[HarmonyPatch("StartSetLoadout"), HarmonyPrefix]
		public static bool StartSetLoadout_Prefix() {
			return false;
		}

		[HarmonyPatch("StartSetLoadout"), HarmonyPostfix]
		public static IEnumerator StartSetLoadout_Postfix(IEnumerator value, PlayerDataManager __instance) {
			var updateTime = Time.time + loadoutUpdateDelay;
			ParadiseTraverse.SetField(__instance, "_updateLoadoutTime", updateTime);

			while (updateTime > Time.time) {
				yield return new WaitForEndOfFrame();
			}

			if (ParadiseTraverse.GetField<float>(__instance, "_updateLoadoutTime") > updateTime) {
				yield break;
			}

			yield return UserWebServiceClient.SetLoadout(PlayerDataManager.AuthToken, (LoadoutView)ParadiseTraverse.InvokeMethod(__instance, "CreateLocalPlayerLoadoutView"), (MemberOperationResult ev) => {
				if (Singleton<GameStateController>.Instance.Client.IsConnected) {
					Singleton<GameStateController>.Instance.Client.Operations.SendUpdateLoadout();
				}

				if (ev != MemberOperationResult.Ok) {
					Debug.LogError($"SetLoadout failed with error={ev}");
				}
			}, (Exception ex) => {});

			yield break;
		}
	}
}
