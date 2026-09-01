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

using Cmune.Core.Models.Views;
using Cmune.DataCenter.Common.Entities;
using HarmonyLib;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UberStrike.DataCenter.Common.Entities;
using UberStrike.WebService.Unity;
using UnityEngine;

namespace Paradise.Client {
	[HarmonyPatch(typeof(GlobalSceneLoader))]
	public static class GlobalSceneLoaderHook {
		private static ParadiseTraverse<GlobalSceneLoader> traverse;

		[HarmonyPatch("Start"), HarmonyPrefix]
		public static bool Start_Prefix(GlobalSceneLoader __instance) {
			traverse = ParadiseTraverse<GlobalSceneLoader>.Create(__instance);

			ApplicationDataManager.ApplicationOptions.Initialize();

			if (!ParadiseClient.Settings.HasKey(ParadisePrefs.Key.TelemetryChoice) || !ParadiseClient.Settings.TelemetryChoiceMade) {
				PopupSystem.Show(new ParadisePopupDialog {
					Title = ParadiseLocalizedStrings.TelemetryPopupTitle,
					Text = ParadiseLocalizedStrings.TelemetryPopupText,
					AlertType = PopupSystem.AlertType.OKCancel,
					OkCaption = ParadiseLocalizedStrings.Allow,
					OkAction = () => {
						ParadiseClient.Settings.SetKey(ParadisePrefs.Key.TelemetryChoice, ParadisePrefs.TelemetryChoice.Yes);
						__instance.StartCoroutine(Start());
					},
					CancelCaption = ParadiseLocalizedStrings.Disallow,
					CancelAction = () => {
						ParadiseClient.Settings.SetKey(ParadisePrefs.Key.TelemetryChoice, ParadisePrefs.TelemetryChoice.No);
						__instance.StartCoroutine(Start());
					},
					AuxCaption = ParadiseLocalizedStrings.PrivacyPolicy,
					AuxAction = () => {
						ApplicationDataManager.OpenUrl(string.Empty, "https://paradise.festival.tf/privacy-policy");
					}
				});
			} else {
				__instance.StartCoroutine(Start());
			}

			return false;
		}

		[HarmonyPatch("InitializeGlobalScene"), HarmonyPostfix]
		public static void InitializeGlobalScene_Postfix() {
			QualitySettings.vSyncCount = ApplicationDataManager.ApplicationOptions.VideoVSyncCount;
		}

		private static IEnumerator Start() {
			AutoMonoBehaviour<PreloadOptionsPanelButton>.Instance.enabled = true;

			Application.runInBackground = true;
			Application.LoadLevel("Menu");
			// ParadiseTraverse.SetProperty(Singleton<SceneLoader>.Instance, "CurrentScene", "Menu");

			Configuration.WebserviceBaseUrl = ApplicationDataManager.WebServiceBaseUrl;

			traverse.SetProperty("GlobalSceneProgress", 1f);
			traverse.SetProperty("IsGlobalSceneLoaded", true);
			traverse.SetProperty("ItemAssetBundleProgress", 1f);
			traverse.SetProperty("IsItemAssetBundleLoaded", true);

			traverse.InvokeMethod("InitializeGlobalScene");

			Application.targetFrameRate = (int)ParadiseClient.Settings.MaximumFPS;

			var continueAuthentication = true;

			yield return traverse.Instance.StartCoroutine(BeginAuthenticateApplication(delegate (AuthenticateApplicationView authView) {
				continueAuthentication = OnAuthenticateApplication(authView);
			}, delegate (Exception e) {
				continueAuthentication = false;

				OnAuthenticateApplicationException(e);
			}));

			for (float f = 0f; f < 1f; f += Time.deltaTime) {
				yield return new WaitForEndOfFrame();

				var color = traverse.GetField<Color>("_color");
				color.a = 1f - f / 1f;

				traverse.SetField("_color", color);
			}

			if (!continueAuthentication)
				yield break;

			traverse.Instance.StartCoroutine(StartWithCheckingUpdates());

			// yield return new WaitForSeconds(1f);
			UnityEngine.Object.Destroy(traverse.Instance.gameObject);

			yield break;
		}

