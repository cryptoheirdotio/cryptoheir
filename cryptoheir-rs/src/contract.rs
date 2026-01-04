//! CryptoHeir contract ABI encoding and bytecode loading

use crate::Result;
use alloy::{
    primitives::{Address, Bytes, U256},
    sol,
    sol_types::{SolCall, SolInterface},
};

/// Path to the compiled CryptoHeir contract artifact
const CONTRACT_ARTIFACT_PATH: &str = "../foundry/out/CryptoHeir.sol/CryptoHeir.json";

// Define the contract ABI by loading from Foundry's compiled artifacts
// This automatically syncs with the Solidity contract - just run `forge build` and recompile
// Note: sol! macro requires a string literal (can't use the constant above)
sol!(
    #[sol(rpc)]
    CryptoHeir,
    "../foundry/out/CryptoHeir.sol/CryptoHeir.json"
);

/// Load contract bytecode from Foundry artifacts
pub fn load_bytecode() -> Result<Bytes> {
    let artifact_str = std::fs::read_to_string(CONTRACT_ARTIFACT_PATH).map_err(|e| {
        eyre::eyre!(
            "Failed to read contract artifact at {}: {}. Make sure Foundry contracts are compiled.",
            CONTRACT_ARTIFACT_PATH,
            e
        )
    })?;

    let artifact: serde_json::Value = serde_json::from_str(&artifact_str)?;

    let bytecode_str = artifact["bytecode"]["object"]
        .as_str()
        .ok_or_else(|| eyre::eyre!("Bytecode not found in artifact"))?;

    let bytecode: Bytes = bytecode_str.parse()?;

    if bytecode.is_empty() {
        return Err(eyre::eyre!("Contract bytecode is empty"));
    }

    Ok(bytecode)
}

/// Encode deposit function call
/// Returns (calldata, value)
/// Note: Parameter order matches Solidity: token, beneficiary, amount, deadline
pub async fn encode_deposit(
    beneficiary: Address,
    amount: U256,
    deadline: u64,
    token: Option<Address>,
) -> Result<(Bytes, Option<U256>)> {
    let token_addr = token.unwrap_or(Address::ZERO);
    let deadline_u256 = U256::from(deadline);

    // If token is zero address, this is a native token deposit
    let value = if token.is_none() {
        Some(amount)
    } else {
        None
    };

    // Encode the function call - using actual parameter names from contract
    let call = CryptoHeir::depositCall {
        _token: token_addr,
        _beneficiary: beneficiary,
        _amount: amount,
        _deadline: deadline_u256,
    };

    let calldata = call.abi_encode().into();

    Ok((calldata, value))
}

/// Encode claim function call
pub fn encode_claim(id: U256) -> Result<Bytes> {
    let call = CryptoHeir::claimCall { _inheritanceId: id };
    Ok(call.abi_encode().into())
}

/// Encode reclaim function call
pub fn encode_reclaim(id: U256) -> Result<Bytes> {
    let call = CryptoHeir::reclaimCall { _inheritanceId: id };
    Ok(call.abi_encode().into())
}

/// Encode extendDeadline function call
pub fn encode_extend_deadline(id: U256, new_deadline: u64) -> Result<Bytes> {
    let call = CryptoHeir::extendDeadlineCall {
        _inheritanceId: id,
        _newDeadline: U256::from(new_deadline),
    };
    Ok(call.abi_encode().into())
}

/// Encode transferFeeCollector function call
pub fn encode_transfer_fee_collector(new_collector: Address) -> Result<Bytes> {
    let call = CryptoHeir::transferFeeCollectorCall { newFeeCollector: new_collector };
    Ok(call.abi_encode().into())
}

/// Encode acceptFeeCollector function call
pub fn encode_accept_fee_collector() -> Result<Bytes> {
    let call = CryptoHeir::acceptFeeCollectorCall {};
    Ok(call.abi_encode().into())
}

/// Decode contract revert data into a human-readable error message
pub fn decode_contract_error(revert_data: &Bytes) -> Option<String> {
    // Try to decode as a CryptoHeir error
    if let Ok(error) = CryptoHeir::CryptoHeirErrors::abi_decode(revert_data, false) {
        let message = match error {
            CryptoHeir::CryptoHeirErrors::InvalidBeneficiary(_) => {
                "Invalid beneficiary address (cannot be zero address or sender)"
            }
            CryptoHeir::CryptoHeirErrors::InvalidDeadline(_) => {
                "Invalid deadline (must be in the future)"
            }
            CryptoHeir::CryptoHeirErrors::InsufficientAmount(_) => {
                "Insufficient amount (cannot be zero)"
            }
            CryptoHeir::CryptoHeirErrors::InvalidTokenTransfer(_) => {
                "Invalid token transfer (msg.value must be zero for ERC20 deposits)"
            }
            CryptoHeir::CryptoHeirErrors::InheritanceNotFound(_) => {
                "Inheritance not found"
            }
            CryptoHeir::CryptoHeirErrors::AlreadyClaimed(_) => {
                "Inheritance already claimed"
            }
            CryptoHeir::CryptoHeirErrors::DeadlineNotReached(_) => {
                "Deadline not reached yet"
            }
            CryptoHeir::CryptoHeirErrors::DeadlineAlreadyPassed(_) => {
                "Deadline already passed"
            }
            CryptoHeir::CryptoHeirErrors::OnlyDepositor(_) => {
                "Only the depositor can perform this action"
            }
            CryptoHeir::CryptoHeirErrors::OnlyBeneficiary(_) => {
                "Only the beneficiary can perform this action"
            }
            CryptoHeir::CryptoHeirErrors::OnlyFeeCollector(_) => {
                "Only the fee collector can perform this action"
            }
            CryptoHeir::CryptoHeirErrors::InvalidFeeCollector(_) => {
                "Invalid fee collector address"
            }
            CryptoHeir::CryptoHeirErrors::NoPendingTransfer(_) => {
                "No pending fee collector transfer"
            }
            _ => "Unknown contract error"
        };
        Some(message.to_string())
    } else {
        None
    }
}
