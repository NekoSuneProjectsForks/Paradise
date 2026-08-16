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
	public interface IUserWebServiceContract {
		[OperationContract]
		byte[] AddItemTransaction(byte[] data);

		[OperationContract]
		byte[] ChangeMemberName(byte[] data);

		[OperationContract]
		byte[] IsDuplicateMemberName(byte[] data);

		[OperationContract]
		byte[] GenerateNonDuplicatedMemberNames(byte[] data);

		[OperationContract]
		byte[] GetMemberWallet(byte[] data);

		[OperationContract]
		byte[] GetInventory(byte[] data);

		[OperationContract]
		byte[] GetCurrencyDeposits(byte[] data);

		[OperationContract]
		byte[] GetItemTransactions(byte[] data);

		[OperationContract]
		byte[] GetPointsDeposits(byte[] data);

		[OperationContract]
		byte[] GetLoadout(byte[] data);

		[OperationContract]
		byte[] SetLoadout(byte[] data);

		[OperationContract]
		byte[] GetMember(byte[] data);

		[OperationContract]
		byte[] GetMemberSessionData(byte[] data);

		[OperationContract]
		byte[] GetMemberListSessionData(byte[] data);

		[OperationContract]
		byte[] DepositCredits(byte[] data);

		[OperationContract]
		byte[] DepositPoints(byte[] data);

		[OperationContract]
		byte[] UpdatePlayerStatistics(byte[] data);

		[OperationContract]
		byte[] RemoveItemFromInventory(byte[] data);
	}
}
