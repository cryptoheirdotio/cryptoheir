# Building for ARM64 (Raspberry Pi)

This guide explains how to cross-compile `cryptoheir-rs` for ARM64 architecture (Raspberry Pi 3/4/5).

## Prerequisites

- Rust toolchain installed
- Zig (installed as part of setup below)

## One-Time Setup

### Install cargo-zigbuild and Zig

1. Install cargo-zigbuild:
   ```bash
   cargo install cargo-zigbuild
   ```

2. Download and install Zig:
   ```bash
   curl -L https://ziglang.org/download/0.13.0/zig-linux-x86_64-0.13.0.tar.xz -o /tmp/zig.tar.xz
   mkdir -p ~/.local/bin
   tar -xf /tmp/zig.tar.xz -C ~/.local
   ln -sf ~/.local/zig-linux-x86_64-0.13.0/zig ~/.local/bin/zig
   ```

3. Add Zig to your PATH:
   ```bash
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
   source ~/.bashrc
   ```

## Building

### Build for ARM64

```bash
cargo zigbuild --release --target aarch64-unknown-linux-gnu
```

The compiled binary will be located at:
```
target/aarch64-unknown-linux-gnu/release/cryptoheir-rs
```

### Build Options

- **Release build** (optimized, smaller, slower compile):
  ```bash
  cargo zigbuild --release --target aarch64-unknown-linux-gnu
  ```

- **Debug build** (faster compile, larger binary):
  ```bash
  cargo zigbuild --target aarch64-unknown-linux-gnu
  ```

- **Clean build** (if you encounter issues):
  ```bash
  cargo clean
  cargo zigbuild --release --target aarch64-unknown-linux-gnu
  ```

## Deploying to Raspberry Pi

1. **Copy binary to Raspberry Pi:**
   ```bash
   scp target/aarch64-unknown-linux-gnu/release/cryptoheir-rs pi@raspberrypi:~/
   ```

2. **SSH into Raspberry Pi:**
   ```bash
   ssh pi@raspberrypi
   ```

3. **Make executable and run:**
   ```bash
   chmod +x ~/cryptoheir-rs
   ./cryptoheir-rs --help
   ```

## Supported Devices

- Raspberry Pi 3 (64-bit OS)
- Raspberry Pi 4
- Raspberry Pi 5
- Any ARM64 (aarch64) Linux device

## Notes

- The `openssl-sys` dependency with `vendored` feature ensures OpenSSL is compiled from source during cross-compilation
- Binary size is approximately 15MB for release builds
- The binary is dynamically linked and requires standard GNU/Linux libraries on the target device
