# Security policy

## Reporting a vulnerability

Do not open a public issue for a vulnerability. Use the private report form: **Security** tab of the repository > **Report a vulnerability**.

Describe what you found, how to reproduce it and what an attacker gains. You get an answer within a week.

## What matters most

The app keeps a Google refresh token in an encrypted cookie and reads calendar data. The assets to protect, the attackers considered and what is accepted are in [docs/architecture/THREAT-MODEL.md](docs/architecture/THREAT-MODEL.md).

## Supported versions

Only the latest commit of `main` is supported.
