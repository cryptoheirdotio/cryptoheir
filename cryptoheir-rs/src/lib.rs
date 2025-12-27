//! CryptoHeir Offline Signer - Rust Implementation
//!
//! This library provides air-gapped offline transaction signing for the CryptoHeir
//! smart contract, with support for interactive TUI and QR code-based data transfer.

pub mod commands;
pub mod contract;
pub mod crypto;
pub mod network;
pub mod qr;
pub mod tui;
pub mod types;

// Re-export commonly used types
pub use types::{Config, SignedTx, TxParams};

// Re-export error type
pub type Result<T> = eyre::Result<T>;
