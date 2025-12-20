#!/bin/bash

# Test script for prepare-transaction.js using Foundry local test node
# This script tests all contract functions with the updated prepare-transaction.js

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_OUTPUT_DIR="./test-outputs"
ANVIL_PID=""
ANVIL_RPC="http://127.0.0.1:8545"

# Foundry default test accounts
DEPLOYER_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
BENEFICIARY_ADDRESS="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
FEE_COLLECTOR_ADDRESS="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"

# Mock ERC20 token address (for testing encoding, won't actually work without deployment)
MOCK_ERC20="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"

# Timestamps
CURRENT_TIME=$(date +%s)
FUTURE_DEADLINE=$((CURRENT_TIME + 86400))  # 1 day from now
FAR_FUTURE_DEADLINE=$((CURRENT_TIME + 172800))  # 2 days from now

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  CryptoHeir prepare-transaction.js Test Suite                 ║${NC}"
echo -e "${BLUE}║  Testing with Foundry Local Node (Anvil)                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}\n"

# Function to print test header
print_test() {
    echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}TEST: $1${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to check if anvil is running
check_anvil() {
    if curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        $ANVIL_RPC > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to start anvil
start_anvil() {
    print_test "Starting Anvil (Foundry Local Node)"

    if check_anvil; then
        print_success "Anvil is already running at $ANVIL_RPC"
        return 0
    fi

    echo "Starting anvil in background..."
    cd ../foundry
    anvil > /dev/null 2>&1 &
    ANVIL_PID=$!
    cd ../offline-signer

    # Wait for anvil to start
    echo -n "Waiting for anvil to be ready"
    for i in {1..10}; do
        if check_anvil; then
            echo ""
            print_success "Anvil started successfully (PID: $ANVIL_PID)"
            return 0
        fi
        echo -n "."
        sleep 1
    done

    echo ""
    print_error "Failed to start anvil"
    exit 1
}

# Function to stop anvil
stop_anvil() {
    if [ ! -z "$ANVIL_PID" ]; then
        print_test "Stopping Anvil"
        kill $ANVIL_PID 2>/dev/null || true
        print_success "Anvil stopped"
    fi
}

# Function to setup environment
setup_environment() {
    print_test "Setting Up Test Environment"

    # Create test output directory
    mkdir -p "$TEST_OUTPUT_DIR"
    print_success "Created test output directory: $TEST_OUTPUT_DIR"

    # Check if contract is built
    if [ ! -f "../foundry/out/CryptoHeir.sol/CryptoHeir.json" ]; then
        echo "Building CryptoHeir contract..."
        cd ../foundry
        forge build
        cd ../offline-signer
        print_success "Contract built successfully"
    else
        print_success "Contract artifact found"
    fi

    # Create .env file for testing
    cat > .env << EOF
# Test configuration for Foundry local node
SIGNER_ADDRESS=$DEPLOYER_ADDRESS
RPC_URL=$ANVIL_RPC
EOF
    print_success "Created test .env file"
    print_success "  SIGNER_ADDRESS: $DEPLOYER_ADDRESS"
    print_success "  RPC_URL: $ANVIL_RPC"
}

# Function to validate output file
validate_output() {
    local file=$1
    local expected_mode=$2
    local expected_function=$3

    if [ ! -f "$file" ]; then
        print_error "Output file not created: $file"
        return 1
    fi

    # Check if it's valid JSON
    if ! jq empty "$file" 2>/dev/null; then
        print_error "Invalid JSON in output file: $file"
        return 1
    fi

    # Check mode
    local mode=$(jq -r '.mode' "$file")
    if [ "$mode" != "$expected_mode" ]; then
        print_error "Expected mode '$expected_mode', got '$mode'"
        return 1
    fi

    # Check function name (if applicable)
    if [ "$expected_mode" == "call" ]; then
        local func=$(jq -r '.functionName' "$file")
        if [ "$func" != "$expected_function" ]; then
            print_error "Expected function '$expected_function', got '$func'"
            return 1
        fi
    fi

    # Check if transaction data exists
    local data=$(jq -r '.transaction.data' "$file")
    if [ -z "$data" ] || [ "$data" == "null" ]; then
        print_error "Missing transaction data"
        return 1
    fi

    print_success "Output file validated: $file"
    echo "    Mode: $mode"
    if [ "$expected_mode" == "call" ]; then
        echo "    Function: $func"
    fi
    echo "    Data length: ${#data} chars"
    echo "    Chain ID: $(jq -r '.transaction.chainId' "$file")"
    echo "    Nonce: $(jq -r '.transaction.nonce' "$file")"
    echo "    Gas Limit: $(jq -r '.transaction.gasLimit' "$file")"

    return 0
}

# Function to run a test
run_test() {
    local test_name=$1
    shift
    local output_file="$TEST_OUTPUT_DIR/$test_name.json"

    echo -e "\nRunning: node prepare-transaction.js $@"

    if node prepare-transaction.js "$@" --output "$output_file"; then
        print_success "Command executed successfully"
        return 0
    else
        print_error "Command failed"
        return 1
    fi
}

# Cleanup function
cleanup() {
    print_test "Cleaning Up"
    stop_anvil
    print_success "Cleanup complete"
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# ============================================================================
# START TESTS
# ============================================================================

# Setup
start_anvil
setup_environment

DEPLOYED_CONTRACT=""
TEST_RESULTS=()

# ============================================================================
# Test 1: Deploy Contract
# ============================================================================
print_test "Test 1: Deploy Contract"
if run_test "01-deploy" --deploy; then
    validate_output "$TEST_OUTPUT_DIR/01-deploy.json" "deploy" ""
    # Extract predicted contract address for future tests
    DEPLOYED_CONTRACT=$(jq -r '.transaction.to // "0x5FbDB2315678afecb367f032d93F642f64180aa3"' "$TEST_OUTPUT_DIR/01-deploy.json")
    print_success "Test 1 PASSED"
    TEST_RESULTS+=("✓ Deploy Contract")
else
    print_error "Test 1 FAILED"
    TEST_RESULTS+=("✗ Deploy Contract")
fi

# Use a default contract address for function call tests
CONTRACT_ADDR="0x5FbDB2315678afecb367f032d93F642f64180aa3"

# ============================================================================
# Test 2: Deposit - Native Token (no --token specified)
# ============================================================================
print_test "Test 2: Deposit Native Token (default, no --token flag)"
if run_test "02-deposit-native-default" \
    --call deposit \
    --contract "$CONTRACT_ADDR" \
    --beneficiary "$BENEFICIARY_ADDRESS" \
    --deadline "$FUTURE_DEADLINE" \
    --value "0.1"; then

    validate_output "$TEST_OUTPUT_DIR/02-deposit-native-default.json" "call" "deposit"

    # Validate params
    token=$(jq -r '.params.token' "$TEST_OUTPUT_DIR/02-deposit-native-default.json")
    amount=$(jq -r '.params.amount' "$TEST_OUTPUT_DIR/02-deposit-native-default.json")

    if [ "$token" == "0x0000000000000000000000000000000000000000" ]; then
        print_success "Token correctly defaulted to address(0)"
    else
        print_error "Token should be address(0), got: $token"
    fi

    if [ "$amount" == "0" ]; then
        print_success "Amount correctly set to 0 (ignored for native token)"
    else
        print_error "Amount should be 0 for native token, got: $amount"
    fi

    print_success "Test 2 PASSED"
    TEST_RESULTS+=("✓ Deposit Native Token (default)")
else
    print_error "Test 2 FAILED"
    TEST_RESULTS+=("✗ Deposit Native Token (default)")
fi

# ============================================================================
# Test 3: Deposit - Native Token (explicit address(0))
# ============================================================================
print_test "Test 3: Deposit Native Token (explicit address(0))"
if run_test "03-deposit-native-explicit" \
    --call deposit \
    --contract "$CONTRACT_ADDR" \
    --token "0x0000000000000000000000000000000000000000" \
    --beneficiary "$BENEFICIARY_ADDRESS" \
    --deadline "$FUTURE_DEADLINE" \
    --value "1.5"; then

    validate_output "$TEST_OUTPUT_DIR/03-deposit-native-explicit.json" "call" "deposit"

    # Check that value is set in transaction
    tx_value=$(jq -r '.transaction.value' "$TEST_OUTPUT_DIR/03-deposit-native-explicit.json")
    if [ ! -z "$tx_value" ] && [ "$tx_value" != "null" ]; then
        print_success "Transaction value is set"
    else
        print_error "Transaction value should be set for native token deposit"
    fi

    print_success "Test 3 PASSED"
    TEST_RESULTS+=("✓ Deposit Native Token (explicit)")
else
    print_error "Test 3 FAILED"
    TEST_RESULTS+=("✗ Deposit Native Token (explicit)")
fi

# ============================================================================
# Test 4: Deposit - ERC20 Token
# ============================================================================
print_test "Test 4: Deposit ERC20 Token"
if run_test "04-deposit-erc20" \
    --call deposit \
    --contract "$CONTRACT_ADDR" \
    --token "$MOCK_ERC20" \
    --beneficiary "$BENEFICIARY_ADDRESS" \
    --amount "1000000" \
    --deadline "$FUTURE_DEADLINE"; then

    validate_output "$TEST_OUTPUT_DIR/04-deposit-erc20.json" "call" "deposit"

    # Validate params
    token=$(jq -r '.params.token' "$TEST_OUTPUT_DIR/04-deposit-erc20.json")
    amount=$(jq -r '.params.amount' "$TEST_OUTPUT_DIR/04-deposit-erc20.json")

    if [ "$token" == "$MOCK_ERC20" ]; then
        print_success "Token address correct: $token"
    else
        print_error "Token address mismatch"
    fi

    if [ "$amount" == "1000000" ]; then
        print_success "Amount correct: $amount"
    else
        print_error "Amount mismatch"
    fi

    # Check that value is NOT set for ERC20
    tx_value=$(jq -r '.transaction.value' "$TEST_OUTPUT_DIR/04-deposit-erc20.json")
    if [ -z "$tx_value" ] || [ "$tx_value" == "null" ]; then
        print_success "Transaction value is not set (correct for ERC20)"
    else
        print_error "Transaction value should not be set for ERC20 deposit"
    fi

    print_success "Test 4 PASSED"
    TEST_RESULTS+=("✓ Deposit ERC20 Token")
else
    print_error "Test 4 FAILED"
    TEST_RESULTS+=("✗ Deposit ERC20 Token")
fi

# ============================================================================
# Test 5: Claim
# ============================================================================
print_test "Test 5: Claim Inheritance"
if run_test "05-claim" \
    --call claim \
    --contract "$CONTRACT_ADDR" \
    --inheritance-id "0"; then

    validate_output "$TEST_OUTPUT_DIR/05-claim.json" "call" "claim"

    inheritance_id=$(jq -r '.params.inheritanceId' "$TEST_OUTPUT_DIR/05-claim.json")
    if [ "$inheritance_id" == "0" ]; then
        print_success "Inheritance ID correct: $inheritance_id"
    else
        print_error "Inheritance ID mismatch"
    fi

    print_success "Test 5 PASSED"
    TEST_RESULTS+=("✓ Claim")
else
    print_error "Test 5 FAILED"
    TEST_RESULTS+=("✗ Claim")
fi

# ============================================================================
# Test 6: Reclaim
# ============================================================================
print_test "Test 6: Reclaim Inheritance"
if run_test "06-reclaim" \
    --call reclaim \
    --contract "$CONTRACT_ADDR" \
    --inheritance-id "0"; then

    validate_output "$TEST_OUTPUT_DIR/06-reclaim.json" "call" "reclaim"
    print_success "Test 6 PASSED"
    TEST_RESULTS+=("✓ Reclaim")
else
    print_error "Test 6 FAILED"
    TEST_RESULTS+=("✗ Reclaim")
fi

# ============================================================================
# Test 7: Extend Deadline
# ============================================================================
print_test "Test 7: Extend Deadline"
if run_test "07-extend-deadline" \
    --call extendDeadline \
    --contract "$CONTRACT_ADDR" \
    --inheritance-id "0" \
    --deadline "$FAR_FUTURE_DEADLINE"; then

    validate_output "$TEST_OUTPUT_DIR/07-extend-deadline.json" "call" "extendDeadline"

    new_deadline=$(jq -r '.params.deadline' "$TEST_OUTPUT_DIR/07-extend-deadline.json")
    if [ "$new_deadline" == "$FAR_FUTURE_DEADLINE" ]; then
        print_success "New deadline correct: $new_deadline"
    else
        print_error "New deadline mismatch"
    fi

    print_success "Test 7 PASSED"
    TEST_RESULTS+=("✓ Extend Deadline")
else
    print_error "Test 7 FAILED"
    TEST_RESULTS+=("✗ Extend Deadline")
fi

# ============================================================================
# Test 8: Transfer Fee Collector
# ============================================================================
print_test "Test 8: Transfer Fee Collector"
if run_test "08-transfer-fee-collector" \
    --call transferFeeCollector \
    --contract "$CONTRACT_ADDR" \
    --new-fee-collector "$FEE_COLLECTOR_ADDRESS"; then

    validate_output "$TEST_OUTPUT_DIR/08-transfer-fee-collector.json" "call" "transferFeeCollector"

    new_collector=$(jq -r '.params.newFeeCollector' "$TEST_OUTPUT_DIR/08-transfer-fee-collector.json")
    if [ "$new_collector" == "$FEE_COLLECTOR_ADDRESS" ]; then
        print_success "New fee collector correct: $new_collector"
    else
        print_error "New fee collector mismatch"
    fi

    print_success "Test 8 PASSED"
    TEST_RESULTS+=("✓ Transfer Fee Collector")
else
    print_error "Test 8 FAILED"
    TEST_RESULTS+=("✗ Transfer Fee Collector")
fi

# ============================================================================
# Test 9: Accept Fee Collector
# ============================================================================
print_test "Test 9: Accept Fee Collector"
if run_test "09-accept-fee-collector" \
    --call acceptFeeCollector \
    --contract "$CONTRACT_ADDR"; then

    validate_output "$TEST_OUTPUT_DIR/09-accept-fee-collector.json" "call" "acceptFeeCollector"

    # acceptFeeCollector has no params
    params=$(jq -r '.params | length' "$TEST_OUTPUT_DIR/09-accept-fee-collector.json")
    if [ "$params" == "0" ]; then
        print_success "No parameters (correct for acceptFeeCollector)"
    else
        print_error "Should have no parameters"
    fi

    print_success "Test 9 PASSED"
    TEST_RESULTS+=("✓ Accept Fee Collector")
else
    print_error "Test 9 FAILED"
    TEST_RESULTS+=("✗ Accept Fee Collector")
fi

# ============================================================================
# Test 10: Error Case - ERC20 without --amount
# ============================================================================
print_test "Test 10: Error Case - ERC20 Deposit Without Amount (should fail)"
if run_test "10-error-erc20-no-amount" \
    --call deposit \
    --contract "$CONTRACT_ADDR" \
    --token "$MOCK_ERC20" \
    --beneficiary "$BENEFICIARY_ADDRESS" \
    --deadline "$FUTURE_DEADLINE" 2>/dev/null; then

    print_error "Test 10 FAILED - Should have errored but succeeded"
    TEST_RESULTS+=("✗ Error: ERC20 without amount")
else
    print_success "Test 10 PASSED - Correctly rejected ERC20 deposit without --amount"
    TEST_RESULTS+=("✓ Error: ERC20 without amount")
fi

# ============================================================================
# Test 11: Error Case - Native token without --value
# ============================================================================
print_test "Test 11: Error Case - Native Token Without Value (should fail)"
if run_test "11-error-native-no-value" \
    --call deposit \
    --contract "$CONTRACT_ADDR" \
    --beneficiary "$BENEFICIARY_ADDRESS" \
    --deadline "$FUTURE_DEADLINE" 2>/dev/null; then

    print_error "Test 11 FAILED - Should have errored but succeeded"
    TEST_RESULTS+=("✗ Error: Native without value")
else
    print_success "Test 11 PASSED - Correctly rejected native token deposit without --value"
    TEST_RESULTS+=("✓ Error: Native without value")
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      TEST SUMMARY                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}\n"

PASSED=0
FAILED=0

for result in "${TEST_RESULTS[@]}"; do
    if [[ $result == ✓* ]]; then
        echo -e "${GREEN}$result${NC}"
        ((PASSED++))
    else
        echo -e "${RED}$result${NC}"
        ((FAILED++))
    fi
done

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "Test output files saved to: ${YELLOW}$TEST_OUTPUT_DIR/${NC}\n"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! 🎉${NC}\n"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED ❌${NC}\n"
    exit 1
fi
