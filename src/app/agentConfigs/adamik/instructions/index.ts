// Instruction Composer
// Combines modular instructions based on context

import { baseInstructions } from "./baseInstructions";
import {
  networkInstructions,
  walletCreationInstructions,
} from "./networkInstructions";
import { hardwareWalletInstructions } from "./hardwareWalletInstructions";
import { treasuryInstructions } from "./treasuryInstructions";
import {
  transactionInstructions,
  nonEvmInstructions,
} from "./transactionInstructions";

export interface InstructionContext {
  includeHardwareWallet?: boolean;
  includeTreasury?: boolean;
  includeTransactions?: boolean;
  includeNetworks?: boolean;
  includeWalletCreation?: boolean;
}

export const composeInstructions = (
  context: InstructionContext = {}
): string => {
  const {
    includeHardwareWallet = true,
    includeTreasury = true,
    includeTransactions = true,
    includeNetworks = true,
    includeWalletCreation = true,
  } = context;

  const instructionSections = [baseInstructions];

  if (includeNetworks) {
    instructionSections.push(networkInstructions);
  }

  if (includeWalletCreation) {
    instructionSections.push(walletCreationInstructions);
  }

  if (includeHardwareWallet) {
    instructionSections.push(hardwareWalletInstructions);
  }

  if (includeTreasury) {
    instructionSections.push(treasuryInstructions);
  }

  if (includeTransactions) {
    instructionSections.push(transactionInstructions);
  }

  // Always include non-EVM instructions
  instructionSections.push(nonEvmInstructions);

  return instructionSections.join("\n\n");
};

// Predefined instruction sets for common scenarios
export const instructionPresets = {
  // Full-featured agent (current behavior)
  full: () => composeInstructions(),

  // Basic wallet operations only
  basic: () =>
    composeInstructions({
      includeHardwareWallet: false,
      includeTreasury: false,
      includeTransactions: true,
      includeNetworks: true,
      includeWalletCreation: true,
    }),

  // Security-focused (hardware wallet emphasis)
  security: () =>
    composeInstructions({
      includeHardwareWallet: true,
      includeTreasury: false,
      includeTransactions: true,
      includeNetworks: true,
      includeWalletCreation: false,
    }),

  // Treasury management focused
  treasury: () =>
    composeInstructions({
      includeHardwareWallet: true,
      includeTreasury: true,
      includeTransactions: false,
      includeNetworks: true,
      includeWalletCreation: false,
    }),
};

// Legacy export for backward compatibility
export const fullInstructions = instructionPresets.full();
