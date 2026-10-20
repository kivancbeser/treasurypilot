# Treasury vault testnet preparation

Status: source compiled and exercised on a local Ganache EVM. **No public testnet deployment or external pilot is claimed.**

## Verified network details (20 October 2026)

Source: https://elysium.kinetiq.xyz/docs/connecting-to-elysium

- Elysium Testnet chain ID: 99801 (`0x185d9`). Public RPC `eth_chainId` was checked and returned this value.
- RPC: https://testnet-rpc.elysium.kinetiq.xyz
- Explorer: https://elysium.kinetiq.xyz/testnet-explorer
- Faucet: https://elysium.kinetiq.xyz/testnet-faucet
- Native gas/test asset: test HYPE. Mainnet is out of scope.

## Prerequisites

Two distinct EVM test accounts: admin and reviewer. They can be separate accounts in one wallet application for testing, but this does not demonstrate independent human control. Both need faucet test HYPE for gas. A recipient also needs gas to withdraw its approved credit; it may be one of those accounts in a test scenario.

Never share or commit private keys, seed phrases, or wallet recovery data. Sign transactions through your own wallet. No private-key deployment script is supplied.

## Compile and inspect

```sh
npm install
npm run compile:contract
npm test
```

Compiler: solc 0.8.30, optimizer 200 runs, EVM target Paris. The artifact in `artifacts/TreasuryPilotVault.json` contains the ABI and deployment bytecode and is excluded from Git. Ganache and Solidity tooling are development dependencies only, excluded from the static public demo. Ganache's development dependency tree reports audit advisories; do not expose the local EVM to a network or reuse its generated keys.

## Wallet-signed deployment workflow

1. Review `contracts/TreasuryPilotVault.sol`. There has been no independent audit.
2. In an official Solidity deployment tool such as Remix (https://remix.ethereum.org), compile the exact source with the settings above.
3. Select the injected wallet on **chain 99801**, verify its network and chain ID, and supply the two distinct public role addresses to the constructor.
4. The account owner reviews and signs deployment. Record the contract address and confirmed deployment transaction hash.
5. Verify/publish the exact source with compiler settings on a supported explorer if available. Do not describe the contract as verified before checking the explorer result.

## Minimal acceptance scenario (test assets only)

1. Call `deposit()` with 0.001 test HYPE. It credits budgets 40/30/20/10. Plain transfers are not the deposit interface.
2. As admin, call `request(1, recipient, 100000000000000, bytes32(0))` for 0.0001 test HYPE from Development. Bucket indices: reserve 0, development 1, marketing 2, community 3. Amounts are integer wei, **not UI demo cents**.
3. Confirm that admin cannot call `review`. Switch to reviewer and call `review(0, true)`.
4. Approval creates a withdrawable recipient credit. It does not transfer HYPE immediately. As recipient call `withdraw()`; verify the receipt, vault balance delta and zeroed credit.
5. Create another request and reject or cancel it. Confirm the budget reservation is released without spending its balance.
6. Publish a small evidence table with chain ID, address, each action, tx hash and explorer link. None exists yet.

## Deliberate constraints

Native test asset only; no ERC-20 support, multisig integration, upgrades, admin rescue, role rotation or account recovery. Lost role keys can strand funds. Approved credits are withdrawn by their recipient. A recipient unable to accept native transfers cannot withdraw; use controlled test accounts. This is a technical prototype, not production treasury custody. Local-EVM tests are not an independent audit or public testnet evidence.
