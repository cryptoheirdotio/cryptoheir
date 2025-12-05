#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Define file paths
const SOURCE_PATH = path.join(__dirname, 'foundry', 'out', 'CryptoHeir.sol', 'CryptoHeir.json');
const DEST_PATH = path.join(__dirname, 'frontend', 'src', 'utils', 'CryptoHeirABI.json');

console.log('🔄 Updating CryptoHeir ABI...\n');

try {
  // Check if source file exists
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error('❌ Error: Source file not found!');
    console.error(`   Expected: ${SOURCE_PATH}`);
    console.error('\n💡 Tip: Run "forge build" in the foundry directory first.\n');
    process.exit(1);
  }

  // Read the Foundry output file
  console.log(`📖 Reading: ${path.relative(__dirname, SOURCE_PATH)}`);
  const foundryOutput = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));

  // Extract the ABI
  if (!foundryOutput.abi) {
    console.error('❌ Error: No ABI found in source file!');
    process.exit(1);
  }

  const abi = foundryOutput.abi;
  console.log(`✓ Found ABI with ${abi.length} entries`);

  // Ensure destination directory exists
  const destDir = path.dirname(DEST_PATH);
  if (!fs.existsSync(destDir)) {
    console.log(`📁 Creating directory: ${path.relative(__dirname, destDir)}`);
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Write the ABI to the frontend
  console.log(`📝 Writing: ${path.relative(__dirname, DEST_PATH)}`);
  fs.writeFileSync(DEST_PATH, JSON.stringify(abi, null, 2), 'utf8');

  console.log('\n✅ ABI updated successfully!\n');

} catch (error) {
  console.error('\n❌ Error updating ABI:');
  console.error(error.message);
  process.exit(1);
}
