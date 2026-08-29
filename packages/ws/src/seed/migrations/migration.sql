ALTER TABLE `ActivePlayers`
  MODIFY `Channel` int(11) NOT NULL,
  ADD KEY `ActivePlayers_ibfk_2` (`CommServerId`),
  ADD KEY `ActivePlayers_ibfk_3` (`GameServerId`),
  ADD KEY `ActivePlayers_ibfk_4` (`GameRoomId`),
  ADD CONSTRAINT `ActivePlayers_ibfk_2` FOREIGN KEY (`CommServerId`) REFERENCES `PhotonServers` (`PhotonId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ActivePlayers_ibfk_3` FOREIGN KEY (`GameServerId`) REFERENCES `PhotonServers` (`PhotonId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ActivePlayers_ibfk_4` FOREIGN KEY (`GameRoomId`) REFERENCES `GameRooms` (`Number`) ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE `ApplicationConfiguration` SET `MaxXp`=1584350 WHERE `ApplicationId`=1 AND `MaxXp` IS NULL;
ALTER TABLE `ApplicationConfiguration`
  MODIFY `XpRequiredPerLevel` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`XpRequiredPerLevel`)),
  MODIFY `MaxLevel` int(11) NOT NULL,
  MODIFY `MaxXp` int(11) NOT NULL,
  MODIFY `XpKill` int(11) NOT NULL,
  MODIFY `XpSmackdown` int(11) NOT NULL,
  MODIFY `XpHeadshot` int(11) NOT NULL,
  MODIFY `XpNutshot` int(11) NOT NULL,
  MODIFY `XpPerMinuteLoser` int(11) NOT NULL,
  MODIFY `XpPerMinuteWinner` int(11) NOT NULL,
  MODIFY `XpBaseLoser` int(11) NOT NULL,
  MODIFY `XpBaseWinner` int(11) NOT NULL,
  MODIFY `PointsKill` int(11) NOT NULL,
  MODIFY `PointsSmackdown` int(11) NOT NULL,
  MODIFY `PointsHeadshot` int(11) NOT NULL,
  MODIFY `PointsNutshot` int(11) NOT NULL,
  MODIFY `PointsPerMinuteLoser` int(11) NOT NULL,
  MODIFY `PointsPerMinuteWinner` int(11) NOT NULL,
  MODIFY `PointsBaseLoser` int(11) NOT NULL,
  MODIFY `PointsBaseWinner` int(11) NOT NULL;

ALTER TABLE `ClanMembers`
  DROP PRIMARY KEY,
  DROP INDEX `Cmid`,
  DROP FOREIGN KEY `ClanMembers_ibfk_1`,
  DROP COLUMN `Name`,
  MODIFY `Cmid` int(11) NOT NULL FIRST,
  MODIFY `Position` int(11) NOT NULL DEFAULT 2,
  MODIFY `JoiningDate` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  MODIFY `Lastlogin` datetime NOT NULL;
