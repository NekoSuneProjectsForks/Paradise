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

using System.Collections.Generic;

using static Paradise.Client.ParadisePrefs;

namespace Paradise.Client {
	public static class ParadiseLocalizedStrings {
		public static string Add = "Add";
		public static string Allow = "Allow";
		public static string Apply = "Apply";
		public static string AutomaticUpdatesDisabledTitle = "Automatic Updates disabled";
		public static string AutomaticUpdatesDisabledText = "You have disabled automatic updates. If you want to play UberStrike, you may need to update the Paradise runtime.\n\nPlease enable automatic updates in order to receive updates.";
		public static string BundleError = "Bundle Error";
		public static string CheckConnection = "There was a problem loading UberStrike. Please check your internet connection and try again.";
		public static string CheckingForUpdates = "Checking for updates...\n";
		public static string CheckingFilesForUpdates = "Checking files for updates...\n{0}";
		public static string ClientNotSupported = "Your UberStrike client is not supported. Please update from our website.\n(Invalid Channel: {0})";
		public static string ClientOutOfDate = "Your UberStrike client is out of date. {0}";
		public static string ClientTypeNotSupported = "This client type is not supported.";
		public static string ClientUpdate = "Click OK to update from our website.";
		public static string ClientUpdateAndroid = "Click OK to update from the Play Store.";
		public static string ClientUpdateBrowser = "You should refresh your browser.";
		public static string ClientUpdateIOS = "Click OK to update from the App Store.";
		public static string ClientUpdateSteam = "Please update from the Steam store.";
		public static string ConsoleCaps = "CONSOLE";
		public static string CustomResolution = "Custom Resolution";
		public static string DeleteCaps = "DELETE";
		public static string Disallow = "Disallow";
		public static string Discord = "Discord";
		public static string ErrorGettingShopDataSupport = "There was an error getting the Shop Data.\nPlease visit paradise.festival.tf";
		public static string ErrorGettingPlayerLoadoutSupport = "There was an error getting the Player Loadout.\nPlease visit paradise.festival.tf";
		public static string ErrorPlayerStatisticsSupport = "There was an error getting the Player Statistics.\nPlease visit paradise.festival.tf";
		public static string ErrorLoadingAdditionalMaps = "There was an error loading additional maps.";
		public static string ErrorLoadingAdditionalMapsSupport = "There was an error getting additional maps.\nPlease visit paradise.festival.tf";
		public static string ErrorLoadingMap = "An error occured while loading the map: {0}";
		public static string ErrorLoadingMapsSupport = "There was an error getting the maps.\nPlease visit paradise.festival.tf";
		public static string Handguns = "Handguns";
		public static string High = "High";
		public static string InvalidServerURL = "There are invalid server URLs!\nPlease check your server settings.";
		public static string InventoryCantRemoveDefaultItems = "You can't remove default items.";
		public static string InventoryDeleteItem = "Delete Item";
		public static string InventoryDeleteItemPrompt = "Are you sure you want to remove \"{0}\" from your inventory? To use it, you'll need to purchase it from the shop again.";
		public static string InventoryRemove = "Remove";
		public static string Loading = "Loading";
		public static string LoadingCustomMapData = "Loading Additional Map Data";
		public static string LoadingMapFrom = "Loading map from {0}";
		public static string LoginErrorAlreadyLinked = "Sorry this account is linked already.";
		public static string LoginErrorContactSupport = "There was an error logging you in. Please try again or contact us at https://paradise.festival.tf";
		public static string LoginErrorInvalidCredentials = "Your login credentials are not correct. Please try to login again.";
		public static string Low = "Low";
		public static string MapBundleNotFound = "The map you are trying to load cannot be found.";
		public static string Medium = "Medium";
		public static string MostHandgunKills = "Most Handgun Kills";
		public static string No = "No";
		public static string OpenLog = "Open Log";
		public static string ParadiseCaps = "PARADISE";
		public static string PleaseUpdate = "Please Update.";
		public static string PrivacyPolicy = "Privacy Policy";
		public static string ReportIssue = "Report Issue";
		public static string ResolutionSet = "Resolution has been set to {0:N0}x{1:N0}.\nDo you want to keep this setting?";
		public static string Save = "Save";
		public static string ServerChangesAppliedAfterRestart = "Server changes will be applied after a game restart.";
		public static string TelemetryPopupText = "We would like to collect UberStrike error logs and details about your hardware. This data is completely anonymous, and you can always choose to enable or disable data collection in the Paradise settings if you change your mind.";
		public static string TelemetryPopupTitle = "Allow telemetry";
		public static string ThisIsATestBuild = "This is a test build, do not distribute!";
		public static string Update = "Update";
		public static string UpdateAvailableText = "An update is available. You should install this update in order to receive the latest fixes and improvements.\n\nVersion: {0} ({1})\nChannel: {2}\n\nIf you choose to ignore this update, you will be asked again the next time you launch UberStrike.";
		public static string UpdateAvailableMandatoryText = "A mandatory update is available. You need to install this update in order to play.\n\nVersion: {0} ({1})\nChannel: {2}";
		public static string UpdateCatalogDownloadEmpty = "Server returned an empty response.";
		public static string UpdateCatalogDownloadError = "Failed to download update catalog.\n{0}";
		public static string UpdateCatalogDownloadTimeout = "A timeout occurred while downloading the update catalog.";
		public static string UpdateCatalogParseError = "Failed to parse update catalog.\n{0}";
		public static string UpdateCheckError = "An error occured while checking for updates: {0}";
		public static string UpdateCheckForUpdates = "Check for Updates";
		public static string UpdateCompleteTitle = "Update Complete";
		public static string UpdateCompleteText = "Updates have been installed successfully. In order to complete the installation, UberStrike needs to be restarted.";
		public static string UpdateDownloadFileConnectionFailed = "Connection failed.";
		public static string UpdateDownloadFileError = "Failed to download {0} {1}:\n{2}";
		public static string UpdateDownloadFileTimeout = "A timeout occurred while downloading the file.";
		public static string UpdateDownloading = "Downloading updates... ({0}/{1})";
		public static string UpdateInstallError = "An error occured while installing updates: {0}";
		public static string UpdateLastChecked = "Last checked: {0}";
		public static string UpdateLastCheckedDateFormat = "MMM dd yyyy, HH:mm:ss";
		public static string UpdateLastCheckedNever = "Never";
		public static string UpdateNoAvailableTitle = "No Updates";
		public static string UpdateNoAvailableText = "There are currently no updates available.";
		public static string UpdateVerificationFailed = "One or more downloaded files could not be verified. Please contact your server administrator.\n\n{0}";
		public static string UseFullscreen = "Use Fullscreen";
		public static string WSConnectionFailed = "Failed to connect to the UberStrike Web Services. Please check the logs for details.\n\nReinstalling Paradise is not necessary.";
		public static string Yes = "Yes";

