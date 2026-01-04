//! Prepare command - creates unsigned transactions (requires network access)

use crate::{contract, network, qr, types::*, Result};
use alloy::primitives::{Address, U256};
use clap::Subcommand;
use tracing::info;

// Type alias for the RPC client type
type RpcClient = alloy::providers::RootProvider<alloy::transports::http::Http<alloy::transports::http::Client>>;

#[derive(Subcommand, Debug, Clone)]
pub enum Operation {
    /// Deploy a new CryptoHeir contract
    Deploy,

    /// Deposit funds into an inheritance
    Deposit {
        /// Beneficiary address
        #[arg(short, long)]
        beneficiary: Address,

        /// Amount to deposit (in ETH or token units)
        #[arg(short, long)]
        amount: String,

        /// Deadline (Unix timestamp in seconds)
        #[arg(short, long)]
        deadline: u64,

        /// ERC20 token address (if depositing tokens instead of ETH)
        #[arg(short, long)]
        token: Option<Address>,

        /// Contract address
        #[arg(short, long, env = "CONTRACT_ADDRESS")]
        contract: Option<Address>,
    },

    /// Claim an inheritance (as beneficiary)
    Claim {
        /// Inheritance ID
        #[arg(short, long)]
        id: U256,

        /// Contract address
        #[arg(short, long, env = "CONTRACT_ADDRESS")]
        contract: Option<Address>,
    },

    /// Reclaim an inheritance (as owner, before deadline)
    Reclaim {
        /// Inheritance ID
        #[arg(short, long)]
        id: U256,

        /// Contract address
        #[arg(short, long, env = "CONTRACT_ADDRESS")]
        contract: Option<Address>,
    },

    /// Extend the deadline for an inheritance
    ExtendDeadline {
        /// Inheritance ID
        #[arg(short, long)]
        id: U256,

        /// New deadline (Unix timestamp in seconds)
        #[arg(short, long)]
        new_deadline: u64,

        /// Contract address
        #[arg(short, long, env = "CONTRACT_ADDRESS")]
        contract: Option<Address>,
    },

    /// Transfer fee collector role (initiate 2-step transfer)
    TransferFeeCollector {
        /// New fee collector address
        #[arg(short, long)]
        new_collector: Address,

        /// Contract address
        #[arg(short, long, env = "CONTRACT_ADDRESS")]
        contract: Option<Address>,
    },

    /// Accept fee collector role (complete 2-step transfer)
    AcceptFeeCollector {
        /// Contract address
        #[arg(short, long, env = "CONTRACT_ADDRESS")]
        contract: Option<Address>,
    },
}

