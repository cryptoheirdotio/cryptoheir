//! Core types for transaction preparation, signing, and broadcasting

use alloy::primitives::{Address, Bytes, TxHash, U256};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Configuration loaded from environment variables
#[derive(Debug, Clone)]
pub struct Config {
    pub signer_address: Option<Address>,
    pub private_key: Option<String>,
    pub infura_api_key: Option<String>,
    pub rpc_url: Option<String>,
    pub contract_address: Option<Address>,
}

impl Config {
    /// Load configuration from environment variables
    pub fn load() -> eyre::Result<Self> {
        // Attempt to load .env file (ignore if not found)
        let _ = dotenvy::dotenv();

        Ok(Self {
            signer_address: std::env::var("SIGNER_ADDRESS")
                .ok()
                .and_then(|s| s.parse().ok()),
            private_key: std::env::var("PRIVATE_KEY").ok(),
            infura_api_key: std::env::var("INFURA_API_KEY").ok(),
            rpc_url: std::env::var("RPC_URL").ok(),
            contract_address: std::env::var("CONTRACT_ADDRESS")
                .ok()
                .and_then(|s| s.parse().ok()),
        })
    }
}

/// Network information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkInfo {
    pub name: String,
    pub chain_id: u64,
    pub rpc_url: Option<String>,
}

/// Transaction parameters (unsigned transaction)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TxParams {
    pub mode: TransactionMode,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub function_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<serde_json::Value>,
    pub transaction: TransactionData,
    pub metadata: Metadata,
}

/// Transaction mode (deploy or call)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TransactionMode {
    Deploy,
    Call,
}

/// Transaction data (compatible with both EIP-1559 and legacy transactions)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionData {
    #[serde(rename = "type")]
    pub tx_type: u8,
    pub from: Address,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<Address>,
    pub data: Bytes,
    pub nonce: u64,
    pub chain_id: u64,
    #[serde(with = "u256_hex")]
    pub gas_limit: U256,

    // EIP-1559 fields
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(with = "optional_u256_hex")]
    pub max_fee_per_gas: Option<U256>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(with = "optional_u256_hex")]
    pub max_priority_fee_per_gas: Option<U256>,

    // Legacy field
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(with = "optional_u256_hex")]
    pub gas_price: Option<U256>,

    // Optional value for payable functions
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(with = "optional_u256_hex")]
    pub value: Option<U256>,
}

/// Metadata about the transaction
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Metadata {
    pub network: NetworkInfo,
    pub estimated_cost: String,
    pub timestamp: String,
    pub prepared: bool,
    pub signed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signed_at: Option<String>,
}

/// Signed transaction ready for broadcasting
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignedTx {
    #[serde(rename = "signedTransaction")]
    pub signed_transaction: Bytes,
    #[serde(rename = "txHash")]
    pub tx_hash: TxHash,
    pub mode: TransactionMode,
    pub from: Address,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub predicted_contract_address: Option<Address>,
    pub metadata: Metadata,
}

/// Transaction receipt after broadcasting
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TxReceipt {
    #[serde(rename = "transactionHash")]
    pub transaction_hash: TxHash,
    #[serde(rename = "blockNumber")]
    pub block_number: u64,
    #[serde(rename = "blockHash")]
    pub block_hash: String,
    pub from: Address,
    pub to: Option<Address>,
    #[serde(rename = "gasUsed")]
    pub gas_used: String,
    pub status: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "contractAddress")]
    pub contract_address: Option<Address>,
    pub metadata: HashMap<String, serde_json::Value>,
}

// Custom serialization for U256 as hex strings
mod u256_hex {
    use alloy::primitives::U256;
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(value: &U256, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&value.to_string())
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<U256, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        s.parse().map_err(serde::de::Error::custom)
    }
}

mod optional_u256_hex {
    use alloy::primitives::U256;
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(value: &Option<U256>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match value {
            Some(v) => serializer.serialize_some(&v.to_string()),
            None => serializer.serialize_none(),
        }
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<U256>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = Option::<String>::deserialize(deserializer)?;
        s.map(|s| s.parse().map_err(serde::de::Error::custom))
            .transpose()
    }
}
