package network

import (
	"context"
	"fmt"
	"log/slog"
	"math/big"
	"time"

	"github.com/cryptoheirdotio/cryptoheir/cryptoheir-go/internal/types"
	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	coretypes "github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

var log *slog.Logger

// SetLogger sets the logger for the network package
func SetLogger(logger *slog.Logger) {
	log = logger
}

// GetRPCURL returns the RPC URL for a given network name
func GetRPCURL(network string, infuraAPIKey string) (string, error) {
	// Check for custom RPC URL first (localhost, custom endpoints)
	if network == "localhost" || network == "anvil" || network == "hardhat" {
		return "http://127.0.0.1:8545", nil
	}

	// If Infura key not provided, can't use predefined networks
	if infuraAPIKey == "" {
		return "", fmt.Errorf("INFURA_API_KEY required for network %s", network)
	}

	// Map network names to Infura endpoints
	networkMap := map[string]string{
		// Ethereum
		"mainnet": fmt.Sprintf("https://mainnet.infura.io/v3/%s", infuraAPIKey),
		"sepolia": fmt.Sprintf("https://sepolia.infura.io/v3/%s", infuraAPIKey),
		"holesky": fmt.Sprintf("https://holesky.infura.io/v3/%s", infuraAPIKey),

		// Polygon
		"polygon-mainnet": fmt.Sprintf("https://polygon-mainnet.infura.io/v3/%s", infuraAPIKey),
		"polygon-amoy":    fmt.Sprintf("https://polygon-amoy.infura.io/v3/%s", infuraAPIKey),

		// Arbitrum
		"arbitrum-mainnet": fmt.Sprintf("https://arbitrum-mainnet.infura.io/v3/%s", infuraAPIKey),
		"arbitrum-sepolia": fmt.Sprintf("https://arbitrum-sepolia.infura.io/v3/%s", infuraAPIKey),

		// Optimism
		"optimism-mainnet": fmt.Sprintf("https://optimism-mainnet.infura.io/v3/%s", infuraAPIKey),
		"optimism-sepolia": fmt.Sprintf("https://optimism-sepolia.infura.io/v3/%s", infuraAPIKey),

		// Base
		"base-mainnet": fmt.Sprintf("https://base-mainnet.infura.io/v3/%s", infuraAPIKey),
		"base-sepolia": fmt.Sprintf("https://base-sepolia.infura.io/v3/%s", infuraAPIKey),

		// Linea
		"linea-mainnet": fmt.Sprintf("https://linea-mainnet.infura.io/v3/%s", infuraAPIKey),
		"linea-sepolia": fmt.Sprintf("https://linea-sepolia.infura.io/v3/%s", infuraAPIKey),
	}

	url, exists := networkMap[network]
	if !exists {
		return "", fmt.Errorf("unknown network: %s", network)
	}

	return url, nil
}

// CreateClient creates an Ethereum RPC client
func CreateClient(ctx context.Context, rpcURL string) (*ethclient.Client, error) {
	client, err := ethclient.DialContext(ctx, rpcURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RPC: %w", err)
	}
	return client, nil
}

// GetChainID returns the chain ID from the RPC endpoint
func GetChainID(ctx context.Context, client *ethclient.Client) (uint64, error) {
	chainID, err := client.ChainID(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to get chain ID: %w", err)
	}
	return chainID.Uint64(), nil
}

// GetNonce returns the transaction count (nonce) for an address
func GetNonce(ctx context.Context, client *ethclient.Client, address common.Address) (uint64, error) {
	nonce, err := client.PendingNonceAt(ctx, address)
	if err != nil {
		return 0, fmt.Errorf("failed to get nonce: %w", err)
	}
	return nonce, nil
}

// GasPrices holds the gas price information for a transaction
type GasPrices struct {
	MaxFeePerGas         *big.Int // EIP-1559
	MaxPriorityFeePerGas *big.Int // EIP-1559
	GasPrice             *big.Int // Legacy
	IsEIP1559            bool
}

// GetGasPrices fetches gas prices, preferring EIP-1559 if available
func GetGasPrices(ctx context.Context, client *ethclient.Client) (*GasPrices, error) {
	// Try EIP-1559 fee history first
	feeHistory, err := client.FeeHistory(ctx, 1, nil, []float64{50})
	if err == nil && len(feeHistory.BaseFee) > 0 {
		baseFee := feeHistory.BaseFee[len(feeHistory.BaseFee)-1]

		// Priority fee: 1.5 gwei
		priorityFee := new(big.Int).Mul(big.NewInt(15), big.NewInt(1e8)) // 1.5 gwei

		// Max fee: 2 * base_fee + priority_fee
		maxFee := new(big.Int).Mul(baseFee, big.NewInt(2))
		maxFee.Add(maxFee, priorityFee)

		return &GasPrices{
			MaxFeePerGas:         maxFee,
			MaxPriorityFeePerGas: priorityFee,
			IsEIP1559:            true,
		}, nil
	}

	// Fallback to legacy gas price
	gasPrice, err := client.SuggestGasPrice(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get gas price: %w", err)
	}

	return &GasPrices{
		GasPrice:  gasPrice,
		IsEIP1559: false,
	}, nil
}

// EstimateGas estimates gas for a transaction with 20% buffer
func EstimateGas(ctx context.Context, client *ethclient.Client, from common.Address, to *common.Address, data []byte, value *big.Int) (*big.Int, error) {
	msg := ethereum.CallMsg{
		From:  from,
		To:    to,
		Data:  data,
		Value: value,
	}

	gasLimit, err := client.EstimateGas(ctx, msg)
	if err != nil {
		// Try to extract revert reason
		_, callErr := client.CallContract(ctx, msg, nil)
		if callErr != nil {
			// Try to decode the error
			if len(callErr.Error()) > 0 {
				return nil, fmt.Errorf("gas estimation failed: %s", callErr.Error())
			}
		}
		return nil, fmt.Errorf("gas estimation failed: %w", err)
	}

	// Add 20% buffer for safety
	buffer := new(big.Int).Div(big.NewInt(int64(gasLimit)), big.NewInt(5))
	gasWithBuffer := new(big.Int).Add(big.NewInt(int64(gasLimit)), buffer)

	return gasWithBuffer, nil
}

// BroadcastTransaction broadcasts a signed raw transaction
func BroadcastTransaction(ctx context.Context, client *ethclient.Client, signedTx []byte) (common.Hash, error) {
	tx := new(coretypes.Transaction)
	if err := tx.UnmarshalBinary(signedTx); err != nil {
		return common.Hash{}, fmt.Errorf("failed to decode signed transaction: %w", err)
	}

	if err := client.SendTransaction(ctx, tx); err != nil {
		return common.Hash{}, fmt.Errorf("failed to broadcast transaction: %w", err)
	}

	return tx.Hash(), nil
}

// GetTransaction retrieves a transaction by hash
func GetTransaction(ctx context.Context, client *ethclient.Client, txHash common.Hash) (*coretypes.Transaction, bool, error) {
	tx, isPending, err := client.TransactionByHash(ctx, txHash)
	if err != nil {
		return nil, false, err
	}
	return tx, isPending, nil
}

// WaitForReceipt polls for a transaction receipt with timeout
func WaitForReceipt(ctx context.Context, client *ethclient.Client, txHash common.Hash) (*types.TxReceipt, error) {
	timeout := 5 * time.Minute
	interval := 5 * time.Second
	deadline := time.Now().Add(timeout)

	log.Info("Waiting for transaction to be mined", "hash", txHash.Hex())

	lastLog := time.Now()
	for time.Now().Before(deadline) {
		receipt, err := client.TransactionReceipt(ctx, txHash)
		if err == nil {
			// Receipt found
			log.Info("Transaction mined", "block", receipt.BlockNumber.Uint64())

			var contractAddr *common.Address
			if receipt.ContractAddress != (common.Address{}) {
				contractAddr = &receipt.ContractAddress
			}

			txReceipt := &types.TxReceipt{
				TransactionHash: receipt.TxHash,
				BlockNumber:     receipt.BlockNumber.Uint64(),
				BlockHash:       receipt.BlockHash.Hex(),
				From:            common.Address{}, // Not available in receipt
				To:              nil,              // Not available in receipt
				GasUsed:         fmt.Sprintf("%d", receipt.GasUsed),
				Status:          receipt.Status,
				ContractAddress: contractAddr,
				Metadata:        make(map[string]interface{}),
			}

			return txReceipt, nil
		}

		// Log progress every 30 seconds
		if time.Since(lastLog) >= 30*time.Second {
			log.Info("Still waiting for confirmation...")
			lastLog = time.Now()
		}

		// Wait before next poll
		time.Sleep(interval)
	}

	return nil, fmt.Errorf("timeout waiting for transaction receipt after %v", timeout)
}

// FormatEth converts wei to ETH string with 6 decimal places
func FormatEth(wei *big.Int) string {
	if wei == nil {
		return "0"
	}

	// Convert to float for display (wei to ETH = / 1e18)
	weiFloat := new(big.Float).SetInt(wei)
	ethFloat := new(big.Float).Quo(weiFloat, big.NewFloat(1e18))

	return fmt.Sprintf("%.6f ETH", ethFloat)
}