		private static IEnumerator BeginAuthenticateApplication(Action<AuthenticateApplicationView> callback, Action<Exception> errorCallback) {
			Debug.Log($"BeginAuthenticateApplication {Configuration.WebserviceBaseUrl}");

			yield return ApplicationWebServiceClient.AuthenticateApplication(ApplicationDataManager.Version, ApplicationDataManager.Channel, string.Empty, delegate (AuthenticateApplicationView authView) {
				Debug.Log($"Connected to : {Configuration.WebserviceBaseUrl}");

				callback(authView);
			}, delegate (Exception exception) {
				errorCallback(exception);
			});

			yield break;
		}

		private static bool OnAuthenticateApplication(AuthenticateApplicationView authView) {
			try {
				GlobalSceneLoader.IsInitialised = true;

				if (authView != null && authView.IsEnabled) {
					Configuration.EncryptionInitVector = authView.EncryptionInitVector;
					Configuration.EncryptionPassPhrase = authView.EncryptionPassPhrase;
					ApplicationDataManager.IsOnline = true;

					Debug.Log("OnAuthenticateApplication");

					Singleton<GameServerManager>.Instance.CommServer = new PhotonServer(authView.CommServer);
					Singleton<GameServerManager>.Instance.AddPhotonGameServers(authView.GameServers.FindAll((PhotonView i) => i.UsageType == PhotonUsageType.All));

					if (authView.WarnPlayer) {
						HandleVersionWarning();

						return false;
					}

					return true;
				} else {
					Debug.Log($"OnAuthenticateApplication failed with {ApplicationDataManager.Version}/{ApplicationDataManager.Channel}: Please update.");

					HandleVersionError();
				}
			} catch (Exception exception) {
				Debug.LogError($"OnAuthenticateApplication crashed with {ApplicationDataManager.Version}/{ApplicationDataManager.Channel}: {exception.Message} {exception.StackTrace}");

				HandleApplicationAuthenticationError(ParadiseLocalizedStrings.CheckConnection);
			}

			return false;
		}

		private static void OnAuthenticateApplicationException(Exception exception) {
			Debug.LogError($"An exception occurred while authenticating the application with ${ApplicationDataManager.Version}/{ApplicationDataManager.Channel}: {exception.Message}");

			HandleApplicationAuthenticationError(ParadiseLocalizedStrings.CheckConnection, exception.Message);
		}

		private static IEnumerator StartWithCheckingUpdates() {
			UnityEngine.Debug.Log("StartWithCheckingUpdates");
			UnityRuntime.StartRoutine(ParadiseUpdater.CleanupUpdates());

			// if (!ParadiseClient.Settings.AutoUpdates || true) {
			// 	StartLogin();
			// 	yield break;
			// }

			yield return traverse.Instance.StartCoroutine(AutoMonoBehaviour<ParadiseUpdater>.Instance.CheckForUpdatesIfNecessary((updateCatalog) => {
				if (updateCatalog != null) {
					ParadiseUpdater.HandleUpdateAvailable(updateCatalog, () => {
						StartLogin();
					});
				} else {
					StartLogin();
				}
			}, (error) => {
				AutoMonoBehaviour<ParadiseUpdater>.Instance.HandleUpdateError(error, () => {
					Application.Quit();
				});
			}));

			yield break;
		}

		private static void StartLogin() {
			Debug.Log("Start LoginByChannel");

			if (PlayerDataManager.IsTestBuild) {
				PopupSystem.ShowMessage(LocalizedStrings.Warning, ParadiseLocalizedStrings.ThisIsATestBuild, PopupSystem.AlertType.OK, delegate () {
					Singleton<AuthenticationManager>.Instance.LoginByChannel();
				});
			} else {
				Singleton<AuthenticationManager>.Instance.LoginByChannel();
			}
		}

