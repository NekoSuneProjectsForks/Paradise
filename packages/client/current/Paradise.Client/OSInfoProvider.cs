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

using Microsoft.Win32;
using System;
using System.Runtime.InteropServices;
using System.Text;

namespace Paradise {
	public static class OSInfoProvider {
		[DllImport("kernel32.dll", SetLastError = true)]
    	private static extern uint GetSystemFirmwareTable(uint firmwareTableProviderSignature, uint firmwareTableID, [Out] byte[] firmwareTableBuffer, uint bufferSize);

		[DllImport("kernel32.dll")]
    	private static extern bool GetLogicalProcessorInformation(IntPtr buffer, ref uint returnLength);

		[DllImport("kernel32.dll")]
	    private static extern bool GlobalMemoryStatusEx(IntPtr buffer);

		private const uint RSMB = 0x52534D42;

		public struct MachineInfo {
			public string UUID;
			public string Vendor;
			public string Model;
			public string OperatingSystem;
		}

		public struct CPUInfo {
			public string Vendor;
			public string Model;
			public int Cores;
			public int Threads;
			public long Memory;
		}

		public struct GPUInfo {
			public string Vendor;
			public string Model;
			public string VendorId;
			public string DeviceId;
			public long Memory;
			public string DriverVersion;
		}

		public static MachineInfo GetMachineInfo() {
			var smbios = GetSMBIOS();

			return new MachineInfo {
				UUID = GetSystemUUID(smbios),
				Vendor = GetSystemVendor(smbios),
				Model = GetSystemModel(smbios),
				OperatingSystem = GetOSBuild()
			};
		}

		public static CPUInfo GetCPUInfo() {
			using (var key = Registry.LocalMachine.OpenSubKey(@"HARDWARE\DESCRIPTION\System\CentralProcessor\0")) {
				GetCPUCoreCounts(out var cores, out var threads);

				return new CPUInfo {
					Vendor = key.GetValue("VendorIdentifier").ToString(),
					Model = key.GetValue("ProcessorNameString").ToString().Trim(),
					Cores = cores,
					Threads = threads,
					Memory = GetTotalMemoryBytes()
				};
			}
		}

		public static GPUInfo GetGPUInfo() {
			using (var key = Registry.LocalMachine.OpenSubKey(@"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000")) {
				var pciId = key.GetValue("MatchingDeviceId").ToString().ToLower();

				return new GPUInfo {
					Vendor = key.GetValue("ProviderName").ToString(),
					Model = key.GetValue("DriverDesc").ToString(),
					VendorId = pciId.Substring(pciId.IndexOf("ven_") + 4, 4),
					DeviceId = pciId.Substring(pciId.IndexOf("dev_") + 4, 4),
					DriverVersion = key.GetValue("DriverVersion").ToString(),
					Memory = Convert.ToInt64((uint)(int)key.GetValue("HardwareInformation.MemorySize"))
				};
			}
		}

		#region SMBIOS helpers
		private static byte[] GetSMBIOS() {
			var size = GetSystemFirmwareTable(RSMB, 0, null, 0);
			if (size == 0) return null;

			var data = new byte[size];
			GetSystemFirmwareTable(RSMB, 0, data, size);

			return data;
		}

		private static int FindTableOffset(byte[] data) {
			if (data == null) return -1;
			var offset = 8;

			while (offset + 4 < data.Length) {
				if (data[offset] == 1) return offset;

				offset += data[offset + 1];
				while (offset + 1 < data.Length && (data[offset] != 0 || data[offset + 1] != 0)) {
					offset++;
				}

				offset += 2;
			}

			return -1;
		}

		private static string GetSMBIOSString(byte[] data, int startOffset, byte targetIdx){
			if (targetIdx == 0 || startOffset >= data.Length) return "Unknown";

			int currentIdx = 1;
			int i = startOffset;

			while (i < data.Length)
			{
				if (data[i] == 0)
				{
					if (currentIdx == targetIdx)
					{
						int length = i - startOffset;
						return length > 0 ? Encoding.ASCII.GetString(data, startOffset, length).Trim() : "Unknown";
					}
					currentIdx++;
					startOffset = i + 1;
					if (i + 1 < data.Length && data[i + 1] == 0) break;
				}
				i++;
			}

			return "Unknown";
		}
		#endregion

		#region Machine info helpers
		private static string GetSystemUUID(byte[] smbiosData) {
			var offset = FindTableOffset(smbiosData);
			if (offset == -1 || smbiosData[offset + 1] < 0x19) return null;

			var uuidBytes = new byte[16];
			Buffer.BlockCopy(smbiosData, offset + 8, uuidBytes, 0, 16);

			return new Guid(uuidBytes).ToString().ToUpper();
		}

		private static string GetSystemVendor(byte[] smbiosData) {
			var offset = FindTableOffset(smbiosData);
			if (offset == -1) return "Unknown";

			var index = smbiosData[offset + 4];
			return GetSMBIOSString(smbiosData, offset + smbiosData[offset + 1], index);
		}

		private static string GetSystemModel(byte[] smbiosData) {
			var offset = FindTableOffset(smbiosData);
			if (offset == -1) return "Unknown";

			var index = smbiosData[offset + 5];
			return GetSMBIOSString(smbiosData, offset + smbiosData[offset + 1], index);
		}

		private static string GetOSBuild() {
			try {
				var is64Bit = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("PROCESSOR_ARCHITEW6432")) || Environment.GetEnvironmentVariable("PROCESSOR_ARCHITECTURE").Contains("64");

				using (var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows NT\CurrentVersion")) {
					var productName = key.GetValue("ProductName").ToString();
					var majorVersion = key.GetValue("CurrentMajorVersionNumber").ToString();
					var minorVersion = key.GetValue("CurrentMinorVersionNumber").ToString();
					var currentBuild = key.GetValue("CurrentBuild").ToString();
					var ubr = key.GetValue("UBR").ToString();

					if (int.Parse(currentBuild) >= 22000) {
						productName = productName.Replace("Windows 10", "Windows 11");
					}

					return $"Microsoft {productName} {(is64Bit ? "64-bit" : "32-bit")} ({majorVersion}.{minorVersion}.{currentBuild}.{ubr})";
				}
			} catch (Exception e) {
				UnityEngine.Debug.LogError(e);
			}

			return "Unknown OS";
		}
		#endregion

		#region CPU helpers
		private static void GetCPUCoreCounts(out int cores, out int threads) {
			cores = 0;
			threads = Environment.ProcessorCount;

			var length = (uint)0;
			GetLogicalProcessorInformation(IntPtr.Zero, ref length);

			var buffer = Marshal.AllocHGlobal((int)length);
			GetLogicalProcessorInformation(buffer, ref length);

			var structSize = UIntPtr.Size == 4 ? 24 : 32;
			var structCount = (int)length / structSize;

			for (var i = 0; i < structCount; i++) {
				int relationshipOffset = (i * structSize) + UIntPtr.Size;
				int relationship = Marshal.ReadInt32(buffer, relationshipOffset);

				if (relationship == 0) {
					cores++;
				}
			}

			Marshal.FreeHGlobal(buffer);
		}

		private static long GetTotalMemoryBytes() {
			var buffer = Marshal.AllocHGlobal(64);
			Marshal.WriteInt32(buffer, 0, 64);

			GlobalMemoryStatusEx(buffer);

			var totalMemory = Marshal.ReadInt64(buffer, 8);

			Marshal.FreeHGlobal(buffer);

			return totalMemory;
		}
		#endregion
	}
}
