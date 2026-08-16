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
  SteamMember
} from '@festivaldev/paradise-models';
import {
  AccountCompletionResult,
  ChannelType,
  EmailAddressStatus,
  MemberAuthenticationResult,
  MemberView,
  MemberWalletView,
  PublicProfileView
} from '@festivaldev/uberstrike-js/Cmune/DataCenter/Common/Entities';
import {
  AccountCompletionResultViewProxy,
  EnumProxy,
  Int32Proxy,
  MemberAuthenticationResultViewProxy,
  StringProxy
} from '@festivaldev/uberstrike-js/UberStrike/Core/Serialization';
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
    return ApiVersion.Current;
  }

  private static readonly ProfanityFilter: ProfanityFilter = new ProfanityFilter();

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
      } else if (this.ProfanityFilter.IsProfanity(name) || this.ProfanityFilter.DetectAllProfanities(name).length > 0) {
        AccountCompletionResultViewProxy.Serialize(
          outputStream,
          new AccountCompletionResultView({
            Result: AccountCompletionResult.InvalidName
          })
        );
      } else {
        const [_, signupBundle] = await Promise.all([
          PublicProfile.update(publicProfile.Cmid, { Name: name }),
          ShopBundle.findOne({
            where: {
              Id: 0
            },
            relations: {
              BundleItemViews: true
            }
          })
        ]);

        let itemsAttributed: Record<number, number> = {};

        if (signupBundle) {
          await Promise.all([
            Promise.all(
              signupBundle.BundleItemViews.map((view) =>
                PlayerInventoryItem.insert({
                  Cmid: publicProfile.Cmid,
                  ItemId: view.ItemId,
                  AmountRemaining: -1
                })
              )
            ),
            Promise.all(
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
            )
          ]);

          itemsAttributed = signupBundle.BundleItemViews.reduce((acc, cur) => {
            acc[cur.ItemId] = cur.Amount;
            return acc;
          }, {} as any);

          PlayerLoadout.update(cmid, {
            MeleeWeapon:
              (itemsAttributed[UberstrikeInventoryItem.TheSplatbat] && UberstrikeInventoryItem.TheSplatbat) ??
              undefined,
            Weapon1:
              (itemsAttributed[UberstrikeInventoryItem.MachineGun] && UberstrikeInventoryItem.MachineGun) ?? undefined,
            Weapon2: (itemsAttributed[UberstrikeInventoryItem.ShotGun] && UberstrikeInventoryItem.ShotGun) ?? undefined,
            Weapon3:
              (itemsAttributed[UberstrikeInventoryItem.SniperRifle] && UberstrikeInventoryItem.SniperRifle) ?? undefined
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

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (error) {
      this.handleEndpointError('CompleteAccount', error);
    }

    return null;
  }

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

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (error) {
      this.handleEndpointError('CreateUser', error);
    }

    return null;
  }

  static async LinkSteamMember(bytes: number[], outputStream: number[]) {
    try {
      const email = StringProxy.Deserialize(bytes);
      const password = StringProxy.Deserialize(bytes);
      const steamId = StringProxy.Deserialize(bytes);
      const machineId = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ email, password, steamId, machineId });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (error) {
      this.handleEndpointError('LinkSteamMember', error);
    }

    return null;
  }

  static async LoginMemberEmail(bytes: number[], outputStream: number[]) {
    try {
      const email = StringProxy.Deserialize(bytes);
      const password = StringProxy.Deserialize(bytes);
      const channel = EnumProxy.Deserialize<ChannelType>(bytes);
      const machineId = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ email, password, channel, machineId });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (error) {
      this.handleEndpointError('LoginMemberEmail', error);
    }

    return null;
  }

  static async LoginMemberFacebookUnitySdk(bytes: number[], outputStream: number[]) {
    try {
      const facebookPlayerAccessToken = StringProxy.Deserialize(bytes);
      const channel = EnumProxy.Deserialize<ChannelType>(bytes);
      const machineId = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ facebookPlayerAccessToken, channel, machineId });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (error) {
      this.handleEndpointError('LoginMemberFacebookUnitySdk', error);
    }

    return null;
  }

  static async LoginMemberPortal(bytes: number[], outputStream: number[]) {
    try {
      const cmid = Int32Proxy.Deserialize(bytes);
      const hash = StringProxy.Deserialize(bytes);
      const machineId = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ cmid, hash, machineId });

      throw new Error('Not Implemented');
      // return isEncrypted
      //   ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
      //   : outputStream;
    } catch (error) {
      this.handleEndpointError('LoginMemberPortal', error);
    }

    return null;
  }

  static async LoginSteam(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const steamId = StringProxy.Deserialize(bytes);
      const authToken = StringProxy.Deserialize(bytes);
      const machineId = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ steamId, authToken, machineId });

      let steamMember = await SteamMember.findOne({ where: { SteamId: steamId } });

      if (!steamMember) {
        const Cmid = Math.randomInt();

        const publicProfile = await PublicProfile.save(
          PublicProfile.create({
            Cmid,
            Name: '',
            LastLoginDate: new Date(),
            EmailAddressStatus: EmailAddressStatus.Verified
          })
        );

        steamMember = await SteamMember.save(
          SteamMember.create({
            SteamId: steamId,
            Cmid,
            AuthToken: authToken,
            MachineId: machineId
          })
        );

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
            Cmid,
            Points: signupBundle?.Points ?? 0,
            Credits: signupBundle?.Credits ?? 0,
            PointsExpiration: new Date('9999-12-31T23:59:59.999Z'),
            CreditsExpiration: new Date('9999-12-31T23:59:59.999Z')
          })
        );

        if (signupBundle) {
          const transactionKey = crypto.randomBytes(32).toString('hex');

          CurrencyDeposit.insert({
            CreditsDepositId: Math.randomInt(),
            DepositDate: new Date(),
            Credits: signupBundle.Credits,
            Points: signupBundle.Points,
            CurrencyLabel: '$',
            Cmid,
            TransactionKey: transactionKey,
            ApplicationId: ParadiseService.Instance.ServiceSettings.ApplicationId,
            ChannelId: ChannelType.Steam,
            BundleId: signupBundle.Id
          });
        }

        const playerStatistics = await PlayerStatistics.save(
          PlayerStatistics.create({
            Cmid,
            Level: 1,
            PersonalRecord: new PlayerPersonalRecordStatisticsView(),
            WeaponStatistics: new PlayerWeaponStatisticsView()
          })
        );

        const session = await ParadiseService.Instance.SessionManager.findOrCreateSessionForSteamUser(
          publicProfile as PublicProfileView,
          machineId,
          steamMember
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
          AuthToken: session.SessionId
        });

        MemberAuthenticationResultViewProxy.Serialize(outputStream, memberAuth);
      } else {
        const bannedMember = await ModerationAction.findOne({
          where: {
            ModerationFlag: ModerationFlag.Banned,
            TargetCmid: steamMember.Cmid
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
          const publicProfile = await PublicProfile.findOne({ where: { Cmid: steamMember.Cmid } });

          if (!publicProfile) {
            MemberAuthenticationResultViewProxy.Serialize(
              outputStream,
              new MemberAuthenticationResultView({
                MemberAuthenticationResult: MemberAuthenticationResult.UnknownError
              })
            );
          } else {
            const memberWallet = await MemberWallet.findOne({ where: { Cmid: steamMember.Cmid } });
            const playerStatistics = await PlayerStatistics.findOne({ where: { Cmid: steamMember.Cmid } });

            const session = await ParadiseService.Instance.SessionManager.findOrCreateSessionForSteamUser(
              publicProfile as PublicProfileView,
              machineId,
              steamMember
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
                const clanMember = clan.Members.find((_) => _.Cmid === steamMember!.Cmid);

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
                AuthToken: session.SessionId
              })
            );
          }
        }
      }

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (error) {
      this.handleEndpointError('LoginSteam', error);
    }

    return null;
  }

  static async VerifyAuthToken(data: number[], outputStream: number[]): Promise<number[] | null> {
    const isEncrypted = this.isEncrypted(data);
    const bytes = isEncrypted
      ? this.CryptoPolicy.RijndaelDecrypt(data, this.EncryptionPassPhrase, this.EncryptionInitVector)
      : data;

    try {
      const authToken = StringProxy.Deserialize(bytes);

      this.debugEndpointData({ authToken });

      const session = await ParadiseService.Instance.SessionManager.findSessionForSteamUser(authToken);
      if (!session) {
        MemberAuthenticationResultViewProxy.Serialize(
          outputStream,
          new MemberAuthenticationResultView({
            MemberAuthenticationResult: MemberAuthenticationResult.InvalidCookie
          })
        );
      } else {
        const steamMember = await session.SteamMember;

        if (!steamMember) {
          MemberAuthenticationResultViewProxy.Serialize(
            outputStream,
            new MemberAuthenticationResultView({
              MemberAuthenticationResult: MemberAuthenticationResult.UnknownError
            })
          );
        } else {
          const bannedMember = await ModerationAction.findOne({
            where: {
              ModerationFlag: ModerationFlag.Banned,
              TargetCmid: steamMember.Cmid
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
            const publicProfile = await PublicProfile.findOne({ where: { Cmid: steamMember.Cmid } });

            if (!publicProfile) {
              MemberAuthenticationResultViewProxy.Serialize(
                outputStream,
                new MemberAuthenticationResultView({
                  MemberAuthenticationResult: MemberAuthenticationResult.UnknownError
                })
              );
            } else {
              const memberWallet = await MemberWallet.findOne({ where: { Cmid: steamMember.Cmid } });
              const playerStatistics = await PlayerStatistics.findOne({ where: { Cmid: steamMember.Cmid } });

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
                  ServerTime: new Date(),
                  IsAccountComplete: publicProfile.Name.trim().length > 0,
                  AuthToken: session.SessionId
                })
              );

              if (publicProfile.Name.trim().length > 0) {
                await ClanMember.update(
                  {
                    Cmid: publicProfile.Cmid
                  },
                  {
                    Lastlogin: new Date()
                  }
                );
              }
            }
          }
        }
      }

      return isEncrypted
        ? this.CryptoPolicy.RijndaelEncrypt(outputStream, this.EncryptionPassPhrase, this.EncryptionInitVector)
        : outputStream;
    } catch (error) {
      this.handleEndpointError('VerifyAuthToken', error);
    }

    return null;
  }
}
