ALTER TABLE `ActivePlayers`
  DROP FOREIGN KEY `ActivePlayers_ibfk_1`,
  MODIFY COLUMN `Channel` int(11) NOT NULL,
  ADD CONSTRAINT `FK_9172ac1ba62b1de0ac9d87717d1`
    FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_058ffc10ec30d30a06ded3cd5ea`
    FOREIGN KEY (`CommServerId`) REFERENCES `PhotonServers` (`PhotonId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_6c29a29bfce5df53d1a6729c4d6`
    FOREIGN KEY (`GameServerId`) REFERENCES `PhotonServers` (`PhotonId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_a3651ba3786e41f2fbacc0cf1c3`
    FOREIGN KEY (`GameRoomId`) REFERENCES `GameRooms` (`Number`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD INDEX `FK_058ffc10ec30d30a06ded3cd5ea` (`CommServerId`),
  ADD INDEX `FK_6c29a29bfce5df53d1a6729c4d6` (`GameServerId`),
  ADD INDEX `FK_a3651ba3786e41f2fbacc0cf1c3` (`GameRoomId`);

UPDATE `ApplicationConfiguration` SET `MaxXp`=1584350 WHERE `ApplicationId`=1 AND `MaxXp` IS NULL;
ALTER TABLE `ApplicationConfiguration`
  MODIFY COLUMN `XpRequiredPerLevel` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`XpRequiredPerLevel`)),
  MODIFY COLUMN `MaxLevel` int(11) NOT NULL,
  MODIFY COLUMN `MaxXp` int(11) NOT NULL,
  MODIFY COLUMN `XpKill` int(11) NOT NULL,
  MODIFY COLUMN `XpSmackdown` int(11) NOT NULL,
  MODIFY COLUMN `XpHeadshot` int(11) NOT NULL,
  MODIFY COLUMN `XpNutshot` int(11) NOT NULL,
  MODIFY COLUMN `XpPerMinuteLoser` int(11) NOT NULL,
  MODIFY COLUMN `XpPerMinuteWinner` int(11) NOT NULL,
  MODIFY COLUMN `XpBaseLoser` int(11) NOT NULL,
  MODIFY COLUMN `XpBaseWinner` int(11) NOT NULL,
  MODIFY COLUMN `PointsKill` int(11) NOT NULL,
  MODIFY COLUMN `PointsSmackdown` int(11) NOT NULL,
  MODIFY COLUMN `PointsHeadshot` int(11) NOT NULL,
  MODIFY COLUMN `PointsNutshot` int(11) NOT NULL,
  MODIFY COLUMN `PointsPerMinuteLoser` int(11) NOT NULL,
  MODIFY COLUMN `PointsPerMinuteWinner` int(11) NOT NULL,
  MODIFY COLUMN `PointsBaseLoser` int(11) NOT NULL,
  MODIFY COLUMN `PointsBaseWinner` int(11) NOT NULL;

ALTER TABLE `ClanMembers`
  DROP PRIMARY KEY,
  DROP INDEX `Cmid`,
  DROP FOREIGN KEY `ClanMembers_ibfk_1`,
  DROP COLUMN `Name`,
  MODIFY `Cmid` int(11) NOT NULL FIRST,
  MODIFY `Position` int(11) NOT NULL DEFAULT 2,
  MODIFY `JoiningDate` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  MODIFY `Lastlogin` datetime NOT NULL,
  ADD PRIMARY KEY (`Cmid`),
  ADD KEY `FK_9accaf4f3326f54d3a77e21feff` (`GroupId`),
  ADD CONSTRAINT `FK_011d6c7d16c556266d633434026` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_9accaf4f3326f54d3a77e21feff` FOREIGN KEY (`GroupId`) REFERENCES `Clans` (`GroupId`) ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE `Clans` SET `ColorStyle`=0 WHERE `ColorStyle` IS NULL;
