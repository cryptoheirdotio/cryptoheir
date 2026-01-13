package commands

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/cryptoheirdotio/cryptoheir/cryptoheir-go/internal/network"
	"github.com/cryptoheirdotio/cryptoheir/cryptoheir-go/internal/types"
	"github.com/ethereum/go-ethereum/common"
	"github.com/spf13/cobra"
)

// BroadcastCmd represents the broadcast command
var BroadcastCmd = &cobra.Command{
	Use:   "broadcast",
	Short: "Broadcast a signed transaction to the network",
	Long: `Broadcast a signed transaction to the blockchain network.

This command requires network access and should be run on an online machine.
It will submit the transaction and wait for confirmation.`,
	RunE: runBroadcast,
}

var (
	broadcastInputFlag   string
	broadcastNetworkFlag string
	broadcastRPCURLFlag  string
)

func init() {
	BroadcastCmd.Flags().StringVarP(&broadcastInputFlag, "input", "i", "signed-tx.json", "Input signed transaction file")
	BroadcastCmd.Flags().StringVar(&broadcastNetworkFlag, "network", "", "Network name (must match signed transaction)")
	BroadcastCmd.Flags().StringVar(&broadcastRPCURLFlag, "rpc-url", "", "Custom RPC URL (overrides network)")
}

func runBroadcast(cmd *cobra.Command, args []string) error {
	// Load signed transaction
	signedTxData, err := os.ReadFile(broadcastInputFlag)
	if err != nil {
		return fmt.Errorf("failed to read input file: %w", err)
	}

	var signedTx types.SignedTx
	if err := json.Unmarshal(signedTxData, &signedTx); err != nil {
		return fmt.Errorf("failed to parse signed transaction: %w", err)
	}

	log.Info("Signed transaction loaded")
	log.Infof("  TX Hash: %s", signedTx.TxHash.Hex())
	log.Infof("  From: %s", signedTx.From.Hex())
	log.Infof("  Network: %s (Chain ID: %d)", signedTx.Metadata.Network.Name, signedTx.Metadata.Network.ChainID)

	// Load configuration
	config, err := types.LoadConfig()
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	// Determine RPC URL
	rpcURL := broadcastRPCURLFlag
	if rpcURL == "" {
		// Use network flag if provided, otherwise use metadata
		networkName := broadcastNetworkFlag
		if networkName == "" {
			networkName = signedTx.Metadata.Network.Name
		}

		rpcURL, err = network.GetRPCURL(networkName, config.InfuraAPIKey)
		if err != nil {
			return fmt.Errorf("failed to get RPC URL: %w", err)
		}
	}

	// Connect to network
	ctx := context.Background()
	client, err := network.CreateClient(ctx, rpcURL)
	if err != nil {
		return err
	}
	defer client.Close()

	log.Info("Connected to network")

	// Verify chain ID matches
	chainID, err := network.GetChainID(ctx, client)
	if err != nil {
		return err
	}

	if chainID != signedTx.Metadata.Network.ChainID {
		return fmt.Errorf("chain ID mismatch: connected to chain %d but transaction is for chain %d",
			chainID, signedTx.Metadata.Network.ChainID)
	}
	log.Infof("✓ Chain ID verified: %d", chainID)

	// Check if transaction already broadcast (idempotent)
	_, isPending, err := network.GetTransaction(ctx, client, signedTx.TxHash)
	if err == nil {
		log.Warn("⚠ Transaction already broadcast!")
		if isPending {
			log.Info("  Transaction is pending confirmation")
		} else {
			log.Info("  Transaction is already confirmed")
		}

		// Still try to get receipt if it's confirmed
		if !isPending {
			receipt, err := client.TransactionReceipt(ctx, signedTx.TxHash)
			if err == nil {
				log.Infof("  Block: %d", receipt.BlockNumber.Uint64())
				log.Infof("  Status: %d (1=success, 0=failed)", receipt.Status)
				if receipt.ContractAddress != (common.Address{}) {
					log.Infof("  Contract Address: %s", receipt.ContractAddress.Hex())
				}
				return nil
			}
		}

		// Continue to wait for receipt
		log.Info("Waiting for confirmation...")
	} else {
		// Transaction not found, broadcast it
		log.Info("Broadcasting transaction...")
		txHash, err := network.BroadcastTransaction(ctx, client, signedTx.SignedTransaction)
		if err != nil {
			return fmt.Errorf("failed to broadcast transaction: %w", err)
		}

		if txHash != signedTx.TxHash {
			log.Warnf("⚠ Warning: broadcast TX hash (%s) differs from signed TX hash (%s)",
				txHash.Hex(), signedTx.TxHash.Hex())
		}

		log.Infof("✓ Transaction broadcast successfully")
		log.Infof("  TX Hash: %s", txHash.Hex())
	}

	// Wait for receipt
	receipt, err := network.WaitForReceipt(ctx, client, signedTx.TxHash)
	if err != nil {
		return err
	}

	// Update metadata
	receipt.Metadata["broadcast_at"] = time.Now().UTC().Format(time.RFC3339)
	receipt.Metadata["network"] = signedTx.Metadata.Network.Name

	// Display receipt information
	log.Info("═════════════════════════════════════════")
	log.Info("✓ TRANSACTION CONFIRMED")
	log.Info("═════════════════════════════════════════")
	log.Infof("  TX Hash: %s", receipt.TransactionHash.Hex())
	log.Infof("  Block: %d", receipt.BlockNumber)
	log.Infof("  Status: %d (1=success, 0=failed)", receipt.Status)
	log.Infof("  Gas Used: %s", receipt.GasUsed)

	if receipt.Status == 0 {
		log.Error("⚠ TRANSACTION FAILED - Check block explorer for details")
	}

	if receipt.ContractAddress != nil && *receipt.ContractAddress != (common.Address{}) {
		log.Info("  Contract Deployed:")
		log.Infof("    Address: %s", receipt.ContractAddress.Hex())

		if signedTx.PredictedContractAddress != nil &&
			*receipt.ContractAddress != *signedTx.PredictedContractAddress {
			log.Warnf("    ⚠ Warning: Address differs from predicted %s",
				signedTx.PredictedContractAddress.Hex())
		}
	}

	// Save receipt to file
	receiptFilename := fmt.Sprintf("%s-receipt.json", broadcastInputFlag[:len(broadcastInputFlag)-5])
	receiptData, err := json.MarshalIndent(receipt, "", "  ")
	if err != nil {
		log.Warnf("Failed to serialize receipt: %v", err)
	} else {
		if err := os.WriteFile(receiptFilename, receiptData, 0644); err != nil {
			log.Warnf("Failed to write receipt file: %v", err)
		} else {
			log.Infof("  Receipt saved: %s", receiptFilename)
		}
	}

	return nil
}

// GetTransactionStatus checks the status of a transaction by hash
func GetTransactionStatus(ctx context.Context, client interface{}, txHash common.Hash) (string, error) {
	// This is a helper function for checking transaction status
	// Implementation would query the blockchain for transaction details
	return "unknown", fmt.Errorf("not implemented")
}
