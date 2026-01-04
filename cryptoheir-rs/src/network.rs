//! Network utilities for RPC communication

use crate::{types::TxReceipt, Result};
use alloy::{
    primitives::{Address, Bytes, TxHash, U256},
    providers::{Provider, ProviderBuilder, RootProvider},
    rpc::types::TransactionReceipt,
    transports::http::{Client, Http},
};
use std::collections::HashMap;
use tracing::info;

/// Supported networks with Infura
pub fn get_rpc_url(network: &str, infura_key: Option<&str>) -> Option<String> {
    match network {
        // Ethereum
        "mainnet" | "ethereum" => infura_key.map(|key| format!("https://mainnet.infura.io/v3/{}", key)),
        "sepolia" => infura_key.map(|key| format!("https://sepolia.infura.io/v3/{}", key)),
        "holesky" => infura_key.map(|key| format!("https://holesky.infura.io/v3/{}", key)),

        // Polygon
        "polygon" | "polygon-mainnet" => infura_key.map(|key| format!("https://polygon-mainnet.infura.io/v3/{}", key)),
        "polygon-amoy" => infura_key.map(|key| format!("https://polygon-amoy.infura.io/v3/{}", key)),

        // Arbitrum
        "arbitrum" | "arbitrum-mainnet" => infura_key.map(|key| format!("https://arbitrum-mainnet.infura.io/v3/{}", key)),
        "arbitrum-sepolia" => infura_key.map(|key| format!("https://arbitrum-sepolia.infura.io/v3/{}", key)),

        // Optimism
        "optimism" | "optimism-mainnet" => infura_key.map(|key| format!("https://optimism-mainnet.infura.io/v3/{}", key)),
        "optimism-sepolia" => infura_key.map(|key| format!("https://optimism-sepolia.infura.io/v3/{}", key)),

        // Base
        "base" | "base-mainnet" => infura_key.map(|key| format!("https://base-mainnet.infura.io/v3/{}", key)),
        "base-sepolia" => infura_key.map(|key| format!("https://base-sepolia.infura.io/v3/{}", key)),

        // Linea
        "linea" | "linea-mainnet" => infura_key.map(|key| format!("https://linea-mainnet.infura.io/v3/{}", key)),
        "linea-sepolia" => infura_key.map(|key| format!("https://linea-sepolia.infura.io/v3/{}", key)),

        // Local development
        "localhost" | "anvil" | "hardhat" => Some("http://localhost:8545".to_string()),

        _ => None,
    }
}

/// Create an RPC client
pub async fn create_client(rpc_url: &str) -> Result<RootProvider<Http<Client>>> {
    let provider = ProviderBuilder::new().on_http(rpc_url.parse()?);
    Ok(provider)
}

/// Get chain ID
pub async fn get_chain_id(client: &RootProvider<Http<Client>>) -> Result<u64> {
    Ok(client.get_chain_id().await?)
}

/// Get nonce for an address
pub async fn get_nonce(client: &RootProvider<Http<Client>>, address: Address) -> Result<u64> {
    Ok(client.get_transaction_count(address).await?)
}

/// Get gas prices (returns EIP-1559 or legacy)
pub async fn get_gas_prices(
    client: &RootProvider<Http<Client>>,
) -> Result<(Option<U256>, Option<U256>, Option<U256>)> {
    // Try to get EIP-1559 fee estimates first
    match client.get_fee_history(10, Default::default(), &[]).await {
        Ok(fee_history) => {
            // Get latest base fee
            let base_fee_u128 = fee_history
                .latest_block_base_fee()
                .unwrap_or(1_000_000_000u128); // 1 gwei default
            let base_fee = U256::from(base_fee_u128);

            // Set priority fee (tip)
            let max_priority_fee_per_gas = U256::from(1_500_000_000u64); // 1.5 gwei

            // Max fee = 2x base fee + priority fee (to handle fluctuations)
            let max_fee_per_gas = base_fee * U256::from(2) + max_priority_fee_per_gas;

            info!(
                "Using EIP-1559: max_fee={} gwei, priority_fee={} gwei",
                max_fee_per_gas / U256::from(1_000_000_000u64),
                max_priority_fee_per_gas / U256::from(1_000_000_000u64)
            );

            Ok((
                Some(max_fee_per_gas),
                Some(max_priority_fee_per_gas),
                None,
            ))
        }
        Err(_) => {
            // Fallback to legacy gas price
            let gas_price_u128 = client.get_gas_price().await?;
            let gas_price = U256::from(gas_price_u128);
            info!("Using legacy gas price: {} gwei", gas_price / U256::from(1_000_000_000u64));
            Ok((None, None, Some(gas_price)))
        }
    }
}

