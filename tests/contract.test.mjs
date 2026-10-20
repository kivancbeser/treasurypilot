import test from 'node:test';
import assert from 'node:assert/strict';
import ganache from 'ganache';
import { BrowserProvider, ContractFactory, ZeroAddress, ZeroHash } from 'ethers';
import { compileVault } from '../scripts/compile-contract.mjs';

test('native-asset vault enforces roles, reservations, review and real local-EVM withdrawal', async () => {
  const rpc = ganache.provider({ logging: { quiet: true }, wallet: { totalAccounts: 4 } });
  try {
    const provider = new BrowserProvider(rpc); provider.pollingInterval = 10;
    const admin = await provider.getSigner(0), reviewer = await provider.getSigner(1), recipient = await provider.getSigner(2), outsider = await provider.getSigner(3);
    const artifact = await compileVault();
    const mustRevert = async promise => assert.rejects(async () => { const tx = await promise; if (tx.wait) await tx.wait(); else if (tx.waitForDeployment) await tx.waitForDeployment(); });
    const factory = new ContractFactory(artifact.abi, artifact.evm.bytecode.object, admin);
    await mustRevert(factory.deploy(await admin.getAddress(), await admin.getAddress()));
    const vault = await factory.deploy(await admin.getAddress(), await reviewer.getAddress()); await vault.waitForDeployment();
    await (await vault.deposit({ value: 10000n })).wait();
    assert.equal(await vault.balances(1), 3000n);
    await mustRevert(vault.connect(outsider).request(1, await recipient.getAddress(), 1n, ZeroHash));
    await mustRevert(vault.request(1, ZeroAddress, 1n, ZeroHash));
    await mustRevert(vault.request(1, await vault.getAddress(), 1n, ZeroHash));
    await (await vault.request(1, await recipient.getAddress(), 2000n, ZeroHash)).wait();
    await mustRevert(vault.request(1, await recipient.getAddress(), 2000n, ZeroHash));
    await mustRevert(vault.review(0, true));
    await (await vault.connect(reviewer).review(0, true)).wait();
    assert.equal(await vault.balances(1), 1000n); assert.equal(await vault.reserved(1), 0n); assert.equal(await vault.credits(await recipient.getAddress()), 2000n);
    await mustRevert(vault.connect(reviewer).review(0, true));
    await (await vault.connect(recipient).withdraw()).wait();
    assert.equal(await vault.credits(await recipient.getAddress()), 0n); assert.equal(await vault.totalWithdrawn(), 2000n);
    assert.equal(BigInt(await rpc.request({ method: 'eth_getBalance', params: [await vault.getAddress(), 'latest'] })), 8000n);
    await (await vault.request(0, await recipient.getAddress(), 100n, ZeroHash)).wait();
    await (await vault.connect(reviewer).review(1, false)).wait(); assert.equal(await vault.balances(0), 4000n);
    await (await vault.request(0, await recipient.getAddress(), 100n, ZeroHash)).wait();
    await (await vault.cancel(2)).wait(); assert.equal(await vault.reserved(0), 0n);
    await mustRevert(vault.connect(outsider).setPolicy([100, 0, 0, 0]));
    await mustRevert(vault.setPolicy([50, 50, 1, 0]));
    await (await vault.setPolicy([50, 50, 0, 0])).wait();
    await (await vault.deposit({ value: 1n })).wait();
    assert.equal(await vault.balances(0), 4001n); assert.equal(await vault.balances(3), 1000n);
    assert.equal(await vault.totalDeposited(), 10001n);
  } finally { await rpc.disconnect(); }
});
