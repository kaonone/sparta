import Web3 from 'web3';

import { isHex } from 'utils/hex/isHex';

export function getPledgeId(supproterAddress: string, borrowerAddress: string, proposalId: string) {
  return Web3.utils.keccak256(
    `0x${normalizeHex(supproterAddress)}${normalizeHex(borrowerAddress)}${normalizeHex(
      proposalId,
    )}`,
  );
}

function normalizeHex(value: string): string {
  const s = (() => {
    switch (true) {
      case isHex(value, undefined, true):
        return value.slice(2);
      case isHex(`0x${value}`, undefined, true):
        return value;
      default:
        return null;
    }
  })();

  if (s === null) {
    throw new Error(`value: "${value}" is not a hex`);
  }

  if (s.length % 2 === 1) {
    return `0${s}`;
  }

  return s.toLowerCase();
}
