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
	public interface IAuthenticationWebServiceContract {
		[OperationContract]
		byte[] CreateUser(byte[] data);

		[OperationContract]
		byte[] CompleteAccount(byte[] data);

		[OperationContract]
		byte[] LoginMemberEmail(byte[] data);

		[OperationContract]
		byte[] LoginMemberFacebookUnitySdk(byte[] data);

		[OperationContract]
		byte[] LoginSteam(byte[] data);

		[OperationContract]
		byte[] LoginMemberPortal(byte[] data);

		[OperationContract]
		byte[] LinkSteamMember(byte[] data);


		// CUSTOM
		[OperationContract]
		byte[] VerifyAuthToken(byte[] data);
	}
}