ALTER TABLE `ClanMembers`
  ADD PRIMARY KEY (`Cmid`),
  ADD KEY `ClanMembers_ibfk_1` (`GroupId`),
  ADD CONSTRAINT `ClanMembers_ibfk_1` FOREIGN KEY (`GroupId`) REFERENCES `Clans` (`GroupId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ClanMembers_ibfk_2` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE `Clans` SET `ColorStyle`=0 WHERE `ColorStyle` IS NULL;
UPDATE `Clans` SET `FontStyle`=0 WHERE `FontStyle` IS NULL;
ALTER TABLE `Clans`
  DROP FOREIGN KEY `Clans_ibfk_1`,
  DROP COLUMN `MembersCount`,
  DROP COLUMN `OwnerName`,
  DROP COLUMN `Cmid`,
  MODIFY `Description` varchar(255) DEFAULT NULL,
  MODIFY `Name` varchar(25) NOT NULL,
  MODIFY `Motto` varchar(25) NOT NULL,
  MODIFY `FoundingDate` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  MODIFY `Type` int(11) NOT NULL DEFAULT 0,
  MODIFY `LastUpdated` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  MODIFY `Tag` varchar(5) NOT NULL,
  MODIFY `ColorStyle` int(11) NOT NULL DEFAULT 0,
  MODIFY `FontStyle` int(11) NOT NULL DEFAULT 0,
  MODIFY `ApplicationId` int(11) NOT NULL,
  MODIFY `OwnerCmid` int(11) NOT NULL;
ALTER TABLE `Clans`
  ADD UNIQUE KEY `Tag` (`Tag`),
  ADD UNIQUE KEY `OwnerCmid` (`OwnerCmid`),
  ADD CONSTRAINT `Clans_ibfk_1` FOREIGN KEY (`OwnerCmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE `ContactRequests` SET `Status`=0 WHERE `Status` IS NULL;
ALTER TABLE `ContactRequests`
  DROP INDEX `InitiatorCmid`,
  DROP INDEX `ReceiverCmid`,
  DROP COLUMN `Initiatorname`,
  MODIFY `RequestId` int(11) NOT NULL,
  MODIFY `InitiatorCmid` int(11) NOT NULL,
  MODIFY `ReceiverCmid` int(11) NOT NULL,
  MODIFY `InitiatorMessage` text NOT NULL,
  MODIFY `Status` int(11) NOT NULL DEFAULT 0,
  MODIFY `SentDate` datetime(6) NOT NULL DEFAULT current_timestamp(6);
ALTER TABLE `ContactRequests` AUTO_INCREMENT=0;
ALTER TABLE `ContactRequests`
  ADD KEY `ContactRequests_ibfk_1` (`InitiatorCmid`),
  ADD KEY `ContactRequests_ibfk_2` (`ReceiverCmid`),
  ADD CONSTRAINT `ContactRequests_ibfk_1` FOREIGN KEY (`InitiatorCmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ContactRequests_ibfk_2` FOREIGN KEY (`ReceiverCmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ShopBundles`
  MODIFY `ApplicationId` int(11) NOT NULL,
  MODIFY `Name` varchar(255) NOT NULL,
  MODIFY `ImageUrl` varchar(255) DEFAULT NULL,
  MODIFY `IconUrl` varchar(255) DEFAULT NULL,
  MODIFY `Description` text DEFAULT NULL,
  MODIFY `IsOnSale` tinyint(4) NOT NULL DEFAULT 0,
  MODIFY `IsPromoted` tinyint(4) NOT NULL DEFAULT 0,
  MODIFY `USDPrice` int(11) DEFAULT 0,
  MODIFY `USDPromoPrice` int(11) DEFAULT NULL,
  MODIFY `Credits` int(11) NOT NULL DEFAULT 0,
  MODIFY `Points` int(11) NOT NULL DEFAULT 0,
  MODIFY `Category` int(11) NOT NULL DEFAULT 0,
  MODIFY `Availability` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '[]' CHECK (json_valid(`Availability`)),
  MODIFY `IsDefault` tinyint(4) NOT NULL DEFAULT 0;
UPDATE `ShopBundles` SET `Id`=1 WHERE `Id` = 0 AND `Name` = 'Example Bundle';
INSERT INTO `ShopBundles` (`Id`, `ApplicationId`, `Name`, `ImageUrl`, `IconUrl`, `Description`, `IsOnSale`, `IsPromoted`, `USDPrice`, `USDPromoPrice`, `Credits`, `Points`, `Category`, `Availability`, `PromotionTag`, `MacAppStoreUniqueId`, `IosAppStoreUniqueId`, `AndroidStoreUniqueId`, `IsDefault`) VALUES ('0', '1', 'Signup Reward', NULL, NULL, NULL, 0, 0, NULL, NULL, '1000', '10000', '0', '[12]', NULL, NULL, NULL, NULL, '1');

UPDATE `CurrencyDeposits` SET `Cash`=0 WHERE `Cash` IS NULL;
UPDATE `CurrencyDeposits` SET `IsAdminAction`=0 WHERE `IsAdminAction` IS NULL;
UPDATE `CurrencyDeposits` SET `PaymentProviderId`=0 WHERE `PaymentProviderId` IS NULL;
UPDATE `CurrencyDeposits` SET `ApplicationId`=1 WHERE `ApplicationId` IS NULL;
UPDATE `CurrencyDeposits` SET `UsdAmount`=0 WHERE `UsdAmount` IS NULL;
ALTER TABLE `CurrencyDeposits`
  DROP FOREIGN KEY `CurrencyDeposits_ibfk_1`,
  DROP INDEX `Cmid`,
  DROP COLUMN `BundleName`,
  MODIFY `DepositDate` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  MODIFY `Credits` int(11) NOT NULL DEFAULT 0,
  MODIFY `Points` int(11) NOT NULL DEFAULT 0,
  MODIFY `Cash` decimal(10,0) NOT NULL DEFAULT 0,
  MODIFY `CurrencyLabel` varchar(255) DEFAULT NULL,
  MODIFY `Cmid` int(11) NOT NULL,
  MODIFY `IsAdminAction` tinyint(4) NOT NULL DEFAULT 0,
  MODIFY `PaymentProviderId` int(11) NOT NULL DEFAULT 0,
  MODIFY `TransactionKey` varchar(255) NOT NULL,
  MODIFY `ApplicationId` int(11) NOT NULL,
  MODIFY `ChannelId` int(11) NOT NULL,
  MODIFY `UsdAmount` decimal(10,0) NOT NULL DEFAULT 0;
ALTER TABLE `CurrencyDeposits`
  ADD KEY `CurrencyDeposits_ibfk_2` (`BundleId`),
  ADD KEY `CurrencyDeposits_ibfk_1` (`Cmid`),
  ADD CONSTRAINT `CurrencyDeposits_ibfk_1` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `CurrencyDeposits_ibfk_2` FOREIGN KEY (`BundleId`) REFERENCES `ShopBundles` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `DiscordUsers`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `DiscordUsers`
  DROP INDEX `Nonce`,
  MODIFY `DiscordUserId` varchar(255) DEFAULT NULL,
  MODIFY `Nonce` varchar(255) DEFAULT NULL,
  MODIFY `Completed` tinyint(4) NOT NULL DEFAULT 0;
ALTER TABLE `DiscordUsers`
  ADD UNIQUE KEY `DiscordUserId` (`DiscordUserId`),
  ADD UNIQUE KEY `Nonce` (`Nonce`);

ALTER TABLE `GameRooms`
  DROP COLUMN `ServerIp`,
  DROP COLUMN `ServerPort`,
  DROP COLUMN `ConnectedPlayers`,
  MODIFY `Name` varchar(18) NOT NULL,
  MODIFY `IsPasswordProtected` tinyint(4) NOT NULL DEFAULT 0,
  MODIFY `GameMode` int(11) NOT NULL,
  MODIFY `PlayerLimit` int(11) NOT NULL,
  MODIFY `TimeLimit` int(11) NOT NULL,
  MODIFY `KillLimit` int(11) NOT NULL,
  MODIFY `GameFlags` int(11) NOT NULL,
  MODIFY `MapID` int(11) NOT NULL,
  MODIFY `LevelMin` int(11) NOT NULL DEFAULT 0,
  MODIFY `LevelMax` int(11) NOT NULL DEFAULT 0,
  MODIFY `IsPermanentGame` tinyint(4) NOT NULL DEFAULT 0;
ALTER TABLE `GameRooms`
  ADD COLUMN `PhotonServerId` int(11) NOT NULL AFTER `Number`,
  ADD COLUMN `Password` varchar(255) DEFAULT NULL AFTER `Name`,
  ADD KEY `GameRooms_ibfk_2` (`PhotonServerId`),
  ADD KEY `GameRooms_ibfk_1` (`MapID`),
  ADD CONSTRAINT `GameRooms_ibfk_1` FOREIGN KEY (`MapID`) REFERENCES `Maps` (`MapId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `GameRooms_ibfk_2` FOREIGN KEY (`PhotonServerId`) REFERENCES `PhotonServers` (`PhotonId`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `GameSessions`
  DROP INDEX `Cmid`,
  DROP FOREIGN KEY `GameSessions_ibfk_1`,
  MODIFY `Cmid` int(11) NOT NULL;
ALTER TABLE `GameSessions`
  ADD COLUMN `Channel` int(11) NOT NULL AFTER `Cmid`,
  ADD KEY `GameSessions_ibfk_1` (`Cmid`),
  ADD CONSTRAINT `GameSessions_ibfk_1` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `GroupInvitations`
  DROP INDEX `InviterCmid`,
  DROP INDEX `GroupId`,
  DROP INDEX `InviteeCmid`,
  DROP FOREIGN KEY `GroupInvitations_ibfk_1`,
  DROP FOREIGN KEY `GroupInvitations_ibfk_2`,
  DROP FOREIGN KEY `GroupInvitations_ibfk_3`,
  DROP COLUMN `InviterName`,
  DROP COLUMN `GroupName`,
  DROP COLUMN `GroupTag`,
  DROP COLUMN `InviteeName`,
  MODIFY `InviterCmid` int(11) NOT NULL,
  MODIFY `GroupId` int(11) NOT NULL,
  MODIFY `InviteeCmid` int(11) NOT NULL,
  MODIFY `Message` text NOT NULL;
ALTER TABLE `GroupInvitations`
  ADD KEY `GroupInvitations_ibfk_1` (`InviterCmid`),
  ADD KEY `GroupInvitations_ibfk_2` (`GroupId`),
  ADD KEY `GroupInvitations_ibfk_3` (`InviteeCmid`),
  ADD CONSTRAINT `GroupInvitations_ibfk_1` FOREIGN KEY (`InviterCmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `GroupInvitations_ibfk_2` FOREIGN KEY (`GroupId`) REFERENCES `Clans` (`GroupId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `GroupInvitations_ibfk_3` FOREIGN KEY (`InviteeCmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE `ItemTransactions` SET `Credits`=0 WHERE `Credits` IS NULL;
UPDATE `ItemTransactions` SET `IsAdminAction`=0 WHERE `IsAdminAction` IS NULL;
UPDATE `ItemTransactions` SET `Points`=0 WHERE `Points` IS NULL;
ALTER TABLE `ItemTransactions`
  DROP INDEX `Cmid`,
  DROP FOREIGN KEY `ItemTransactions_ibfk_1`,
  MODIFY `WithdrawalDate` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  MODIFY `Points` int(11) NOT NULL DEFAULT 0,
  MODIFY `Credits` int(11) NOT NULL DEFAULT 0,
  MODIFY `Cmid` int(11) NOT NULL,
  MODIFY `IsAdminAction` tinyint(4) NOT NULL DEFAULT 0,
  MODIFY `ItemId` int(11) NOT NULL,
  MODIFY `Duration` int(11) NOT NULL;
ALTER TABLE `ItemTransactions`
  ADD KEY `ItemTransactions_ibfk_1` (`Cmid`),
  ADD CONSTRAINT `ItemTransactions_ibfk_1` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MapSettings`
  MODIFY `KillsMin` int(11) NOT NULL,
  MODIFY `KillsMax` int(11) NOT NULL,
  MODIFY `KillsCurrent` int(11) NOT NULL,
  MODIFY `PlayersMin` int(11) NOT NULL,
  MODIFY `PlayersMax` int(11) NOT NULL,
  MODIFY `PlayersCurrent` int(11) NOT NULL,
  MODIFY `TimeMin` int(11) NOT NULL,
  MODIFY `TimeMax` int(11) NOT NULL,
  MODIFY `TimeCurrent` int(11) NOT NULL;

UPDATE `Maps` SET `FileName` = '{\"4.3.10\":\"SpaceCity-39cc09a30cead812868d2ec3f39c43d7050f18d2-HD.unity3d\",\"4.7.1\":\"SpaceCity-39cc09a30cead812868d2ec3f39c43d7050f18d2-HD.unity3d\"}' WHERE `Maps`.`MapId` = 64;
UPDATE `Maps` SET `FileName` = '{\"4.3.10\":\"SpacePortAlpha-f5a000d702f88da661050a3741e4c10000f277e8-HD.unity3d\",\"4.7.1\":\"SpacePortAlpha-f5a000d702f88da661050a3741e4c10000f277e8-HD.unity3d\"}' WHERE `Maps`.`MapId` = 65;
UPDATE `Maps` SET `FileName` = '{\"4.3.10\":\"UberZone-3d65324112d322a4dc2a155c9795d4b7ec08ee3a-HD.unity3d\",\"4.7.1\":\"UberZone-3d65324112d322a4dc2a155c9795d4b7ec08ee3a-HD.unity3d\"}' WHERE `Maps`.`MapId` = 66;
ALTER TABLE `Maps`
  DROP COLUMN `ParadiseFileName`,
  MODIFY `DisplayName` varchar(255) NOT NULL,
  MODIFY `Description` text NOT NULL,
  MODIFY `SceneName` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`SceneName`)),
  MODIFY `IsBlueBox` tinyint(4) NOT NULL,
  MODIFY `FileName` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`FileName`));

ALTER TABLE `MemberWallets`
  MODIFY `Credits` int(11) NOT NULL DEFAULT 0,
  MODIFY `Points` int(11) NOT NULL DEFAULT 0;

ALTER TABLE `ModerationActions`
  DROP INDEX `SourceCmid`,
  DROP INDEX `TargetCmid`,
  DROP FOREIGN KEY `ModerationActions_ibfk_1`,
  DROP FOREIGN KEY `ModerationActions_ibfk_2`,
  DROP COLUMN `SourceName`,
  DROP COLUMN `TargetName`,
  MODIFY `ModerationFlag` int(11) NOT NULL,
  MODIFY `SourceCmid` int(11) NOT NULL,
  MODIFY `TargetCmid` int(11) NOT NULL,
  MODIFY `ActionDate` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  MODIFY `Reason` text NOT NULL;
ALTER TABLE `ModerationActions`
  ADD KEY `ModerationActions_ibfk_1` (`SourceCmid`),
  ADD KEY `ModerationActions_ibfk_2` (`TargetCmid`),
  ADD CONSTRAINT `ModerationActions_ibfk_1` FOREIGN KEY (`SourceCmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ModerationActions_ibfk_2` FOREIGN KEY (`TargetCmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PhotonServers`
  MODIFY `IP` varchar(255) NOT NULL,
  MODIFY `Port` int(11) NOT NULL AFTER `IP`,
  MODIFY `Name` varchar(255) NOT NULL,
  MODIFY `Region` int(11) NOT NULL,
  MODIFY `UsageType` int(11) NOT NULL,
  MODIFY `Guid` varchar(36) NOT NULL AFTER `PhotonId`;
ALTER TABLE `PhotonServers`
  ADD COLUMN `Passphrase` varchar(255) NOT NULL AFTER `Guid`,
  ADD COLUMN `Enabled` tinyint(4) NOT NULL DEFAULT 1 AFTER `Name`,
  ADD COLUMN `ApiVersion` varchar(255) NOT NULL AFTER `Enabled`;

ALTER TABLE `PlayerInventoryItems`
  MODIFY `AmountRemaining` int(11) NOT NULL DEFAULT 0;

ALTER TABLE `PlayerLoadouts`
  MODIFY `Type` int(11) DEFAULT 0;

ALTER TABLE `PlayerMachines`
  DROP PRIMARY KEY,
  DROP INDEX `Cmid`,
  DROP FOREIGN KEY `PlayerMachines_ibfk_1`,
  MODIFY `Cmid` int(11) NOT NULL FIRST,
  MODIFY `SystemDeviceType` varchar(255) DEFAULT NULL,
  MODIFY `SystemCoreCount` varchar(255) DEFAULT NULL,
  RENAME COLUMN `SystemProcessorType` TO `SystemProcessorModel`,
  RENAME COLUMN `GPUModelID` TO `GPUDeviceID`;
ALTER TABLE `PlayerMachines`
  ADD COLUMN `SystemVendor` varchar(255) DEFAULT NULL AFTER `SystemIdentifier`,
  ADD COLUMN `SystemProcessorVendor` varchar(255) DEFAULT NULL AFTER `SystemOperatingSystem`,
  ADD COLUMN `SystemThreadCount` varchar(255) DEFAULT NULL AFTER `SystemCoreCount`,
  ADD COLUMN `ClientVersion` varchar(255) DEFAULT NULL,
  ADD COLUMN `ParadiseVersion` varchar(255) DEFAULT NULL,
  ADD COLUMN `ParadiseBuild` varchar(255) DEFAULT NULL,
  ADD PRIMARY KEY (`Cmid`,`SystemIdentifier`),
  ADD CONSTRAINT `PlayerMachines_ibfk_1` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE `PlayerStatistics` SET `Xp`=0 WHERE `Xp` IS NULL;
UPDATE `PlayerStatistics` SET `Level`=0 WHERE `Level` IS NULL;
ALTER TABLE `PlayerStatistics`
  MODIFY `Xp` int(11) NOT NULL DEFAULT 0,
  MODIFY `Level` int(11) NOT NULL DEFAULT 0,
  MODIFY `PersonalRecord` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`PersonalRecord`)),
  MODIFY `WeaponStatistics` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`WeaponStatistics`));

