//! Cryptographic operations for signing transactions

use crate::{
    types::{Metadata, SignedTx, TransactionData, TransactionMode, TxParams},
    Result,
};
use alloy::{
    consensus::{SignableTransaction, TxEip1559, TxLegacy},
    network::{TxSignerSync},
    primitives::{Address, Bytes, PrimitiveSignature, TxKind, U256},
    signers::{local::PrivateKeySigner, Signature},
};

/// Sign a transaction with a private key
pub fn sign_transaction(tx_params: &TxParams, private_key: &str) -> Result<SignedTx> {
    // Parse private key
    let signer: PrivateKeySigner = private_key.parse()?;

    // Verify the signer address matches the from address
    let signer_address = signer.address();
    if signer_address != tx_params.transaction.from {
        return Err(eyre::eyre!(
            "Private key address {} does not match transaction from address {}",
            signer_address,
            tx_params.transaction.from
        ));
    }

    // Create and sign the transaction based on type
    let (signed_tx_bytes, tx_hash) = match tx_params.transaction.tx_type {
        2 => sign_eip1559(&tx_params.transaction, &signer)?,
        0 => sign_legacy(&tx_params.transaction, &signer)?,
        _ => {
            return Err(eyre::eyre!(
                "Unsupported transaction type: {}",
                tx_params.transaction.tx_type
            ))
        }
    };

    // Calculate predicted contract address for deployments
    let predicted_contract_address = if matches!(tx_params.mode, TransactionMode::Deploy) {
        Some(signer_address.create(tx_params.transaction.nonce))
    } else {
        None
    };

    // Create updated metadata
    let mut metadata = tx_params.metadata.clone();
    metadata.signed = true;
    metadata.signed_at = Some(chrono::Utc::now().to_rfc3339());

    Ok(SignedTx {
        signed_transaction: signed_tx_bytes,
        tx_hash,
        mode: tx_params.mode.clone(),
        from: tx_params.transaction.from,
        predicted_contract_address,
        metadata,
    })
}

/// Sign an EIP-1559 (Type 2) transaction
fn sign_eip1559(
    tx_data: &TransactionData,
    signer: &PrivateKeySigner,
) -> Result<(Bytes, alloy::primitives::TxHash)> {
    let max_fee_per_gas = tx_data
        .max_fee_per_gas
        .ok_or_else(|| eyre::eyre!("max_fee_per_gas required for EIP-1559"))?;
    let max_priority_fee_per_gas = tx_data
        .max_priority_fee_per_gas
        .ok_or_else(|| eyre::eyre!("max_priority_fee_per_gas required for EIP-1559"))?;

    let tx = TxEip1559 {
        chain_id: tx_data.chain_id,
        nonce: tx_data.nonce,
        gas_limit: tx_data.gas_limit.to::<u64>(),
        max_fee_per_gas: max_fee_per_gas.to::<u128>(),
        max_priority_fee_per_gas: max_priority_fee_per_gas.to::<u128>(),
        to: tx_data.to.map(TxKind::Call).unwrap_or(TxKind::Create),
        value: tx_data.value.unwrap_or(U256::ZERO),
        input: tx_data.data.clone(),
        access_list: Default::default(),
    };

    // Sign the transaction
    let signature = signer.sign_transaction_sync(&mut tx.clone().into())?;

    // Get the transaction hash
    let tx_hash = tx.signature_hash();

    // Encode the signed transaction
    let signed_tx = tx.into_signed(signature);
    let encoded = alloy::rlp::encode(&signed_tx);

    Ok((encoded.into(), tx_hash))
}

/// Sign a legacy (Type 0) transaction
fn sign_legacy(
    tx_data: &TransactionData,
    signer: &PrivateKeySigner,
) -> Result<(Bytes, alloy::primitives::TxHash)> {
    let gas_price = tx_data
        .gas_price
        .ok_or_else(|| eyre::eyre!("gas_price required for legacy transaction"))?;

    let tx = TxLegacy {
        chain_id: Some(tx_data.chain_id),
        nonce: tx_data.nonce,
        gas_price: gas_price.to::<u128>(),
        gas_limit: tx_data.gas_limit.to::<u64>(),
        to: tx_data.to.map(TxKind::Call).unwrap_or(TxKind::Create),
        value: tx_data.value.unwrap_or(U256::ZERO),
        input: tx_data.data.clone(),
    };

    // Sign the transaction
    let signature = signer.sign_transaction_sync(&mut tx.clone().into())?;

    // Get the transaction hash
    let tx_hash = tx.signature_hash();

    // Encode the signed transaction
    let signed_tx = tx.into_signed(signature);
    let encoded = alloy::rlp::encode(&signed_tx);

    Ok((encoded.into(), tx_hash))
}
