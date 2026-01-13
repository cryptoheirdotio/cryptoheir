package main

import (
	"fmt"
	"os"

	"github.com/cryptoheirdotio/cryptoheir/cryptoheir-go/internal/commands"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

var (
	log     = logrus.New()
	verbose bool
)

var rootCmd = &cobra.Command{
	Use:   "cryptoheir",
	Short: "Air-gapped offline transaction signing for CryptoHeir contract",
	Long: `CryptoHeir - Secure offline transaction signing for Ethereum-based inheritance contracts

This tool implements a three-step workflow for maximum security:
  1. PREPARE (online):  Create unsigned transaction with network data
  2. SIGN (offline):    Sign transaction with private key on air-gapped machine
  3. BROADCAST (online): Submit signed transaction to blockchain

Features:
  - Air-gapped signing for maximum security
  - Interactive TUI for transaction review
  - Support for EIP-1559 and legacy transactions
  - Multi-network support (Ethereum, Polygon, Arbitrum, Optimism, Base, Linea)`,
	PersistentPreRun: func(cmd *cobra.Command, args []string) {
		// Configure logging
		if verbose {
			log.SetLevel(logrus.DebugLevel)
		} else {
			log.SetLevel(logrus.InfoLevel)
		}

		log.SetFormatter(&logrus.TextFormatter{
			FullTimestamp: true,
			DisableColors: false,
		})
	},
}

func init() {
	// Global flags
	rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "Enable verbose output")

	// Add subcommands
	rootCmd.AddCommand(commands.PrepareCmd)
	rootCmd.AddCommand(commands.SignCmd)
	rootCmd.AddCommand(commands.BroadcastCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
