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

import ParadiseService from '@/ParadiseService';
import { XpPointsUtil } from '@/utils';
import { ApiVersion } from '@/utils/enums';
import {
  ItemTransaction,
  Map,
  MemberWallet,
  PlayerInventoryItem,
  PlayerStatistics,
  PublicProfile,
  ShopBundle,
  ShopFunctionalItem,
  ShopGearItem,
  ShopItemPrice,
  ShopQuickItem,
  ShopWeaponItem,
  UserAccount
} from '@festivaldev/paradise-models';
import {
  BundleCategoryType,
  BundleView,
  BuyItemResult,
  BuyingDurationType,
  BuyingLocationType,
  BuyingRecommendationType,
  ChannelType,
  MemberAccessLevel,
  PackType,
  UberStrikeCurrencyType
} from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import {
  UberStrikeItemShopClientView,
  type UberStrikeItemFunctionalView,
  type UberStrikeItemGearView,
  type UberStrikeItemQuickView,
  type UberStrikeItemWeaponView
} from '@festivaldev/uberstrike-js/UberStrike/Core/Models/Views';
import {
  EnumProxy,
  Int32Proxy,
  ListProxy,
  StringProxy
} from '@festivaldev/uberstrike-js/UberStrike/Core/Serialization';
import {
  BundleViewProxy,
  LuckyDrawUnityViewProxy,
  MysteryBoxUnityViewProxy,
  UberStrikeItemShopClientViewProxy
} from '@festivaldev/uberstrike-js/UberStrike/Core/Serialization/Legacy';
import { UberstrikeItemType } from '@festivaldev/uberstrike-js/UberStrike/Core/Types';
import { add } from 'date-fns';
import { IsNull, MoreThan, Or } from 'typeorm';
import BaseWebService from '../BaseWebService';

export default class ShopWebService extends BaseWebService {
  static override get ServiceName(): string {
    return 'ShopWebService';
  }

  static override get ServiceVersion(): string {
    return ApiVersion.Legacy;
  }

