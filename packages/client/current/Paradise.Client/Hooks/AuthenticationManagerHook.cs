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
using System.IO;
using UberStrike.Core.Models.Views;
using UberStrike.Core.Types;
using UberStrike.Core.ViewModel;
using UberStrike.WebService.Unity;
using UnityEngine;

namespace Paradise.Client {
	[HarmonyPatch(typeof(AuthenticationManager))]
	public static class AuthenticationManagerHook {
		private static string STEAMID_FILE => string.Join("/", new string[] { Application.dataPath, "PlayerSteamID" });
		private static string STEAMID_EMU => string.Join("/", new string[] { Application.dataPath, "../steam_settings/force_steamid.txt" });

		[HarmonyPatch("LoginByChannel"), HarmonyPrefix]
		public static bool LoginByChannel_Prefix(AuthenticationManager __instance) {
			string steamId = string.Empty;
			if (File.Exists(STEAMID_FILE)) {
				steamId = File.ReadAllText(STEAMID_FILE);
			} else if (File.Exists(STEAMID_EMU)) {
				steamId = File.ReadAllText(STEAMID_EMU);
			}

			Debug.Log(string.Format("SteamWorks SteamID:{0}, PlayerPrefs SteamID:{1}", PlayerDataManager.SteamId, steamId));

			UnityRuntime.StartRoutine(ParadiseTraverse.InvokeMethod<IEnumerator>(__instance, "StartLoginMemberSteam", true));

			return false;
		}

		[HarmonyPatch("CompleteAuthentication"), HarmonyPrefix]
		public static bool CompleteAuthentication_Prefix(AuthenticationManager __instance, ref IEnumerator __result, MemberAuthenticationResultView authView, bool isRegistrationLogin) {
			__result = CompleteAuthentication(__instance, authView, isRegistrationLogin);

			if (authView.MemberAuthenticationResult == MemberAuthenticationResult.Ok) {
				File.WriteAllText(STEAMID_FILE, PlayerDataManager.SteamId.ToString());
			}

			if (authView.IsAccountComplete) {
				CommConnectionManagerHook.Connect(AutoMonoBehaviour<CommConnectionManager>.Instance);
			}

			return false;
		}