		public static string InputXMouseSensitivity = "Mouse Sensitivity (Horizontal)";
		public static string InputYMouseSensitivity = "Mouse Sensitivity (Vertical)";
		public static string InputMouseRotationMinY = "Minimum Y Rotation";
		public static string InputMouseRotationMaxY = "Maximum Y Rotation";
		public static string InputInvertMouse = "Invert Y axis";

		public static string VideoBloomAndFlares = "Bloom & Flares";
		public static string VideoVignetting = "Vignette";
		public static string VideoMotionBlur = "Motion Blur";

		public static string SettingsGeneral = "General";
		public static string SettingsTelemetry = "Allow sending anonymous telemetry (*)";
		public static string SettingsDiscord = "Enable Discord Rich Presence (*)";
		public static string SettingsDetailedItemStatistics = "Show detailed item statistics";
		public static string SettingsWeaponsInKillfeed = "Show weapon names in killfeed";
		public static string SettingsLandingGrunt = "Enable landing grunt sound effect";
		public static string SettingsAdvanced = "Show advanced settings";
		public static string SettingsAdvancedDisclaimer = "These settings are for experienced users only.\nIf you set incorrect values, you can break things.\n\nProceed at your own risk.";
		public static string SettingsRestartInfo = "(*) Requires a restart to take effect.";

		public static string SettingsMenuTheme = "Menu Theme";
		public static Dictionary<MainMenuMusicType, string> SettingsMenuThemeOptions = new Dictionary<MainMenuMusicType, string> {
			[MainMenuMusicType.None] = "None",
			[MainMenuMusicType.Default] = "Default",
			[MainMenuMusicType.Selotron] = "Selotron",
			[MainMenuMusicType.Catalyst] = "Catalyst",
			[MainMenuMusicType.ApexTwin] = "Apex Twin",
			[MainMenuMusicType.GhostIsland] = "Ghost Island",
			[MainMenuMusicType.DangerZone] = "Danger Zone"
		};

		public static string SettingsServers = "Servers";
		public static string SettingsWebServices = "Web Services";
		public static string SettingsWebServiceEndpoint = "Web Service Endpoint";
		public static string SettingsWebServicePrefix = "Web Service Prefix";
		public static string SettingsWebServiceSuffix = "Web Service Suffix";
		public static string SettingsEncryptWSTraffic = "Enable WebService traffic encryption";
		public static string SettingsFileServers = "File Servers";
		public static string SettingsImagePath = "Image Path";

		public static string SettingsUpdates = "Updates";
		public static string SettingsEnableUpdates = "Enable automatic updates";
		public static string SettingsDisableUpdates = "Disable Automatic Updates";
		public static string SettingsDisableUpdatesConfirmation = "Are you sure you want to disable automatic updates?\n\nYou will no longer receive bug fixes and new features unless you turn on updates again.";
		public static string SettingsUpdateChannel = "Update Channel";
		public static string[] SettingUpdateChannelOptions = new[] { "Stable", "Beta" };
		public static string SettingsUpdateEndpoint = "Update Endpoint";
	}
}
