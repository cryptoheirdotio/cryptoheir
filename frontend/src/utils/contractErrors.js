/**
 * Contract Error Parser for CryptoHeir
 * Handles parsing and mapping of smart contract errors to user-friendly messages
 */

import { decodeErrorResult } from 'viem';
import { contractABI } from './contract';

// Map of error signatures to error names (for quick lookup)
const ERROR_SIGNATURES = {
  // CryptoHeir Contract Errors
  '0xfb8f41b2': 'InvalidBeneficiary',
  '0x4a8bc1e2': 'InvalidDeadline',
  '0x356680b7': 'InsufficientAmount',
  '0x82b42900': 'InvalidTokenTransfer',
  '0x0686117c': 'InheritanceNotFound',
  '0xd5e3c468': 'AlreadyClaimed',
  '0xc2237061': 'DeadlineNotReached',
  '0x3087e2e7': 'DeadlineAlreadyPassed',
  '0xa295ac11': 'OnlyDepositor',
  '0x85d1f726': 'OnlyBeneficiary',
  '0x64283d7b': 'OnlyFeeCollector',
  '0x7a34e7e0': 'InvalidFeeCollector',
  '0x6a76d5b2': 'NoPendingTransfer',

  // ERC20 Standard Errors (EIP-6093)
  '0xe602df05': 'ERC20InvalidApprover',
  '0x94280d62': 'ERC20InvalidSpender',
  '0x13be252b': 'ERC20InsufficientAllowance',
  '0xe450d38c': 'ERC20InsufficientBalance',
  '0xec442f05': 'ERC20InvalidSender',
  '0x96c6fd1e': 'ERC20InvalidReceiver'
};

// Map of custom contract errors to user-friendly messages
const ERROR_MESSAGES = {
  // Beneficiary & Address Errors
  InvalidBeneficiary: {
    message: 'Invalid beneficiary address. Please enter a valid address that is different from your wallet address.',
    severity: 'error'
  },

  // Deadline Errors
  InvalidDeadline: {
    message: 'Invalid deadline. The deadline must be set in the future.',
    severity: 'error'
  },
  DeadlineNotReached: {
    message: 'Cannot claim yet. The deadline has not been reached. Please wait until the deadline passes.',
    severity: 'warning'
  },
  DeadlineAlreadyPassed: {
    message: 'Cannot reclaim. The deadline has already passed and the beneficiary can now claim this inheritance.',
    severity: 'error'
  },

  // Amount Errors
  InsufficientAmount: {
    message: 'Amount must be greater than zero.',
    severity: 'error'
  },

  // Token Transfer Errors
  InvalidTokenTransfer: {
    message: 'Cannot send native tokens (ETH/MATIC) when depositing ERC20 tokens. Please set the amount to match the token you selected.',
    severity: 'error'
  },

  // Inheritance Status Errors
  InheritanceNotFound: {
    message: 'Inheritance not found. This inheritance may not exist or has been claimed.',
    severity: 'error'
  },
  AlreadyClaimed: {
    message: 'This inheritance has already been claimed and is no longer available.',
    severity: 'error'
  },

  // Permission Errors
  OnlyDepositor: {
    message: 'Only the original depositor can perform this action. Please connect with the wallet that created this inheritance.',
    severity: 'error'
  },
  OnlyBeneficiary: {
    message: 'Only the designated beneficiary can perform this action. Please connect with the beneficiary wallet.',
    severity: 'error'
  },
  OnlyFeeCollector: {
    message: 'Only the fee collector can perform this action.',
    severity: 'error'
  },

  // Fee Collector Errors
  InvalidFeeCollector: {
    message: 'Invalid fee collector address. The address cannot be zero.',
    severity: 'error'
  },
  NoPendingTransfer: {
    message: 'No pending fee collector transfer exists.',
    severity: 'error'
  },

  // ERC20 Standard Errors (EIP-6093)
  ERC20InvalidApprover: {
    message: 'Invalid approver address. Please ensure your wallet is connected properly.',
    severity: 'error'
  },
  ERC20InvalidSpender: {
    message: 'Invalid spender address provided for token approval.',
    severity: 'error'
  },
  ERC20InsufficientAllowance: {
    message: 'Insufficient token allowance. Please approve the contract to spend your tokens first.',
    severity: 'error'
  },
  ERC20InsufficientBalance: {
    message: 'Insufficient token balance. You do not have enough tokens to complete this transaction.',
    severity: 'error'
  },
  ERC20InvalidSender: {
    message: 'Invalid sender address for token transfer.',
    severity: 'error'
  },
  ERC20InvalidReceiver: {
    message: 'Invalid receiver address for token transfer.',
    severity: 'error'
  }
};

// Map of require() message patterns to user-friendly messages
const REQUIRE_MESSAGE_PATTERNS = {
  'Fee transfer failed': {
    message: 'Fee transfer failed. Please ensure you have enough balance to cover the transaction fee.',
    severity: 'error'
  },
  'Transfer failed': {
    message: 'Token transfer failed. Please check your balance and try again.',
    severity: 'error'
  }
};

