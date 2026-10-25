/*
 * Copyright (C) 2017, 2022-2026 Team FESTIVAL
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { createHmac, randomBytes, randomUUID } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import packageJson from '@/../package.json';
import { ActivePlayer, PhotonServer } from '@festivaldev/paradise-models';
import { Log } from '@/utils';
import type { CommunityDirectorySettings } from '@/ParadiseServiceSettings';
import { ServerType } from '../socket/WebSocket';

type DirectoryRecord = {
  name: string;
  address: string;
  port: number;
  region: string;
  game_mode: string;
  current_map: string;
  player_count: number;
  max_players: number;
  protocol_version: string;
  software_version: string;
  server_software: 'paradise';
  usage_type: 'comm' | 'game';
  visibility: 'public';
};

/** Reports only Paradise nodes that authenticated to this Paradise web service. */
export default class CommunityDirectoryClient {
  private readonly active = new Map<number, ServerType>();
  private timer?: ReturnType<typeof setInterval>;
  private updating = false;
  private enabled = false;
  private readonly registered = new Set<string>();
  private credentialSecret?: Buffer;

  constructor(private readonly settings: CommunityDirectorySettings) {}

  start(): void {
    if (!this.settings.Enabled) return;
    this.validateSettings();
    this.enabled = true;
    const interval = Math.max(10, Math.min(300, this.settings.HeartbeatInterval || 30)) * 1000;
    this.timer = setInterval(() => void this.heartbeatActive(), interval);
    Log.info(`[Directory] Paradise reporting enabled for ${new URL(this.settings.Url).origin}.`);
  }

  async serverConnected(photonId: number, type: ServerType): Promise<void> {
    if (
      !this.enabled ||
      !Number.isInteger(photonId) ||
      photonId < 0 ||
      (type !== ServerType.Comm && type !== ServerType.Game)
    ) return;
    this.active.set(photonId, type);
    await this.report(photonId, type);
  }

  serverDisconnected(photonId: number): void {
    this.active.delete(photonId);
    // The directory lease will expire if Paradise is stopped or disconnected.
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.active.clear();
    this.registered.clear();
    this.enabled = false;
  }

