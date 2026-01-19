# CryptoHeir Go - Offline Transaction Signer

Air-gapped offline transaction signing for the CryptoHeir smart contract, written in Go.

This is a Go implementation of the Rust [cryptoheir-rs](../cryptoheir-rs/) offline signer, providing the same core functionality with Go's simplicity and excellent cross-compilation support.

## Features

- ✅ **Three-step air-gapped workflow**: Prepare → Sign → Broadcast
- ✅ **Interactive TUI**: Review transactions with bubbletea terminal UI before signing
- ✅ **Multi-network**: Supports Ethereum, Polygon, Arbitrum, Optimism, Base, Linea (mainnet & testnets)
- ✅ **EIP-1559 & Legacy**: Automatic transaction type detection and gas price optimization
- ✅ **Pure Go**: Single static binary with no dependencies
- ✅ **Fast**: Compiled binary with minimal runtime overhead

## Installation

### Prerequisites

- Go 1.25+ (install from [golang.org](https://golang.org/dl/))
  - Go 1.25+ is required for symlink embedding support
  - Older versions (1.16+) will work if you copy the contract artifact instead of using a symlink
- Foundry (for contract compilation) - only needed if you're modifying contracts

### Build from Source

The contract ABI and bytecode are embedded into the binary, so no external files are needed at runtime.

```bash
cd cryptoheir-go
go mod tidy
make build
```

The binary will be available at `./cryptoheir`.

**Available Make targets:**
- `make build` - Build the binary (standard build)
- `make build-static` - Build optimized static binary for distribution
- `make build-contracts` - Rebuild Foundry contracts (updates the embedded artifact)
- `make all` - Rebuild contracts and then build the binary
- `make clean` - Remove built binaries

### Build Static Binary (for distribution)

```bash
make build-static
```

This creates a fully static binary with no dependencies, optimized for size.

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
CONTRACT_ADDRESS=0x5678...  # CryptoHeir contract address
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
./cryptoheir prepare deploy --network sepolia -o tx-params.json

# Create inheritance deposit
./cryptoheir prepare deposit \
  --beneficiary 0xBeneficiary... \
  --amount 1.5 \
  --deadline 1735689600 \
  --network sepolia \
  -o tx-params.json
```

**Output**: `tx-params.json`

#### 2. Sign Transaction (Offline Machine)

Transfer `tx-params.json` to your air-gapped machine (USB drive), then sign:

```bash
# Interactive TUI review (recommended)
./cryptoheir sign -i tx-params.json -o signed-tx.json

# Skip review (use with caution)
./cryptoheir sign -i tx-params.json -o signed-tx.json --skip-review
```

**Interactive TUI Controls**:
- `Y` / `Enter`: Approve and sign
- `N` / `Q` / `Esc`: Cancel
- `↑↓` / `j/k`: Scroll
- `PgUp/PgDn`: Fast scroll

**Output**: `signed-tx.json`

#### 3. Broadcast Transaction (Online Machine)

Transfer `signed-tx.json` back to online machine, then broadcast:

```bash
./cryptoheir broadcast -i signed-tx.json --network sepolia
```

**Output**: `signed-tx-receipt.json` with confirmation details

### Supported Operations

```bash
# Contract deployment
./cryptoheir prepare deploy --network <network> -o deploy-tx.json

# Deposit (create inheritance)
./cryptoheir prepare deposit \
  --beneficiary <address> \
  --amount <eth> \
  --deadline <unix-timestamp> \
  --network <network> \
  -o deposit-tx.json

# For ERC20 tokens, add --token flag:
./cryptoheir prepare deposit \
  --beneficiary <address> \
  --amount <amount> \
  --deadline <timestamp> \
  --token <token-address> \
  --network <network>
```

**Note**: Other operations (claim, reclaim, extend-deadline) will be added in future releases.

### Examples

**Deploy on Sepolia testnet:**
```bash
# Online machine
./cryptoheir prepare deploy --network sepolia -o deploy-tx.json

# Transfer to offline machine via USB

# Offline machine
./cryptoheir sign -i deploy-tx.json -o deploy-signed.json

# Transfer back to online machine

# Online machine
./cryptoheir broadcast -i deploy-signed.json --network sepolia
```

**Deposit 1 ETH with 30-day deadline:**
```bash
# Calculate deadline (30 days from now)
DEADLINE=$(($(date +%s) + 30*24*60*60))

# Prepare transaction
./cryptoheir prepare deposit \
  --beneficiary 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb \
  --amount 1.0 \
  --deadline $DEADLINE \
  --network sepolia \
  -o deposit-tx.json
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
./cryptoheir prepare deploy --rpc-url http://localhost:8545
./cryptoheir prepare deposit --rpc-url https://polygon-rpc.com ...
```

## Security

### Best Practices

1. **Air-Gap Your Signing Machine**: Never connect your signing machine to the internet
2. **Use USB Drives**: Transfer files via USB drives, not network
3. **Review Transactions**: Always use the interactive TUI to review before signing
4. **Verify Addresses**: Double-check all addresses (contract, beneficiary, token)
5. **Protect Your Keys**: Store private keys encrypted, never on online machines
6. **Test First**: Always test on testnets (Sepolia) before mainnet

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
cryptoheir-go/
├── cmd/cryptoheir/
│   └── main.go                  # CLI entry point
├── internal/
│   ├── types/types.go           # Core data structures
│   ├── network/network.go       # RPC client
│   ├── contract/
│   │   ├── contract.go          # ABI encoding (uses go:embed)
│   │   └── CryptoHeir.json      # Symlink to ../foundry/out/CryptoHeir.sol/CryptoHeir.json
│   ├── crypto/crypto.go         # Transaction signing
│   ├── tui/tui.go               # Bubbletea terminal UI
│   └── commands/
│       ├── prepare.go           # Prepare command
│       ├── sign.go              # Sign command
│       └── broadcast.go         # Broadcast command
├── .env.example
├── Makefile                     # Build automation
├── go.mod
└── README.md
```

### Contract Artifact Embedding

The CryptoHeir contract ABI and bytecode are embedded directly into the binary using Go's `embed` package:

- **Source**: `../foundry/out/CryptoHeir.sol/CryptoHeir.json` (generated by `forge build`)
- **Symlink**: `internal/contract/CryptoHeir.json` → points to the foundry output
- **Embedded**: At build time using `//go:embed CryptoHeir.json` in `contract.go`
- **Runtime**: No external files needed - everything is in the binary

**When contracts change:**
```bash
make all  # Rebuilds contracts and Go binary
```

This approach ensures:
- ✅ Single binary distribution with no dependencies
- ✅ Version matching between code and contract
- ✅ No runtime file loading errors

### Run Tests

```bash
go test ./...
```

### Build for Multiple Platforms

**Note**: When building manually, set `GODEBUG=embedfollowsymlinks=1` to enable symlink embedding (Go 1.25+).

```bash
# Linux
GODEBUG=embedfollowsymlinks=1 GOOS=linux GOARCH=amd64 go build -o cryptoheir-linux-amd64 ./cmd/cryptoheir

# macOS
GODEBUG=embedfollowsymlinks=1 GOOS=darwin GOARCH=amd64 go build -o cryptoheir-darwin-amd64 ./cmd/cryptoheir
GODEBUG=embedfollowsymlinks=1 GOOS=darwin GOARCH=arm64 go build -o cryptoheir-darwin-arm64 ./cmd/cryptoheir

# Windows
GODEBUG=embedfollowsymlinks=1 GOOS=windows GOARCH=amd64 go build -o cryptoheir-windows-amd64.exe ./cmd/cryptoheir
```

## Comparison with Rust Version

| Feature | Rust (`cryptoheir-rs`) | Go (`cryptoheir-go`) |
|---------|----------------------|----------------------|
| Binary size | ~15MB | ~12MB |
| Startup time | ~50ms | ~20ms |
| Memory usage | ~5MB | ~8MB |
| Interactive TUI | ✅ ratatui | ✅ bubbletea |
| QR code support | ✅ | ⏳ Planned |
| Type safety | Full (Rust) | Strong (Go) |
| Cross-compilation | Good | Excellent |
| Build time | Slower | Faster |

## Troubleshooting

**"cannot embed irregular file CryptoHeir.json"**
→ Ensure you're using Go 1.25+ and `GODEBUG=embedfollowsymlinks=1` is set, or use the Makefile which handles this automatically

**"Contract artifact not found" (during development)**
→ The contract artifact is embedded from `../foundry/out/CryptoHeir.sol/CryptoHeir.json` via a symlink at `internal/contract/CryptoHeir.json`. If you've modified the contracts, run `make build-contracts` or `make all` to rebuild them

**"SIGNER_ADDRESS not set"**
→ Set in `.env` or provide via environment variable

**"Chain ID mismatch"**
→ Ensure the same `--network` is used for prepare and broadcast

**"Gas estimation failed"**
→ Check that the contract address is correct and the operation is valid

## Roadmap

- [x] Core workflow (prepare, sign, broadcast)
- [x] Deploy and deposit operations
- [x] Interactive TUI with bubbletea
- [x] EIP-1559 and legacy transaction support
- [ ] QR code support for air-gap transfer
- [ ] Mnemonic generation and key derivation
- [ ] Claim, reclaim, and extend-deadline operations
- [ ] Hardware wallet support (Ledger/Trezor)
- [ ] Transaction simulation before signing

## License

MIT

## Contributing

Contributions are welcome! Please ensure:
- Code builds without errors: `go build ./...`
- Tests pass: `go test ./...`
- Code is formatted: `go fmt ./...`
- Follow Go conventions and best practices

## Links

- [CryptoHeir Contract](../foundry/)
- [Rust Implementation](../cryptoheir-rs/)
- [Project Documentation](../README.md)