pub async fn execute(
    operation: Operation,
    network: Option<String>,
    rpc_url: Option<String>,
    output: String,
    generate_qr: bool,
) -> Result<()> {
    info!("Preparing transaction...");

    // Load configuration
    let config = Config::load()?;

    // Determine RPC URL
    let rpc_url = rpc_url
        .or(config.rpc_url)
        .or_else(|| {
            network::get_rpc_url(
                network.as_deref().unwrap_or("sepolia"),
                config.infura_api_key.as_deref(),
            )
        })
        .ok_or_else(|| eyre::eyre!("No RPC URL provided or configured"))?;

    info!("Connecting to network via {}", rpc_url);

    // Get signer address
    let signer_address = config
        .signer_address
        .ok_or_else(|| eyre::eyre!("SIGNER_ADDRESS not set in environment"))?;

    // Create RPC client
    let client = network::create_client(&rpc_url).await?;

    // Get network info
    let chain_id = network::get_chain_id(&client).await?;
    let network_name = network.unwrap_or_else(|| "custom".to_string());

    info!(
        "Connected to {} (chain ID: {})",
        network_name, chain_id
    );

    // Get nonce
    let nonce = network::get_nonce(&client, signer_address).await?;
    info!("Nonce: {}", nonce);

    // Prepare transaction based on operation
    let tx_params = match operation {
        Operation::Deploy => {
            prepare_deploy(&client, signer_address, nonce, chain_id, &network_name).await?
        }
        Operation::Deposit {
            beneficiary,
            amount,
            deadline,
            token,
            contract,
        } => {
            let contract_addr = contract.or(config.contract_address).ok_or_else(|| {
                eyre::eyre!("Contract address required (use --contract or set CONTRACT_ADDRESS)")
            })?;
            prepare_deposit(
                &client,
                signer_address,
                nonce,
                chain_id,
                &network_name,
                contract_addr,
                beneficiary,
                amount,
                deadline,
                token,
            )
            .await?
        }
        Operation::Claim { id, contract } => {
            let contract_addr = contract.or(config.contract_address).ok_or_else(|| {
                eyre::eyre!("Contract address required (use --contract or set CONTRACT_ADDRESS)")
            })?;
            prepare_claim(
                &client,
                signer_address,
                nonce,
                chain_id,
                &network_name,
                contract_addr,
                id,
            )
            .await?
        }
        Operation::Reclaim { id, contract } => {
            let contract_addr = contract.or(config.contract_address).ok_or_else(|| {
                eyre::eyre!("Contract address required (use --contract or set CONTRACT_ADDRESS)")
            })?;
            prepare_reclaim(
                &client,
                signer_address,
                nonce,
                chain_id,
                &network_name,
                contract_addr,
                id,
            )
            .await?
        }
        Operation::ExtendDeadline {
            id,
            new_deadline,
            contract,
        } => {
            let contract_addr = contract.or(config.contract_address).ok_or_else(|| {
                eyre::eyre!("Contract address required (use --contract or set CONTRACT_ADDRESS)")
            })?;
            prepare_extend_deadline(
                &client,
                signer_address,
                nonce,
                chain_id,
                &network_name,
                contract_addr,
                id,
                new_deadline,
            )
            .await?
        }
        Operation::TransferFeeCollector {
            new_collector,
            contract,
        } => {
            let contract_addr = contract.or(config.contract_address).ok_or_else(|| {
                eyre::eyre!("Contract address required (use --contract or set CONTRACT_ADDRESS)")
            })?;
            prepare_transfer_fee_collector(
                &client,
                signer_address,
                nonce,
                chain_id,
                &network_name,
                contract_addr,
                new_collector,
            )
            .await?
        }
        Operation::AcceptFeeCollector { contract } => {
            let contract_addr = contract.or(config.contract_address).ok_or_else(|| {
                eyre::eyre!("Contract address required (use --contract or set CONTRACT_ADDRESS)")
            })?;
            prepare_accept_fee_collector(
                &client,
                signer_address,
                nonce,
                chain_id,
                &network_name,
                contract_addr,
            )
            .await?
        }
    };

    // Save to file
    let json = serde_json::to_string_pretty(&tx_params)?;
    std::fs::write(&output, &json)?;

    info!("Transaction parameters saved to {}", output);
    println!("\n✓ Transaction prepared successfully!");
    println!("  Output: {}", output);
    println!("  Network: {} (chain ID: {})", network_name, chain_id);
    println!("  Estimated cost: {} ETH", tx_params.metadata.estimated_cost);

    // Generate QR code if requested
    if generate_qr {
        info!("Generating QR code...");
        qr::display_qr(&json)?;
    }

    println!("\nNext step: Transfer {} to offline machine and run:", output);
    println!("  cryptoheir-rs sign -i {}", output);

    Ok(())
}

async fn prepare_deploy(
    client: &RpcClient,
    from: Address,
    nonce: u64,
    chain_id: u64,
    network_name: &str,
) -> Result<TxParams> {
    info!("Preparing contract deployment...");

    // Load contract bytecode
    let bytecode = contract::load_bytecode()?;
    let data = bytecode.into();

    // Estimate gas
    let gas_limit = network::estimate_gas(client, from, None, &data, None).await?;

    // Get gas prices
    let (max_fee_per_gas, max_priority_fee_per_gas, gas_price) =
        network::get_gas_prices(client).await?;

    // Determine transaction type and set appropriate gas fields
    let (tx_type, final_max_fee, final_priority_fee, final_gas_price) =
        if max_fee_per_gas.is_some() {
            // EIP-1559 transaction (type 2)
            (2, max_fee_per_gas, max_priority_fee_per_gas, None)
        } else {
            // Legacy transaction (type 0)
            (0, None, None, gas_price)
        };

    // Calculate estimated cost
    let estimated_cost = if let Some(max_fee) = final_max_fee {
        network::format_eth(gas_limit * max_fee)
    } else if let Some(price) = final_gas_price {
        network::format_eth(gas_limit * price)
    } else {
        "unknown".to_string()
    };

    Ok(TxParams {
        mode: TransactionMode::Deploy,
        function_name: None,
        params: None,
        transaction: TransactionData {
            tx_type,
            from,
            to: None,
            data,
            nonce,
            chain_id,
            gas_limit,
            max_fee_per_gas: final_max_fee,
            max_priority_fee_per_gas: final_priority_fee,
            gas_price: final_gas_price,
            value: None,
        },
        metadata: Metadata {
            network: NetworkInfo {
                name: network_name.to_string(),
                chain_id,
                rpc_url: None,
            },
            estimated_cost,
            timestamp: chrono::Utc::now().to_rfc3339(),
            prepared: true,
            signed: false,
            signed_at: None,
        },
    })
}

