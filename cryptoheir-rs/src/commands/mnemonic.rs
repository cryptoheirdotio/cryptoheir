//! Mnemonic commands - generate and derive keys from BIP39 mnemonic phrases

use crate::Result;
use alloy_signer_local::MnemonicBuilder;
use tracing::{info, warn};

/// Generate a new 24-word BIP39 mnemonic phrase
pub async fn generate(show_keys: bool) -> Result<()> {
    info!("Generating 24-word BIP39 mnemonic phrase...");

    // Generate random 24-word mnemonic using coins_bip39 directly
    use alloy_signer_local::coins_bip39::{English, Mnemonic};
    let mnemonic = Mnemonic::<English>::new_with_count(&mut rand::thread_rng(), 24)
        .map_err(|e| eyre::eyre!("Failed to generate mnemonic: {}", e))?;

    // Get the mnemonic phrase
    let phrase = mnemonic.to_phrase();

    // Display mnemonic to user
    println!("\n{}", "=".repeat(70));
    println!("  24-Word Mnemonic Phrase (BIP39)");
    println!("{}", "=".repeat(70));
    println!("\n{}\n", phrase);
    println!("{}", "=".repeat(70));

    warn!("IMPORTANT: Write this mnemonic down and store it securely!");
    warn!("Anyone with this phrase can access your funds.");
    warn!("Never share it or store it digitally.");
    println!();

    // Optionally show the first derived key
    if show_keys {
        info!("Deriving first Ethereum account (index 0)...");

        let signer = MnemonicBuilder::<alloy_signer_local::coins_bip39::English>::default()
            .phrase(phrase.as_str())
            .index(0)?
            .build()?;

        let address = signer.address();
        let private_key = hex::encode(signer.to_bytes());

        println!("Derived Account (m/44'/60'/0'/0/0):");
        println!("  Address:     {}", address);
        println!("  Private Key: 0x{}", private_key);
        println!();
        warn!("Keep your private key secret!");
    }

    Ok(())
}

/// Derive Ethereum private key from mnemonic phrase
pub async fn derive(index: Option<u32>) -> Result<()> {
    let account_index = index.unwrap_or(0);

    println!("\n{}", "=".repeat(70));
    println!("  Derive Ethereum Private Key from Mnemonic");
    println!("{}", "=".repeat(70));
    println!("\nEnter your 12 or 24-word mnemonic phrase:");
    println!("(Input will be visible - use in a private location)");
    print!("> ");

    // Flush stdout to ensure prompt is displayed
    use std::io::Write;
    std::io::stdout().flush()?;

    // Read mnemonic from stdin (visible)
    let mut mnemonic_phrase = String::new();
    std::io::stdin()
        .read_line(&mut mnemonic_phrase)
        .map_err(|e| eyre::eyre!("Failed to read mnemonic: {}", e))?;

    // Trim whitespace
    let mnemonic_phrase = mnemonic_phrase.trim();

    // Validate word count
    let word_count = mnemonic_phrase.split_whitespace().count();
    if word_count != 12 && word_count != 24 {
        return Err(eyre::eyre!(
            "Invalid mnemonic: expected 12 or 24 words, got {}",
            word_count
        ));
    }

    info!("Deriving account {} from {}-word mnemonic...", account_index, word_count);

    // Build signer from mnemonic
    let signer = MnemonicBuilder::<alloy_signer_local::coins_bip39::English>::default()
        .phrase(mnemonic_phrase)
        .index(account_index)?
        .build()
        .map_err(|e| eyre::eyre!("Failed to derive key from mnemonic: {}", e))?;

    let address = signer.address();
    let private_key = hex::encode(signer.to_bytes());

    // Display results
    println!("\n{}", "=".repeat(70));
    println!("  Derived Ethereum Account");
    println!("{}", "=".repeat(70));
    println!("\nDerivation Path: m/44'/60'/0'/0/{}", account_index);
    println!("Address:         {}", address);
    println!("Private Key:     0x{}", private_key);
    println!("\n{}", "=".repeat(70));

    println!();
    warn!("IMPORTANT: Keep your private key secure!");
    warn!("Never share it or store it in an insecure location.");
    println!();

    println!("You can use this private key with the 'sign' command by setting:");
    println!("  export PRIVATE_KEY=0x{}", private_key);
    println!("  export SIGNER_ADDRESS={}", address);

    Ok(())
}
