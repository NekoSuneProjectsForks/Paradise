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
using log4net;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Security.Cryptography;
using UnityEngine;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace Paradise.Client {
	public enum UpdateChannel {
		Stable,
		Beta
	}

	internal class UpdateCatalog {
		[YamlMember(Alias = "version")]
		public string Version { get; set; }

		[YamlMember(Alias = "build")]
		public string Build { get; set; }

		[YamlMember(Alias = "channel")]
		public UpdateChannel Channel { get; set; }

		[YamlMember(Alias = "platforms")]
		public Dictionary<string, UpdatePlatformDefinition> Platforms { get; set; }
	}

	internal class UpdatePlatformDefinition {
		[YamlMember(Alias = "platform")]
		public string Platform { get; set; }

		[YamlMember(Alias = "files")]
		public List<UpdateFile> Files { get; set; }

		[YamlMember(Alias = "removedFiles")]
		public List<UpdateFile> RemovedFiles { get; set; }
	}

	internal class UpdateFile {
		[YamlMember(Alias = "filename")]
		public string FileName { get; set; }

		[YamlMember(Alias = "description")]
		public string Description { get; set; }

		[YamlMember(Alias = "localPath")]
		public string LocalPath { get; set; }

		[YamlMember(Alias = "remoteURL")]
		public string RemoteURL { get; set; }

		[YamlMember(Alias = "remotePath")]
		public string RemotePath { get; set; }

		[YamlMember(Alias = "filesize")]
		public long FileSize { get; set; }

		[YamlMember(Alias = "optional")]
		public bool IsOptional { get; set; }

		[YamlMember(Alias = "md5sum")]
		public string MD5 { get; set; }

		[YamlMember(Alias = "sha256")]
		public string SHA256 { get; set; }

		[YamlMember(Alias = "sha512")]
		public string SHA512 { get; set; }
	}

	internal class ParadiseUpdater : AutoMonoBehaviour<ParadiseUpdater> {
		private static readonly ILog Log = LogManager.GetLogger(nameof(ParadiseUpdater));

		private UpdateCatalog CachedUpdates;
		private readonly List<UpdateFile> FilesToUpdate = new List<UpdateFile>();
		private readonly List<UpdateFile> FilesToRemove = new List<UpdateFile>();

		private static string UpdateCatalogUrl => $"{ParadiseClient.Settings.FileServerUrl}/{ParadiseClient.Settings.UpdateEndpoint}/v2/";
		private static string UpdateCatalog => $"{ParadiseClient.Settings.UpdateChannel.ToString().ToLower()}/updates.yml";
		private static string UpdatePlatform {
			get {
				switch (Application.platform) {
					case RuntimePlatform.WindowsPlayer:
					case RuntimePlatform.WindowsEditor:
					case RuntimePlatform.WindowsWebPlayer:
						return "win";
					case RuntimePlatform.OSXPlayer:
					case RuntimePlatform.OSXEditor:
					case RuntimePlatform.OSXWebPlayer:
						return "darwin";
					default:
						break;
				}

				return null;
			}
		}

		private static bool CanIgnoreUpdates => !PlayerDataManager.IsPlayerLoggedIn || PlayerDataManager.AccessLevel >= MemberAccessLevel.SeniorQA;

		private ParadiseProgressPopupDialog progressPopup;

		public static IEnumerator CleanupUpdates() {
			Log.Info("Cleaning cached update files");

			// Delete downloaded update files
			if (Directory.Exists(string.Join("/", new string[] { Application.dataPath, "Updates" }))) {
				var files = Directory.GetFiles(string.Join("/", new string[] { Application.dataPath, "Updates" }), "*");

				foreach (var file in files) {
					File.Delete(file);
				}
			}

			// Delete backup files
			if (Directory.Exists(string.Join("/", new string[] { Application.dataPath, "Updates", "bak" }))) {
				Directory.Delete(string.Join("/", new string[] { Application.dataPath, "Updates", "bak" }), true);
			}

			yield break;
		}

		public IEnumerator CheckForUpdates(Action<UpdateCatalog> updateAvailableCallback, Action<string> errorCallback) {
			EnsureSSLTrust();

			FilesToUpdate.Clear();
			FilesToRemove.Clear();

			var updateUri = NormalizeUri(string.Join("", new string[] { UpdateCatalogUrl, UpdateCatalog }));

			progressPopup = new ParadiseProgressPopupDialog {
				Title = LocalizedStrings.SettingUp,
				Text = ParadiseLocalizedStrings.CheckingForUpdates,
				Depth = (GuiDepth)ParadiseGuiDepth.UpdatePopup,
			};
			PopupSystem.Show(progressPopup);

			UnityRuntime.StartRoutine(DownloadUpdateCatalog(updateUri, delegate (UpdateCatalog updateCatalog) {
				UnityRuntime.StartRoutine(OnUpdateCatalogDownloadComplete(updateCatalog, updateAvailableCallback, errorCallback));
			}, delegate (HttpResponse responseHeader) {
				PopupSystem.HideMessage(progressPopup);

				HandleUpdateError(string.Format(ParadiseLocalizedStrings.UpdateCatalogDownloadError, responseHeader.StatusText), () => {
					// Application.Quit();
				});
			}));

			yield break;
		}

		public IEnumerator CheckForUpdatesIfNecessary(Action<UpdateCatalog> updateAvailableCallback, Action<string> errorCallback) {
			if (!ParadiseClient.Settings.AutoUpdates) {
				Log.Info("Automatic updates disabled");

				if (!CanIgnoreUpdates) {
					PopupSystem.ShowMessage(ParadiseLocalizedStrings.AutomaticUpdatesDisabledTitle, ParadiseLocalizedStrings.AutomaticUpdatesDisabledText, PopupSystem.AlertType.OK, () => {
						updateAvailableCallback?.Invoke(null);
					});
				} else {
					updateAvailableCallback?.Invoke(null);
				}

				yield break;
			}

			if (Math.Abs((ParadiseClient.Settings.LastUpdateCheckTimeStamp - DateTimeOffset.Now).TotalSeconds) < 30) {
				updateAvailableCallback?.Invoke(null);
				yield break;
			}

			EnsureSSLTrust();

			FilesToUpdate.Clear();
			FilesToRemove.Clear();

			var updateUri = NormalizeUri(string.Join("", new string[] { UpdateCatalogUrl, UpdateCatalog }));

			progressPopup = new ParadiseProgressPopupDialog {
				Title = LocalizedStrings.SettingUp,
				Text = ParadiseLocalizedStrings.CheckingForUpdates,
				Depth = (GuiDepth)ParadiseGuiDepth.UpdatePopup,
			};
			PopupSystem.Show(progressPopup);

			UnityRuntime.StartRoutine(DownloadUpdateCatalog(updateUri, delegate (UpdateCatalog updateCatalog) {
				UnityRuntime.StartRoutine(OnUpdateCatalogDownloadComplete(updateCatalog, updateAvailableCallback, errorCallback));
			}, delegate (HttpResponse responseHeader) {
				PopupSystem.HideMessage(progressPopup);

				HandleUpdateError(string.Format(ParadiseLocalizedStrings.UpdateCatalogDownloadError, responseHeader.StatusText), () => {
					Application.Quit();
				});
			}));

			yield break;
		}

		private IEnumerator DownloadUpdateCatalog(string updateUri, Action<UpdateCatalog> successCallback, Action<HttpResponse> errorCallback) {
			Log.Info($"Attempting to download update catalog from {updateUri}");

			using (WWW loader = new WWW(updateUri)) {
				float elapsedTime = 0f;

				while (!loader.isDone) {
					elapsedTime += Time.deltaTime;

					if (elapsedTime >= 15f) {
						PopupSystem.HideMessage(progressPopup);
						Log.Error("Update catalog download timed out");

						errorCallback?.Invoke(new HttpResponse {
							StatusCode = HttpStatusCode.RequestTimeout,
							StatusText = string.Format(ParadiseLocalizedStrings.UpdateCatalogDownloadError, ParadiseLocalizedStrings.UpdateCatalogDownloadTimeout),
						});

						yield break;
					}

					yield return null;
				}

				if (!string.IsNullOrEmpty(loader.error)) {
					Log.Error($"Update catalog download failed: {loader.error}");
					errorCallback?.Invoke(new HttpResponse {
						StatusCode = HttpStatusCode.ServiceUnavailable,
						StatusText = loader.error,
					});

					yield break;
				}

				if (string.IsNullOrEmpty(loader.text)) {
					Log.Error("Update catalog download returned no content");
					errorCallback?.Invoke(new HttpResponse {
						StatusCode = HttpStatusCode.ServiceUnavailable,
						StatusText = string.Format(ParadiseLocalizedStrings.UpdateCatalogDownloadError, ParadiseLocalizedStrings.UpdateCatalogDownloadEmpty),
					});

					yield break;
				}

				progressPopup.Progress = 0.2f;
				Log.Info("Successfully downloaded update catalog");

				yield return new WaitForSeconds(0.5f);

				UpdateCatalog updateCatalog = null;

				try {
					var deserializer = new DeserializerBuilder()
						.WithNamingConvention(CamelCaseNamingConvention.Instance)
						.Build();

					updateCatalog = deserializer.Deserialize<UpdateCatalog>(loader.text);

					Log.Info("Successfully parsed update catalog");
					progressPopup.Progress = 0.4f;
				} catch (Exception e) {
					Log.Error($"An error occured while checking for updates:\n{e.Message}");
					Log.Debug(e);

					errorCallback?.Invoke(new HttpResponse {
						StatusCode = HttpStatusCode.UnsupportedMediaType,
						StatusText = string.Format(ParadiseLocalizedStrings.UpdateCatalogParseError, e.Message),
					});

					yield break;
				}

				if (updateCatalog != null) {
					successCallback?.Invoke(updateCatalog);
				}
			}

			yield break;
		}

		private IEnumerator OnUpdateCatalogDownloadComplete(UpdateCatalog updateCatalog, Action<UpdateCatalog> updateAvailableCallback, Action<string> errorCallback) {
			yield return new WaitForSeconds(1f);

			if (ParseBuildDate(updateCatalog.Build) < ParseBuildDate(ParadiseConstants.Build)) {
				PopupSystem.HideMessage(progressPopup);
				Log.Info("No update available.");

				updateAvailableCallback?.Invoke(null);
				ParadiseClient.Settings.LastUpdateCheckTimeStamp = DateTime.Now;
				ParadiseClient.Settings.SaveSettings();

				yield break;
			}

			CachedUpdates = updateCatalog;

			updateCatalog.Platforms.TryGetValue("universal", out var universalUpdates);
			updateCatalog.Platforms.TryGetValue(UpdatePlatform, out var platformUpdates);

			var totalFiles = (universalUpdates?.Files.Count ?? 0) + (platformUpdates?.Files.Count ?? 0);

			progressPopup.Text = ParadiseLocalizedStrings.CheckingFilesForUpdates;

			var checkFailed = false;
			Action<string> errorCallbackAction = (msg) => {
				checkFailed = true;
				errorCallback?.Invoke(msg);
			};

			if (universalUpdates == null) {
				Log.Error("Update catalog does not contain universal platform.");
			} else {
				if (universalUpdates.Files != null) {
					yield return UnityRuntime.StartRoutine(CheckUpdatedFiles(universalUpdates, 0, totalFiles, errorCallback));
				}

				if (universalUpdates.RemovedFiles != null) {
					yield return UnityRuntime.StartRoutine(CheckRemovedFiles(universalUpdates));
				}
			}

			yield return null;

			if (checkFailed) {
				yield break;
			}

			if (platformUpdates == null) {
				Log.Error($"Update catalog does not contain platform \"{UpdatePlatform}\".");
			} else {
				if (platformUpdates.Files != null) {
					yield return UnityRuntime.StartRoutine(CheckUpdatedFiles(platformUpdates, universalUpdates?.Files.Count ?? 0, totalFiles, errorCallback));
				}

				if (platformUpdates.RemovedFiles != null) {
					yield return UnityRuntime.StartRoutine(CheckRemovedFiles(platformUpdates));
				}
			}

			if (checkFailed) {
				yield break;
			}

			PopupSystem.HideMessage(progressPopup);

			if (FilesToUpdate.Count > 0) {
				Log.Info($"Update available: {CachedUpdates.Version} (Build {CachedUpdates.Build}), files to update: {FilesToUpdate.Count}; files to remove: {FilesToRemove.Count}");
				updateAvailableCallback?.Invoke(CachedUpdates);
			} else {
				Log.Info("No update available.");

				if (FilesToRemove.Count > 0) {
					yield return UnityRuntime.StartRoutine(DeleteRemovedFiles());
				}

				updateAvailableCallback?.Invoke(null);
			}

			ParadiseClient.Settings.LastUpdateCheckTimeStamp = DateTime.Now;
			ParadiseClient.Settings.SaveSettings();

			yield break;
		}

		private IEnumerator CheckUpdatedFiles(UpdatePlatformDefinition updateDef, int startIndex, int totalFiles, Action<string> errorCallback) {
			if (updateDef.Files.Count == 0) {
				Log.Info($"Update catalog doesn't contain any files for platform \"{updateDef.Platform}\", aborting...");
				yield break;
			}

			foreach (var file in updateDef.Files) {
				progressPopup.Text = string.Format(ParadiseLocalizedStrings.CheckingFilesForUpdates, file.FileName);
				progressPopup.Progress = 0.4f + (((float)startIndex + (float)updateDef.Files.IndexOf(file)) / (float)(totalFiles - 1f)) * 0.6f;

				yield return new WaitForEndOfFrame();

				string path = $"{Path.GetDirectoryName(Application.dataPath)}\\{file.LocalPath}\\{file.FileName}";

				if (!File.Exists(path)) {
					if (!file.IsOptional) {
						Log.Info($"Local file {file.FileName} doesn't exist");

						FilesToUpdate.Add(file);
					}

					continue;
				} else {
					try {
						var fileNeedsUpdate = false;

						// if (!string.IsNullOrEmpty(file.MD5)) {
						// 	using (FileStream fileStream = File.OpenRead(path)) {
						// 		using (var md5 = MD5.Create()) {
						// 			var md5sum = BitConverter.ToString(md5.ComputeHash(fileStream)).Replace("-", "").ToLowerInvariant();

						// 			if (!md5sum.Equals(file.MD5)) {
						// 				Log.Info($"Local file {file.FileName}: MD5 doesn't match (expected {file.MD5}, got {md5sum})");
						// 				fileNeedsUpdate = true;
						// 			}
						// 		}
						// 	}
						// }

						// if (!string.IsNullOrEmpty(file.SHA256)) {
						// 	using (FileStream fileStream = File.OpenRead(path)) {
						// 		using (var sha256 = SHA256.Create()) {
						// 			var sha256sum = BitConverter.ToString(sha256.ComputeHash(fileStream)).Replace("-", "").ToLowerInvariant();

						// 			if (!sha256sum.Equals(file.SHA256)) {
						// 				Log.Info($"Local file {file.FileName}: SHA256 doesn't match (expected {file.SHA256}, got {sha256sum})");
						// 				fileNeedsUpdate = true;
						// 			}
						// 		}
						// 	}
						// }

						if (!string.IsNullOrEmpty(file.SHA512)) {
							using (FileStream fileStream = File.OpenRead(path)) {
								using (var sha512 = SHA512.Create()) {
									var sha512sum = BitConverter.ToString(sha512.ComputeHash(fileStream)).Replace("-", "").ToLowerInvariant();

									if (!sha512sum.Equals(file.SHA512)) {
										Log.Info($"Local file {file.FileName}: SHA512 doesn't match (expected {file.SHA512}, got {sha512sum})");
										fileNeedsUpdate = true;
									}
								}
							}
						}

						if (fileNeedsUpdate) {
							FilesToUpdate.Add(file);
						}
					} catch (Exception e) {
						PopupSystem.HideMessage(progressPopup);

						errorCallback?.Invoke(string.Format(ParadiseLocalizedStrings.UpdateCheckError, e.Message));
						Log.Debug(e);

						yield break;
					}
				}

				yield return null;
			}

			yield break;
		}

		private IEnumerator CheckRemovedFiles(UpdatePlatformDefinition updateDef) {
			foreach (var file in updateDef.RemovedFiles) {
				string path = $"{Path.GetDirectoryName(Application.dataPath)}\\{file.LocalPath}\\{file.FileName}";

				if (File.Exists(path)) {
					Log.Info($"Local file {file.FileName} exists, marked for removal");
					FilesToRemove.Add(file);
				}

				yield return null;
			}

			yield break;
		}

		private IEnumerator DeleteRemovedFiles() {
			if (FilesToRemove.Count == 0)
				yield break;

			var backupPath = $"{Application.dataPath}\\Updates\\bak";

			if (!Directory.Exists(backupPath)) {
				Directory.CreateDirectory(backupPath);
			}

			foreach (var file in FilesToRemove) {
				try {
					if (!Directory.Exists($"{Path.GetDirectoryName(Application.dataPath)}\\{file.LocalPath}")) {
						continue;
					}

					var filename = $"{Path.GetDirectoryName(Application.dataPath)}\\{file.LocalPath}\\{file.FileName}";

					if (File.Exists(filename)) {
						// File will be removed on game restart
						var fileBackupPath = Path.Combine(backupPath, Path.GetFileName(filename) + ".bak");

						if (File.Exists(fileBackupPath)) {
							File.Delete(fileBackupPath);
						}

						File.Move(filename, fileBackupPath);
					}
				} catch (Exception e) {
					Log.Error(e);
				}

				yield return null;
			}

			yield break;
		}


		private IEnumerator InstallUpdates(Action updateCompleteCallback, Action<string> errorCallback) {
			if (FilesToUpdate.Count == 0)
				yield break;

			var backupPath = $"{Application.dataPath}\\Updates\\bak";

			if (!Directory.Exists(backupPath)) {
				Directory.CreateDirectory(backupPath);
			}

			var verifyFailures = new List<string>();

			progressPopup = new ParadiseProgressPopupDialog {
				Title = string.Format(ParadiseLocalizedStrings.UpdateDownloading, 1, FilesToUpdate.Count),
				Text = "",
				Depth = (GuiDepth)ParadiseGuiDepth.UpdatePopup,
			};
			PopupSystem.Show(progressPopup);

			foreach (var file in FilesToUpdate) {
				progressPopup.Title = string.Format(ParadiseLocalizedStrings.UpdateDownloading, FilesToUpdate.IndexOf(file) + 1, FilesToUpdate.Count);
				progressPopup.Text = $"{file.FileName} ({ParadiseUtils.FormatSize(file.FileSize)})";

				var fileUri = NormalizeUri(string.Join("/", new string[] { file.RemoteURL ?? UpdateCatalogUrl, file.RemotePath, file.FileName }));
				using (WWW loader = new WWW(fileUri)) {
					Log.Info($"Downloading remote file: {fileUri}");

					float elapsedTime = 0f;

					while (!loader.isDone) {
						progressPopup.Progress = loader.progress;
						elapsedTime += Time.deltaTime;

						if (elapsedTime >= 120f) {
							PopupSystem.HideMessage(progressPopup);
							Log.Error($"Download of {file.FileName} timed out");

							errorCallback?.Invoke(string.Format(ParadiseLocalizedStrings.UpdateDownloadFileError, fileUri, file.FileName, ParadiseLocalizedStrings.UpdateDownloadFileTimeout));

							yield break;
						}

						yield return null;
					}

					if (!string.IsNullOrEmpty(loader.error) || loader.bytes == null || loader.bytes.Length == 0) {
						PopupSystem.HideMessage(progressPopup);
						Log.Error($"Failed to download {file.FileName}: {loader.error}");
						errorCallback?.Invoke($"Failed to download {file.FileName}:\n{(string.IsNullOrEmpty(loader.error) ? "connection failed" : loader.error)}");

						errorCallback?.Invoke(string.Format(ParadiseLocalizedStrings.UpdateDownloadFileError, fileUri, file.FileName, ParadiseLocalizedStrings.UpdateDownloadFileConnectionFailed));

						yield break;
					}

					var fileBytes = loader.bytes;

					try {
						if (!Directory.Exists($"{Application.dataPath}\\Updates")) {
							Directory.CreateDirectory($"{Application.dataPath}\\Updates");
						}

						// if (!string.IsNullOrEmpty(file.MD5)) {
						// 	using (var md5 = MD5.Create()) {
						// 		var md5sum = BitConverter.ToString(md5.ComputeHash(fileBytes)).Replace("-", "").ToLowerInvariant();

						// 		if (!md5sum.Equals(file.MD5)) {
						// 			Log.Error($"Downloaded file {file.FileName}: MD5 doesn't match (expected {file.MD5}, got {md5sum})");
						// 			verifyFailures.Add(file.FileName);

						// 			continue;
						// 		}
						// 	}
						// }

						// if (!string.IsNullOrEmpty(file.SHA256)) {
						// 	using (var sha256 = SHA256.Create()) {
						// 		var sha256sum = BitConverter.ToString(sha256.ComputeHash(fileBytes)).Replace("-", "").ToLowerInvariant();

						// 		if (!sha256sum.Equals(file.SHA256)) {
						// 			Log.Error($"Downloaded file {file.FileName}: SHA256 doesn't match (expected {file.SHA256}, got {sha256sum})");
						// 			verifyFailures.Add(file.FileName);

						// 			continue;
						// 		}
						// 	}
						// }

						if (!string.IsNullOrEmpty(file.SHA512)) {
							using (var sha512 = SHA512.Create()) {
								var sha512sum = BitConverter.ToString(sha512.ComputeHash(fileBytes)).Replace("-", "").ToLowerInvariant();

								if (!sha512sum.Equals(file.SHA512)) {
									Log.Error($"Downloaded file {file.FileName}: SHA512 doesn't match (expected {file.SHA512}, got {sha512sum})");
									verifyFailures.Add(file.FileName);

									continue;
								}
							}
						}
					} catch (Exception e) {
						PopupSystem.HideMessage(progressPopup);

						errorCallback?.Invoke(string.Format(ParadiseLocalizedStrings.UpdateInstallError, e.Message));
						Log.Debug(e);

						yield break;
					}

					try {
						var tempFilename = $"{Application.dataPath}\\Updates\\{file.FileName}";
						File.WriteAllBytes(tempFilename, fileBytes);

						if (!Directory.Exists($"{Path.GetDirectoryName(Application.dataPath)}\\{file.LocalPath}")) {
							Directory.CreateDirectory($"{Path.GetDirectoryName(Application.dataPath)}\\{file.LocalPath}");
						}

						var filename = $"{Path.GetDirectoryName(Application.dataPath)}\\{file.LocalPath}\\{file.FileName}";

						if (File.Exists(filename)) {
							// File will be removed on game restart
							var fileBackupPath = Path.Combine(backupPath, Path.GetFileName(filename) + ".bak");

							if (File.Exists(fileBackupPath)) {
								File.Delete(fileBackupPath);
							}

							File.Move(filename, fileBackupPath);
						}

						File.Move(tempFilename, filename);
					} catch (Exception e) {
						PopupSystem.HideMessage(progressPopup);

						errorCallback?.Invoke(string.Format(ParadiseLocalizedStrings.UpdateInstallError, e.Message));
						Log.Error(e);

						yield break;
					}
				}
			}

			PopupSystem.HideMessage(progressPopup);

			DeleteRemovedFiles();

			if (verifyFailures.Count > 0) {
				errorCallback?.Invoke(string.Format(ParadiseLocalizedStrings.UpdateVerificationFailed, string.Join("\n", verifyFailures.Select(_ => $"- {_}").ToArray())));

				yield break;
			}

			updateCompleteCallback?.Invoke();
		}

		public static void HandleUpdateAvailable(UpdateCatalog updateCatalog, Action ignoreCallback) {
			PopupSystem.Show(new ParadisePopupDialog {
				Size = ParadisePopupDialog.PopupSize.Regular,
				Title = LocalizedStrings.UpdateAvailable,
				Text = string.Format(!CanIgnoreUpdates ? ParadiseLocalizedStrings.UpdateAvailableMandatoryText : ParadiseLocalizedStrings.UpdateAvailableText, updateCatalog.Version ?? LocalizedStrings.Unknown, updateCatalog.Build ?? LocalizedStrings.Unknown, updateCatalog.Channel.ToString() ?? LocalizedStrings.Unknown),
				AlertType = PopupSystem.AlertType.OKCancel,
				ActionType = PopupSystem.ActionType.Positive,
				OkCaption = ParadiseLocalizedStrings.Update,
				OkAction = () => {
					UnityRuntime.StartRoutine(Instance.InstallUpdates(HandleUpdateComplete, delegate (string message) {
						Instance.HandleUpdateError(message, delegate {
							ignoreCallback?.Invoke();
						});
					}));
				},
				CancelCaption = !CanIgnoreUpdates ? LocalizedStrings.Quit : LocalizedStrings.Ignore,
				CancelAction = () => {
					if (!CanIgnoreUpdates) {
						Application.Quit();
					} else {
						ignoreCallback?.Invoke();
					}
				},
				Depth = (GuiDepth)(-140)
			});
		}

		public static void HandleUpdateComplete() {
			PopupSystem.Show(new ParadisePopupDialog {
				Size = ParadisePopupDialog.PopupSize.Regular,
				Title = ParadiseLocalizedStrings.UpdateCompleteTitle,
				Text = ParadiseLocalizedStrings.UpdateCompleteText,
				AlertType = PopupSystem.AlertType.OK,
				OkAction = () => {
					Caching.CleanCache();
					System.Diagnostics.Process.Start(Path.Combine(Directory.GetCurrentDirectory(), "UberStrike.exe")).WaitForExit(1000);
					Application.Quit();
				},
			});
		}

		public void HandleUpdateError(string message) {
			HandleUpdateError(message, null);
		}

		public void HandleUpdateError(string message, Action callback = null) {
			PopupSystem.HideMessage(progressPopup);

			Log.Error(message);
			PopupSystem.ShowMessage("Error", message, PopupSystem.AlertType.OK, () => {
				callback?.Invoke();
			});
		}

		private static string NormalizeUri(string uri) {
			var uriBuilder = new UriBuilder(uri);
			uriBuilder.Path = uriBuilder.Path.Replace("//", "/");

			return uriBuilder.Uri.AbsoluteUri;
		}

		// private string GetMasterHash() {
		// 	var files = new List<string> {
		// 		"0Harmony.dll",
		// 		"Assembly-CSharp.dll",
		// 		"log4net.dll",
		// 		"Paradise.Client.Bootstrap.dll",
		// 		"Paradise.Client.dll",
		// 		"RuntimeUnityEditor.Core.dll",
		// 		"YamlDotNet.dll",
		// 	};

		// 	var hashes = new List<string>();

		// 	using (var sha256 = SHA256.Create()) {
		// 		foreach (var file in files) {
		// 			string path = $"{Path.GetDirectoryName(Application.dataPath)}\\Managed\\{file}";

		// 			using (FileStream fileStream = File.OpenRead(path)) {
		// 				hashes.Add(BitConverter.ToString(sha256.ComputeHash(fileStream)).Replace("-", "").ToLowerInvariant());
		// 			}
		// 		}

		// 		return BitConverter.ToString(sha256.ComputeHash(Encoding.UTF8.GetBytes(string.Join("", hashes.ToArray()))));
		// 	}
		// }

		// private string GetResourcesHash() {
		// 	var files = new List<string> {
		// 		"Maps/SpaceCity.unity3d",
		// 		"Maps/SpacePortAlpha.unity3d",
		// 		"Maps/UberZone.unity3d",
		//         "Resources/0305-Catalyst2D_V2.ogg",
		//         "Resources/0416-ApexTwinTowers_V4Gandhi.ogg",
		//         "Resources/0503-Volley_V1.ogg",
		//         "Resources/1017-Halloween MusicSELODEMO_V3.ogg",
		//         "Resources/1017-Halloween_MusicSELODEMO_V3.ogg",
		//         "Resources/SeletronRadio-Short.ogg",
		// 	};

		// 	var hashes = new List<string>();

		// 	using (var sha256 = SHA256.Create()) {
		// 		foreach (var file in files) {
		// 			string path = $"{Path.GetDirectoryName(Application.dataPath)}\\{file}";

		// 			using (FileStream fileStream = File.OpenRead(path)) {
		// 				hashes.Add(BitConverter.ToString(sha256.ComputeHash(fileStream)).Replace("-", "").ToLowerInvariant());
		// 			}
		// 		}

		// 		return BitConverter.ToString(sha256.ComputeHash(Encoding.UTF8.GetBytes(string.Join("", hashes.ToArray()))));
		// 	}
		// }

		private static bool sslTrustReady;
		private static void EnsureSSLTrust() {
			if (sslTrustReady)
				return;
			sslTrustReady = true;

			try {
				ServicePointManager.ServerCertificateValidationCallback = (sender, cert, chain, errors) => true;
			} catch (Exception e) {
				Log.Warn($"Could not relax certificate validation for updates: {e.Message}");
			}
		}

		private static DateTime ParseBuildDate(string version) {
			int index = version.IndexOf('-');
			string timestamp = version.Substring(index + 1);

			return DateTime.ParseExact(
				timestamp,
				"yyMMdd-HHmm",
				CultureInfo.InvariantCulture);
		}
	}
}
