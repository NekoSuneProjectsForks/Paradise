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
  CurrencyDeposit,
  ItemTransaction,
  MemberWallet,
  PlayerInventoryItem,
  PlayerStatistics,
  PublicProfile,
  ShopBundle,
  ShopBundleItem,
  ShopFunctionalItem,
  ShopGearItem,
  ShopItemPrice,
  ShopQuickItem,
  ShopWeaponItem
} from '@festivaldev/paradise-models';
import {
  BundleCategoryType,
  BundleView,
  BuyingDurationType,
  BuyingLocationType,
  BuyingRecommendationType,
  BuyItemResult,
  ChannelType,
  MemberAccessLevel,
  PackType,
  PaymentProviderType,
  UberStrikeCurrencyType
} from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import {
  UberStrikeItemFunctionalView,
  UberStrikeItemGearView,
  UberStrikeItemQuickView,
  UberStrikeItemShopClientView,
  UberStrikeItemWeaponView
} from '@festivaldev/uberstrike-js/UberStrike/Core/Models/Views';
import {
  BooleanProxy,
  BundleViewProxy,
  EnumProxy,
  Int32Proxy,
  ListProxy,
  StringProxy,
  UberStrikeItemShopClientViewProxy
} from '@festivaldev/uberstrike-js/UberStrike/Core/Serialization';
import { UberstrikeItemType } from '@festivaldev/uberstrike-js/UberStrike/Core/Types';
import crypto from 'crypto';
import { add } from 'date-fns';
import { IsNull, MoreThan, Not, Or } from 'typeorm';
import BaseWebService from '../BaseWebService';

export default class ShopWebService extends BaseWebService {
  static override get ServiceName(): string {
    return 'ShopWebService';
  }

  static override get ServiceVersion(): string {
    return ApiVersion.Current;
  }

