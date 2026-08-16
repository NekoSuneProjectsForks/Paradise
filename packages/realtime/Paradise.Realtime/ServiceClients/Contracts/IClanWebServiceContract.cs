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
	public interface IClanWebServiceContract {
		[OperationContract]
		byte[] GetOwnClan(byte[] data);

		[OperationContract]
		byte[] UpdateMemberPosition(byte[] data);

		[OperationContract]
		byte[] InviteMemberToJoinAGroup(byte[] data);

		[OperationContract]
		byte[] AcceptClanInvitation(byte[] data);

		[OperationContract]
		byte[] DeclineClanInvitation(byte[] data);

		[OperationContract]
		byte[] KickMemberFromClan(byte[] data);

		[OperationContract]
		byte[] DisbandGroup(byte[] data);

		[OperationContract]
		byte[] LeaveAClan(byte[] data);

		[OperationContract]
		byte[] GetMyClanId(byte[] data);

		[OperationContract]
		byte[] CancelInvitation(byte[] data);

		[OperationContract]
		byte[] GetAllGroupInvitations(byte[] data);

		[OperationContract]
		byte[] GetPendingGroupInvitations(byte[] data);

		[OperationContract]
		byte[] CreateClan(byte[] data);

		[OperationContract]
		byte[] TransferOwnership(byte[] data);

		[OperationContract]
		byte[] CanOwnAClan(byte[] data);
	}
}
