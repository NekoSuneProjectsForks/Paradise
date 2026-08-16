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
import { ProfanityFilter } from '@/ProfanityFilter';
import { Log } from '@/utils';
import { ApiVersion, ModerationFlag, UberstrikeInventoryItem } from '@/utils/enums';
import {
  Clan,
  ClanMember,
  CurrencyDeposit,
  ItemTransaction,
  MemberWallet,
  ModerationAction,
  PlayerInventoryItem,
  PlayerLoadout,
  PlayerStatistics,
  PublicProfile,
  ShopBundle,
  UserAccount
} from '@festivaldev/paradise-models';
import {
  AccountCompletionResult,
  ChannelType,
  EmailAddressStatus,
  MemberAuthenticationResult,
  MemberRegistrationResult,
  MemberView,
  MemberWalletView,
  PublicProfileView,
  WeeklySpecialView
} from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import {
  DateTimeProxy,
  EnumProxy,
  Int32Proxy,
  StringProxy
} from '@festivaldev/uberstrike-js/UberStrike/Core/Serialization';
import {
  AccountCompletionResultViewProxy,
  MemberAuthenticationResultViewProxy
} from '@festivaldev/uberstrike-js/UberStrike/Core/Serialization/Legacy';
import { TutorialStepType } from '@festivaldev/uberstrike-js/UberStrike/Core/Types';
import { MemberAuthenticationResultView } from '@festivaldev/uberstrike-js/UberStrike/Core/ViewModel';
import {
  AccountCompletionResultView,
  PlayerPersonalRecordStatisticsView,
  PlayerStatisticsView,
  PlayerWeaponStatisticsView
} from '@festivaldev/uberstrike-js/UberStrike/DataCenter/Common/Entities';
import crypto from 'crypto';
import BaseWebService from '../BaseWebService';
import forbiddenNames from '../forbiddenNames.json';

export default class AuthenticationWebService extends BaseWebService {
  static override get ServiceName(): string {
    return 'AuthenticationWebService';
  }

  static override get ServiceVersion(): string {
    return ApiVersion.Legacy;
  }

  private static readonly ProfanityFilter: ProfanityFilter = new ProfanityFilter();

  private static weeklySpecial: WeeklySpecialView = new WeeklySpecialView({
    StartDate: new Date('1970-01-01T01:00:00.000Z'),
    EndDate: new Date('9999-12-31T23:59:59.999Z'),
    Id: 0,
    ImageUrl: 'http://via.placeholder.com/350x150',
    Text: 'LockWatch 2 Beta (iOS 13/14)',
    Title: 'Team FESTIVAL',
    ItemId: 1003
  });

