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
using System;
using System.Reflection;
using UnityEngine;

namespace Paradise.Client {
	/// <summary>
	/// Restores "missing" announcer lines by converting the sound delay from seconds to milliseconds. (Why, oh why, Cmune??)
	/// </summary>
	[HarmonyPatch(typeof(SfxManager))]
	public static class SfxManagerHook {
		[HarmonyPatch("Play2dAudioClip", new Type[] { typeof(AudioClip), typeof(ulong), typeof(float), typeof(float) }), HarmonyPostfix]
		public static void Play2dAudioClip_Postfix(AudioClip audioClip, ulong delay, float volume, float pitch) {
			if (audioClip == null) {
				return;
			}

			AudioSource uiAudioSource = (AudioSource)typeof(SfxManager).GetField("uiAudioSource", BindingFlags.Instance | BindingFlags.NonPublic).GetValue(AutoMonoBehaviour<SfxManager>.Instance);

			if (delay > 0UL) {
				uiAudioSource.clip = audioClip;
				uiAudioSource.PlayDelayed(delay / 1000f);
			} else {
				uiAudioSource.PlayOneShot(audioClip);
			}

			ApplicationOptions applicationOptions = ApplicationDataManager.ApplicationOptions;
			float volumeMultiplier = (!applicationOptions.AudioEnabled) ? 0f : (applicationOptions.AudioEffectsVolume * applicationOptions.AudioMasterVolume);

			uiAudioSource.volume = volumeMultiplier * volume;
			uiAudioSource.pitch = pitch;
		}
	}
}
