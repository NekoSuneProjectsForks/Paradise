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

using HarmonyLib;
using UnityEngine;

namespace Paradise.Client {
	/// <summary>
	/// Allows purchasing ingame bundles for free without Steam microtransactions.
	/// </summary>
	[HarmonyPatch(typeof(BundleManager))]
	public static class BundleManagerHook {
		private static ParadiseTraverse<BundleManager> traverse;

		[HarmonyPatch("BuyBundle"), HarmonyPrefix]
		public static bool BuyBundle_Prefix(BundleManager __instance, BundleUnityView bundle) {
			if (traverse == null) {
				traverse = ParadiseTraverse<BundleManager>.Create(__instance);
			}

			return true;
		}

		[HarmonyPatch("<BuyBundle>m__A7"), HarmonyPrefix]
		public static bool BuyBundle_m__A7_Prefix(bool success) {
			traverse.InvokeMethod("OnMicroTxnCallback", new object[] {
				new Steamworks.MicroTxnAuthorizationResponse_t {
					m_bAuthorized = (byte)(success ? 1 : 0)
				}
			});

			return false;
		}
	}
}
