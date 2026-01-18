package commands

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/cryptoheirdotio/cryptoheir/cryptoheir-go/internal/crypto"
	"github.com/cryptoheirdotio/cryptoheir/cryptoheir-go/internal/tui"
	"github.com/cryptoheirdotio/cryptoheir/cryptoheir-go/internal/types"
	"github.com/spf13/cobra"
)

// SignCmd represents the sign command
var SignCmd = &cobra.Command{
	Use:   "sign",
	Short: "Sign a prepared transaction offline",
	Long: `Sign a prepared transaction with your private key.

This command is designed to be run on an air-gapped (offline) machine.
It will display the transaction details in an interactive TUI for review before signing.`,
	RunE: runSign,
}

var (
	signInputFlag      string
	signOutputFlag     string
	signSkipReviewFlag bool
)

func init() {
	SignCmd.Flags().StringVarP(&signInputFlag, "input", "i", "tx-params.json", "Input transaction parameters file")
	SignCmd.Flags().StringVarP(&signOutputFlag, "output", "o", "signed-tx.json", "Output signed transaction file")
	SignCmd.Flags().BoolVar(&signSkipReviewFlag, "skip-review", false, "Skip interactive TUI review (not recommended)")
}

func runSign(cmd *cobra.Command, args []string) error {
	// Load transaction parameters
	txParamsData, err := os.ReadFile(signInputFlag)
	if err != nil {
		return fmt.Errorf("failed to read input file: %w", err)
	}

	var txParams types.TxParams
	if err := json.Unmarshal(txParamsData, &txParams); err != nil {
		return fmt.Errorf("failed to parse transaction parameters: %w", err)
	}

	log.Info("Transaction parameters loaded")
	log.Info("  Network",
		"network", txParams.Metadata.Network.Name,
		"chain_id", txParams.Transaction.ChainID)
	log.Info("  Mode", "mode", txParams.Mode)
	if txParams.FunctionName != "" {
		log.Info("  Function", "function", txParams.FunctionName)
	}

	// Validate transaction parameters
	if err := validateTxParams(&txParams); err != nil {
		return fmt.Errorf("invalid transaction parameters: %w", err)
	}

	// Interactive TUI review (unless skipped)
	if !signSkipReviewFlag {
		log.Info("Launching interactive transaction review...")
		log.Info("(Use --skip-review flag to bypass this step)")

		approved, err := tui.ReviewTransaction(&txParams)
		if err != nil {
			return fmt.Errorf("TUI error: %w", err)
		}

		if !approved {
			log.Info("Transaction signing cancelled by user")
			return nil
		}

		log.Info("✓ Transaction approved by user")
	} else {
		log.Warn("⚠ WARNING: Skipping transaction review (use with caution!)")
	}

	// Load private key from environment
	config, err := types.LoadConfig()
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	if config.PrivateKey == "" {
		return fmt.Errorf("PRIVATE_KEY not set in environment")
	}

	// Sign transaction
	log.Info("Signing transaction...")
	signedTx, err := crypto.SignTransaction(&txParams, config.PrivateKey)
	if err != nil {
		return fmt.Errorf("failed to sign transaction: %w", err)
	}

	// Update metadata
	signedTx.Metadata.SignedAt = time.Now().UTC().Format(time.RFC3339)

	log.Info("✓ Transaction signed successfully")
	log.Info("  TX Hash", "hash", signedTx.TxHash.Hex())
	if signedTx.PredictedContractAddress != nil {
		log.Info("  Predicted Contract Address", "address", signedTx.PredictedContractAddress.Hex())
	}

	// Save signed transaction
	signedData, err := json.MarshalIndent(signedTx, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to serialize signed transaction: %w", err)
	}

	if err := os.WriteFile(signOutputFlag, signedData, 0644); err != nil {
		return fmt.Errorf("failed to write output file: %w", err)
	}

	log.Info("✓ Signed transaction saved", "file", signOutputFlag)
	log.Info("  Next",
		"instruction", fmt.Sprintf("Transfer to online machine and run 'cryptoheir broadcast -i %s --network %s'",
			signOutputFlag, txParams.Metadata.Network.Name))

	return nil
}

// validateTxParams validates transaction parameters before signing
func validateTxParams(txParams *types.TxParams) error {
	// Check gas parameters match transaction type
	if txParams.Transaction.TxType == 2 {
		// EIP-1559
		if txParams.Transaction.MaxFeePerGas == nil || txParams.Transaction.MaxPriorityFeePerGas == nil {
			return fmt.Errorf("EIP-1559 transaction requires max_fee_per_gas and max_priority_fee_per_gas")
		}
	} else if txParams.Transaction.TxType == 0 {
		// Legacy
		if txParams.Transaction.GasPrice == nil {
			return fmt.Errorf("legacy transaction requires gas_price")
		}
	} else {
		return fmt.Errorf("unsupported transaction type: %d", txParams.Transaction.TxType)
	}

	// Validate addresses
	if txParams.Transaction.From.Hex() == "0x0000000000000000000000000000000000000000" {
		return fmt.Errorf("invalid from address")
	}

	// Validate gas limit
	if txParams.Transaction.GasLimit == nil || txParams.Transaction.GasLimit.ToBigInt().Sign() <= 0 {
		return fmt.Errorf("invalid gas limit")
	}

	return nil
}
