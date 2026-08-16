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

using CommandLine;

namespace Paradise.Realtime.Host {
	class ApplicationOptions {
		[Option("listen")]
		public string ListenAddress { get; set; }

		[Option("port")]
		public int? Port { get; set; }

		[Option("binary-path")]
		public string BinaryPath { get; set; }

		[Option("max-peers")]
		public int? MaxPeers { get; set; }

		[Option("key")]
		public string ConnectionKey { get; set; }

		public override string ToString() {
			return $"ListenAddress={ListenAddress} Port={Port} BinaryPath={BinaryPath} MaxPeers={MaxPeers} ConnectionKey={ConnectionKey}";
		}
	}

	[Verb("comm", HelpText = "Launches the Paradise Communication Server.")]
	class CommApplicationOptions : ApplicationOptions {
		// public override int Port { get; set; } = 5055;
	}

	[Verb("game", HelpText = "Launches the Paradise Game Server.")]
	class GameApplicationOptions : ApplicationOptions {
		// public override int Port { get; set; } = 5155;
	}
}