		private static void HandleApplicationAuthenticationError(string message, string auxMessage = "") {
			var channel = ApplicationDataManager.Channel;

			switch (channel) {
				case ChannelType.Steam:
				case ChannelType.WindowsStandalone:
				case ChannelType.OSXStandalone:
					PopupSystem.Show(new ParadisePopupDialog {
						Size = ParadisePopupDialog.PopupSize.Regular,
						Title = LocalizedStrings.Error,
						Text = ParadiseLocalizedStrings.WSConnectionFailed,
						AlertType = PopupSystem.AlertType.OK,
						OkAction = () => { Application.Quit(); },
						AuxCaption = ParadiseLocalizedStrings.OpenLog,
						AuxAction = () => {
							System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo($"{Application.dataPath}/output_log.txt") { UseShellExecute = true });
						}
					});

					break;
				case ChannelType.IPhone:
				case ChannelType.IPad:
				case ChannelType.Android:
					PopupSystem.ShowError(LocalizedStrings.Error, message, PopupSystem.AlertType.OK, () => {
						Application.Quit();
					});

					break;
				default:
					if (channel != ChannelType.WebPortal && channel != ChannelType.WebFacebook) {
						PopupSystem.Show(new ParadisePopupDialog {
							Size = ParadisePopupDialog.PopupSize.Regular,
							Title = LocalizedStrings.Error,
							Text = ParadiseLocalizedStrings.ClientTypeNotSupported,
							AlertType = PopupSystem.AlertType.OK,
							OkAction = () => { Application.Quit(); },
						});
					} else {
						PopupSystem.ShowError(LocalizedStrings.Error, message, PopupSystem.AlertType.None);
					}

					break;
			}
		}

		private static void HandleVersionWarning() {
			var channel = ApplicationDataManager.Channel;

			switch (channel) {
				case ChannelType.Steam:
					PopupSystem.Show(new ParadisePopupDialog {
						Size = ParadisePopupDialog.PopupSize.Regular,
						Title = LocalizedStrings.Warning,
						Text = string.Format(ParadiseLocalizedStrings.ClientOutOfDate, ParadiseLocalizedStrings.ClientUpdateSteam),
						AlertType = PopupSystem.AlertType.OKCancel,
						ActionType = PopupSystem.ActionType.Positive,
						OkCaption = ParadiseLocalizedStrings.Update,
						OkAction = () => {
							ApplicationDataManager.OpenUrl(string.Empty, "steam://store/291210");
							Application.Quit();
						},
						CancelCaption = LocalizedStrings.Continue,
						CancelAction = Singleton<AuthenticationManager>.Instance.LoginByChannel
					});

					break;
				case ChannelType.IPhone:
				case ChannelType.IPad:
					PopupSystem.Show(new ParadisePopupDialog {
						Size = ParadisePopupDialog.PopupSize.Regular,
						Title = LocalizedStrings.Warning,
						Text = string.Format(ParadiseLocalizedStrings.ClientOutOfDate, ParadiseLocalizedStrings.ClientUpdateIOS),
						AlertType = PopupSystem.AlertType.OKCancel,
						ActionType = PopupSystem.ActionType.Positive,
						OkCaption = ParadiseLocalizedStrings.Update,
						OkAction = () => {
							ApplicationDataManager.OpenUrl(string.Empty, "itms-apps://itunes.com/apps/uberstrike");
							Application.Quit();
						},
						CancelCaption = LocalizedStrings.Continue,
						CancelAction = Singleton<AuthenticationManager>.Instance.LoginByChannel
					});

					break;
				case ChannelType.Android:
					PopupSystem.Show(new ParadisePopupDialog {
						Size = ParadisePopupDialog.PopupSize.Regular,
						Title = LocalizedStrings.Warning,
						Text = string.Format(ParadiseLocalizedStrings.ClientOutOfDate, ParadiseLocalizedStrings.ClientUpdateAndroid),
						AlertType = PopupSystem.AlertType.OKCancel,
						ActionType = PopupSystem.ActionType.Positive,
						OkCaption = ParadiseLocalizedStrings.Update,
						OkAction = () => {
							ApplicationDataManager.OpenUrl(string.Empty, "market://details?id=com.cmune.uberstrike.android");
							Application.Quit();
						},
						CancelCaption = LocalizedStrings.Continue,
						CancelAction = Singleton<AuthenticationManager>.Instance.LoginByChannel
					});

					break;
				default:
					if (channel != ChannelType.WebPortal && channel != ChannelType.WebFacebook) {
						PopupSystem.Show(new ParadisePopupDialog {
							Size = ParadisePopupDialog.PopupSize.Regular,
							Title = LocalizedStrings.Error,
							Text = string.Format(ParadiseLocalizedStrings.ClientNotSupported, channel),
							AlertType = PopupSystem.AlertType.OK,
							OkAction = () => { Application.Quit(); },
						});
					} else {
						PopupSystem.Show(new ParadisePopupDialog {
							Size = ParadisePopupDialog.PopupSize.Regular,
							Title = LocalizedStrings.Warning,
							Text = string.Format(ParadiseLocalizedStrings.ClientOutOfDate, ParadiseLocalizedStrings.ClientUpdateBrowser),
							AlertType = PopupSystem.AlertType.OK,
							OkCaption = LocalizedStrings.Continue
						});
					}
					break;
			}
		}

