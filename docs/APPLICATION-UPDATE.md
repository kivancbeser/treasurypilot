# Application evidence — 21 October 2026

These paragraphs describe completed work. They do not claim public testnet deployment, security audit, external users, revenue, or accepted pilots.

## 6. Links

Interactive demo: https://treasurypilot-gamma.vercel.app
GitHub: https://github.com/kivancbeser/treasurypilot

The public demo uses simulated browser-local funds and roles. The repository also includes an authenticated local team beta and a Solidity vault prototype tested on a local EVM.

## 11. Shipped and validated

As of 21 October 2026, I have shipped a public interactive demo, an authenticated local team beta, and a Solidity treasury vault prototype tested on a local EVM.

Public demo: https://treasurypilot-gamma.vercel.app
GitHub: https://github.com/kivancbeser/treasurypilot

The public demo supports configurable revenue allocation, budget reservations, payment requests, simulated separate-reviewer approvals, cancellation, CSV reporting, and runway scenarios. The local beta adds password-based accounts, persistent server-side records, and server-enforced admin, requester, and reviewer permissions.

Thirteen automated tests pass, including HTTP and local-EVM integration scenarios. The contract test covers deposits, budget reservations, separate-role approval, recipient withdrawals, rejection, cancellation, and policy changes. Core browser workflows have also been manually checked.

Prelaunch, with no external users or revenue yet. The public demo uses simulated funds. The contract has not been independently audited or deployed to a public testnet. Elysium testnet deployment and structured evaluation with early-stage teams are the next milestones; no external pilot participation has been confirmed.

## 19. Technical, security and operational risks

The public demo uses browser-local storage and simulated identities and does not handle real funds. The authenticated local beta enforces roles on the server and persists records to a local file, but is designed for a single process and one shared workspace; it is not configured for internet-facing production use.

The Solidity native-asset vault is compiled and tested locally, with separate immutable admin and reviewer addresses and recipient-initiated withdrawals after approval. It has no role rotation or recovery, no ERC-20 support, and no independent audit. Lost role keys or incompatible recipients can strand funds. No public testnet or mainnet contract is deployed. Development-only EVM tooling has dependency audit advisories and is not included in the public static demo.

Before any real-fund release, I would require additional threat modeling, production authentication and persistence, explicit custody and admin controls, and independent security review. TreasuryPilot is currently a solo, part-time project, so scope and delivery milestones will remain narrow.