/// Estimate gas for a transaction
pub async fn estimate_gas(
    client: &RootProvider<Http<Client>>,
    from: Address,
    to: Option<Address>,
    data: &Bytes,
    value: Option<U256>,
) -> Result<U256> {
    let mut tx = alloy::rpc::types::TransactionRequest::default()
        .from(from)
        .input(data.clone().into());

    if let Some(to_addr) = to {
        tx = tx.to(to_addr);
    }

    if let Some(val) = value {
        tx = tx.value(val);
    }

    let gas_u64 = client.estimate_gas(&tx).await?;
    let gas = U256::from(gas_u64);
    info!("Estimated gas: {}", gas);

    // Add 20% buffer for safety
    let gas_with_buffer = gas * U256::from(120) / U256::from(100);
    info!("Gas with 20% buffer: {}", gas_with_buffer);

    Ok(gas_with_buffer)
}

/// Format Wei to ETH string
pub fn format_eth(wei: U256) -> String {
    let eth = wei.to_string().parse::<f64>().unwrap_or(0.0) / 1e18;
    format!("{:.6}", eth)
}

/// Get a transaction by hash
pub async fn get_transaction(
    client: &RootProvider<Http<Client>>,
    tx_hash: TxHash,
) -> Result<alloy::rpc::types::Transaction> {
    client
        .get_transaction_by_hash(tx_hash)
        .await?
        .ok_or_else(|| eyre::eyre!("Transaction not found"))
}

/// Broadcast a signed transaction
pub async fn broadcast_transaction(
    client: &RootProvider<Http<Client>>,
    signed_tx: &Bytes,
) -> Result<TxHash> {
    let pending_tx = client.send_raw_transaction(signed_tx).await?;
    Ok(*pending_tx.tx_hash())
}

/// Wait for transaction receipt
pub async fn wait_for_receipt(client: &RootProvider<Http<Client>>, tx_hash: TxHash) -> Result<TxReceipt> {
    // Poll for receipt with timeout
    let mut attempts = 0;
    const MAX_ATTEMPTS: u32 = 60; // 5 minutes with 5s intervals
    const POLL_INTERVAL: std::time::Duration = std::time::Duration::from_secs(5);

    info!("Polling for transaction receipt (max {} seconds)...", MAX_ATTEMPTS * 5);

    loop {
        match client.get_transaction_receipt(tx_hash).await? {
            Some(receipt) => {
                info!("Receipt received after {} seconds", attempts * 5);
                return receipt_to_tx_receipt(receipt);
            }
            None => {
                attempts += 1;

                // Log progress every 6 attempts (30 seconds)
                if attempts % 6 == 0 {
                    info!(
                        "Still waiting for receipt... ({}/{} seconds elapsed)",
                        attempts * 5,
                        MAX_ATTEMPTS * 5
                    );
                    println!(
                        "  ⏳ Waiting for block to be mined... ({}/{} seconds)",
                        attempts * 5,
                        MAX_ATTEMPTS * 5
                    );
                }

                if attempts >= MAX_ATTEMPTS {
                    return Err(eyre::eyre!(
                        "Timeout waiting for transaction receipt after {} seconds.\n\
                         \n\
                         The transaction may still be pending. You can:\n\
                         1. Check the transaction on a block explorer\n\
                         2. If using a local node (Anvil), mine a block: cast rpc anvil_mine\n\
                         3. Run the broadcast command again (it will detect the existing transaction)",
                        MAX_ATTEMPTS * 5
                    ));
                }

                tokio::time::sleep(POLL_INTERVAL).await;
            }
        }
    }
}

/// Convert alloy receipt to our TxReceipt type
fn receipt_to_tx_receipt(receipt: TransactionReceipt) -> Result<TxReceipt> {
    Ok(TxReceipt {
        transaction_hash: receipt.transaction_hash,
        block_number: receipt.block_number.ok_or_else(|| eyre::eyre!("No block number"))?,
        block_hash: format!("{:?}", receipt.block_hash.ok_or_else(|| eyre::eyre!("No block hash"))?),
        from: receipt.from,
        to: receipt.to,
        gas_used: receipt.gas_used.to_string(),
        status: if receipt.status() { 1 } else { 0 },
        contract_address: receipt.contract_address,
        metadata: HashMap::new(),
    })
}
