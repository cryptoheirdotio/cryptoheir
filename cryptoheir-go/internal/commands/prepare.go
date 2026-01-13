package commands

import (
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"os"
	"time"

	"github.com/cryptoheirdotio/cryptoheir/cryptoheir-go/internal/contract"
	"github.com/cryptoheirdotio/cryptoheir/cryptoheir-go/internal/network"
	"github.com/cryptoheirdotio/cryptoheir/cryptoheir-go/internal/types"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/ethereum/go-ethereum/params"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

var log = logrus.New()

// PrepareCmd represents the prepare command
var PrepareCmd = &cobra.Command{
	Use:   "prepare [deploy|deposit]",
	Short: "Prepare an unsigned transaction for offline signing",
	Long: `Prepare an unsigned transaction by connecting to the network,
estimating gas, and creating a transaction parameters file for offline signing.

Supports:
  - deploy: Deploy a new CryptoHeir contract
  - deposit: Create an inheritance deposit`,
	Args: cobra.ExactArgs(1),
	RunE: runPrepare,
}

var (
	// Common flags
	networkFlag string
	rpcURLFlag  string
	outputFlag  string

	// Deposit flags
	beneficiaryFlag string
	amountFlag      string
	deadlineFlag    int64
	tokenFlag       string
)

func init() {
	// Common flags
	PrepareCmd.PersistentFlags().StringVar(&networkFlag, "network", "sepolia", "Network name (sepolia, mainnet, etc.)")
	PrepareCmd.PersistentFlags().StringVar(&rpcURLFlag, "rpc-url", "", "Custom RPC URL (overrides network)")
	PrepareCmd.PersistentFlags().StringVarP(&outputFlag, "output", "o", "tx-params.json", "Output file path")

	// Deposit-specific flags
	PrepareCmd.PersistentFlags().StringVar(&beneficiaryFlag, "beneficiary", "", "Beneficiary address")
	PrepareCmd.PersistentFlags().StringVar(&amountFlag, "amount", "", "Amount in ETH (e.g., 1.5)")
	PrepareCmd.PersistentFlags().Int64Var(&deadlineFlag, "deadline", 0, "Deadline as Unix timestamp")
	PrepareCmd.PersistentFlags().StringVar(&tokenFlag, "token", "", "ERC20 token address (omit for native ETH)")
}

func runPrepare(cmd *cobra.Command, args []string) error {
	operation := args[0]

	// Load configuration
	config, err := types.LoadConfig()
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	// Initialize contract module
	if err := contract.Initialize(); err != nil {
		return fmt.Errorf("failed to initialize contract: %w", err)
	}

	// Determine RPC URL
	rpcURL := rpcURLFlag
	if rpcURL == "" {
		rpcURL, err = network.GetRPCURL(networkFlag, config.InfuraAPIKey)
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

	// Get chain ID
	chainID, err := network.GetChainID(ctx, client)
	if err != nil {
		return err
	}
	log.Infof("Chain ID: %d", chainID)

	// Get signer address
	if config.SignerAddress == nil {
		return fmt.Errorf("SIGNER_ADDRESS not set in environment")
	}
	signerAddress := *config.SignerAddress
	log.Infof("Signer address: %s", signerAddress.Hex())

	// Get nonce
	nonce, err := network.GetNonce(ctx, client, signerAddress)
	if err != nil {
		return err
	}
	log.Infof("Nonce: %d", nonce)

	// Prepare transaction based on operation
	var txParams *types.TxParams
	switch operation {
	case "deploy":
		txParams, err = prepareDeploy(ctx, client, signerAddress, nonce, chainID, networkFlag, rpcURL)
	case "deposit":
		txParams, err = prepareDeposit(ctx, client, config, signerAddress, nonce, chainID, networkFlag, rpcURL)
	default:
		return fmt.Errorf("unsupported operation: %s (supported: deploy, deposit)", operation)
	}

	if err != nil {
		return err
	}

	// Save to file
	data, err := json.MarshalIndent(txParams, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to serialize transaction: %w", err)
	}

	if err := os.WriteFile(outputFlag, data, 0644); err != nil {
		return fmt.Errorf("failed to write output file: %w", err)
	}

	log.Infof("✓ Transaction prepared successfully")
	log.Infof("  Output: %s", outputFlag)
	log.Infof("  Next: Transfer to offline machine and run 'cryptoheir sign -i %s'", outputFlag)

	return nil
}

func prepareDeploy(ctx context.Context, client *ethclient.Client, signerAddress common.Address, nonce uint64, chainID uint64, networkName, rpcURL string) (*types.TxParams, error) {
	log.Info("Preparing contract deployment...")

	// Load bytecode
	bytecode, err := contract.LoadBytecode()
	if err != nil {
		return nil, err
	}
	log.Infof("Contract bytecode loaded (%d bytes)", len(bytecode))

	// Estimate gas
	gasLimit, err := network.EstimateGas(ctx, client, signerAddress, nil, bytecode, nil)
	if err != nil {
		return nil, fmt.Errorf("gas estimation failed: %w", err)
	}
	log.Infof("Estimated gas: %s", gasLimit.String())

	// Get gas prices
	gasPrices, err := network.GetGasPrices(ctx, client)
	if err != nil {
		return nil, err
	}

	// Build transaction data
	txData := types.TransactionData{
		From:     signerAddress,
		To:       nil, // Contract deployment
		Data:     bytecode,
		Nonce:    nonce,
		ChainID:  chainID,
		GasLimit: types.NewBigInt(gasLimit),
	}

	// Set gas prices based on transaction type
	if gasPrices.IsEIP1559 {
		txData.TxType = 2
		txData.MaxFeePerGas = types.NewBigInt(gasPrices.MaxFeePerGas)
		txData.MaxPriorityFeePerGas = types.NewBigInt(gasPrices.MaxPriorityFeePerGas)
		log.Infof("EIP-1559: Max fee %s gwei, Priority %s gwei",
			weiToGwei(gasPrices.MaxFeePerGas), weiToGwei(gasPrices.MaxPriorityFeePerGas))
	} else {
		txData.TxType = 0
		txData.GasPrice = types.NewBigInt(gasPrices.GasPrice)
		log.Infof("Legacy: Gas price %s gwei", weiToGwei(gasPrices.GasPrice))
	}

	// Build metadata
	metadata := types.Metadata{
		PreparedAt:  time.Now().UTC().Format(time.RFC3339),
		Network:     types.NetworkInfo{Name: networkName, ChainID: chainID, RPCURL: rpcURL},
		ToolVersion: "cryptoheir-go v0.1.0",
	}

	// Build TxParams
	txParams := &types.TxParams{
		Mode:        types.TransactionModeDeploy,
		Transaction: txData,
		Metadata:    metadata,
	}

	return txParams, nil
}

func prepareDeposit(ctx context.Context, client *ethclient.Client, config *types.Config, signerAddress common.Address, nonce uint64, chainID uint64, networkName, rpcURL string) (*types.TxParams, error) {
	log.Info("Preparing deposit transaction...")

	// Validate required flags
	if beneficiaryFlag == "" {
		return nil, fmt.Errorf("--beneficiary is required")
	}
	if amountFlag == "" {
		return nil, fmt.Errorf("--amount is required")
	}
	if deadlineFlag == 0 {
		return nil, fmt.Errorf("--deadline is required")
	}

	// Parse beneficiary address
	beneficiary := common.HexToAddress(beneficiaryFlag)
	if beneficiary == (common.Address{}) {
		return nil, fmt.Errorf("invalid beneficiary address")
	}

	// Parse amount (ETH to wei)
	amount, err := parseEther(amountFlag)
	if err != nil {
		return nil, fmt.Errorf("invalid amount: %w", err)
	}

	// Parse deadline
	deadline := big.NewInt(deadlineFlag)

	// Parse token address (optional)
	var token *common.Address
	if tokenFlag != "" {
		tokenAddr := common.HexToAddress(tokenFlag)
		token = &tokenAddr
	}

	// Get contract address
	if config.ContractAddress == nil {
		return nil, fmt.Errorf("CONTRACT_ADDRESS not set in environment")
	}
	contractAddress := *config.ContractAddress

	// Encode deposit function
	data, value, err := contract.EncodeDeposit(beneficiary, amount, deadline, token)
	if err != nil {
		return nil, err
	}

	// Estimate gas
	gasLimit, err := network.EstimateGas(ctx, client, signerAddress, &contractAddress, data, value)
	if err != nil {
		return nil, fmt.Errorf("gas estimation failed: %w", err)
	}
	log.Infof("Estimated gas: %s", gasLimit.String())

	// Get gas prices
	gasPrices, err := network.GetGasPrices(ctx, client)
	if err != nil {
		return nil, err
	}

	// Build transaction data
	txData := types.TransactionData{
		From:     signerAddress,
		To:       &contractAddress,
		Data:     data,
		Nonce:    nonce,
		ChainID:  chainID,
		GasLimit: types.NewBigInt(gasLimit),
	}

	// Set value if native token
	if value != nil {
		txData.Value = types.NewBigInt(value)
		log.Infof("Deposit value: %s", network.FormatEth(value))
	}

	// Set gas prices
	if gasPrices.IsEIP1559 {
		txData.TxType = 2
		txData.MaxFeePerGas = types.NewBigInt(gasPrices.MaxFeePerGas)
		txData.MaxPriorityFeePerGas = types.NewBigInt(gasPrices.MaxPriorityFeePerGas)
	} else {
		txData.TxType = 0
		txData.GasPrice = types.NewBigInt(gasPrices.GasPrice)
	}

	// Build parameters JSON
	params := map[string]interface{}{
		"beneficiary": beneficiary.Hex(),
		"amount":      amount.String(),
		"deadline":    deadline.String(),
	}
	if token != nil {
		params["token"] = token.Hex()
	}
	paramsJSON, _ := json.Marshal(params)

	// Build metadata
	metadata := types.Metadata{
		PreparedAt:  time.Now().UTC().Format(time.RFC3339),
		Network:     types.NetworkInfo{Name: networkName, ChainID: chainID, RPCURL: rpcURL},
		ToolVersion: "cryptoheir-go v0.1.0",
	}

	// Build TxParams
	txParams := &types.TxParams{
		Mode:         types.TransactionModeCall,
		FunctionName: "deposit",
		Params:       paramsJSON,
		Transaction:  txData,
		Metadata:     metadata,
	}

	log.Infof("Deposit prepared for beneficiary %s", beneficiary.Hex())
	return txParams, nil
}

// parseEther converts an ETH string to wei (*big.Int)
func parseEther(ethStr string) (*big.Int, error) {
	// Parse as float first
	var ethFloat float64
	if _, err := fmt.Sscanf(ethStr, "%f", &ethFloat); err != nil {
		return nil, fmt.Errorf("invalid number format: %w", err)
	}

	// Convert to wei (multiply by 1e18)
	weiFloat := ethFloat * params.Ether
	wei := new(big.Int)
	wei.SetUint64(uint64(weiFloat))

	return wei, nil
}

// weiToGwei converts wei to gwei string
func weiToGwei(wei *big.Int) string {
	if wei == nil {
		return "0"
	}
	gwei := new(big.Float).Quo(new(big.Float).SetInt(wei), big.NewFloat(params.GWei))
	return fmt.Sprintf("%.2f", gwei)
}
