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

namespace Photon.SocketServer {
    public abstract class ApplicationBase : MarshalByRefObject {
        private string applicationPath;
		private string binaryPath;
		private string applicationRootPath;

        private RealtimeHost host;

        private int peerCount;
		private int running;

		private Version sdkVersion = new Version("1.0.0.0");
		private Version coreVersion = new Version("1.0.0.0");

        public static ApplicationBase Instance { get; private set; }
        public string ApplicationName { get; private set; }

        public string ApplicationPath {
			get {
				return applicationPath;
			}
		}

        public string BinaryPath {
			get {
				return binaryPath;
			}
		}

        public string ApplicationRootPath {
			get {
				return this.applicationRootPath;
			}
		}

		public int PeerCount {
			get {
				return peerCount;
			}
		}

        public bool Running {
			get {
				return running == 1;
			}
		}

        public Version CoreVersion {
			get {
				return coreVersion;
			}
		}

		public Version SdkVersion {
			get {
				return sdkVersion;
			}
		}

        protected internal abstract void Setup();
		protected internal abstract void TearDown();
		protected internal abstract PeerBase CreatePeer(InitRequest initRequest);

        public void RunHost(RealtimeHostOptions options) {
            Instance = this;
			binaryPath = string.IsNullOrEmpty(options.BinaryPath) ? System.AppContext.BaseDirectory : options.BinaryPath;
			applicationPath = string.IsNullOrEmpty(options.ApplicationPath) ? BinaryPath : options.ApplicationPath;

			Setup();

			host = new RealtimeHost(this, options);
			host.Run();
        }

        public void StopHost() {
			host?.Stop();

			TearDown();
		}

        internal PeerBase CreatePeerInternal(InitRequest initRequest) => CreatePeer(initRequest);
    }
}
