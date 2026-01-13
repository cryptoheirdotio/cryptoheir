package crypto

import (
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"strings"

	"github.com/cryptoheirdotio/cryptoheir/cryptoheir-go/internal/types"
	"github.com/ethereum/go-ethereum/common"
	coretypes "github.com/ethereum/go-ethereum/core/types"
	ethcrypto "github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/rlp"
)

// SignTransaction signs a transaction with a private key
func SignTransaction(txParams *types.TxParams, privateKeyHex string) (*types.SignedTx, error) {
	// Parse private key
	privateKeyHex = strings.TrimPrefix(privateKeyHex, "0x")
	privateKey, err := ethcrypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return nil, fmt.Errorf("invalid private key: %w", err)
	}

	// Verify signer address matches from address
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("failed to cast public key to ECDSA")
	}
	signerAddress := ethcrypto.PubkeyToAddress(*publicKeyECDSA)

	if signerAddress != txParams.Transaction.From {
		return nil, fmt.Errorf("signer address %s does not match transaction from address %s",
			signerAddress.Hex(), txParams.Transaction.From.Hex())
	}

	// Sign based on transaction type
	var signedTxBytes []byte
	var txHash common.Hash

	if txParams.Transaction.TxType == 2 {
		// EIP-1559 transaction
		signedTxBytes, txHash, err = signEIP1559(&txParams.Transaction, privateKey)
		if err != nil {
			return nil, fmt.Errorf("failed to sign EIP-1559 transaction: %w", err)
		}
	} else if txParams.Transaction.TxType == 0 {
		// Legacy transaction
		signedTxBytes, txHash, err = signLegacy(&txParams.Transaction, privateKey)
		if err != nil {
			return nil, fmt.Errorf("failed to sign legacy transaction: %w", err)
		}
	} else {
		return nil, fmt.Errorf("unsupported transaction type: %d", txParams.Transaction.TxType)
	}

	// Predict contract address for deployments
	var predictedAddr *common.Address
	if txParams.Mode == types.TransactionModeDeploy {
		addr := ethcrypto.CreateAddress(txParams.Transaction.From, txParams.Transaction.Nonce)
		predictedAddr = &addr
	}

	// Build SignedTx result
	signedTx := &types.SignedTx{
		SignedTransaction:        signedTxBytes,
		TxHash:                   txHash,
		Mode:                     txParams.Mode,
		From:                     txParams.Transaction.From,
		PredictedContractAddress: predictedAddr,
		Metadata:                 txParams.Metadata,
	}

	return signedTx, nil
}

// signEIP1559 signs an EIP-1559 transaction
func signEIP1559(txData *types.TransactionData, privateKey *ecdsa.PrivateKey) ([]byte, common.Hash, error) {
	// Validate EIP-1559 fields
	if txData.MaxFeePerGas == nil || txData.MaxPriorityFeePerGas == nil {
		return nil, common.Hash{}, fmt.Errorf("EIP-1559 transaction requires max_fee_per_gas and max_priority_fee_per_gas")
	}

	// Build transaction value (default to 0)
	value := big.NewInt(0)
	if txData.Value != nil {
		value = txData.Value.ToBigInt()
	}

	// Create EIP-1559 transaction
	tx := coretypes.NewTx(&coretypes.DynamicFeeTx{
		ChainID:   big.NewInt(int64(txData.ChainID)),
		Nonce:     txData.Nonce,
		GasTipCap: txData.MaxPriorityFeePerGas.ToBigInt(),
		GasFeeCap: txData.MaxFeePerGas.ToBigInt(),
		Gas:       txData.GasLimit.ToBigInt().Uint64(),
		To:        txData.To,
		Value:     value,
		Data:      txData.Data,
	})

	// Sign the transaction
	signer := coretypes.NewLondonSigner(big.NewInt(int64(txData.ChainID)))
	signedTx, err := coretypes.SignTx(tx, signer, privateKey)
	if err != nil {
		return nil, common.Hash{}, fmt.Errorf("failed to sign transaction: %w", err)
	}

	// Encode to binary (EIP-2718 format)
	signedTxBytes, err := signedTx.MarshalBinary()
	if err != nil {
		return nil, common.Hash{}, fmt.Errorf("failed to encode signed transaction: %w", err)
	}

	return signedTxBytes, signedTx.Hash(), nil
}

// signLegacy signs a legacy (pre-EIP-1559) transaction
func signLegacy(txData *types.TransactionData, privateKey *ecdsa.PrivateKey) ([]byte, common.Hash, error) {
	// Validate legacy fields
	if txData.GasPrice == nil {
		return nil, common.Hash{}, fmt.Errorf("legacy transaction requires gas_price")
	}

	// Build transaction value (default to 0)
	value := big.NewInt(0)
	if txData.Value != nil {
		value = txData.Value.ToBigInt()
	}

	// Create legacy transaction
	tx := coretypes.NewTx(&coretypes.LegacyTx{
		Nonce:    txData.Nonce,
		GasPrice: txData.GasPrice.ToBigInt(),
		Gas:      txData.GasLimit.ToBigInt().Uint64(),
		To:       txData.To,
		Value:    value,
		Data:     txData.Data,
	})

	// Sign with EIP-155 (chain ID for replay protection)
	signer := coretypes.NewEIP155Signer(big.NewInt(int64(txData.ChainID)))
	signedTx, err := coretypes.SignTx(tx, signer, privateKey)
	if err != nil {
		return nil, common.Hash{}, fmt.Errorf("failed to sign transaction: %w", err)
	}

	// Encode to binary
	signedTxBytes, err := signedTx.MarshalBinary()
	if err != nil {
		return nil, common.Hash{}, fmt.Errorf("failed to encode signed transaction: %w", err)
	}

	return signedTxBytes, signedTx.Hash(), nil
}

// VerifySignature verifies a signed transaction matches expected parameters
func VerifySignature(signedTxBytes []byte, expectedFrom common.Address) error {
	tx := new(coretypes.Transaction)
	if err := tx.UnmarshalBinary(signedTxBytes); err != nil {
		return fmt.Errorf("failed to decode transaction: %w", err)
	}

	// Extract signer address from signature
	chainID := tx.ChainId()
	var signer coretypes.Signer
	if tx.Type() == coretypes.DynamicFeeTxType {
		signer = coretypes.NewLondonSigner(chainID)
	} else {
		signer = coretypes.NewEIP155Signer(chainID)
	}

	from, err := coretypes.Sender(signer, tx)
	if err != nil {
		return fmt.Errorf("failed to recover signer: %w", err)
	}

	if from != expectedFrom {
		return fmt.Errorf("signature verification failed: expected %s, got %s", expectedFrom.Hex(), from.Hex())
	}

	return nil
}

// PredictContractAddress predicts the address of a contract deployment
func PredictContractAddress(deployer common.Address, nonce uint64) common.Address {
	return ethcrypto.CreateAddress(deployer, nonce)
}

// RLPEncode encodes data using RLP encoding
func RLPEncode(data interface{}) ([]byte, error) {
	return rlp.EncodeToBytes(data)
}
