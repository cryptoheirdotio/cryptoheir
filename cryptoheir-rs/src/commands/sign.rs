//! Sign command - signs prepared transactions offline (no network required)

use crate::{crypto, qr, tui, types::*, Result};
use tracing::{info, warn};

pub async fn execute(
    input: String,
    output: String,
    qr_input: Option<String>,
    generate_qr: bool,
    skip_review: bool,
) -> Result<()> {
    info!("Loading transaction parameters...");

    // Load tx params from file or QR code
    let tx_params_json = if let Some(qr_file) = qr_input {
        info!("Scanning QR code from {}...", qr_file);
        qr::scan_qr(&qr_file)?
    } else {
        std::fs::read_to_string(&input)?
    };

    let tx_params: TxParams = serde_json::from_str(&tx_params_json)?;

    // Verify transaction is prepared but not signed
    if !tx_params.metadata.prepared {
        return Err(eyre::eyre!("Transaction has not been prepared"));
    }
    if tx_params.metadata.signed {
        warn!("Transaction appears to already be signed");
    }

    // Validate gas parameters match transaction type
    match tx_params.transaction.tx_type {
        2 => {
            // EIP-1559 transaction must have max fees, not gas price
            if tx_params.transaction.max_fee_per_gas.is_none() {
                return Err(eyre::eyre!(
                    "EIP-1559 transaction (type 2) requires maxFeePerGas but it is missing"
                ));
            }
            if tx_params.transaction.max_priority_fee_per_gas.is_none() {
                return Err(eyre::eyre!(
                    "EIP-1559 transaction (type 2) requires maxPriorityFeePerGas but it is missing"
                ));
            }
            if tx_params.transaction.gas_price.is_some() {
                warn!("EIP-1559 transaction (type 2) should not have gasPrice field - it will be ignored");
            }
        }
        0 => {
            // Legacy transaction must have gas price, not EIP-1559 fees
            if tx_params.transaction.gas_price.is_none() {
                return Err(eyre::eyre!(
                    "Legacy transaction (type 0) requires gasPrice but it is missing"
                ));
            }
            if tx_params.transaction.max_fee_per_gas.is_some() || tx_params.transaction.max_priority_fee_per_gas.is_some() {
                warn!("Legacy transaction (type 0) should not have EIP-1559 fee fields - they will be ignored");
            }
        }
        _ => {
            return Err(eyre::eyre!(
                "Unsupported transaction type: {}. Only type 0 (legacy) and type 2 (EIP-1559) are supported",
                tx_params.transaction.tx_type
            ));
        }
    }

    info!(
        "Transaction type {} validated with appropriate gas parameters",
        tx_params.transaction.tx_type
    );

    // Display transaction for review (interactive TUI or simple display)
    if !skip_review {
        info!("Launching transaction review UI...");
        let approved = tui::review_transaction(&tx_params)?;
        if !approved {
            println!("\n✗ Transaction signing cancelled by user");
            return Ok(());
        }
    } else {
        warn!("Skipping interactive review (--skip-review flag)");
        display_transaction_summary(&tx_params);
    }

    // Load private key from environment
    let config = Config::load()?;
    let private_key = config
        .private_key
        .ok_or_else(|| eyre::eyre!("PRIVATE_KEY not set in environment"))?;

    info!("Signing transaction...");

    // Sign the transaction
    let signed_tx = crypto::sign_transaction(&tx_params, &private_key).await?;

    // Save to file
    let json = serde_json::to_string_pretty(&signed_tx)?;
    std::fs::write(&output, &json)?;

    println!("\n✓ Transaction signed successfully!");
    println!("  Output: {}", output);
    println!("  TX Hash: {}", signed_tx.tx_hash);
    println!("  From: {}", signed_tx.from);

    if let Some(addr) = signed_tx.predicted_contract_address {
        println!("  Contract Address: {}", addr);
    }

    // Generate QR code if requested
    if generate_qr {
        info!("Generating QR code...");
        qr::display_qr(&json)?;
    }

    println!("\nNext step: Transfer {} to online machine and run:", output);
    println!("  cryptoheir-rs broadcast -i {}", output);

    Ok(())
}

fn display_transaction_summary(tx_params: &TxParams) {
    println!("\n========== Transaction Review ==========");
    println!("Network: {} (chain ID: {})",
        tx_params.metadata.network.name,
        tx_params.metadata.network.chain_id
    );
    println!("Mode: {:?}", tx_params.mode);
    if let Some(fn_name) = &tx_params.function_name {
        println!("Function: {}", fn_name);
    }
    println!("From: {}", tx_params.transaction.from);
    if let Some(to) = tx_params.transaction.to {
        println!("To: {}", to);
    }
    println!("Nonce: {}", tx_params.transaction.nonce);
    println!("Gas Limit: {}", tx_params.transaction.gas_limit);
    println!("Estimated Cost: {} ETH", tx_params.metadata.estimated_cost);
    println!("========================================");
}
