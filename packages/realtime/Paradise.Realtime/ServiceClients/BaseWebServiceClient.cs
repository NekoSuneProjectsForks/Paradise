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

using log4net;
using Paradise.Realtime.Server;
using System;
using System.IO;
using System.Net;
using System.ServiceModel;
using UberStrike.Realtime.UnitySdk;

namespace Paradise.Realtime {
	public abstract class BaseWebServiceClient<T> {
		protected static readonly ILog Log = LogManager.GetLogger(nameof(BaseWebServiceClient<T>));

		private readonly T _service;
		protected readonly ICryptographyPolicy NullCryptoPolicy = new NullCryptographyPolicy();
		protected readonly ICryptographyPolicy CryptoPolicy = new RijndaelCryptographyPolicy();

		protected BaseWebServiceClient(string masterHostname, int port, string serviceEndpoint, string service) {
			if (string.IsNullOrWhiteSpace(masterHostname))
				throw new ArgumentNullException(nameof(masterHostname));

			if (string.IsNullOrWhiteSpace(serviceEndpoint))
				throw new ArgumentNullException(nameof(serviceEndpoint));

			if (string.IsNullOrWhiteSpace(service))
				throw new ArgumentNullException(nameof(service));

			var builder = new UriBuilder(masterHostname);
			builder.Path = Path.Combine(builder.Path, serviceEndpoint, service);
			builder.Port = port;

			BasicHttpBinding binding = new BasicHttpBinding {
				MaxBufferSize = ushort.MaxValue * 4,
				MaxReceivedMessageSize = ushort.MaxValue * 4
			};

			if (BaseRealtimeApplication.Instance.Configuration.WebServiceUseTLS) {
				builder.Scheme = "https";
				binding.Security.Mode = BasicHttpSecurityMode.Transport;
				binding.Security.Transport.ClientCredentialType = HttpClientCredentialType.None;
				ServicePointManager.ServerCertificateValidationCallback += (sender, cert, chain, errors) => true;
			}

			ChannelFactory<T> factory = new ChannelFactory<T>(binding);

			var address = new EndpointAddress(builder.Uri);
			_service = factory.CreateChannel(address);
		}

		protected T Service => _service;

		protected byte[] Encrypt(byte[] data) {
			if (string.IsNullOrWhiteSpace(BaseRealtimeApplication.Instance.EncryptionPassPhrase) || string.IsNullOrWhiteSpace(BaseRealtimeApplication.Instance.EncryptionInitVector)) {
				return NullCryptoPolicy.RijndaelEncrypt(data, "", "");
			}

			return CryptoPolicy.RijndaelEncrypt(data, BaseRealtimeApplication.Instance.EncryptionPassPhrase, BaseRealtimeApplication.Instance.EncryptionInitVector);
		}

		protected byte[] Decrypt(byte[] data) {
			if (string.IsNullOrWhiteSpace(BaseRealtimeApplication.Instance.EncryptionPassPhrase) || string.IsNullOrWhiteSpace(BaseRealtimeApplication.Instance.EncryptionInitVector)) {
				return NullCryptoPolicy.RijndaelDecrypt(data, "", "");
			}

			return CryptoPolicy.RijndaelDecrypt(data, BaseRealtimeApplication.Instance.EncryptionPassPhrase, BaseRealtimeApplication.Instance.EncryptionInitVector);
		}
	}
}
