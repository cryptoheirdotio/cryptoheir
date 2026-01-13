package types

import (
	"encoding/json"
	"fmt"
	"math/big"
	"os"

	"github.com/ethereum/go-ethereum/common"
	"github.com/joho/godotenv"
)

// Config holds application configuration loaded from environment
type Config struct {
	SignerAddress   *common.Address
	PrivateKey      string
	InfuraAPIKey    string
	RPCURL          string
	ContractAddress *common.Address
}

// LoadConfig loads configuration from .env file and environment variables
func LoadConfig() (*Config, error) {
	// Try to load .env file (optional)
	_ = godotenv.Load()

	config := &Config{}

	// Load signer address
	if addr := os.Getenv("SIGNER_ADDRESS"); addr != "" {
		address := common.HexToAddress(addr)
		config.SignerAddress = &address
	}

	// Load private key
	config.PrivateKey = os.Getenv("PRIVATE_KEY")

	// Load Infura API key
	config.InfuraAPIKey = os.Getenv("INFURA_API_KEY")

	// Load RPC URL
	config.RPCURL = os.Getenv("RPC_URL")

	// Load contract address
	if addr := os.Getenv("CONTRACT_ADDRESS"); addr != "" {
		address := common.HexToAddress(addr)
		config.ContractAddress = &address
	}

	return config, nil
}

// TransactionMode represents the type of transaction
type TransactionMode string

const (
	TransactionModeDeploy TransactionMode = "deploy"
	TransactionModeCall   TransactionMode = "call"
)

// NetworkInfo contains information about the blockchain network
type NetworkInfo struct {
	Name    string `json:"name"`
	ChainID uint64 `json:"chain_id"`
	RPCURL  string `json:"rpc_url,omitempty"`
}

// Metadata contains additional transaction information
type Metadata struct {
	PreparedAt    string                 `json:"prepared_at"`
	SignedAt      string                 `json:"signed_at,omitempty"`
	BroadcastAt   string                 `json:"broadcast_at,omitempty"`
	Network       NetworkInfo            `json:"network"`
	ToolVersion   string                 `json:"tool_version"`
	AdditionalInfo map[string]interface{} `json:"additional_info,omitempty"`
}

// TransactionData contains the raw transaction parameters
type TransactionData struct {
	TxType                 uint8           `json:"tx_type"` // 0=Legacy, 2=EIP-1559
	From                   common.Address  `json:"from"`
	To                     *common.Address `json:"to"` // nil for contract deployment
	Data                   []byte          `json:"data"`
	Nonce                  uint64          `json:"nonce"`
	ChainID                uint64          `json:"chain_id"`
	GasLimit               *BigInt         `json:"gas_limit"`
	MaxFeePerGas           *BigInt         `json:"max_fee_per_gas,omitempty"`           // EIP-1559
	MaxPriorityFeePerGas   *BigInt         `json:"max_priority_fee_per_gas,omitempty"`   // EIP-1559
	GasPrice               *BigInt         `json:"gas_price,omitempty"`                  // Legacy
	Value                  *BigInt         `json:"value,omitempty"`
}

// TxParams represents an unsigned transaction prepared for signing
type TxParams struct {
	Mode         TransactionMode `json:"mode"`
	FunctionName string          `json:"function_name,omitempty"`
	Params       json.RawMessage `json:"params,omitempty"`
	Transaction  TransactionData `json:"transaction"`
	Metadata     Metadata        `json:"metadata"`
}

// SignedTx represents a signed transaction ready for broadcasting
type SignedTx struct {
	SignedTransaction        []byte          `json:"signed_transaction"`
	TxHash                   common.Hash     `json:"tx_hash"`
	Mode                     TransactionMode `json:"mode"`
	From                     common.Address  `json:"from"`
	PredictedContractAddress *common.Address `json:"predicted_contract_address,omitempty"`
	Metadata                 Metadata        `json:"metadata"`
}

// TxReceipt represents a transaction receipt after broadcasting
type TxReceipt struct {
	TransactionHash common.Hash            `json:"transaction_hash"`
	BlockNumber     uint64                 `json:"block_number"`
	BlockHash       string                 `json:"block_hash"`
	From            common.Address         `json:"from"`
	To              *common.Address        `json:"to,omitempty"`
	GasUsed         string                 `json:"gas_used"`
	Status          uint64                 `json:"status"`
	ContractAddress *common.Address        `json:"contract_address,omitempty"`
	Metadata        map[string]interface{} `json:"metadata"`
}

// BigInt is a wrapper around big.Int for custom JSON marshaling
type BigInt struct {
	*big.Int
}

// NewBigInt creates a new BigInt from a big.Int
func NewBigInt(i *big.Int) *BigInt {
	if i == nil {
		return nil
	}
	return &BigInt{Int: i}
}

// MarshalJSON implements json.Marshaler interface
// Serializes big.Int as a decimal string (not hex)
func (b *BigInt) MarshalJSON() ([]byte, error) {
	if b == nil || b.Int == nil {
		return json.Marshal("0")
	}
	return json.Marshal(b.Int.String())
}

// UnmarshalJSON implements json.Unmarshaler interface
func (b *BigInt) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}

	i, ok := new(big.Int).SetString(s, 10)
	if !ok {
		return fmt.Errorf("invalid big integer: %s", s)
	}

	b.Int = i
	return nil
}

// ToBigInt converts BigInt to *big.Int
func (b *BigInt) ToBigInt() *big.Int {
	if b == nil || b.Int == nil {
		return big.NewInt(0)
	}
	return b.Int
}