  static async CreateUser(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const emailAddress = StringProxy.Deserialize(bytes);
      const password = StringProxy.Deserialize(bytes);
      const channel = EnumProxy.Deserialize<ChannelType>(bytes);
      const locale = StringProxy.Deserialize(bytes);
      const machineId = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ emailAddress, password, channel, locale, machineId });

      if (await UserAccount.findOne({ where: { EmailAddress: emailAddress } })) {
        EnumProxy.Serialize<MemberRegistrationResult>(outputStream, MemberRegistrationResult.DuplicateEmail);
      } else {
        const Cmid = Math.randomInt();

        const publicProfile = await PublicProfile.save(
          PublicProfile.create({
            Cmid,
            Name: '',
            LastLoginDate: new Date(),
            EmailAddressStatus: EmailAddressStatus.Verified
          })
        );

        const userAccount = await UserAccount.save(
          UserAccount.create({
            Cmid,
            EmailAddress: emailAddress,
            Password: Bun.password.hashSync(password, { algorithm: 'bcrypt' }),
            Channel: channel,
            Locale: locale
          })
        );

        if (userAccount) {
          EnumProxy.Serialize<MemberRegistrationResult>(outputStream, MemberRegistrationResult.Ok);
        } else {
          EnumProxy.Serialize<MemberRegistrationResult>(outputStream, MemberRegistrationResult.Error_MemberNotCreated);
        }
      }

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (e) {
      this.handleEndpointError('CreateUser', e);
    }

    return null;
  }

  static async CompleteAccount(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const cmid = Int32Proxy.Deserialize(bytes);
      const name = StringProxy.Deserialize(bytes);
      const channel = EnumProxy.Deserialize<ChannelType>(bytes);
      const locale = StringProxy.Deserialize(bytes);
      const machineId = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ cmid, name, channel, locale, machineId });

      const userAccount = await UserAccount.findOne({ where: { Cmid: cmid } });

      if (userAccount) {
        const publicProfile = await PublicProfile.findOne({ where: { Cmid: cmid } });

        if (!publicProfile) {
          AccountCompletionResultViewProxy.Serialize(
            outputStream,
            new AccountCompletionResultView({
              Result: AccountCompletionResult.InvalidData
            })
          );
        } else if (publicProfile.Name.trim().length) {
          AccountCompletionResultViewProxy.Serialize(
            outputStream,
            new AccountCompletionResultView({
              Result: AccountCompletionResult.AlreadyCompletedAccount
            })
          );
        } else if ((await PublicProfile.findOne({ where: { Name: name } })) != null) {
          AccountCompletionResultViewProxy.Serialize(
            outputStream,
            new AccountCompletionResultView({
              Result: AccountCompletionResult.DuplicateName
            })
          );
        } else if (
          name.length < 3 ||
          !name.match(/^[a-zA-Z0-9_]+$/) ||
          forbiddenNames.some((_) => name.toLocaleLowerCase().includes(_.toLocaleLowerCase()))
        ) {
          AccountCompletionResultViewProxy.Serialize(
            outputStream,
            new AccountCompletionResultView({
              Result: AccountCompletionResult.InvalidName
            })
          );
        } else if (
          this.ProfanityFilter.IsProfanity(name) ||
          this.ProfanityFilter.DetectAllProfanities(name).length > 0
        ) {
          AccountCompletionResultViewProxy.Serialize(
            outputStream,
            new AccountCompletionResultView({
              Result: AccountCompletionResult.InvalidName
            })
          );
        } else {
          await PublicProfile.update(publicProfile.Cmid, { Name: name });

          const signupBundle = await ShopBundle.findOne({
            where: {
              Id: 0
            },
            relations: {
              BundleItemViews: true
            }
          });

          let itemsAttributed: Record<number, number> = {};

          if (signupBundle) {
            await Promise.all(
              signupBundle.BundleItemViews.map((view) =>
                PlayerInventoryItem.insert({
                  Cmid: publicProfile.Cmid,
                  ItemId: view.ItemId,
                  AmountRemaining: -1
                })
              )
            );

            await Promise.all(
              signupBundle.BundleItemViews.map((view) =>
                ItemTransaction.insert({
                  WithdrawalId: Math.randomInt(),
                  Points: 0,
                  Credits: 0,
                  Cmid: publicProfile.Cmid,
                  ItemId: view.ItemId,
                  Duration: view.Duration
                })
              )
            );

            itemsAttributed = signupBundle.BundleItemViews.reduce((acc, cur) => {
              acc[cur.ItemId] = cur.Amount;
              return acc;
            }, {} as any);

            PlayerLoadout.update(cmid, {
              MeleeWeapon:
                (itemsAttributed[UberstrikeInventoryItem.TheSplatbat] && UberstrikeInventoryItem.TheSplatbat) ??
                undefined,
              Weapon1:
                (itemsAttributed[UberstrikeInventoryItem.MachineGun] && UberstrikeInventoryItem.MachineGun) ??
                undefined,
              Weapon2:
                (itemsAttributed[UberstrikeInventoryItem.ShotGun] && UberstrikeInventoryItem.ShotGun) ?? undefined,
              Weapon3:
                (itemsAttributed[UberstrikeInventoryItem.SniperRifle] && UberstrikeInventoryItem.SniperRifle) ??
                undefined
            });
          }

          AccountCompletionResultViewProxy.Serialize(
            outputStream,
            new AccountCompletionResultView({
              Result: AccountCompletionResult.Ok,
              ItemsAttributed: itemsAttributed
            })
          );

          Log.info(`${publicProfile.Name}(${publicProfile.Cmid}) logged in.`);
        }
      }

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (e) {
      this.handleEndpointError('CompleteAccount', e);
    }

    return null;
  }

  static async LoginMemberEmail(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const email = StringProxy.Deserialize(bytes);
      const password = StringProxy.Deserialize(bytes);
      const channelType = EnumProxy.Deserialize<ChannelType>(bytes);
      const machineId = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ email, password, channelType, machineId });

      const userAccount = await UserAccount.findOne({ where: { EmailAddress: email } });

      if (!userAccount) {
        MemberAuthenticationResultViewProxy.Serialize(
          outputStream,
          new MemberAuthenticationResultView({
            MemberAuthenticationResult: MemberAuthenticationResult.InvalidEmail
          })
        );
      } else {
        if (!Bun.password.verifySync(password, userAccount.Password)) {
          MemberAuthenticationResultViewProxy.Serialize(
            outputStream,
            new MemberAuthenticationResultView({
              MemberAuthenticationResult: MemberAuthenticationResult.InvalidPassword
            })
          );
        } else {
          const bannedMember = await ModerationAction.findOne({
            where: {
              ModerationFlag: ModerationFlag.Banned,
              TargetCmid: userAccount.Cmid
            },
            order: {
              ActionDate: 'DESC'
            }
          });

          if (bannedMember && (!bannedMember.ExpireTime || bannedMember.ExpireTime > new Date())) {
            MemberAuthenticationResultViewProxy.Serialize(
              outputStream,
              new MemberAuthenticationResultView({
                MemberAuthenticationResult: MemberAuthenticationResult.IsBanned
              })
            );
          } else {
            const publicProfile = (await PublicProfile.findOne({ where: { Cmid: userAccount.Cmid } }))!;

            if (publicProfile?.Name.length === 0) {
              const signupBundle = await ShopBundle.findOne({
                where: {
                  Id: 0
                },
                relations: {
                  BundleItemViews: true
                }
              });

              const memberWallet = await MemberWallet.save(
                MemberWallet.create({
                  Cmid: publicProfile.Cmid,
                  Points: signupBundle?.Points ?? 0,
                  Credits: signupBundle?.Credits ?? 0,
                  PointsExpiration: new Date('9999-12-31T23:59:59.999Z'),
                  CreditsExpiration: new Date('9999-12-31T23:59:59.999Z')
                })
              );

              if (signupBundle) {
                const transactionKey = crypto.randomBytes(32).toString('hex');

                await CurrencyDeposit.insert({
                  CreditsDepositId: Math.randomInt(),
                  DepositDate: new Date(),
                  Credits: signupBundle.Credits,
                  Points: signupBundle.Points,
                  CurrencyLabel: '$',
                  Cmid: userAccount.Cmid,
                  TransactionKey: transactionKey,
                  ApplicationId: ParadiseService.Instance.ServiceSettings.ApplicationId,
                  ChannelId: channelType,
                  BundleId: signupBundle.Id
                });
              }

              const playerStatistics = await PlayerStatistics.save(
                PlayerStatistics.create({
                  Cmid: publicProfile.Cmid,
                  Level: 1,
                  PersonalRecord: new PlayerPersonalRecordStatisticsView(),
                  WeaponStatistics: new PlayerWeaponStatisticsView()
                })
              );

              const session = await ParadiseService.Instance.SessionManager.findOrCreateSession(
                publicProfile as PublicProfileView,
                machineId,
                userAccount
              );

              const memberAuth = new MemberAuthenticationResultView({
                MemberAuthenticationResult: MemberAuthenticationResult.Ok,
                MemberView: new MemberView({
                  PublicProfile: publicProfile as PublicProfileView,
                  MemberWallet: {
                    ...(memberWallet as MemberWalletView),
                    Credits: Math.max(memberWallet.Credits, 0),
                    Points: Math.max(memberWallet.Points, 0)
                  }
                }),
                PlayerStatisticsView: playerStatistics as PlayerStatisticsView,
                ServerTime: new Date(),
                IsAccountComplete: false,
                IsTutorialComplete: false,
                AuthToken: session.SessionId,
                WeeklySpecial: this.weeklySpecial
              });

              MemberAuthenticationResultViewProxy.Serialize(outputStream, memberAuth);
            } else {
              const memberWallet = await MemberWallet.findOne({ where: { Cmid: userAccount.Cmid } });
              const playerStatistics = await PlayerStatistics.findOne({ where: { Cmid: userAccount.Cmid } });

              const session = await ParadiseService.Instance.SessionManager.findOrCreateSession(
                publicProfile as PublicProfileView,
                machineId,
                userAccount
              );

              let clan;
              if (publicProfile.Name.trim().length > 0) {
                clan = await Clan.findOne({
                  where: {
                    Members: {
                      Cmid: publicProfile.Cmid
                    }
                  },
                  relations: {
                    Members: true
                  }
                });

                if (clan) {
                  const clanMember = clan.Members.find((_) => _.Cmid === userAccount!.Cmid);

                  if (clanMember) {
                    ClanMember.update(
                      {
                        GroupId: clan.GroupId,
                        Cmid: clanMember.Cmid
                      },
                      {
                        Lastlogin: new Date()
                      }
                    );
                  }
                }

                await PublicProfile.update(publicProfile.Cmid, {
                  LastLoginDate: new Date()
                });

                Log.info(`${publicProfile.Name}(${publicProfile.Cmid}) logged in.`);
              }

              MemberAuthenticationResultViewProxy.Serialize(
                outputStream,
                new MemberAuthenticationResultView({
                  MemberAuthenticationResult: MemberAuthenticationResult.Ok,
                  MemberView: new MemberView({
                    PublicProfile: new PublicProfileView({
                      ...(publicProfile as PublicProfileView)
                    }),
                    MemberWallet: new MemberWalletView({ ...(memberWallet! as MemberWalletView) })
                  }),
                  PlayerStatisticsView: new PlayerStatisticsView({ ...(playerStatistics! as PlayerStatisticsView) }),
                  IsAccountComplete: publicProfile.Name.trim().length > 0,
                  IsTutorialComplete: userAccount.TutorialStep >= TutorialStepType.TutorialComplete,
                  AuthToken: session.SessionId,
                  WeeklySpecial: this.weeklySpecial
                })
              );
            }
          }
        }
      }

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (error) {
      this.handleEndpointError('LoginMemberEmail', error);
    }

    return null;
  }

  static async LoginMemberCookie(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const cmid = Int32Proxy.Deserialize(bytes);
      const expirationTime = DateTimeProxy.Deserialize(bytes);
      const encryptedContent = StringProxy.Deserialize(bytes);
      const hash = StringProxy.Deserialize(bytes);
      const channelType = EnumProxy.Deserialize<ChannelType>(bytes);
      const machineId = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ cmid, expirationTime, encryptedContent, hash, channelType, machineId });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('LoginMemberCookie', e);
    }

    return null;
  }

  static async LoginMemberFacebook(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const facebookId = StringProxy.Deserialize(bytes);
      const hash = StringProxy.Deserialize(bytes);
      const machineId = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ facebookId, hash, machineId });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('LoginMemberFacebook', e);
    }

    return null;
  }

  static async FacebookSingleSignOn(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const authToken = StringProxy.Deserialize(bytes);
      const channelType = EnumProxy.Deserialize<ChannelType>(bytes);
      const machineId = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ authToken, channelType, machineId });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (e) {
      this.handleEndpointError('FacebookSingleSignOn', e);
    }

    return null;
  }
}
