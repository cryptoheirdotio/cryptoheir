import { useState, useEffect, useRef } from 'react';
import QrScanner from 'qr-scanner';
import { isAddress } from 'viem';

export const QRScannerModal = ({ isOpen, onClose, onAddressScanned }) => {
  const [activeTab, setActiveTab] = useState('camera');
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize camera scanner
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') {
      // Clean up scanner if modal closed or switched to upload tab
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
      return;
    }

    const initScanner = async () => {
      if (!videoRef.current) return;

      try {
        setError('');
        setIsScanning(true);

        // Create scanner instance
        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            const scannedData = result.data;
            if (validateAndProcessAddress(scannedData)) {
              scanner.stop();
            }
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );

        scannerRef.current = scanner;
        await scanner.start();
      } catch (err) {
        console.error('Camera error:', err);
        setError('Failed to access camera. Please check permissions.');
        setIsScanning(false);
      }
    };

    initScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [isOpen, activeTab]);

  // Validate and process the scanned address
  const validateAndProcessAddress = (data) => {
    setError('');

    // Clean the data (remove whitespace)
    const cleanData = data.trim();

    // Check if it's a valid Ethereum address
    if (isAddress(cleanData)) {
      onAddressScanned(cleanData);
      onClose();
      return true;
    } else {
      setError('QR code does not contain a valid Ethereum address');
      return false;
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      setIsScanning(true);

      const result = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
      });

      validateAndProcessAddress(result.data);
    } catch (err) {
      console.error('QR scan error:', err);
      setError('Failed to read QR code from image. Please try another image.');
    } finally {
      setIsScanning(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClose = () => {
    setError('');
    setActiveTab('camera');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <input type="checkbox" id="qr-scanner-modal" className="modal-toggle" checked={isOpen} readOnly />
      <div className="modal modal-open">
        <div className="modal-box max-w-2xl">
          <h3 className="font-bold text-2xl mb-4">Scan Beneficiary Address</h3>

          {/* Tabs */}
          <div className="tabs tabs-boxed mb-4">
            <button
              className={`tab ${activeTab === 'camera' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('camera')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Scan with Camera
            </button>
            <button
              className={`tab ${activeTab === 'upload' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Upload Image
            </button>
          </div>

          {/* Camera Tab */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {!isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <span className="loading loading-spinner loading-lg"></span>
                  </div>
                )}
              </div>
              <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Point your camera at a QR code containing an Ethereum address</span>
              </div>
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Select QR Code Image:</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="file-input file-input-bordered file-input-primary w-full"
                  disabled={isScanning}
                />
              </div>
              <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Upload an image file containing a QR code with an Ethereum address</span>
              </div>
              {isScanning && (
                <div className="flex items-center justify-center py-8">
                  <span className="loading loading-spinner loading-lg"></span>
                  <span className="ml-3">Scanning QR code...</span>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="alert alert-error mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="modal-action">
            <button onClick={handleClose} className="btn">
              Close
            </button>
          </div>
        </div>
        <div className="modal-backdrop" onClick={handleClose}></div>
      </div>
    </>
  );
};