ALTER TABLE `PointDeposits`
  DROP INDEX `Cmid`,
  DROP FOREIGN KEY `PointDeposits_ibfk_1`,
  MODIFY `DepositDate` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  MODIFY `Points` int(11) NOT NULL DEFAULT 0,
  MODIFY `Cmid` int(11) NOT NULL DEFAULT 0,
  MODIFY `IsAdminAction` tinyint(4) NOT NULL DEFAULT 0,
  MODIFY `DepositType` int(11) NOT NULL;
ALTER TABLE `PointDeposits`
  ADD KEY `PointDeposits_ibfk_1` (`Cmid`),
  ADD CONSTRAINT `PointDeposits_ibfk_1` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PrivateMessages`
  DROP INDEX `FromCmid`,
  DROP INDEX `ToCmid`,
  DROP FOREIGN KEY `PrivateMessages_ibfk_1`,
  DROP FOREIGN KEY `PrivateMessages_ibfk_2`,
  DROP COLUMN `FromName`,
  MODIFY `FromCmid` int(11) NOT NULL,
  MODIFY `ToCmid` int(11) NOT NULL,
  MODIFY `DateSent` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  MODIFY `ContentText` text NOT NULL,
  MODIFY `IsRead` tinyint(4) NOT NULL DEFAULT 0,
  MODIFY `HasAttachment` tinyint(4) NOT NULL DEFAULT 0,
  MODIFY `IsDeletedBySender` tinyint(4) NOT NULL DEFAULT 0,
  MODIFY `IsDeletedByReceiver` tinyint(4) NOT NULL DEFAULT 0;
ALTER TABLE `PrivateMessages`
  ADD KEY `PrivateMessages_ibfk_1` (`FromCmid`),
  ADD KEY `PrivateMessages_ibfk_2` (`ToCmid`),
  ADD CONSTRAINT `PrivateMessages_ibfk_1` FOREIGN KEY (`FromCmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `PrivateMessages_ibfk_2` FOREIGN KEY (`ToCmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PublicProfiles`
  DROP COLUMN `GroupTag`,
  MODIFY `Name` varchar(18) NOT NULL,
  MODIFY `IsChatDisabled` tinyint(4) NOT NULL DEFAULT 0,
  MODIFY `AccessLevel` int(11) NOT NULL DEFAULT 0,
  MODIFY `LastLoginDate` datetime NOT NULL,
  MODIFY `EmailAddressStatus` int(11) NOT NULL DEFAULT 1;

ALTER TABLE `ShopBundleItems`
  DROP INDEX `BundleId`,
  DROP FOREIGN KEY `ShopBundleItems_ibfk_1`,
  MODIFY `id` int(11) NOT NULL,
  MODIFY `BundleId` int(11) NOT NULL,
  MODIFY `ItemId` int(11) NOT NULL,
  MODIFY `Amount` int(11) NOT NULL DEFAULT 1,
  MODIFY `Duration` int(11) NOT NULL;
ALTER TABLE `ShopBundleItems` AUTO_INCREMENT=0;
ALTER TABLE `ShopBundleItems`
  ADD KEY `ShopBundleItems_ibfk_1` (`BundleId`),
  ADD CONSTRAINT `ShopBundleItems_ibfk_1` FOREIGN KEY (`BundleId`) REFERENCES `ShopBundles` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE `ShopFunctionalItems` SET `LevelLock`=0 WHERE `LevelLock` IS NULL;
UPDATE `ShopFunctionalItems` SET `IsConsumable`=0 WHERE `IsConsumable` IS NULL;
UPDATE `ShopFunctionalItems` SET `ShopHighlightType`=0 WHERE `ShopHighlightType` IS NULL;
ALTER TABLE `ShopFunctionalItems`
  MODIFY `Name` varchar(255) NOT NULL,
  MODIFY `Description` text DEFAULT NULL,
  MODIFY `LevelLock` int(11) NOT NULL DEFAULT 0,
  MODIFY `IsConsumable` tinyint(4) NOT NULL DEFAULT 0,
  MODIFY `ShopHighlightType` int(11) NOT NULL DEFAULT 0,
  MODIFY `CustomProperties` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`CustomProperties`)),
  MODIFY `ItemProperties` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`ItemProperties`));

