# Security

This is an actively developed prototype. The `main` branch is the maintained version; there is no published support guarantee for older snapshots.

Please report suspected authentication, ownership, private-media, or data-exposure problems through [GitHub private vulnerability reporting](https://github.com/PhillipVedder/gym-paradise/security/advisories/new). Include reproduction steps using disposable data, the affected commit, and the expected versus observed access. Do not include credentials or another person's private data.

For ordinary UI bugs, use the public issue tracker.

## Deployment boundary

Hosted requests must pass through the trusted Sites authentication gateway. The raw Worker trusts its identity header and must not be exposed directly to arbitrary clients. Any hosting migration must establish a verified identity boundary first.

The demo runner is local development tooling, binds to loopback, and uses a fixed disposable identity. It must not be published through a tunnel or used as internet authentication. See [architecture](docs/architecture.md#storage-and-trust-boundary).
