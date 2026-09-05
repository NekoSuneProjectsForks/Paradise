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
using UberStrike.Core.Types;
using System;

namespace Paradise.Client {
	/// <summary>
	/// Applies explosion-induced force to all players
	/// </summary>
	[HarmonyPatch(typeof(ProjectileDetonator))]
	public static class ProjectileDetonatorHook {
		[HarmonyPatch("DoExplosionDamage"), HarmonyPrefix]
		public static bool DoExplosionDamage_Prefix(IShootable shootable, Vector3 explosionPoint, Vector3 hitPoint, int projectileId, float damage, Vector3 dir, float radius, int force, byte slot, int weaponId, UberstrikeItemClass weaponClass, DamageEffectType damageEffectFlag, float damageEffectValue) {
			if (!Physics.Linecast(explosionPoint, hitPoint, out var raycastHit, UberstrikeLayerMasks.ProtectionMask) || raycastHit.transform == shootable.Transform || raycastHit.transform.GetComponent<BaseGameProp>() != null) {
				var distance = ((radius <= 1f) ? 0f : Mathf.Floor(Mathf.Clamp((hitPoint - explosionPoint).magnitude, 0f, radius)));
				var direction = (hitPoint - explosionPoint).normalized;

				if (distance < 0.01f) {
					direction = dir.normalized;
				} else if (Vector3.Angle(direction, Vector3.up) < 30f) {
					direction = Vector3.up;
					distance = 0f;
				}

				var falloffDamage = Convert.ToInt16((damage * (radius - distance) / radius) / 2);
				var forceVector = direction * (float)force;

				shootable.ApplyDamage(new DamageInfo(falloffDamage) {
					Force = forceVector,
					UpwardsForceMultiplier = 5f,
					Hitpoint = hitPoint,
					ProjectileID = projectileId,
					SlotId = slot,
					WeaponID = weaponId,
					WeaponClass = weaponClass,
					DamageEffectFlag = damageEffectFlag,
					DamageEffectValue = damageEffectValue,
					Distance = (byte)Mathf.Clamp(Mathf.CeilToInt(distance), 0, 255)
				});
			}

			return false;
		}
	}
}