  static async BuyBundle(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const authToken = StringProxy.Deserialize(bytes);
      const bundleId = Int32Proxy.Deserialize(bytes);
      const channel = EnumProxy.Deserialize<ChannelType>(bytes);
      const hashedReceipt = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ authToken, bundleId, channel, hashedReceipt });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (error) {
      this.handleEndpointError('BuyBundle', error);
    }

    return null;
  }

  static async BuyBundleSteam(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const bundleId = Int32Proxy.Deserialize(bytes);
      const steamId = StringProxy.Deserialize(bytes);
      const authToken = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ bundleId, steamId, authToken });

      const session = await ParadiseService.Instance.SessionManager.findSessionForSteamUser(authToken);
      if (session) {
        const steamMember = await session.SteamMember;

        if (steamMember) {
          const publicProfile = await PublicProfile.findOne({ where: { Cmid: steamMember.Cmid } });

          if (publicProfile) {
            const bundle = await ShopBundle.findOne({
              where: {
                Id: bundleId
              }
            });

            if (bundle && bundle.Availability.includes(ChannelType.Steam)) {
              const memberWallet = await MemberWallet.findOne({ where: { Cmid: steamMember.Cmid } });

              if (memberWallet) {
                const transactionKey = crypto.randomBytes(32).toString('hex');

                await CurrencyDeposit.insert({
                  CreditsDepositId: Math.randomInt(),
                  Credits: bundle.Credits,
                  Points: bundle.Points,
                  CurrencyLabel: 'USD',
                  Cmid: publicProfile.Cmid,
                  PaymentProviderId: PaymentProviderType.Cmune,
                  TransactionKey: transactionKey,
                  ApplicationId: ParadiseService.Instance.ServiceSettings.ApplicationId,
                  ChannelId: ChannelType.Steam,
                  BundleId: bundle.Id,
                  UsdAmount: bundle.USDPrice ?? 0
                });

                const bundleItems = await ShopBundleItem.find({
                  where: { BundleId: bundleId }
                });

                if (bundleItems?.length) {
                  for (const bundleItem of bundleItems) {
                    let expirationDate: Date | null = null;

                    switch (bundleItem.Duration) {
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

                    await PlayerInventoryItem.insert({
                      Cmid: publicProfile.Cmid,
                      ItemId: bundleItem.ItemId,
                      ExpirationDate: expirationDate,
                      AmountRemaining: bundleItem.Amount
                    });

                    await ItemTransaction.insert({
                      WithdrawalId: Math.randomInt(),
                      Cmid: publicProfile.Cmid,
                      ItemId: bundleItem.ItemId,
                      Duration: bundleItem.Duration
                    });
                  }
                }

                await MemberWallet.update(memberWallet.Cmid, {
                  Credits: memberWallet.Credits! + bundle.Credits!,
                  Points: memberWallet.Points! + bundle.Points!
                });

                BooleanProxy.Serialize(outputStream, true);
              }
            }
          }
        }
      }

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (error) {
      this.handleEndpointError('BuyBundleSteam', error);
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
      const authToken = StringProxy.Deserialize(bytes);
      const currencyType = EnumProxy.Deserialize<UberStrikeCurrencyType>(bytes);
      const durationType = EnumProxy.Deserialize<BuyingDurationType>(bytes);
      const itemType = EnumProxy.Deserialize<UberstrikeItemType>(bytes);
      const marketLocation = EnumProxy.Deserialize<BuyingLocationType>(bytes);
      const recommendationType = EnumProxy.Deserialize<BuyingRecommendationType>(bytes);

      this.debugEndpointData({
        itemId,
        authToken,
        currencyType,
        durationType,
        itemType,
        marketLocation,
        recommendationType
      });

      const session = await ParadiseService.Instance.SessionManager.findSessionForSteamUser(authToken);

      if (session) {
        const steamMember = await session.SteamMember;

        if (!steamMember) {
          Int32Proxy.Serialize(outputStream, BuyItemResult.InvalidMember);
        } else {
          const publicProfile = await PublicProfile.findOne({ where: { Cmid: steamMember.Cmid } });

          if (!publicProfile) {
            Int32Proxy.Serialize(outputStream, BuyItemResult.InvalidMember);
          } else {
            const playerStatistics = await PlayerStatistics.findOne({ where: { Cmid: steamMember.Cmid } });
            const memberWallet = await MemberWallet.findOne({ where: { Cmid: publicProfile.Cmid } });

            if (!memberWallet) {
              Int32Proxy.Serialize(outputStream, BuyItemResult.InvalidMember);
            } else {
              if (
                await PlayerInventoryItem.findOne({
                  where: {
                    Cmid: steamMember.Cmid,
                    ItemId: itemId,
                    ExpirationDate: Or(IsNull(), MoreThan(new Date()))
                  }
                })
              ) {
                Int32Proxy.Serialize(outputStream, BuyItemResult.AlreadyInInventory);
              } else {
                let item: ShopWeaponItem | ShopGearItem | ShopQuickItem | ShopFunctionalItem | null = null;

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
                        (_: ShopItemPrice) =>
                          _.Currency === UberStrikeCurrencyType.Credits && _.Duration === durationType
                      );

                      if (!price) {
                        Int32Proxy.Serialize(outputStream, BuyItemResult.IsNotForSale);
                      } else if (memberWallet.Credits! < price.Price) {
                        Int32Proxy.Serialize(outputStream, BuyItemResult.NotEnoughCurrency);
                      } else {
                        await MemberWallet.update(memberWallet.Cmid, {
                          Credits: memberWallet.Credits! - price.Price
                        });

                        await ItemTransaction.insert({
                          Cmid: publicProfile.Cmid,
                          Duration: durationType,
                          ItemId: itemId,
                          Credits: price.Price,
                          WithdrawalId: Math.randomInt()
                        });

                        purchased = true;
                      }
                    } else if (currencyType === UberStrikeCurrencyType.Points) {
                      const price = item.Prices.find(
                        (_: ShopItemPrice) =>
                          _.Currency === UberStrikeCurrencyType.Points && _.Duration === durationType
                      );

                      if (!price) {
                        Int32Proxy.Serialize(outputStream, BuyItemResult.IsNotForSale);
                      } else if (memberWallet.Points! < price.Price) {
                        Int32Proxy.Serialize(outputStream, BuyItemResult.NotEnoughCurrency);
                      } else {
                        await MemberWallet.update(memberWallet.Cmid, {
                          Points: memberWallet.Points! - price.Price
                        });

                        await ItemTransaction.insert({
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

                      await PlayerInventoryItem.insert({
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
      }

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (error) {
      this.handleEndpointError('BuyItem', error);
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
      const authToken = StringProxy.Deserialize(bytes);
      const packType = EnumProxy.Deserialize<PackType>(bytes);
      const currencyType = EnumProxy.Deserialize<UberStrikeCurrencyType>(bytes);
      const itemType = EnumProxy.Deserialize<UberstrikeItemType>(bytes);
      const marketLocation = EnumProxy.Deserialize<BuyingLocationType>(bytes);
      const recommendationType = EnumProxy.Deserialize<BuyingRecommendationType>(bytes);

      this.debugEndpointData({
        itemId,
        authToken,
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
    } catch (error) {
      this.handleEndpointError('BuyPack', error);
    }

    return null;
  }

  static async FinishBuyBundleSteam(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const orderId = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ orderId });

      BooleanProxy.Serialize(outputStream, true);

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (error) {
      this.handleEndpointError('FinishBuyBundleSteam', error);
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

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (error) {
      this.handleEndpointError('GetAllLuckyDraws_1', error);
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

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (error) {
      this.handleEndpointError('GetAllLuckyDraws_2', error);
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

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (error) {
      this.handleEndpointError('GetAllMysteryBoxs_1', error);
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

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (error) {
      this.handleEndpointError('GetAllMysteryBoxs_2', error);
    }

    return null;
  }

  static async GetBundles(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const channelType = EnumProxy.Deserialize<ChannelType>(bytes);

      this.debugEndpointData({ channelType });

      const bundles = (
        await ShopBundle.find({
          where: {
            USDPrice: Not(IsNull())
            // Availability:
          },
          relations: {
            BundleItemViews: true
          }
        })
      ).filter((_) => _.Availability!.includes(channelType));

      ListProxy.Serialize<BundleView>(outputStream, bundles as BundleView[], BundleViewProxy.Serialize);

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (error) {
      this.handleEndpointError('GetBundles', error);
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
    } catch (error) {
      this.handleEndpointError('GetLuckyDraw', error);
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
    } catch (error) {
      this.handleEndpointError('GetMysteryBox', error);
    }

    return null;
  }

  static async GetShop(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      this.debugEndpointData({});

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
          })) as unknown[] as UberStrikeItemWeaponView[]
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

  static async RollLuckyDraw(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const authToken = StringProxy.Deserialize(bytes);
      const luckDrawId = Int32Proxy.Deserialize(bytes);
      const channel = EnumProxy.Deserialize<ChannelType>(bytes);

      this.debugEndpointData({ authToken, luckDrawId, channel });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (error) {
      this.handleEndpointError('RollLuckyDraw', error);
    }

    return null;
  }

  static async RollMysteryBox(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const authToken = StringProxy.Deserialize(bytes);
      const mysteryBoxId = Int32Proxy.Deserialize(bytes);
      const channel = EnumProxy.Deserialize<ChannelType>(bytes);

      this.debugEndpointData({ authToken, mysteryBoxId, channel });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (error) {
      this.handleEndpointError('RollMysteryBox', error);
    }

    return null;
  }

  static async UseConsumableItem(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const authToken = StringProxy.Deserialize(bytes);
      const itemId = Int32Proxy.Deserialize(bytes);

      this.debugEndpointData({ authToken, itemId });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (error) {
      this.handleEndpointError('UseConsumableItem', error);
    }

    return null;
  }

  static async VerifyReceipt(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const hashedReceipt = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ hashedReceipt });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (error) {
      this.handleEndpointError('VerifyReceipt', error);
    }

    return null;
  }
}