		private static IEnumerator CompleteAuthentication(AuthenticationManager __instance, MemberAuthenticationResultView authView, bool isRegistrationLogin = false) {
			var traverse = ParadiseTraverse.Create(__instance);

			if (authView == null) {
				Debug.LogError("Account authentication error: MemberAuthenticationResultView was null, isRegistrationLogin: " + isRegistrationLogin);
				traverse.InvokeMethod("ShowLoginErrorPopup", LocalizedStrings.Error, ParadiseLocalizedStrings.LoginErrorContactSupport);
				yield break;
			}

			if (authView.MemberAuthenticationResult == MemberAuthenticationResult.IsBanned || authView.MemberAuthenticationResult == MemberAuthenticationResult.IsIpBanned) {
				ApplicationDataManager.LockApplication(LocalizedStrings.YourAccountHasBeenBanned);
				yield break;
			}

			if (authView.MemberAuthenticationResult == MemberAuthenticationResult.InvalidEsns) {
				Debug.Log("Result: " + authView.MemberAuthenticationResult);
				traverse.InvokeMethod("ShowLoginErrorPopup", LocalizedStrings.Error, ParadiseLocalizedStrings.LoginErrorAlreadyLinked);
				yield break;
			}

			if (authView.MemberAuthenticationResult != MemberAuthenticationResult.Ok) {
				Debug.Log("Result: " + authView.MemberAuthenticationResult);
				traverse.InvokeMethod("ShowLoginErrorPopup", LocalizedStrings.Error, ParadiseLocalizedStrings.LoginErrorInvalidCredentials);
				yield break;
			}

			Singleton<PlayerDataManager>.Instance.SetLocalPlayerMemberView(authView.MemberView);
			PlayerDataManager.AuthToken = authView.AuthToken;

			if (!PlayerDataManager.IsTestBuild) {
				PlayerDataManager.MagicHash = UberDaemon.Instance.GetMagicHash(authView.AuthToken);
				Debug.Log("Magic Hash:" + PlayerDataManager.MagicHash);
			}

			ApplicationDataManager.ServerDateTime = authView.ServerTime;
			EventHandler.Global.Fire(new GlobalEvents.Login(authView.MemberView.PublicProfile.AccessLevel));

			var _progress = traverse.GetField<ProgressPopupDialog>("_progress");

			#region Clan Data
			_progress.Text = LocalizedStrings.LoadingFriendsList;
			_progress.Progress = 0.2f;
			yield return UnityRuntime.StartRoutine(Singleton<CommsManager>.Instance.GetContactsByGroups());
			#endregion

			#region Application Config
			_progress.Text = LocalizedStrings.LoadingCharacterData;
			_progress.Progress = 0.3f;
			yield return ApplicationWebServiceClient.GetConfigurationData(ApplicationDataManager.Version, (ApplicationConfigurationView appConfigView) => {
				XpPointsUtil.Config = appConfigView;
			}, (Exception ex) => {
				ApplicationDataManager.LockApplication(LocalizedStrings.ErrorLoadingData);
			});
			#endregion

			#region Maps
			Singleton<PlayerDataManager>.Instance.SetPlayerStatisticsView(authView.PlayerStatisticsView);

			_progress.Text = LocalizedStrings.LoadingMapData;
			_progress.Progress = 0.5f;

			bool mapsLoadedSuccessfully = false;

			yield return ApplicationWebServiceClient.GetMaps(ApplicationDataManager.Version, DefinitionType.StandardDefinition, (List<MapView> callback) => {
				mapsLoadedSuccessfully = Singleton<MapManager>.Instance.InitializeMapsToLoad(callback);
			}, (Exception ex) => {
				ApplicationDataManager.LockApplication(LocalizedStrings.ErrorLoadingMaps);
			});

			if (!mapsLoadedSuccessfully) {
				PopupSystem.HideMessage(_progress);
				traverse.InvokeMethod("ShowLoginErrorPopup", LocalizedStrings.Error, ParadiseLocalizedStrings.ErrorLoadingMapsSupport);
				yield break;
			}

			#region Custom Maps
			_progress.Text = ParadiseLocalizedStrings.LoadingCustomMapData;
			_progress.Progress = 0.55f;

			mapsLoadedSuccessfully = false;

			yield return ParadiseWebServiceClient.GetCustomMaps(ApplicationDataManager.Version, DefinitionType.StandardDefinition, (List<ParadiseMapView> callback) => {
				var mapManager = ParadiseTraverse.Create(Singleton<MapManager>.Instance);

				foreach (var mapView in callback) {
					mapManager.InvokeMethod("AddMapView", mapView, true, false);
				}

				mapsLoadedSuccessfully = ParadiseMapManager.LoadMaps(callback);
			}, (Exception ex) => {
				ApplicationDataManager.LockApplication(ParadiseLocalizedStrings.ErrorLoadingAdditionalMaps);
			});

			if (!mapsLoadedSuccessfully) {
				PopupSystem.HideMessage(_progress);
				traverse.InvokeMethod("ShowLoginErrorPopup", LocalizedStrings.Error, ParadiseLocalizedStrings.ErrorLoadingAdditionalMapsSupport);
				yield break;
			}
			#endregion
			#endregion

			#region Shop
			_progress.Progress = 0.6f;
			_progress.Text = LocalizedStrings.LoadingWeaponAndGear;
			yield return UnityRuntime.StartRoutine(Singleton<ItemManager>.Instance.StartGetShop());

			if (!Singleton<ItemManager>.Instance.ValidateItemMall()) {
				PopupSystem.HideMessage(_progress);
				traverse.InvokeMethod("ShowLoginErrorPopup", LocalizedStrings.Error, ParadiseLocalizedStrings.ErrorGettingShopDataSupport);
				yield break;
			}
			#endregion

			#region Inventory/Loadout
			_progress.Progress = 0.7f;
			_progress.Text = LocalizedStrings.LoadingPlayerInventory;
			yield return UnityRuntime.StartRoutine(Singleton<ItemManager>.Instance.StartGetInventory(false));

			_progress.Progress = 0.8f;
			_progress.Text = LocalizedStrings.GettingPlayerLoadout;
			yield return UnityRuntime.StartRoutine(Singleton<PlayerDataManager>.Instance.StartGetLoadout());

			if (!Singleton<LoadoutManager>.Instance.ValidateLoadout()) {
				traverse.InvokeMethod("ShowLoginErrorPopup", LocalizedStrings.ErrorGettingPlayerLoadout, ParadiseLocalizedStrings.ErrorGettingPlayerLoadoutSupport);
				yield break;
			}
			#endregion

			#region PlayerStatistics
			_progress.Progress = 0.85f;
			_progress.Text = LocalizedStrings.LoadingPlayerStatistics;
			yield return UnityRuntime.StartRoutine(Singleton<PlayerDataManager>.Instance.StartGetMember());

			if (!Singleton<PlayerDataManager>.Instance.ValidateMemberData()) {
				traverse.InvokeMethod("ShowLoginErrorPopup", LocalizedStrings.ErrorGettingPlayerStatistics, ParadiseLocalizedStrings.ErrorPlayerStatisticsSupport);
				yield break;
			}
			#endregion

			#region Clan Data
			_progress.Progress = 0.9f;
			_progress.Text = LocalizedStrings.LoadingClanData;

			yield return ClanWebServiceClient.GetMyClanId(PlayerDataManager.AuthToken, (int id) => {
				PlayerDataManager.ClanID = id;
			}, null);

			if (PlayerDataManager.ClanID > 0) {
				yield return ClanWebServiceClient.GetOwnClan(PlayerDataManager.AuthToken, PlayerDataManager.ClanID, (ClanView ev) => {
					Singleton<ClanDataManager>.Instance.SetClanData(ev);
				}, null);
			}
			#endregion

			GameState.Current.Avatar.SetDecorator(AvatarBuilder.CreateLocalAvatar());
			GameState.Current.Avatar.UpdateAllWeapons();

			// yield return new WaitForEndOfFrame();
			Singleton<InboxManager>.Instance.Initialize();
			// yield return new WaitForEndOfFrame();
			Singleton<BundleManager>.Instance.Initialize();
			// yield return new WaitForEndOfFrame();

			PopupSystem.HideMessage(_progress);

			if (!authView.IsAccountComplete) {
				PanelManager.Instance.OpenPanel(PanelType.CompleteAccount);
			} else {
				MenuPageManager.Instance.LoadPage(PageType.Home, false);
				traverse.SetProperty("IsAuthComplete", true);
			}

			Debug.LogWarning(string.Format("AuthToken:{0}, MagicHash:{1}", PlayerDataManager.AuthToken, PlayerDataManager.MagicHash));

			yield break;
		}

		[HarmonyPatch("ShowLoginErrorPopup"), HarmonyPrefix]
		public static bool ShowLoginErrorPopup_Prefix(AuthenticationManager __instance, string title, string message) {
			var traverse = ParadiseTraverse.Create(__instance);

			Debug.Log("Login Error!");
			PopupSystem.HideMessage(traverse.GetField<ProgressPopupDialog>("_progress"));
			PopupSystem.ShowMessage(title, message, PopupSystem.AlertType.OK, delegate {
				Application.Quit();
			});

			return false;
		}
	}
}
