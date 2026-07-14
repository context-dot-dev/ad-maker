# Security Policy

## Supported versions

Security fixes are applied to the latest code on `main`. This project does not currently maintain older release branches.

## Report a vulnerability

Please do not open a public issue for a suspected vulnerability. Email [hello@context.dev](mailto:hello@context.dev) with `Branda security` in the subject. If you prefer not to include sensitive details in the first message, ask for a private reporting channel.

Include the affected component, reproduction steps, potential impact, and any suggested mitigation. Do not include live API keys, customer data, or other secrets. We will acknowledge the report, investigate it, and coordinate disclosure with you before publishing details.

## Deployment responsibility

Branda's browser-facing API routes can trigger paid Context.dev and AI Gateway requests. Self-hosters should add authentication or rate limits, configure provider spend alerts, keep `.env` files out of version control, and rotate any key that may have been exposed. See [Deploy safely](./README.md#deploy-safely) for the deployment threat model.
