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

using System.ServiceModel;

namespace Paradise.WebServices.Contracts {
	[ServiceContract]
	public interface IShopWebServiceContract {
		[OperationContract]
		byte[] GetShop(byte[] data);

		[OperationContract]
		byte[] BuyItem(byte[] data);

		[OperationContract]
		byte[] BuyPack(byte[] data);

		[OperationContract]
		byte[] GetBundles(byte[] data);

		[OperationContract]
		byte[] BuyBundle(byte[] data);

		[OperationContract]
		byte[] BuyBundleSteam(byte[] data);

		[OperationContract]
		byte[] FinishBuyBundleSteam(byte[] data);

		[OperationContract]
		byte[] VerifyReceipt(byte[] data);

		[OperationContract]
		byte[] UseConsumableItem(byte[] data);

		[OperationContract]
		byte[] GetAllMysteryBoxs_1(byte[] data);

		[OperationContract]
		byte[] GetAllMysteryBoxs_2(byte[] data);

		[OperationContract]
		byte[] GetMysteryBox(byte[] data);

		[OperationContract]
		byte[] RollMysteryBox(byte[] data);

		[OperationContract]
		byte[] GetAllLuckyDraws_1(byte[] data);

		[OperationContract]
		byte[] GetAllLuckyDraws_2(byte[] data);

		[OperationContract]
		byte[] GetLuckyDraw(byte[] data);

		[OperationContract]
		byte[] RollLuckyDraw(byte[] data);
	}
}
