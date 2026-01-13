package contract

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"os"
	"path/filepath"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
)

// ContractArtifact represents the Foundry contract artifact structure
type ContractArtifact struct {
	ABI      json.RawMessage `json:"abi"`
	Bytecode struct {
		Object string `json:"object"`
	} `json:"bytecode"`
}

var (
	contractABI      abi.ABI
	contractBytecode []byte
)

// Initialize loads the contract artifact and parses ABI
func Initialize() error {
	// Get the contract artifact path relative to project root
	artifactPath := filepath.Join("..", "foundry", "out", "CryptoHeir.sol", "CryptoHeir.json")

	// Read artifact file
	data, err := os.ReadFile(artifactPath)
	if err != nil {
		return fmt.Errorf("failed to read contract artifact: %w", err)
	}

	// Parse artifact
	var artifact ContractArtifact
	if err := json.Unmarshal(data, &artifact); err != nil {
		return fmt.Errorf("failed to parse contract artifact: %w", err)
	}

	// Parse ABI
	parsedABI, err := abi.JSON(strings.NewReader(string(artifact.ABI)))
	if err != nil {
		return fmt.Errorf("failed to parse contract ABI: %w", err)
	}
	contractABI = parsedABI

	// Parse bytecode (remove 0x prefix if present)
	bytecodeHex := strings.TrimPrefix(artifact.Bytecode.Object, "0x")
	bytecode, err := hex.DecodeString(bytecodeHex)
	if err != nil {
		return fmt.Errorf("failed to decode contract bytecode: %w", err)
	}
	contractBytecode = bytecode

	return nil
}

// LoadBytecode returns the contract deployment bytecode
func LoadBytecode() ([]byte, error) {
	if len(contractBytecode) == 0 {
		return nil, fmt.Errorf("contract not initialized, call Initialize() first")
	}
	return contractBytecode, nil
}

// EncodeDeposit encodes the deposit function call
// deposit(address _token, address _beneficiary, uint256 _amount, uint256 _deadline)
func EncodeDeposit(beneficiary common.Address, amount *big.Int, deadline *big.Int, token *common.Address) ([]byte, *big.Int, error) {
	if contractABI.Methods == nil {
		return nil, nil, fmt.Errorf("contract not initialized, call Initialize() first")
	}

	// Default token to zero address (native ETH)
	tokenAddr := common.Address{}
	if token != nil {
		tokenAddr = *token
	}

	// Pack the function call
	data, err := contractABI.Pack("deposit", tokenAddr, beneficiary, amount, deadline)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to encode deposit: %w", err)
	}

	// If native token (zero address), return the amount as value
	var value *big.Int
	if tokenAddr == (common.Address{}) {
		value = amount
	}

	return data, value, nil
}

// EncodeClaim encodes the claim function call
// claim(uint256 _inheritanceId)
func EncodeClaim(inheritanceID *big.Int) ([]byte, error) {
	if contractABI.Methods == nil {
		return nil, fmt.Errorf("contract not initialized, call Initialize() first")
	}

	data, err := contractABI.Pack("claim", inheritanceID)
	if err != nil {
		return nil, fmt.Errorf("failed to encode claim: %w", err)
	}

	return data, nil
}

// EncodeReclaim encodes the reclaim function call
// reclaim(uint256 _inheritanceId)
func EncodeReclaim(inheritanceID *big.Int) ([]byte, error) {
	if contractABI.Methods == nil {
		return nil, fmt.Errorf("contract not initialized, call Initialize() first")
	}

	data, err := contractABI.Pack("reclaim", inheritanceID)
	if err != nil {
		return nil, fmt.Errorf("failed to encode reclaim: %w", err)
	}

	return data, nil
}

// EncodeExtendDeadline encodes the extendDeadline function call
// extendDeadline(uint256 _inheritanceId, uint256 _newDeadline)
func EncodeExtendDeadline(inheritanceID *big.Int, newDeadline *big.Int) ([]byte, error) {
	if contractABI.Methods == nil {
		return nil, fmt.Errorf("contract not initialized, call Initialize() first")
	}

	data, err := contractABI.Pack("extendDeadline", inheritanceID, newDeadline)
	if err != nil {
		return nil, fmt.Errorf("failed to encode extendDeadline: %w", err)
	}

	return data, nil
}

// EncodeTransferFeeCollector encodes the transferFeeCollector function call
// transferFeeCollector(address newFeeCollector)
func EncodeTransferFeeCollector(newCollector common.Address) ([]byte, error) {
	if contractABI.Methods == nil {
		return nil, fmt.Errorf("contract not initialized, call Initialize() first")
	}

	data, err := contractABI.Pack("transferFeeCollector", newCollector)
	if err != nil {
		return nil, fmt.Errorf("failed to encode transferFeeCollector: %w", err)
	}

	return data, nil
}

// EncodeAcceptFeeCollector encodes the acceptFeeCollector function call
// acceptFeeCollector()
func EncodeAcceptFeeCollector() ([]byte, error) {
	if contractABI.Methods == nil {
		return nil, fmt.Errorf("contract not initialized, call Initialize() first")
	}

	data, err := contractABI.Pack("acceptFeeCollector")
	if err != nil {
		return nil, fmt.Errorf("failed to encode acceptFeeCollector: %w", err)
	}

	return data, nil
}

// DecodeContractError attempts to decode a contract revert error
func DecodeContractError(revertData []byte) string {
	if len(revertData) < 4 {
		return "unknown error"
	}

	// Try to match error selector
	for name, abiError := range contractABI.Errors {
		if len(revertData) >= 4 {
			errorID := revertData[:4]
			// Compare first 4 bytes (selector)
			if len(abiError.ID) >= 4 &&
				errorID[0] == abiError.ID[0] &&
				errorID[1] == abiError.ID[1] &&
				errorID[2] == abiError.ID[2] &&
				errorID[3] == abiError.ID[3] {
				// Found matching error selector
				return fmt.Sprintf("contract error: %s", name)
			}
		}
	}

	// Check for standard Error(string) revert
	errorSig := []byte{0x08, 0xc3, 0x79, 0xa0} // Error(string) selector
	if len(revertData) >= 4 &&
		revertData[0] == errorSig[0] &&
		revertData[1] == errorSig[1] &&
		revertData[2] == errorSig[2] &&
		revertData[3] == errorSig[3] {
		// Try to decode the string (skip selector, decode ABI-encoded string)
		if len(revertData) > 4 {
			return fmt.Sprintf("revert: %s", string(revertData[4:]))
		}
	}

	return fmt.Sprintf("unknown error: 0x%x", revertData[:min(len(revertData), 32)])
}

// min returns the smaller of two ints
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
