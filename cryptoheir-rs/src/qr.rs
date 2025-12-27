//! QR code generation and scanning for offline data transfer

use crate::Result;
use image::Luma;
use qrcode::QrCode;

/// Display a QR code in the terminal
pub fn display_qr(data: &str) -> Result<()> {
    let code = QrCode::new(data.as_bytes())?;

    // Render as ASCII art for terminal display
    let string = code
        .render::<char>()
        .quiet_zone(false)
        .module_dimensions(2, 1)
        .build();

    println!("\n{}", string);
    println!("\nQR Code generated. Scan with your mobile device or save to file.");

    Ok(())
}

/// Save QR code to an image file
pub fn save_qr_to_file(data: &str, filename: &str) -> Result<()> {
    let code = QrCode::new(data.as_bytes())?;

    // Render to image
    let image = code.render::<Luma<u8>>().build();

    // Save to file
    image.save(filename)?;

    println!("QR code saved to: {}", filename);

    Ok(())
}

/// Scan QR code from an image file
pub fn scan_qr(filename: &str) -> Result<String> {
    // Load the image
    let img = image::open(filename)
        .map_err(|e| eyre::eyre!("Failed to open image {}: {}", filename, e))?;

    // Convert to luma (grayscale)
    let img_luma = img.to_luma8();

    // Prepare image for rqrr
    let mut img_rqrr = rqrr::PreparedImage::prepare(img_luma);

    // Find and decode QR codes
    let grids = img_rqrr.detect_grids();
    if grids.is_empty() {
        return Err(eyre::eyre!("No QR code found in image"));
    }

    // Decode the first QR code found
    let (_, content) = grids[0].decode()?;

    Ok(content)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_qr_encode_decode() {
        let test_data = r#"{"test": "data"}"#;

        // Generate QR code and save to temp file
        let temp_file = "/tmp/test_qr.png";
        save_qr_to_file(test_data, temp_file).unwrap();

        // Scan it back
        let decoded = scan_qr(temp_file).unwrap();

        assert_eq!(decoded, test_data);

        // Clean up
        std::fs::remove_file(temp_file).ok();
    }
}