  static async GetShop(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const applicationVersion = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ applicationVersion });

      UberStrikeItemShopClientViewProxy.Serialize(
        outputStream,
        new UberStrikeItemShopClientView({
          FunctionalItems: (await ShopFunctionalItem.find({
            relations: { Prices: true },
            order: {
              Prices: {
                Duration: 'ASC',
                Currency: 'DESC'
              }
            }
          })) as unknown[] as UberStrikeItemFunctionalView[],
          GearItems: (await ShopGearItem.find({
            relations: { Prices: true },
            order: {
              Prices: {
                Duration: 'ASC',
                Currency: 'DESC'
              }
            }
          })) as unknown[] as UberStrikeItemGearView[],
          QuickItems: (await ShopQuickItem.find({
            relations: { Prices: true },
            order: {
              Prices: {
                Duration: 'ASC',
                Currency: 'DESC'
              }
            }
          })) as unknown[] as UberStrikeItemQuickView[],
          WeaponItems: (await ShopWeaponItem.find({
            relations: { Prices: true },
            order: {
              Prices: {
                Duration: 'ASC',
                Currency: 'DESC'
              }
            }
          })) as unknown[] as UberStrikeItemWeaponView[],
          ItemsRecommendationPerMap: await Map.find().then((maps) =>
            maps.reduce((acc: any, cur: Map) => {
              acc[cur.MapId] = cur.RecommendedItemId;
              return acc;
            }, {})
          )
        })
      );

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (error) {
      this.handleEndpointError('GetShop', error);
    }

    return null;
  }

  static async BuyItem(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const itemId = Int32Proxy.Deserialize(bytes);
      const buyerCmid = Int32Proxy.Deserialize(bytes);
      const currencyType = EnumProxy.Deserialize<UberStrikeCurrencyType>(bytes);
      const durationType = EnumProxy.Deserialize<BuyingDurationType>(bytes);
      const itemType = EnumProxy.Deserialize<UberstrikeItemType>(bytes);
      const marketLocation = EnumProxy.Deserialize<BuyingLocationType>(bytes);
      const recommendationType = EnumProxy.Deserialize<BuyingRecommendationType>(bytes);

      this.debugEndpointData({
        itemId,
        buyerCmid,
        currencyType,
        durationType,
        itemType,
        marketLocation,
        recommendationType
      });

      const userAccount = await UserAccount.findOne({ where: { Cmid: buyerCmid } });

      if (!userAccount) {
        Int32Proxy.Serialize(outputStream, BuyItemResult.InvalidMember);
      } else {
        const publicProfile = await PublicProfile.findOne({ where: { Cmid: userAccount.Cmid } });

        if (!publicProfile) {
          Int32Proxy.Serialize(outputStream, BuyItemResult.InvalidMember);
        } else {
          const playerStatistics = await PlayerStatistics.findOne({ where: { Cmid: userAccount.Cmid } });
          const memberWallet = await MemberWallet.findOne({ where: { Cmid: publicProfile.Cmid } });

          if (!memberWallet) {
            Int32Proxy.Serialize(outputStream, BuyItemResult.InvalidMember);
          } else {
            if (
              await PlayerInventoryItem.findOne({
                where: {
                  Cmid: userAccount.Cmid,
                  ItemId: itemId,
                  ExpirationDate: Or(IsNull(), MoreThan(new Date()))
                }
              })
            ) {
              Int32Proxy.Serialize(outputStream, BuyItemResult.AlreadyInInventory);
            } else {
              let item: any = null;

              switch (itemType) {
                case UberstrikeItemType.Weapon:
                  item = await ShopWeaponItem.findOne({
                    where: { ID: itemId },
                    relations: {
                      Prices: true
                    }
                  });
                  break;
                case UberstrikeItemType.Gear:
                  item = await ShopGearItem.findOne({
                    where: { ID: itemId },
                    relations: {
                      Prices: true
                    }
                  });
                  break;
                case UberstrikeItemType.QuickUse:
                  item = await ShopQuickItem.findOne({
                    where: { ID: itemId },
                    relations: {
                      Prices: true
                    }
                  });
                  break;
                case UberstrikeItemType.Functional:
                  item = await ShopFunctionalItem.findOne({
                    where: { ID: itemId },
                    relations: {
                      Prices: true
                    }
                  });
                  break;
                default:
                  break;
              }

              if (!item) {
                Int32Proxy.Serialize(outputStream, BuyItemResult.ItemNotFound);
              } else {
                if (!item.IsForSale) {
                  Int32Proxy.Serialize(outputStream, BuyItemResult.IsNotForSale);
                } else if (XpPointsUtil.GetLevelForXp(playerStatistics!.Xp) < item.LevelLock) {
                  Int32Proxy.Serialize(outputStream, BuyItemResult.InvalidLevel);
                } else {
                  let purchased = false;

                  if (
                    ParadiseService.Instance.ServiceSettings.GameplaySettings.ShopFreeStaffItems &&
                    publicProfile.AccessLevel > MemberAccessLevel.Default
                  ) {
                    purchased = true;
                  } else if (currencyType === UberStrikeCurrencyType.Credits) {
                    const price = item.Prices.find(
                      (_: ShopItemPrice) => _.Currency === UberStrikeCurrencyType.Credits && _.Duration === durationType
                    );

                    if (!price) {
                      Int32Proxy.Serialize(outputStream, BuyItemResult.IsNotForSale);
                    } else if (memberWallet.Credits! < price.Price) {
                      Int32Proxy.Serialize(outputStream, BuyItemResult.NotEnoughCurrency);
                    } else {
                      await MemberWallet.update(memberWallet.Cmid, {
                        Credits: memberWallet.Credits! - price.Price
                      });

                      await ItemTransaction.create({
                        Cmid: publicProfile.Cmid,
                        Duration: durationType,
                        ItemId: itemId,
                        Credits: price.Price,
                        WithdrawalDate: new Date(),
                        WithdrawalId: Math.randomInt()
                      });

                      purchased = true;
                    }
                  } else if (currencyType === UberStrikeCurrencyType.Points) {
                    const price = item.Prices.find(
                      (_: ShopItemPrice) => _.Currency === UberStrikeCurrencyType.Points && _.Duration === durationType
                    );

                    if (!price) {
                      Int32Proxy.Serialize(outputStream, BuyItemResult.IsNotForSale);
                    } else if (memberWallet.Points! < price.Price) {
                      Int32Proxy.Serialize(outputStream, BuyItemResult.NotEnoughCurrency);
                    } else {
                      await MemberWallet.update(memberWallet.Cmid, {
                        Points: memberWallet.Points! - price.Price
                      });

                      await ItemTransaction.create({
                        Cmid: publicProfile.Cmid,
                        Duration: durationType,
                        ItemId: itemId,
                        Points: price.Price,
                        WithdrawalDate: new Date(),
                        WithdrawalId: Math.randomInt()
                      });

                      purchased = true;
                    }
                  } else {
                    Int32Proxy.Serialize(outputStream, BuyItemResult.InvalidData);
                  }

                  if (purchased) {
                    let expirationDate;

                    if (
                      !ParadiseService.Instance.ServiceSettings.GameplaySettings.ShopFreeStaffItems ||
                      publicProfile.AccessLevel === MemberAccessLevel.Default
                    ) {
                      switch (durationType) {
                        case BuyingDurationType.OneDay:
                          expirationDate = add(new Date(), { days: 1 });
                          break;
                        case BuyingDurationType.SevenDays:
                          expirationDate = add(new Date(), { days: 7 });
                          break;
                        case BuyingDurationType.ThirtyDays:
                          expirationDate = add(new Date(), { days: 30 });
                          break;
                        case BuyingDurationType.NinetyDays:
                          expirationDate = add(new Date(), { days: 90 });
                          break;
                        default:
                          break;
                      }
                    }

                    await PlayerInventoryItem.create({
                      Cmid: publicProfile.Cmid,
                      ItemId: itemId,
                      AmountRemaining: -1,
                      ExpirationDate: expirationDate
                    });

                    Int32Proxy.Serialize(outputStream, BuyItemResult.OK);
                  } else {
                    Int32Proxy.Serialize(outputStream, BuyItemResult.InvalidData);
                  }
                }
              }
            }
          }
        }
      }

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (e) {
      this.handleEndpointError('BuyItem', e);
    }

    return null;
  }

  static async BuyPack(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const itemId = Int32Proxy.Deserialize(bytes);
      const buyerCmid = Int32Proxy.Deserialize(bytes);
      const packType = EnumProxy.Deserialize<PackType>(bytes);
      const currencyType = EnumProxy.Deserialize<UberStrikeCurrencyType>(bytes);
      const itemType = EnumProxy.Deserialize<UberstrikeItemType>(bytes);
      const marketLocation = EnumProxy.Deserialize<BuyingLocationType>(bytes);
      const recommendationType = EnumProxy.Deserialize<BuyingRecommendationType>(bytes);

      this.debugEndpointData({
        itemId,
        buyerCmid,
        packType,
        currencyType,
        itemType,
        marketLocation,
        recommendationType
      });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('BuyPack', e);
    }

    return null;
  }

  static async GetBundles(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const channel = EnumProxy.Deserialize<ChannelType>(bytes);

      this.debugEndpointData({ channel });

      const bundles = (
        await ShopBundle.find({
          relations: {
            BundleItemViews: true
          }
        })
      ).filter((_) => _.Availability!.includes(channel));

      ListProxy.Serialize<BundleView>(outputStream, bundles as BundleView[], BundleViewProxy.Serialize);

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (error) {
      this.handleEndpointError('GetBundles', error);
    }

    return null;
  }

  static async BuyBundle(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const cmid = Int32Proxy.Deserialize(bytes);
      const bundleId = Int32Proxy.Deserialize(bytes);
      const channel = EnumProxy.Deserialize<ChannelType>(bytes);
      const hashedReceipt = StringProxy.Deserialize(bytes);
      const applicationId = Int32Proxy.Deserialize(bytes);

      this.debugEndpointData({ cmid, bundleId, channel, hashedReceipt, applicationId });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('BuyBundle', e);
    }

    return null;
  }

  static async UseConsumableItem(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const cmid = Int32Proxy.Deserialize(bytes);
      const itemId = Int32Proxy.Deserialize(bytes);

      this.debugEndpointData({ cmid, itemId });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('UseConsumableItem', e);
    }

    return null;
  }

  static async GetAllMysteryBoxs_1(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      this.debugEndpointData({});

      ListProxy.Serialize(outputStream, [], MysteryBoxUnityViewProxy.Serialize);

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (e) {
      this.handleEndpointError('GetAllMysteryBoxs_1', e);
    }

    return null;
  }

  static async GetAllMysteryBoxs_2(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const bundleCategoryType = EnumProxy.Deserialize<BundleCategoryType>(bytes);

      this.debugEndpointData({ bundleCategoryType });

      ListProxy.Serialize(outputStream, [], MysteryBoxUnityViewProxy.Serialize);

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (e) {
      this.handleEndpointError('GetAllMysteryBoxs_2', e);
    }

    return null;
  }

  static async GetMysteryBox(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const mysteryBoxId = Int32Proxy.Deserialize(bytes);

      this.debugEndpointData({ mysteryBoxId });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('GetMysteryBox', e);
    }

    return null;
  }

  static async RollMysteryBox(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const cmid = Int32Proxy.Deserialize(bytes);
      const mysteryBoxId = Int32Proxy.Deserialize(bytes);
      const channel = EnumProxy.Deserialize<ChannelType>(bytes);

      this.debugEndpointData({ cmid, mysteryBoxId, channel });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('RollMysteryBox', e);
    }

    return null;
  }

  static async GetAllLuckyDraws_1(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      this.debugEndpointData({});

      ListProxy.Serialize(outputStream, [], LuckyDrawUnityViewProxy.Serialize);

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (e) {
      this.handleEndpointError('GetAllLuckyDraws_1', e);
    }

    return null;
  }

  static async GetAllLuckyDraws_2(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const bundleCategoryType = EnumProxy.Deserialize<BundleCategoryType>(bytes);

      this.debugEndpointData({ bundleCategoryType });

      ListProxy.Serialize(outputStream, [], LuckyDrawUnityViewProxy.Serialize);

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (e) {
      this.handleEndpointError('GetAllLuckyDraws_2', e);
    }

    return null;
  }

  static async GetLuckyDraw(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const luckyDrawId = Int32Proxy.Deserialize(bytes);

      this.debugEndpointData({ luckyDrawId });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('GetLuckyDraw', e);
    }

    return null;
  }

  static async RollLuckyDraw(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const cmid = Int32Proxy.Deserialize(bytes);
      const luckDrawId = Int32Proxy.Deserialize(bytes);
      const channel = EnumProxy.Deserialize<ChannelType>(bytes);

      this.debugEndpointData({ cmid, luckDrawId, channel });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('RollLuckyDraw', e);
    }

    return null;
  }
}
