# Community directory reporting

Paradise can optionally report its authenticated Comm and Game realtime servers to the UberStrike community directory. Reporting is disabled by default and does not change client patching, Paradise authentication, or gameplay.

## Enable reporting

In `paradise.yml`, set the directory URL and enable the integration:

```yaml
CommunityDirectory:
  Enabled: true
  Url: 'https://directory.example.org'
  HeartbeatInterval: 30
  RequestTimeout: 5000
  MaxPlayerCount: 100
```

Use the base HTTPS URL of the directory. HTTP is accepted only for loopback development. The `PhotonServers` records being reported need a public IPv4 address, public realtime port, a UUID v4 `Guid`, and must be enabled. Paradise reports a server after it authenticates to the Paradise web service and refreshes its lease while connected.

Paradise creates `.paradise-community-directory.key` in its working directory on first report. Keep this file private and preserve it across restarts: it derives the per-server directory credentials. Alternatively, set `PARADISE_COMMUNITY_DIRECTORY_SECRET` to a base64 encoded secret containing at least 32 random bytes, and keep that value stable across restarts. Do not include either secret in source control.

The directory currently requires a trusted realtime probe before returning an entry from its public server-list endpoint. Paradise reporting registers and refreshes server metadata, but does not itself perform that probe. Therefore a reported server may remain `registered_unverified` and not appear in public discovery until the directory has a compatible probe configured.