/**
 * Extract contract error name from viem error object
 * @param {Error} error - The error object from viem/wagmi
 * @returns {string|null} - The contract error name or null if not found
 */
function extractContractError(error) {
  if (!error) return null;

  // Check if error has a name property that matches our custom errors
  if (error.name && ERROR_MESSAGES[error.name]) {
    return error.name;
  }

  // Check error message for custom error patterns
  // Viem formats custom errors like: "ContractFunctionExecutionError: The contract function reverted with the following reason: InvalidBeneficiary()"
  const errorMessage = error.message || error.toString();

  // Try to match error signatures like "0xfb8f41b2"
  const signatureMatch = errorMessage.match(/0x[a-fA-F0-9]{8}/);
  if (signatureMatch) {
    const signature = signatureMatch[0].toLowerCase();
    if (ERROR_SIGNATURES[signature]) {
      return ERROR_SIGNATURES[signature];
    }
  }

  // Try to decode error using viem if we have error data
  if (error.data) {
    try {
      const decodedError = decodeErrorResult({
        abi: contractABI,
        data: error.data,
      });
      if (decodedError && decodedError.errorName && ERROR_MESSAGES[decodedError.errorName]) {
        return decodedError.errorName;
      }
    } catch (decodeErr) {
      // Decoding failed, continue with other methods
    }
  }

  // Try to match require message patterns
  for (const [pattern, _] of Object.entries(REQUIRE_MESSAGE_PATTERNS)) {
    if (errorMessage.includes(pattern)) {
      return pattern;
    }
  }

  // Check if error.cause exists and has more details
  if (error.cause) {
    return extractContractError(error.cause);
  }

  // Check if error.walk exists (viem error tree walking)
  if (typeof error.walk === 'function') {
    let foundError = null;
    error.walk((err) => {
      if (err.name && ERROR_MESSAGES[err.name]) {
        foundError = err.name;
        return false; // Stop walking
      }
      // Check the error data if available
      if (err.data?.errorName && ERROR_MESSAGES[err.data.errorName]) {
        foundError = err.data.errorName;
        return false;
      }
    });
    if (foundError) return foundError;
  }

  return null;
}

/**
 * Parse contract error and return user-friendly message
 * @param {Error} error - The error object from viem/wagmi
 * @param {string} fallbackMessage - Optional fallback message if error cannot be parsed
 * @returns {string} - User-friendly error message
 */
export function parseContractError(error, fallbackMessage = 'Transaction failed') {
  if (!error) return fallbackMessage;

  // Try to extract custom contract error
  const contractError = extractContractError(error);

  if (contractError) {
    // Check custom errors first
    if (ERROR_MESSAGES[contractError]) {
      return ERROR_MESSAGES[contractError].message;
    }
    // Check require message patterns
    if (REQUIRE_MESSAGE_PATTERNS[contractError]) {
      return REQUIRE_MESSAGE_PATTERNS[contractError].message;
    }
  }

  // Handle common user-facing errors from wagmi/viem
  const errorMessage = error.message || error.toString();

  // User rejected the transaction
  if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
    return 'Transaction was rejected.';
  }

  // Insufficient funds for gas
  if (errorMessage.includes('insufficient funds')) {
    return 'Insufficient funds to cover gas fees. Please add more funds to your wallet.';
  }

  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
    return 'Network error. Please check your connection and try again.';
  }

  // ERC20 allowance errors
  if (errorMessage.includes('ERC20: insufficient allowance') || errorMessage.includes('allowance')) {
    return 'Token allowance is insufficient. Please approve the contract first.';
  }

  // ERC20 balance errors
  if (errorMessage.includes('ERC20: transfer amount exceeds balance')) {
    return 'Insufficient token balance.';
  }

  // If we have a specific error message from the error object, use it
  // Otherwise use the fallback
  if (error.shortMessage && error.shortMessage !== errorMessage) {
    return error.shortMessage;
  }

  // Return fallback message
  return fallbackMessage;
}

/**
 * Get error severity level
 * @param {Error} error - The error object
 * @returns {'error'|'warning'|'info'} - Severity level
 */
export function getErrorSeverity(error) {
  const contractError = extractContractError(error);

  if (contractError && ERROR_MESSAGES[contractError]) {
    return ERROR_MESSAGES[contractError].severity;
  }

  if (contractError && REQUIRE_MESSAGE_PATTERNS[contractError]) {
    return REQUIRE_MESSAGE_PATTERNS[contractError].severity;
  }

  return 'error';
}

/**
 * Check if an error is a contract revert error
 * @param {Error} error - The error object
 * @returns {boolean} - True if it's a contract revert error
 */
export function isContractError(error) {
  if (!error) return false;

  const contractError = extractContractError(error);
  return contractError !== null;
}
