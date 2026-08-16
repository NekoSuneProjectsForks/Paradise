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

using System;
using System.Security.Cryptography;
using System.Text;
using UberStrike.WebService.Unity;

namespace Paradise.Client {
	internal class RijndaelCryptographyPolicy : ICryptographyPolicy {
		public string SHA256Encrypt(string inputString) {
			var bytes = Encoding.UTF8.GetBytes(inputString);

			using (var sha256 = SHA256.Create()) {
				var array = sha256.ComputeHash(bytes);

				var text = string.Empty;
				for (int i = 0; i < array.Length; i++) {
					text += Convert.ToString(array[i], 16).PadLeft(2, '0');
				}

				return text.PadLeft(32, '0');
			}
		}

		public byte[] RijndaelEncrypt(byte[] inputClearText, string passPhrase, string initVector) {
			RijndaelCipher rijndaelCipher = new RijndaelCipher(passPhrase, initVector);
			return rijndaelCipher.EncryptToBytes(inputClearText);
		}

		public byte[] RijndaelDecrypt(byte[] inputCipherText, string passPhrase, string initVector) {
			RijndaelCipher rijndaelCipher = new RijndaelCipher(passPhrase, initVector);
			return rijndaelCipher.DecryptToBytes(inputCipherText);
		}
	}
}
