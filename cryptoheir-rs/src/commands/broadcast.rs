//! Broadcast command - broadcasts signed transactions (requires network access)

use crate::{network, qr, types::*, Result};
use tracing::{info, warn};

pub async fn execute(
    input: String,
    network: Option<String>,
    rpc_url: Option<String>,
    output: String,
    qr_input: Option<String>,
) -> Result<()> {
    info!("Loading signed transaction...");

    // Load signed tx from file or QR code
    let signed_tx_json = if let Some(qr_file) = qr_input {
        info!("Scanning QR code from {}...", qr_file);
        qr::scan_qr(&qr_file)?
    } else {
        std::fs::read_to_string(&input)?
    };

    let signed_tx: SignedTx = serde_json::from_str(&signed_tx_json)?;

    // Load configuration
    let config = Config::load()?;

    // Determine RPC URL (priority: CLI flag > env var > tx metadata > network name)
    let rpc_url = rpc_url
        .or(config.rpc_url)
        .or_else(|| signed_tx.metadata.network.rpc_url.clone())
        .or_else(|| {
            network::get_rpc_url(
                network.as_deref().unwrap_or("sepolia"),
                config.infura_api_key.as_deref(),
            )
        })
        .ok_or_else(|| eyre::eyre!("No RPC URL provided or configured"))?;

    info!("Connecting to network via {}", rpc_url);

    // Create RPC client
    let client = network::create_client(&rpc_url).await?;

    // Get chain ID and verify it matches
    let chain_id = network::get_chain_id(&client).await?;
    if chain_id != signed_tx.metadata.network.chain_id {
        return Err(eyre::eyre!(
            "Chain ID mismatch! Expected {}, but connected to {}",
            signed_tx.metadata.network.chain_id,
            chain_id
        ));
    }

    info!(
        "Connected to {} (chain ID: {})",
        signed_tx.metadata.network.name, chain_id
    );

    // Check if transaction was already broadcast
    let existing_tx = network::get_transaction(&client, signed_tx.tx_hash).await;
    if existing_tx.is_ok() {
        warn!("Transaction {} appears to already be broadcast", signed_tx.tx_hash);
        println!("\n⚠ Transaction already broadcast: {}", signed_tx.tx_hash);
        println!("Waiting for confirmation...");
    } else {
        // Broadcast the transaction
        info!("Broadcasting transaction {}...", signed_tx.tx_hash);
        println!("\nBroadcasting transaction...");
        println!("  TX Hash: {}", signed_tx.tx_hash);

        network::broadcast_transaction(&client, &signed_tx.signed_transaction).await?;

        println!("✓ Transaction broadcast successfully!");
    }

    // Wait for receipt
    println!("\nWaiting for confirmation...");
    let receipt = network::wait_for_receipt(&client, signed_tx.tx_hash).await?;

    // Save receipt
    let receipt_json = serde_json::to_string_pretty(&receipt)?;
    std::fs::write(&output, &receipt_json)?;

    println!("\n✓ Transaction confirmed!");
    println!("  Block: {}", receipt.block_number);
    println!("  Gas Used: {}", receipt.gas_used);
    println!("  Status: {}", if receipt.status == 1 { "Success" } else { "Failed" });

    if let Some(contract_addr) = receipt.contract_address {
        println!("  Contract Address: {}", contract_addr);
    }

    println!("\nReceipt saved to: {}", output);

    Ok(())
}
