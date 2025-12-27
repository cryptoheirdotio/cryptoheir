use clap::{Parser, Subcommand};
use cryptoheir_rs::{commands, Result};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Parser)]
#[command(name = "cryptoheir-rs")]
#[command(author, version, about, long_about = None)]
#[command(propagate_version = true)]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    /// Enable verbose logging
    #[arg(short, long, global = true)]
    verbose: bool,
}

#[derive(Subcommand)]
enum Commands {
    /// Prepare an unsigned transaction (requires network access)
    ///
    /// This command connects to the blockchain to fetch the current nonce,
    /// gas prices, and other network information needed to construct a transaction.
    /// It outputs an unsigned transaction to tx-params.json that can be transferred
    /// to an offline machine for signing.
    Prepare {
        /// Operation to perform
        #[command(subcommand)]
        operation: commands::prepare::Operation,

        /// Network to use (mainnet, sepolia, polygon-mainnet, etc.)
        #[arg(short, long, env = "NETWORK")]
        network: Option<String>,

        /// Custom RPC URL (overrides network selection)
        #[arg(long, env = "RPC_URL")]
        rpc_url: Option<String>,

        /// Output file path
        #[arg(short, long, default_value = "tx-params.json")]
        output: String,

        /// Generate QR code for offline transfer
        #[arg(long)]
        qr: bool,
    },

    /// Sign a prepared transaction (works offline, no network required)
    ///
    /// This command loads an unsigned transaction, displays it for review in
    /// an interactive TUI, and signs it with your private key. The signed
    /// transaction is saved to signed-tx.json and can be transferred back to
    /// an online machine for broadcasting.
    Sign {
        /// Input file path (tx-params.json)
        #[arg(short, long, default_value = "tx-params.json")]
        input: String,

        /// Output file path (signed-tx.json)
        #[arg(short, long, default_value = "signed-tx.json")]
        output: String,

        /// Scan QR code from image file instead of reading JSON
        #[arg(long)]
        qr_input: Option<String>,

        /// Generate QR code for offline transfer
        #[arg(long)]
        qr: bool,

        /// Skip interactive TUI review (use with caution)
        #[arg(long)]
        skip_review: bool,
    },

    /// Broadcast a signed transaction (requires network access)
    ///
    /// This command loads a signed transaction and broadcasts it to the network.
    /// It waits for confirmation and saves the receipt to signed-tx-receipt.json.
    Broadcast {
        /// Input file path (signed-tx.json)
        #[arg(short, long, default_value = "signed-tx.json")]
        input: String,

        /// Network to use (must match the network used in prepare)
        #[arg(short, long, env = "NETWORK")]
        network: Option<String>,

        /// Custom RPC URL (overrides network selection)
        #[arg(long, env = "RPC_URL")]
        rpc_url: Option<String>,

        /// Output file path for receipt
        #[arg(short, long, default_value = "signed-tx-receipt.json")]
        output: String,

        /// Scan QR code from image file instead of reading JSON
        #[arg(long)]
        qr_input: Option<String>,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    color_eyre::install()?;

    let cli = Cli::parse();

    // Initialize tracing
    let filter = if cli.verbose {
        "cryptoheir_rs=debug,info"
    } else {
        "cryptoheir_rs=info,warn"
    };

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| filter.into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    match cli.command {
        Commands::Prepare {
            operation,
            network,
            rpc_url,
            output,
            qr,
        } => {
            commands::prepare::execute(operation, network, rpc_url, output, qr).await?;
        }
        Commands::Sign {
            input,
            output,
            qr_input,
            qr,
            skip_review,
        } => {
            commands::sign::execute(input, output, qr_input, qr, skip_review).await?;
        }
        Commands::Broadcast {
            input,
            network,
            rpc_url,
            output,
            qr_input,
        } => {
            commands::broadcast::execute(input, network, rpc_url, output, qr_input).await?;
        }
    }

    Ok(())
}