		private static void HandleVersionError() {
			var channel = ApplicationDataManager.Channel;

			switch (channel) {
				case ChannelType.Steam:
					PopupSystem.Show(new ParadisePopupDialog {
						Size = ParadisePopupDialog.PopupSize.Regular,
						Title = LocalizedStrings.Error,
						Text = string.Format(ParadiseLocalizedStrings.ClientOutOfDate, ParadiseLocalizedStrings.ClientUpdateSteam),
						AlertType = PopupSystem.AlertType.OK,
						OkCaption = ParadiseLocalizedStrings.Update,
						OkAction = () => {
							ApplicationDataManager.OpenUrl(string.Empty, "steam://store/291210");
							Application.Quit();
						}
					});

					break;
				case ChannelType.IPhone:
				case ChannelType.IPad:
					PopupSystem.Show(new ParadisePopupDialog {
						Size = ParadisePopupDialog.PopupSize.Regular,
						Title = LocalizedStrings.Error,
						Text = string.Format(ParadiseLocalizedStrings.ClientOutOfDate, ParadiseLocalizedStrings.ClientUpdateIOS),
						AlertType = PopupSystem.AlertType.OK,
						OkCaption = ParadiseLocalizedStrings.Update,
						OkAction = () => {
							ApplicationDataManager.OpenUrl(string.Empty, "itms-apps://itunes.com/apps/uberstrike");
							Application.Quit();
						}
					});

					break;
				case ChannelType.Android:
					PopupSystem.Show(new ParadisePopupDialog {
						Size = ParadisePopupDialog.PopupSize.Regular,
						Title = LocalizedStrings.Error,
						Text = string.Format(ParadiseLocalizedStrings.ClientOutOfDate, ParadiseLocalizedStrings.ClientUpdateAndroid),
						AlertType = PopupSystem.AlertType.OK,
						OkCaption = ParadiseLocalizedStrings.Update,
						OkAction = () => {
							ApplicationDataManager.OpenUrl(string.Empty, "market://details?id=com.cmune.uberstrike.android");
							Application.Quit();
						},
					});

					break;
				default:
					if (channel != ChannelType.WebPortal && channel != ChannelType.WebFacebook) {
						PopupSystem.Show(new ParadisePopupDialog {
							Size = ParadisePopupDialog.PopupSize.Regular,
							Title = LocalizedStrings.Error,
							Text = string.Format(ParadiseLocalizedStrings.ClientNotSupported, channel),
							AlertType = PopupSystem.AlertType.OK,
							OkAction = () => { Application.Quit(); },
						});
					} else {
						PopupSystem.Show(new ParadisePopupDialog {
							Size = ParadisePopupDialog.PopupSize.Regular,
							Title = LocalizedStrings.Error,
							Text = string.Format(ParadiseLocalizedStrings.ClientOutOfDate, ParadiseLocalizedStrings.ClientUpdateBrowser)
						});
					}
					break;
			}
		}
	}
}