UPDATE `ShopGearItems` SET `LevelLock`=0 WHERE `LevelLock` IS NULL;
UPDATE `ShopGearItems` SET `IsConsumable`=0 WHERE `IsConsumable` IS NULL;
UPDATE `ShopGearItems` SET `ShopHighlightType`=0 WHERE `ShopHighlightType` IS NULL;
UPDATE `ShopGearItems` SET `ArmorAbsorptionPercent`=0 WHERE `ArmorAbsorptionPercent` IS NULL;
UPDATE `ShopGearItems` SET `ArmorPoints`=0 WHERE `ArmorPoints` IS NULL;
UPDATE `ShopGearItems` SET `ArmorWeight`=0 WHERE `ArmorWeight` IS NULL;
ALTER TABLE `ShopGearItems`
  MODIFY `Name` varchar(255) NOT NULL,
  MODIFY `Description` text DEFAULT NULL,
  MODIFY `LevelLock` int(11) NOT NULL DEFAULT 0,
  MODIFY `IsConsumable` tinyint(4) NOT NULL DEFAULT 0,
  MODIFY `ShopHighlightType` int(11) NOT NULL DEFAULT 0,
  MODIFY `CustomProperties` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`CustomProperties`)),
  MODIFY `ItemProperties` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`ItemProperties`)),
  MODIFY `ArmorPoints` int(11) NOT NULL DEFAULT 0,
  MODIFY `ArmorWeight` int(11) NOT NULL DEFAULT 0,
  MODIFY `ArmorAbsorptionPercent` int(11) NOT NULL DEFAULT 0;

