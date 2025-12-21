/**
 * Contract verification utility
 * Verifies if a contract exists at a given address by checking bytecode
 */

/**
 * Verifies if a contract exists at the given address by checking bytecode
 * @param {string} address - The contract address to verify
 * @param {object} publicClient - The viem public client instance
 * @returns {Promise<{exists: boolean, error: string|null}>}
 */
export const verifyContractExists = async (address, publicClient) => {
  if (!address || !publicClient) {
    return {
      exists: false,
      error: 'Address or client not provided'
    };
  }

  try {
    const bytecode = await publicClient.getBytecode({ address });

    // A contract exists if bytecode is present and not just '0x'
    const exists = bytecode && bytecode !== '0x';

    return {
      exists,
      error: exists ? null : `No contract found at address ${address}`
    };
  } catch (err) {
    console.error('Error verifying contract:', err);
    return {
      exists: false,
      error: `Failed to verify contract at ${address}: ${err.message}`
    };
  }
};
