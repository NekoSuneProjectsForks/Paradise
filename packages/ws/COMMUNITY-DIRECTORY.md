# Community directory reporting

Paradise can optionally report its authenticated Comm and Game realtime servers to the UberStrike community directory. Reporting is disabled by default and does not change client patching, Paradise authentication, or gameplay.

## Enable reporting

In `paradise.yml`, set the directory URL and enable the integration:

```yaml
CommunityDirectory:
  Enabled: true
  Url: 'https://paradise-directory.nekosunevr.co.uk/'
  HeartbeatInterval: 30
  RequestTimeout: 5000
  MaxPlayerCount: 100
```

Use the base HTTPS URL of the directory. HTTP is accepted only for loopback development. The `PhotonServers` records being reported need a public IPv4 address, public realtime port, a UUID v4 `Guid`, and must be enabled. Paradise reports a server after it authenticates to the Paradise web service and refreshes its lease while connected.

Paradise creates `.paradise-community-directory.key` in its working directory on first report. Keep this file private and preserve it across restarts: it derives the per-server directory credentials. Alternatively, set `PARADISE_COMMUNITY_DIRECTORY_SECRET` to a base64 encoded secret containing at least 32 random bytes, and keep that value stable across restarts. Do not include either secret in source control.

The legacy `AuthenticateApplication` response now reads the shared directory's `/api/community/servers` endpoint and adapts verified `game` records to the existing `PhotonView` response. This preserves the game's existing server-browser UI and join flow. The public endpoint only returns records marked `online` by the directory's trusted realtime probe; Paradise heartbeats alone do not mark a server online. If the directory cannot be reached, Paradise falls back to its locally configured game-server records so authentication remains available.