UPDATE `ShopItemPrices` SET `Discount`=0 WHERE `Discount` IS NULL;
UPDATE `ShopItemPrices` SET `PackType`=0 WHERE `PackType` IS NULL;
ALTER TABLE `ShopItemPrices`
  MODIFY `Price` int(11) NOT NULL DEFAULT 0,
  MODIFY `Currency` int(11) NOT NULL DEFAULT 0,
  MODIFY `Discount` int(11) NOT NULL DEFAULT 0,
  MODIFY `Amount` int(11) NOT NULL DEFAULT 1,
  MODIFY `PackType` int(11) NOT NULL DEFAULT 0,
  MODIFY `Duration` int(11) NOT NULL DEFAULT 0;
ALTER TABLE `ShopItemPrices`
  ADD COLUMN `FunctionalItemID` int(11) DEFAULT NULL,
  ADD COLUMN `GearItemID` int(11) DEFAULT NULL,
  ADD COLUMN `QuickItemID` int(11) DEFAULT NULL,
  ADD COLUMN `WeaponItemID` int(11) DEFAULT NULL,
  ADD KEY `ShopItemPrices_ibfk_1` (`FunctionalItemID`),
  ADD KEY `ShopItemPrices_ibfk_2` (`GearItemID`),
  ADD KEY `ShopItemPrices_ibfk_3` (`QuickItemID`),
  ADD KEY `ShopItemPrices_ibfk_4` (`WeaponItemID`),
  ADD CONSTRAINT `ShopItemPrices_ibfk_1` FOREIGN KEY (`FunctionalItemID`) REFERENCES `ShopFunctionalItems` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ShopItemPrices_ibfk_2` FOREIGN KEY (`GearItemID`) REFERENCES `ShopGearItems` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ShopItemPrices_ibfk_3` FOREIGN KEY (`QuickItemID`) REFERENCES `ShopQuickItems` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ShopItemPrices_ibfk_4` FOREIGN KEY (`WeaponItemID`) REFERENCES `ShopWeaponItems` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE `ShopQuickItems` SET `LevelLock`=0 WHERE `LevelLock` IS NULL;
UPDATE `ShopQuickItems` SET `IsConsumable`=0 WHERE `IsConsumable` IS NULL;
UPDATE `ShopQuickItems` SET `ShopHighlightType`=0 WHERE `ShopHighlightType` IS NULL;
ALTER TABLE `ShopQuickItems`
  MODIFY `Name` varchar(255) NOT NULL,
  MODIFY `Description` text DEFAULT NULL,
  MODIFY `LevelLock` int(11) NOT NULL DEFAULT 0,
  MODIFY `IsConsumable` tinyint(4) NOT NULL DEFAULT 0,
  MODIFY `ShopHighlightType` int(11) NOT NULL DEFAULT 0,
  MODIFY `CustomProperties` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`CustomProperties`)),
  MODIFY `ItemProperties` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`ItemProperties`));

UPDATE `ShopWeaponItems` SET `LevelLock`=0 WHERE `LevelLock` IS NULL;
UPDATE `ShopWeaponItems` SET `IsConsumable`=0 WHERE `IsConsumable` IS NULL;
UPDATE `ShopWeaponItems` SET `ShopHighlightType`=0 WHERE `ShopHighlightType` IS NULL;
ALTER TABLE `ShopWeaponItems`
  MODIFY `Name` varchar(255) NOT NULL,
  MODIFY `Description` text DEFAULT NULL,
  MODIFY `LevelLock` int(11) NOT NULL DEFAULT 0,
  MODIFY `IsConsumable` tinyint(4) NOT NULL DEFAULT 0,
  MODIFY `ShopHighlightType` int(11) NOT NULL DEFAULT 0,
  MODIFY `CustomProperties` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`CustomProperties`)),
  MODIFY `ItemProperties` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`ItemProperties`)),
  MODIFY `HasAutomaticFire` tinyint(4) DEFAULT NULL;

ALTER TABLE `SteamMembers`
  DROP KEY `Cmid`,
  DROP FOREIGN KEY `SteamMembers_ibfk_1`,
  MODIFY `Cmid` int(11) NOT NULL;
ALTER TABLE `SteamMembers`
  ADD UNIQUE KEY `Cmid` (`Cmid`),
  ADD CONSTRAINT `SteamMembers_ibfk_1` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `UserAccounts`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `UserAccounts`
  MODIFY `EmailAddress` varchar(255) NOT NULL,
  MODIFY `Password` varchar(255) NOT NULL,
  MODIFY `Channel` int(11) NOT NULL,
  MODIFY `Locale` varchar(255) DEFAULT NULL,
  MODIFY `TutorialStep` int(11) NOT NULL DEFAULT 1;
ALTER TABLE `UserAccounts`
  ADD CONSTRAINT `UserAccounts_ibfk_1` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;