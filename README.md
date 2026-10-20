# TreasuryPilot

**Turn project revenue into accountable team budgets.**

TreasuryPilot is an early-stage treasury operations prototype for teams launching in emerging ecosystems, including Ascend / Elysium. It demonstrates revenue allocation, budget reservations, two-person payment review, and a readable activity history.

**Status: interactive local prototype. No blockchain integration, wallet authentication, custody, or real transfers. Not affiliated with or endorsed by Ascend, Elysium, or Kinetiq.**

## Run locally

Requires Node.js 20 or newer. No packages or API keys needed.

```sh
npm start
```

Open http://127.0.0.1:4173. Run accounting and approval checks with `npm test`.

![TreasuryPilot dashboard](preview.png)

## Two-minute walkthrough

1. Allocate 1,000 demo USD. Reserve receives 400, development 300, marketing 200, and community 100.
2. Request 150 from Development to `0x1111111111111111111111111111111111111111` for “Frontend milestone 1”.
3. Observe the pending reservation: Development has 300 total and 150 available.
4. Switch the simulated team member to Alex and approve. Development now has 150. No funds are sent.
5. Request another payment and reject it to release its reservation. Inspect the activity log.

Use **Load sample workspace** for a fictional scenario with approved and pending payments. Switch between Kivanc and Alex to explore requesting, cancellation, and separate review.

Demo state is stored in localStorage. Reset demo clears it after confirmation. Do not enter sensitive information.

## What is implemented

- Editable allocation policy (40/30/20/10 by default) for future revenue, with integer-cent accounting and largest-remainder allocation.
- Budget checks that account for pending reservations.
- Payment requests, explicit simulated role switching, requester cancellation, approval, and rejection.
- Treasury health summary showing available funds after pending reservations.
- Payment status filters and CSV export with spreadsheet formula-prefix protection.
- Guided example workspace, responsive dashboard, and browser-local activity history.
- Saved-state validation with accounting and reservation consistency checks.
- Dependency-free Node test suite and an optional CI workflow example (`ci-workflow.example.yml`).

## Limits and trust model

Roles are simulated in one browser, not authenticated. Browser storage can be edited and is not an immutable audit trail. Wallet address validation checks format only. Accounting uses two decimal places for simulated USD; production token accounting requires token-specific integer precision. Deposits are manual simulations and do not verify revenue origin. Approval updates local accounting only. The UI uses Google Fonts with system-font fallbacks.

## Technical review

See [architecture and trust boundaries](docs/ARCHITECTURE.md). Ten automated tests cover the core accounting, policy, lifecycle, storage validation, and export behavior. These are not an independent security audit.

## Planned next steps

1. Validate the workflow with three project teams and refine approval policies.
2. Add authenticated team roles and persistence with server-side authorization.
3. Build and test a minimal on-chain vault with verified token configuration, real multisignature authorization, and constrained payouts.
4. Deploy to a supported testnet; publish verified contract addresses and transaction evidence.
5. Complete independent security review before any real-fund release.

No Ascend API, revenue integration, token deployment, or partner relationship is claimed. Any future Ascend revenue receipt would be treated as an input to the team's treasury, under separately agreed integration terms.

## Contact

Kivanc — Founder · [X: @coinstampp](https://x.com/coinstampp) · Discord: `kivanc.coinstamp`

## License

MIT. See LICENSE.