UPDATE `Clans` SET `FontStyle`=0 WHERE `FontStyle` IS NULL;
ALTER TABLE `Clans`
  DROP INDEX `Name`,
  DROP FOREIGN KEY `Clans_ibfk_1`,
  DROP COLUMN `MembersCount`,
  DROP COLUMN `Cmid`,
  DROP COLUMN `OwnerName`,
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
  MODIFY `OwnerCmid` int(11) NOT NULL,
  ADD UNIQUE KEY `IDX_3976131461bb1a52c3b5be93e9` (`Name`),
  ADD UNIQUE KEY `IDX_1115f40bc40ab1a51e0b27fa9d` (`Tag`),
  ADD UNIQUE KEY `IDX_f13144fd9f8dab54a1673598df` (`OwnerCmid`),
  ADD CONSTRAINT `FK_f13144fd9f8dab54a1673598dfa` FOREIGN KEY (`OwnerCmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE `ContactRequests` SET `Status`=0 WHERE `Status` IS NULL;
ALTER TABLE `ContactRequests`
  DROP INDEX `InitiatorCmid`,
  DROP INDEX `ReceiverCmid`,
  DROP FOREIGN KEY `ContactRequests_ibfk_1`,
  DROP FOREIGN KEY `ContactRequests_ibfk_2`,
  DROP COLUMN `InitiatorName`,
  MODIFY `InitiatorCmid` int(11) NOT NULL,
  MODIFY `ReceiverCmid` int(11) NOT NULL,
  MODIFY `InitiatorMessage` text NOT NULL,
  MODIFY `Status` int(11) NOT NULL DEFAULT 0,
  MODIFY `SentDate` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  ADD INDEX `FK_c6a95f753621584f67b8331d968` (`InitiatorCmid`),
  ADD INDEX `FK_403b8193c87bd4889353756c129` (`ReceiverCmid`),
  ADD CONSTRAINT `FK_c6a95f753621584f67b8331d968` FOREIGN KEY (`InitiatorCmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_403b8193c87bd4889353756c129` FOREIGN KEY (`ReceiverCmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE `CurrencyDeposits` SET `Cash`=0 WHERE `Cash` IS NULL;
UPDATE `CurrencyDeposits` SET `IsAdminAction`=0 WHERE `IsAdminAction` IS NULL;
UPDATE `CurrencyDeposits` SET `PaymentProviderId`=0 WHERE `PaymentProviderId` IS NULL;
UPDATE `CurrencyDeposits` SET `ApplicationId`=1 WHERE `ApplicationId` IS NULL;
UPDATE `CurrencyDeposits` SET `UsdAmount`=0 WHERE `UsdAmount` IS NULL;
ALTER TABLE `CurrencyDeposits`
  DROP INDEX `Cmid`,
  DROP FOREIGN KEY `CurrencyDeposits_ibfk_1`,
  DROP COLUMN `BundleName`,
  MODIFY `DepositDate` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  MODIFY `Credits` int(11) NOT NULL DEFAULT 0,
  MODIFY `Points` int(11) NOT NULL DEFAULT 0,
  MODIFY `Cash` decimal(10,0) NOT NULL DEFAULT 0,
  MODIFY `Cmid` int(11) NOT NULL,
  MODIFY `IsAdminAction` tinyint(4) NOT NULL DEFAULT 0,
  MODIFY `PaymentProviderId` int(11) NOT NULL DEFAULT 0,
  MODIFY `TransactionKey` varchar(255) NOT NULL,
  MODIFY `ApplicationId` int(11) NOT NULL,
  MODIFY `ChannelId` int(11) NOT NULL,
  MODIFY `UsdAmount` decimal(10,0) NOT NULL DEFAULT 0,
  ADD KEY `FK_ce92a61c9314358366fb7dc2972` (`Cmid`),
  ADD KEY `FK_a4900913d76ac786d425b261152` (`BundleId`),
  ADD CONSTRAINT `FK_a4900913d76ac786d425b261152` FOREIGN KEY (`BundleId`) REFERENCES `ShopBundles` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_ce92a61c9314358366fb7dc2972` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `DiscordUsers`
  DROP INDEX `Nonce`,
  DROP FOREIGN KEY `DiscordUsers_ibfk_1`,
  MODIFY `Nonce` varchar(255) DEFAULT NULL,
  MODIFY `Completed` tinyint(4) NOT NULL DEFAULT 0,
  ADD UNIQUE KEY `IDX_1bd6093097dd257502a5c48f58` (`DiscordUserId`),
  ADD UNIQUE KEY `IDX_1061e172f3ecbc003bf8cdff0a` (`Nonce`),
  ADD CONSTRAINT `FK_d5edf8a304788f3864e43686610` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

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
  MODIFY `IsPermanentGame` tinyint(4) NOT NULL DEFAULT 0,
  ADD COLUMN `PhotonServerId` int(11) NOT NULL AFTER `Number`,
  ADD COLUMN `Password` varchar(255) DEFAULT NULL AFTER `Name`,
  ADD KEY `FK_e49fa14d4bf573ff080cc1880bb` (`PhotonServerId`),
  ADD KEY `FK_8a1b1b09091fbe0ecc441e5aea6` (`MapID`),
  ADD CONSTRAINT `FK_8a1b1b09091fbe0ecc441e5aea6` FOREIGN KEY (`MapID`) REFERENCES `Maps` (`MapId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_e49fa14d4bf573ff080cc1880bb` FOREIGN KEY (`PhotonServerId`) REFERENCES `PhotonServers` (`PhotonId`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `GameSessions`
  DROP INDEX `Cmid`,
  DROP FOREIGN KEY `GameSessions_ibfk_1`,
  MODIFY `Cmid` int(11) NOT NULL,
  ADD COLUMN `Channel` int(11) NOT NULL AFTER `Cmid`,
  ADD KEY `FK_9f643db350272daf741470ed6f7` (`Cmid`),
  ADD CONSTRAINT `FK_9f643db350272daf741470ed6f7` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

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
  MODIFY `Message` text NOT NULL,
  ADD KEY `FK_47aafb15c4f734a6deff97728aa` (`InviterCmid`),
  ADD KEY `FK_a3abba37559fdab5b3742205ed6` (`GroupId`),
  ADD KEY `FK_d1991257f3cc450ba158bd95e3e` (`InviteeCmid`),
  ADD CONSTRAINT `FK_47aafb15c4f734a6deff97728aa` FOREIGN KEY (`InviterCmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_a3abba37559fdab5b3742205ed6` FOREIGN KEY (`GroupId`) REFERENCES `Clans` (`GroupId`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_d1991257f3cc450ba158bd95e3e` FOREIGN KEY (`InviteeCmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

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
  MODIFY `Duration` int(11) NOT NULL,
  ADD KEY `FK_c58cb8b3961108149a964636944` (`Cmid`),
  ADD CONSTRAINT `FK_c58cb8b3961108149a964636944` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MapSettings`
  DROP FOREIGN KEY `MapSettings_ibfk_1`,
  MODIFY `KillsMin` int(11) NOT NULL,
  MODIFY `KillsMax` int(11) NOT NULL,
  MODIFY `KillsCurrent` int(11) NOT NULL,
  MODIFY `PlayersMin` int(11) NOT NULL,
  MODIFY `PlayersMax` int(11) NOT NULL,
  MODIFY `PlayersCurrent` int(11) NOT NULL,
  MODIFY `TimeMin` int(11) NOT NULL,
  MODIFY `TimeMax` int(11) NOT NULL,
  MODIFY `TimeCurrent` int(11) NOT NULL,
  ADD CONSTRAINT `FK_4e26a349e1617c2eca5b58a0ffb` FOREIGN KEY (`MapId`) REFERENCES `Maps` (`MapId`) ON DELETE CASCADE ON UPDATE CASCADE;

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
  DROP FOREIGN KEY `MemberWallets_ibfk_1`,
  MODIFY `Credits` int(11) NOT NULL DEFAULT 0,
  MODIFY `Points` int(11) NOT NULL DEFAULT 0,
  ADD CONSTRAINT `FK_562e6a2e181137f50346db98413` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

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
  MODIFY `Reason` text NOT NULL,
  ADD KEY `FK_8d45e979b6bdc6183a2342c7553` (`SourceCmid`),
  ADD KEY `FK_3a1a62c93b3e2344d7daf770903` (`TargetCmid`),
  ADD CONSTRAINT `FK_3a1a62c93b3e2344d7daf770903` FOREIGN KEY (`TargetCmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_8d45e979b6bdc6183a2342c7553` FOREIGN KEY (`SourceCmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PhotonServers`
  MODIFY `IP` varchar(255) NOT NULL,
  MODIFY `Port` int(11) NOT NULL AFTER `IP`,
  MODIFY `Name` varchar(255) NOT NULL,
  MODIFY `Region` int(11) NOT NULL,
  MODIFY `UsageType` int(11) NOT NULL,
  MODIFY `Guid` varchar(36) NOT NULL AFTER `PhotonId`,
  ADD COLUMN `Passphrase` varchar(255) NOT NULL AFTER `Guid`,
  ADD COLUMN `Enabled` tinyint(4) NOT NULL DEFAULT 1 AFTER `Name`,
  ADD COLUMN `ApiVersion` varchar(255) NOT NULL AFTER `Enabled`;

ALTER TABLE `PlayerInventoryItems`
  DROP FOREIGN KEY `PlayerInventoryItems_ibfk_1`,
  MODIFY `AmountRemaining` int(11) NOT NULL DEFAULT 0,
  ADD CONSTRAINT `FK_57d2dd36d7e513f782982717570` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PlayerLoadouts`
  DROP FOREIGN KEY `PlayerLoadouts_ibfk_1`,
  MODIFY `Type` int(11) DEFAULT 0,
  ADD CONSTRAINT `FK_d88acdc55d79a666ee66f2975f7` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PlayerMachines`
  DROP PRIMARY KEY,
  DROP INDEX `Cmid`,
  DROP FOREIGN KEY `PlayerMachines_ibfk_1`,
  MODIFY `Cmid` int(11) NOT NULL FIRST,
  MODIFY `SystemDeviceType` varchar(255) DEFAULT NULL,
  MODIFY `SystemCoreCount` varchar(255) DEFAULT NULL,
  RENAME COLUMN `SystemProcessorType` TO `SystemProcessorModel`,
  RENAME COLUMN `GPUModelID` TO `GPUDeviceID`,
  ADD COLUMN `SystemVendor` varchar(255) DEFAULT NULL AFTER `SystemIdentifier`,
  ADD COLUMN `SystemProcessorVendor` varchar(255) DEFAULT NULL AFTER `SystemOperatingSystem`,
  ADD COLUMN `SystemThreadCount` varchar(255) DEFAULT NULL AFTER `SystemCoreCount`,
  ADD COLUMN `ClientVersion` varchar(255) DEFAULT NULL,
  ADD COLUMN `ParadiseVersion` varchar(255) DEFAULT NULL,
  ADD COLUMN `ParadiseBuild` varchar(255) DEFAULT NULL,
  ADD PRIMARY KEY (`Cmid`,`SystemIdentifier`),
  ADD CONSTRAINT `FK_2a8baa4a4575878b7b0b9192ad9` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE `PlayerStatistics` SET `Xp`=0 WHERE `Xp` IS NULL;
UPDATE `PlayerStatistics` SET `Level`=0 WHERE `Level` IS NULL;
ALTER TABLE `PlayerStatistics`
  DROP FOREIGN KEY `PlayerStatistics_ibfk_1`,
  MODIFY `Xp` int(11) NOT NULL DEFAULT 0,
  MODIFY `Level` int(11) NOT NULL DEFAULT 0,
  MODIFY `PersonalRecord` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`PersonalRecord`)),
  MODIFY `WeaponStatistics` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`WeaponStatistics`)),
  ADD CONSTRAINT `FK_a4bbd6f4c3ee5327dee8b955833` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PointDeposits`
  DROP INDEX `Cmid`,
  DROP FOREIGN KEY `PointDeposits_ibfk_1`,
  MODIFY `DepositDate` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  MODIFY `Points` int(11) NOT NULL DEFAULT 0,
  MODIFY `Cmid` int(11) NOT NULL DEFAULT 0,
  MODIFY `IsAdminAction` tinyint(4) NOT NULL DEFAULT 0,
  MODIFY `DepositType` int(11) NOT NULL,
  ADD KEY `FK_a77255f3b0f6b803b4b36afa285` (`Cmid`),
  ADD CONSTRAINT `FK_a77255f3b0f6b803b4b36afa285` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

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
  MODIFY `IsDeletedByReceiver` tinyint(4) NOT NULL DEFAULT 0,
  ADD KEY `FK_2ff5646b5811c95f3242b7e0b0b` (`FromCmid`),
  ADD KEY `FK_14b3aa9d9bb63c2587154e817ab` (`ToCmid`),
  ADD CONSTRAINT `FK_14b3aa9d9bb63c2587154e817ab` FOREIGN KEY (`ToCmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_2ff5646b5811c95f3242b7e0b0b` FOREIGN KEY (`FromCmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

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
  MODIFY `Duration` int(11) NOT NULL,
  ADD KEY `FK_94f89da4f3ac28389891cebb87d` (`BundleId`),
  ADD CONSTRAINT `FK_94f89da4f3ac28389891cebb87d` FOREIGN KEY (`BundleId`) REFERENCES `ShopBundles` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ShopBundles`
  MODIFY `ApplicationId` int(11) NOT NULL,
  MODIFY `Name` varchar(255) NOT NULL,
  MODIFY `IsOnSale` tinyint(4) NOT NULL DEFAULT 0,
  MODIFY `IsPromoted` tinyint(4) NOT NULL DEFAULT 0,
  MODIFY `USDPrice` int(11) DEFAULT 0,
  MODIFY `USDPromoPrice` int(11) DEFAULT NULL,
  MODIFY `Credits` int(11) NOT NULL DEFAULT 0,
  MODIFY `Points` int(11) NOT NULL DEFAULT 0,
  MODIFY `Category` int(11) NOT NULL DEFAULT 0,
  MODIFY `Availability` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '[]' CHECK (json_valid(`Availability`)),
  MODIFY `IsDefault` tinyint(4) NOT NULL DEFAULT 0;

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
  MODIFY `Duration` int(11) NOT NULL DEFAULT 0,
  ADD COLUMN `FunctionalItemID` int(11) DEFAULT NULL,
  ADD COLUMN `GearItemID` int(11) DEFAULT NULL,
  ADD COLUMN `QuickItemID` int(11) DEFAULT NULL,
  ADD COLUMN `WeaponItemID` int(11) DEFAULT NULL,
  ADD KEY `FK_8a3f91abc2e736970a59d0edd50` (`FunctionalItemID`),
  ADD KEY `FK_96d61b6c279bb4e1f7bec5028de` (`GearItemID`),
  ADD KEY `FK_c2fa20bcf5e3b22dd8c9e100012` (`QuickItemID`),
  ADD KEY `FK_8f80515f0b8c8d3f84ead37d96c` (`WeaponItemID`),
  ADD CONSTRAINT `FK_8a3f91abc2e736970a59d0edd50` FOREIGN KEY (`FunctionalItemID`) REFERENCES `ShopFunctionalItems` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_8f80515f0b8c8d3f84ead37d96c` FOREIGN KEY (`WeaponItemID`) REFERENCES `ShopWeaponItems` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_96d61b6c279bb4e1f7bec5028de` FOREIGN KEY (`GearItemID`) REFERENCES `ShopGearItems` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_c2fa20bcf5e3b22dd8c9e100012` FOREIGN KEY (`QuickItemID`) REFERENCES `ShopQuickItems` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE;

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
  MODIFY `Cmid` int(11) NOT NULL,
  ADD UNIQUE KEY `IDX_fa989cc903927a0c125e4fa424` (`Cmid`),
  ADD CONSTRAINT `FK_fa989cc903927a0c125e4fa4248` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `UserAccounts`
  MODIFY `EmailAddress` varchar(255) NOT NULL,
  MODIFY `Password` varchar(255) NOT NULL,
  MODIFY `Channel` int(11) NOT NULL,
  MODIFY `TutorialStep` int(11) NOT NULL DEFAULT 1,
  ADD CONSTRAINT `FK_b8e28f359cc2ac5f55f808fb754` FOREIGN KEY (`Cmid`) REFERENCES `PublicProfiles` (`Cmid`) ON DELETE CASCADE ON UPDATE CASCADE;