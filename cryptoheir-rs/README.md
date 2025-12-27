# CryptoHeir Offline Signer (Rust)

Air-gapped offline transaction signing for the CryptoHeir smart contract, written in Rust.

This is a Rust implementation of the JavaScript [offline-signer](../offline-signer/), providing the same functionality with improved performance, better type safety, and additional features like an interactive TUI and QR code support.

## Features

- ✅ **Three-step air-gapped workflow**: Prepare → Sign → Broadcast
- ✅ **Interactive TUI**: Review transactions with a rich terminal UI before signing
- ✅ **QR Code Support**: Transfer transaction data via QR codes for true air-gap security
- ✅ **Multi-network**: Supports Ethereum, Polygon, Arbitrum, Optimism, Base, Linea (mainnet & testnets)
- ✅ **EIP-1559 & Legacy**: Automatic transaction type detection and gas price optimization
- ✅ **Type-safe**: Rust's type system prevents many classes of errors
- ✅ **Fast**: Compiled binary with minimal runtime overhead

## Installation

### Prerequisites

- Rust 1.70+ (install via [rustup](https://rustup.rs/))
- Foundry (for contract compilation)

### Build from Source

```bash
cd cryptoheir-rs
cargo build --release
```

The binary will be available at `target/release/cryptoheir-rs`.

Optionally, install it system-wide:

```bash
cargo install --path .
```

## Usage

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Online Machine** (for `prepare` and `broadcast`):
```env
SIGNER_ADDRESS=0x1234...    # Your public address
INFURA_API_KEY=your_key     # Or use RPC_URL
```

**Offline Machine** (for `sign`):
```env
PRIVATE_KEY=0xabcd...       # KEEP THIS OFFLINE!
```

### Workflow

#### 1. Prepare Transaction (Online Machine)

Create an unsigned transaction:

```bash
# Deploy contract
cryptoheir-rs prepare deploy --network sepolia -o tx-params.json

# Create inheritance deposit
cryptoheir-rs prepare deposit \
  --beneficiary 0xBeneficiary... \
  --amount 1.5 \
  --deadline 1735689600 \
  --contract 0xContract... \
  --network sepolia

# With QR code output
cryptoheir-rs prepare deposit ... --qr
```

**Output**: `tx-params.json` (or QR code)

#### 2. Sign Transaction (Offline Machine)

Transfer `tx-params.json` to your air-gapped machine (USB drive or QR code), then sign:

```bash
# Interactive TUI review (recommended)
cryptoheir-rs sign -i tx-params.json -o signed-tx.json

# Scan from QR code
cryptoheir-rs sign --qr-input tx-params-qr.png -o signed-tx.json

# Skip review (use with caution)
cryptoheir-rs sign -i tx-params.json -o signed-tx.json --skip-review

# Generate QR code of signed transaction
cryptoheir-rs sign -i tx-params.json -o signed-tx.json --qr
```

**Interactive TUI Controls**:
- `Y` / `Enter`: Approve and sign
- `N` / `Q` / `Esc`: Cancel
- `↑↓` / `j/k`: Scroll
- `PgUp/PgDn`: Fast scroll

**Output**: `signed-tx.json` (or QR code)

#### 3. Broadcast Transaction (Online Machine)

Transfer `signed-tx.json` back to online machine, then broadcast:

```bash
cryptoheir-rs broadcast -i signed-tx.json --network sepolia

# Scan from QR code
cryptoheir-rs broadcast --qr-input signed-tx-qr.png --network sepolia
```

**Output**: `signed-tx-receipt.json` with confirmation details

### Supported Operations

```bash
# Contract deployment
cryptoheir-rs prepare deploy

# Deposit (create inheritance)
cryptoheir-rs prepare deposit --beneficiary ADDR --amount ETH --deadline TIMESTAMP [--token ADDR]

# Claim (as beneficiary, after deadline)
cryptoheir-rs prepare claim --id ID --contract ADDR

# Reclaim (as owner, before deadline)
cryptoheir-rs prepare reclaim --id ID --contract ADDR

# Extend deadline
cryptoheir-rs prepare extend-deadline --id ID --new-deadline TIMESTAMP --contract ADDR

# Transfer fee collector (2-step process)
cryptoheir-rs prepare transfer-fee-collector --new-collector ADDR --contract ADDR
cryptoheir-rs prepare accept-fee-collector --contract ADDR
```

### Examples

**Deploy on Sepolia testnet:**
```bash
cryptoheir-rs prepare deploy --network sepolia -o deploy-tx.json
cryptoheir-rs sign -i deploy-tx.json -o deploy-signed.json
cryptoheir-rs broadcast -i deploy-signed.json --network sepolia
```

**Deposit 1 ETH with 30-day deadline:**
```bash
cryptoheir-rs prepare deposit \
  --beneficiary 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb \
  --amount 1.0 \
  --deadline $(($(date +%s) + 30*24*60*60)) \
  --contract 0xYourContract... \
  --network sepolia \
  -o deposit-tx.json
```

**Deposit ERC20 tokens:**
```bash
cryptoheir-rs prepare deposit \
  --beneficiary 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb \
  --amount 1000 \
  --deadline 1735689600 \
  --token 0xTokenContract... \
  --contract 0xContract... \
  --network polygon-amoy
```

## Supported Networks

### Pre-configured (via Infura)

**Ethereum**: `mainnet`, `sepolia`, `holesky`
**Polygon**: `polygon-mainnet`, `polygon-amoy`
**Arbitrum**: `arbitrum-mainnet`, `arbitrum-sepolia`
**Optimism**: `optimism-mainnet`, `optimism-sepolia`
**Base**: `base-mainnet`, `base-sepolia`
**Linea**: `linea-mainnet`, `linea-sepolia`

### Custom Networks

Use `--rpc-url` or set `RPC_URL` in `.env`:

```bash
cryptoheir-rs prepare ... --rpc-url http://localhost:8545
cryptoheir-rs prepare ... --rpc-url https://polygon-rpc.com
```

## Security

### Best Practices

1. **Air-Gap Your Signing Machine**: Never connect your signing machine to the internet
2. **Use QR Codes**: For true air-gap, use QR codes instead of USB drives
3. **Review Transactions**: Always use the interactive TUI to review before signing
4. **Verify Addresses**: Double-check all addresses (contract, beneficiary, token)
5. **Protect Your Keys**: Store private keys encrypted, never on online machines

### Transaction Review

The TUI displays:
- Network and chain ID
- Transaction type (deploy/call)
- From/To addresses
- Value being sent
- Gas limits and costs
- Function parameters

**Always verify** before approving!

## Development

### Project Structure

```
cryptoheir-rs/
├── src/
│   ├── main.rs           # CLI entry point
│   ├── lib.rs            # Library exports
│   ├── types.rs          # Core data structures
│   ├── commands/
│   │   ├── prepare.rs    # Prepare command
│   │   ├── sign.rs       # Sign command (with TUI)
│   │   └── broadcast.rs  # Broadcast command
│   ├── contract.rs       # ABI encoding
│   ├── network.rs        # RPC client
│   ├── crypto.rs         # Transaction signing
│   ├── qr.rs             # QR code support
│   └── tui.rs            # Terminal UI
└── tests/
    └── integration_tests.rs
```

### Run Tests

```bash
cargo test
```

### Build for Production

```bash
cargo build --release
strip target/release/cryptoheir-rs  # Reduce binary size
```

## Comparison with JavaScript Version

| Feature | JS (`offline-signer`) | Rust (`cryptoheir-rs`) |
|---------|---------------------|------------------------|
| Binary size | ~50MB (with Node.js) | ~15MB (standalone) |
| Startup time | ~500ms | ~50ms |
| Memory usage | ~50MB | ~5MB |
| Interactive TUI | ❌ | ✅ |
| QR code support | ❌ | ✅ |
| Type safety | Partial (TypeScript possible) | Full (Rust) |
| Dependencies | Node.js required | None (static binary) |

## Troubleshooting

**"Contract bytecode not found"**
→ Compile Foundry contracts first: `cd ../foundry && forge build`

**"SIGNER_ADDRESS not set"**
→ Set in `.env` or provide via `--signer-address` flag

**"Transaction already broadcast"**
→ The transaction was already sent. Check receipt with the TX hash.

**"Chain ID mismatch"**
→ Ensure the same `--network` is used for prepare and broadcast

## License

MIT

## Contributing

Contributions are welcome! Please ensure:
- Code compiles without warnings (`cargo clippy`)
- Tests pass (`cargo test`)
- Follow Rust conventions

## Links

- [CryptoHeir Contract](../foundry/)
- [JavaScript Offline Signer](../offline-signer/)
- [Project Documentation](../README.md)