async fn prepare_deposit(
    client: &RpcClient,
    from: Address,
    nonce: u64,
    chain_id: u64,
    network_name: &str,
    contract: Address,
    beneficiary: Address,
    amount: String,
    deadline: u64,
    token: Option<Address>,
) -> Result<TxParams> {
    info!("Preparing deposit transaction...");

    // Parse amount
    let amount_wei = alloy::primitives::utils::parse_ether(&amount)?;

    // Encode function call
    let (data, value) =
        contract::encode_deposit(beneficiary, amount_wei, deadline, token).await?;

    // Estimate gas
    let gas_limit = network::estimate_gas(client, from, Some(contract), &data, value).await?;

    // Get gas prices
    let (max_fee_per_gas, max_priority_fee_per_gas, gas_price) =
        network::get_gas_prices(client).await?;

    // Determine transaction type and set appropriate gas fields
    let (tx_type, final_max_fee, final_priority_fee, final_gas_price) =
        if max_fee_per_gas.is_some() {
            // EIP-1559 transaction (type 2)
            (2, max_fee_per_gas, max_priority_fee_per_gas, None)
        } else {
            // Legacy transaction (type 0)
            (0, None, None, gas_price)
        };

    // Calculate estimated cost (including value being sent)
    let gas_cost = if let Some(max_fee) = final_max_fee {
        gas_limit * max_fee
    } else if let Some(price) = final_gas_price {
        gas_limit * price
    } else {
        U256::ZERO
    };
    let total_cost = gas_cost + value.unwrap_or(U256::ZERO);
    let estimated_cost = network::format_eth(total_cost);

    Ok(TxParams {
        mode: TransactionMode::Call,
        function_name: Some("deposit".to_string()),
        params: Some(serde_json::json!({
            "beneficiary": beneficiary,
            "amount": amount,
            "deadline": deadline,
            "token": token,
        })),
        transaction: TransactionData {
            tx_type,
            from,
            to: Some(contract),
            data,
            nonce,
            chain_id,
            gas_limit,
            max_fee_per_gas: final_max_fee,
            max_priority_fee_per_gas: final_priority_fee,
            gas_price: final_gas_price,
            value,
        },
        metadata: Metadata {
            network: NetworkInfo {
                name: network_name.to_string(),
                chain_id,
                rpc_url: None,
            },
            estimated_cost,
            timestamp: chrono::Utc::now().to_rfc3339(),
            prepared: true,
            signed: false,
            signed_at: None,
        },
    })
}

// Stub implementations for other operations
async fn prepare_claim(
    _client: &RpcClient,
    _from: Address,
    _nonce: u64,
    _chain_id: u64,
    _network_name: &str,
    _contract: Address,
    _id: U256,
) -> Result<TxParams> {
    info!("Preparing claim transaction...");
    // TODO: Implement claim encoding
    todo!("prepare_claim not yet implemented")
}

async fn prepare_reclaim(
    _client: &RpcClient,
    _from: Address,
    _nonce: u64,
    _chain_id: u64,
    _network_name: &str,
    _contract: Address,
    _id: U256,
) -> Result<TxParams> {
    info!("Preparing reclaim transaction...");
    // TODO: Implement reclaim encoding
    todo!("prepare_reclaim not yet implemented")
}

async fn prepare_extend_deadline(
    _client: &RpcClient,
    _from: Address,
    _nonce: u64,
    _chain_id: u64,
    _network_name: &str,
    _contract: Address,
    _id: U256,
    _new_deadline: u64,
) -> Result<TxParams> {
    info!("Preparing extend deadline transaction...");
    // TODO: Implement extend_deadline encoding
    todo!("prepare_extend_deadline not yet implemented")
}

async fn prepare_transfer_fee_collector(
    _client: &RpcClient,
    _from: Address,
    _nonce: u64,
    _chain_id: u64,
    _network_name: &str,
    _contract: Address,
    _new_collector: Address,
) -> Result<TxParams> {
    info!("Preparing transfer fee collector transaction...");
    // TODO: Implement transfer_fee_collector encoding
    todo!("prepare_transfer_fee_collector not yet implemented")
}

async fn prepare_accept_fee_collector(
    _client: &RpcClient,
    _from: Address,
    _nonce: u64,
    _chain_id: u64,
    _network_name: &str,
    _contract: Address,
) -> Result<TxParams> {
    info!("Preparing accept fee collector transaction...");
    // TODO: Implement accept_fee_collector encoding
    todo!("prepare_accept_fee_collector not yet implemented")
}
