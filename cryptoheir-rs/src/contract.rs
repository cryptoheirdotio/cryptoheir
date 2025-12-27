//! CryptoHeir contract ABI encoding and bytecode loading

use crate::Result;
use alloy::{
    primitives::{Address, Bytes, U256},
    sol,
};

// Define the contract ABI using alloy's sol! macro
sol! {
    #[sol(rpc)]
    contract CryptoHeir {
        function deposit(address beneficiary, uint256 amount, uint256 deadline, address token) external payable returns (uint256);
        function claim(uint256 id) external;
        function reclaim(uint256 id) external;
        function extendDeadline(uint256 id, uint256 newDeadline) external;
        function transferFeeCollector(address newCollector) external;
        function acceptFeeCollector() external;
    }
}

/// Load contract bytecode from Foundry artifacts
pub fn load_bytecode() -> Result<Bytes> {
    let artifact_path = "../foundry/out/CryptoHeir.sol/CryptoHeir.json";
    let artifact_str = std::fs::read_to_string(artifact_path).map_err(|e| {
        eyre::eyre!(
            "Failed to read contract artifact at {}: {}. Make sure Foundry contracts are compiled.",
            artifact_path,
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

    // Encode the function call
    let call = CryptoHeir::depositCall {
        beneficiary,
        amount,
        deadline: deadline_u256,
        token: token_addr,
    };

    let calldata = call.abi_encode().into();

    Ok((calldata, value))
}

/// Encode claim function call
pub fn encode_claim(id: U256) -> Result<Bytes> {
    let call = CryptoHeir::claimCall { id };
    Ok(call.abi_encode().into())
}

/// Encode reclaim function call
pub fn encode_reclaim(id: U256) -> Result<Bytes> {
    let call = CryptoHeir::reclaimCall { id };
    Ok(call.abi_encode().into())
}

/// Encode extendDeadline function call
pub fn encode_extend_deadline(id: U256, new_deadline: u64) -> Result<Bytes> {
    let call = CryptoHeir::extendDeadlineCall {
        id,
        newDeadline: U256::from(new_deadline),
    };
    Ok(call.abi_encode().into())
}

/// Encode transferFeeCollector function call
pub fn encode_transfer_fee_collector(new_collector: Address) -> Result<Bytes> {
    let call = CryptoHeir::transferFeeCollectorCall { newCollector: new_collector };
    Ok(call.abi_encode().into())
}

/// Encode acceptFeeCollector function call
pub fn encode_accept_fee_collector() -> Result<Bytes> {
    let call = CryptoHeir::acceptFeeCollectorCall {};
    Ok(call.abi_encode().into())
}