  private validateSettings(): void {
    const url = new URL(this.settings.Url);
    const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !localHttp) {
      throw new Error('CommunityDirectory.Url must use HTTPS (HTTP is allowed only for loopback testing).');
    }
    if (url.username || url.password || url.search || url.hash) {
      throw new Error('CommunityDirectory.Url must not contain credentials, query parameters, or a fragment.');
    }
    if (!Number.isFinite(this.settings.RequestTimeout) || this.settings.RequestTimeout < 250) {
      throw new Error('CommunityDirectory.RequestTimeout must be at least 250 milliseconds.');
    }
  }

  private async heartbeatActive(): Promise<void> {
    if (this.updating || !this.enabled) return;
    this.updating = true;
    try {
      await Promise.all([...this.active.entries()].map(([id, type]) => this.report(id, type)));
    } finally {
      this.updating = false;
    }
  }

  private getCredentialSecret(): Buffer {
    if (!this.credentialSecret) this.credentialSecret = loadCredentialSecret();
    return this.credentialSecret;
  }

  private async report(photonId: number, type: ServerType): Promise<void> {
    try {
      const server = await PhotonServer.findOne({ where: { PhotonId: photonId, Enabled: true } });
      if (!server) return;

      // PhotonServer.Guid is created with crypto.randomUUID(). Keep a separate stable
      // credential for the directory; never derive credentials from the game passphrase.
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(server.Guid)) {
        throw new Error(`Photon server ${photonId} does not have a UUID v4 server identity.`);
      }
      const credential = createHmac('sha256', this.getCredentialSecret())
        .update(`uberstrike-community-directory-v1:${server.Guid}`)
        .digest('hex');
      const playerColumn = type === ServerType.Comm ? 'CommServerId' : 'GameServerId';
      const playerCount = await ActivePlayer.count({ where: { [playerColumn]: photonId } });
      const maxPlayers = Math.min(256, Math.max(1, this.settings.MaxPlayerCount || 100));
      const metadata: DirectoryRecord = {
        name: server.Name.trim(),
        address: server.IP,
        port: server.Port,
        region: String(server.Region).trim(),
        game_mode: '',
        current_map: '',
        player_count: Math.min(maxPlayers, playerCount),
        max_players: maxPlayers,
        protocol_version: '4.3.10',
        software_version: packageJson.version,
        server_software: 'paradise',
        usage_type: type === ServerType.Comm ? 'comm' : 'game',
        visibility: 'public'
      };
      const endpoint = new URL(this.settings.Url);
      const requestOptions = {
        signal: AbortSignal.timeout(this.settings.RequestTimeout),
        headers: { 'Content-Type': 'application/json' }
      };

      if (!this.registered.has(server.Guid)) {
        const registration = await fetch(new URL('/api/v1/servers/register', endpoint), {
          ...requestOptions,
          method: 'POST',
          body: JSON.stringify({ id: server.Guid, credential, ...metadata })
        });
        // 400 can mean the UUID was registered by a prior process start. Confirm
        // identity/credential with the signed heartbeat below before using it.
        if (registration.status !== 201 && registration.status !== 400) {
          throw new Error(`registration returned HTTP ${registration.status}: ${await registration.text()}`);
        }
        this.registered.add(server.Guid);
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = randomUUID().replaceAll('-', '');
      const canonical = canonicalJson(metadata);
      const signature = createHmac('sha256', credential)
        .update(`${server.Guid}\n${timestamp}\n${nonce}\n${canonical}`)
        .digest('hex');
      const heartbeat = await fetch(
        new URL(`/api/v1/servers/${server.Guid}/heartbeat`, endpoint),
        {
          ...requestOptions,
          method: 'POST',
          body: JSON.stringify({ credential, timestamp, nonce, signature, ...metadata })
        }
      );
      if (!heartbeat.ok) {
        throw new Error(`heartbeat returned HTTP ${heartbeat.status}: ${await heartbeat.text()}`);
      }
      Log.debug(`[Directory] Reported Paradise ${metadata.usage_type} server ${server.Name} (${server.Guid}).`);
    } catch (error) {
      Log.warn(`[Directory] Could not report Paradise server ${photonId}; gameplay continues. ${String(error)}`);
    }
  }
}

function canonicalJson(value: Record<string, unknown>): string {
  const normalized = Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, item]) => [
      key,
      item && typeof item === 'object' && !Array.isArray(item)
        ? JSON.parse(canonicalJson(item as Record<string, unknown>))
        : item
    ])
  );
  return JSON.stringify(normalized);
}

// The secret file is created once beside the Paradise process config. Deployments
// can provide the same stable 32-byte-or-longer value through the environment.
function loadCredentialSecret(): Buffer {
  const configured = process.env.PARADISE_COMMUNITY_DIRECTORY_SECRET;
  if (configured) {
    const secret = Buffer.from(configured, 'base64');
    if (secret.length < 32) throw new Error('PARADISE_COMMUNITY_DIRECTORY_SECRET must be base64 for at least 32 random bytes.');
    return secret;
  }

  const filename = path.join(process.cwd(), '.paradise-community-directory.key');
  try {
    const secret = readFileSync(filename);
    if (secret.length < 32) throw new Error(`Directory credential file ${filename} must contain at least 32 random bytes.`);
    return secret;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  const secret = randomBytes(32);
  try {
    writeFileSync(filename, secret, { flag: 'wx', mode: 0o600 });
    return secret;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const existing = readFileSync(filename);
    if (existing.length < 32) throw new Error(`Directory credential file ${filename} must contain at least 32 random bytes.`);
    return existing;
  }
}
