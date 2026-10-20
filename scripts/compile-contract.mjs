import solc from 'solc';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
export async function compileVault() {
  const source = await readFile(new URL('../contracts/TreasuryPilotVault.sol', import.meta.url), 'utf8');
  const input = { language: 'Solidity', sources: { 'TreasuryPilotVault.sol': { content: source } }, settings: { evmVersion: 'paris', optimizer: { enabled: true, runs: 200 }, outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } } };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = output.errors?.filter(e => e.severity === 'error');
  if (errors?.length) throw new Error(errors.map(e => e.formattedMessage).join('\n'));
  return output.contracts['TreasuryPilotVault.sol'].TreasuryPilotVault;
}
if (process.argv[1]?.endsWith('compile-contract.mjs')) {
  const artifact = await compileVault(); await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
  await writeFile(new URL('../artifacts/TreasuryPilotVault.json', import.meta.url), JSON.stringify(artifact, null, 2));
  console.log('Compiled TreasuryPilotVault. Artifact is local only; no deployment performed.');
}
