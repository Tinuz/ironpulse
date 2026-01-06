'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { motion } from 'framer-motion'
import { Camera, Loader2, X, AlertCircle, Package, Scan, Image } from 'lucide-react'

interface ProductData {
  name: string
  barcode: string
  calories: number
  protein: number
  carbs: number
  fats: number
  per100g: boolean
  imageUrl?: string
  brand?: string
}

interface BarcodeScannerProps {
  onProductScanned: (product: ProductData) => void
  onClose: () => void
}

export default function BarcodeScanner({ onProductScanned, onClose }: BarcodeScannerProps) {
  const [scannedCode, setScannedCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productData, setProductData] = useState<ProductData | null>(null)
  const [portionSize, setPortionSize] = useState<string>('100')
  const [scanDetected, setScanDetected] = useState(false)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const isScanning = useRef(false)

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null

    const initScanner = () => {
      try {
        scanner = new Html5QrcodeScanner(
          "reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
            ],
            showTorchButtonIfSupported: true,
            rememberLastUsedCamera: true,
          },
          false // verbose
        )
        scannerRef.current = scanner

        scanner.render(
          async (decodedText) => {
            if (isScanning.current) return
            isScanning.current = true
            
            // Visual feedback: barcode detected!
            setScanDetected(true)
            console.log('🔍 Barcode detected:', decodedText)
            
            setScannedCode(decodedText)
            
            // Clear scanner UI
            if (scanner) {
              scanner.clear().catch(err => {
                console.warn('⚠️ Scanner clear warning:', err)
              })
            }
            
            await fetchProductData(decodedText)
            isScanning.current = false
            setScanDetected(false)
          },
          (_errorMessage) => {
            // Quiet scan errors - happens continuously when not detecting
          }
        )
      } catch (err) {
        console.error("Scanner init error:", err)
        setError("Kon scanner niet starten. Geef camera-toegang in je browserinstellingen.")
      }
    }

    initScanner()

    return () => {
      if (scanner) {
        scanner.clear().catch((err) => {
          console.warn('⚠️ Scanner cleanup warning:', err)
        })
      }
    }
  }, [])

  const fetchProductData = async (barcode: string) => {
    setIsLoading(true)
    setError(null)

    console.log('🔍 [BARCODE SCAN] Starting product fetch...')
    console.log('📊 Barcode:', barcode)

    try {
      const apiUrl = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
      console.log('🌐 API URL:', apiUrl)

      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'IronPulse - Fitness App - Version 1.0 - ironpulse.app'
        }
      })
      
      console.log('📡 Response status:', response.status, response.statusText)
      console.log('✅ Response OK:', response.ok)
      
      if (!response.ok) {
        console.error('❌ API response not OK:', response.status)
        throw new Error('Product niet gevonden')
      }

      const data = await response.json()
      console.log('📦 API Response data:', data)
      console.log('🏷️ Product status:', data.status)
      console.log('🛒 Product found:', !!data.product)

      if (data.status === 0 || !data.product) {
        console.warn('⚠️ Product not found in OpenFoodFacts database')
        setError('Product niet gevonden in database. Probeer een ander product of voeg handmatig toe.')
        setIsLoading(false)
        return
      }

      const product = data.product
      const nutriments = product.nutriments || {}

      console.log('📝 Product name:', product.product_name || product.product_name_nl)
      console.log('🏢 Brand:', product.brands)
      console.log('🍽️ Nutriments:', {
        calories: nutriments.energy_kcal_100g || nutriments['energy-kcal_100g'],
        protein: nutriments.proteins_100g,
        carbs: nutriments.carbohydrates_100g,
        fats: nutriments.fat_100g
      })

      const productData: ProductData = {
        name: product.product_name || product.product_name_nl || 'Onbekend product',
        barcode: barcode,
        calories: Math.round(nutriments.energy_kcal_100g || nutriments['energy-kcal_100g'] || 0),
        protein: Math.round((nutriments.proteins_100g || 0) * 10) / 10,
        carbs: Math.round((nutriments.carbohydrates_100g || 0) * 10) / 10,
        fats: Math.round((nutriments.fat_100g || 0) * 10) / 10,
        per100g: true,
        imageUrl: product.image_url || product.image_front_url,
        brand: product.brands || undefined
      }

      console.log('✨ Processed product data:', productData)
      setProductData(productData)
      setIsLoading(false)
      console.log('✅ Product fetch completed successfully!')
    } catch (err) {
      console.error('❌ Error fetching product:', err)
      console.error('❌ Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      })
      setError('Kon productgegevens niet ophalen. Controleer je internetverbinding.')
      setIsLoading(false)
    }
  }

  const handleUseProduct = () => {
    if (productData) {
      const portion = parseFloat(portionSize) || 100
      const multiplier = portion / 100
      
      const adjustedProduct: ProductData = {
        ...productData,
        calories: Math.round(productData.calories * multiplier),
        protein: Math.round(productData.protein * multiplier * 10) / 10,
        carbs: Math.round(productData.carbs * multiplier * 10) / 10,
        fats: Math.round(productData.fats * multiplier * 10) / 10,
        per100g: false,
        name: `${productData.name} (${portion}g)`
      }
      
      onProductScanned(adjustedProduct)
      onClose()
    }
  }

  const handleRescan = () => {
    setScannedCode(null)
    setProductData(null)
    setError(null)
    setIsLoading(false)
    setScanDetected(false)
    isScanning.current = false
    
    // Reinitialize scanner without page reload
    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
        ],
        showTorchButtonIfSupported: true,
        rememberLastUsedCamera: true,
      },
      false
    )
    scannerRef.current = scanner

    scanner.render(
      async (decodedText) => {
        if (isScanning.current) return
        isScanning.current = true
        
        setScanDetected(true)
        console.log('🔍 Barcode detected:', decodedText)
        
        setScannedCode(decodedText)
        
        if (scanner) {
          scanner.clear().catch(err => {
            console.warn('⚠️ Scanner clear warning:', err)
          })
        }
        
        await fetchProductData(decodedText)
        isScanning.current = false
        setScanDetected(false)
      },
      (_errorMessage) => {
        // Quiet scan errors
      }
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-3">
        {/* Header */}
        <div className="flex justify-between items-center sticky top-0 bg-black/95 pb-3 z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Scan size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Barcode Scanner</h2>
              <p className="text-xs text-gray-400">Scan een product barcode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* Scanner View */}
        {!scannedCode && !error && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden"
          >
            <style jsx global>{`
              /* Container styling */
              #reader {
                border: none !important;
                background: transparent !important;
              }
              
              /* Scan region - video container */
              #reader__scan_region {
                border-radius: 1.5rem !important;
                border: none !important;
                background: black !important;
                min-height: 300px !important;
              }
              
              #reader__scan_region video {
                border-radius: 1.5rem !important;
                object-fit: cover !important;
              }
              
              /* Hide the default overlay box */
              #reader__scan_region img {
                opacity: 0.3 !important;
              }
              
              /* Dashboard section */
              #reader__dashboard {
                background: transparent !important;
                border: none !important;
                padding: 0 !important;
              }
              
              #reader__dashboard_section {
                background: transparent !important;
                border: none !important;
                padding: 1rem 1.5rem !important;
                margin: 0 !important;
              }
              
              /* Camera controls section */
              #reader__dashboard_section_csr {
                background: rgba(17, 24, 39, 0.4) !important;
                border: 1px solid rgba(255, 255, 255, 0.05) !important;
                border-radius: 1rem !important;
                padding: 1rem !important;
                margin: 0.75rem 0 !important;
              }
              
              /* File selection section */
              #reader__dashboard_section_fsr {
                background: rgba(17, 24, 39, 0.4) !important;
                border: 1px solid rgba(255, 255, 255, 0.05) !important;
                border-radius: 1rem !important;
                padding: 1rem !important;
                margin: 0.75rem 0 !important;
              }
              
              /* All buttons */
              #html5-qrcode-button-camera-permission,
              #html5-qrcode-button-camera-start,
              #html5-qrcode-button-camera-stop,
              #html5-qrcode-button-file-selection {
                background: linear-gradient(135deg, rgb(239, 68, 68) 0%, rgb(220, 38, 38) 100%) !important;
                color: white !important;
                border: none !important;
                border-radius: 0.75rem !important;
                padding: 0.875rem 1.75rem !important;
                font-weight: 600 !important;
                font-size: 0.875rem !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3) !important;
                width: 100% !important;
                margin: 0.25rem 0 !important;
                text-transform: none !important;
                letter-spacing: 0.02em !important;
              }
              
              #html5-qrcode-button-camera-permission:hover,
              #html5-qrcode-button-camera-start:hover,
              #html5-qrcode-button-camera-stop:hover,
              #html5-qrcode-button-file-selection:hover {
                background: linear-gradient(135deg, rgb(220, 38, 38) 0%, rgb(185, 28, 28) 100%) !important;
                box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4) !important;
                transform: translateY(-1px) !important;
              }
              
              /* Camera selection dropdown */
              #reader__camera_selection select {
                background: rgba(17, 24, 39, 0.8) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                color: white !important;
                border-radius: 0.75rem !important;
                padding: 0.75rem 1rem !important;
                font-size: 0.875rem !important;
                cursor: pointer !important;
                width: 100% !important;
                margin: 0.5rem 0 !important;
              }
              
              #reader__camera_selection select:focus {
                outline: none !important;
                border-color: rgb(239, 68, 68) !important;
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
              }
              
              #reader__camera_selection label {
                color: rgba(255, 255, 255, 0.7) !important;
                font-size: 0.75rem !important;
                font-weight: 600 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.05em !important;
                margin-bottom: 0.5rem !important;
                display: block !important;
              }
              
              /* Status text */
              #reader__status_span {
                color: rgba(255, 255, 255, 0.6) !important;
                font-size: 0.75rem !important;
                padding: 0.5rem 0 !important;
                text-align: center !important;
              }
              
              /* File input section */
              #reader__dashboard_section_fsr input[type="file"] {
                display: none !important;
              }
              
              /* Swap link between camera/file */
              #reader__dashboard_section_swaplink {
                color: rgb(239, 68, 68) !important;
                text-decoration: none !important;
                font-size: 0.875rem !important;
                font-weight: 500 !important;
                display: inline-block !important;
                margin: 0.75rem 0 !important;
                transition: all 0.2s !important;
              }
              
              #reader__dashboard_section_swaplink:hover {
                color: rgb(220, 38, 38) !important;
                text-decoration: underline !important;
              }
              
              /* Header text */
              #reader__header_message {
                color: white !important;
                font-size: 0.875rem !important;
                font-weight: 500 !important;
                padding: 0.5rem 0 !important;
              }
              
              /* Info icon */
              #reader img[alt="Info icon"] {
                filter: invert(1) opacity(0.5) !important;
              }
              
              /* Hide extra borders */
              #reader > div {
                border: none !important;
              }
              
              /* Torch button styling (if present) */
              button[title*="torch"],
              button[title*="Torch"],
              button[title*="flash"],
              button[title*="Flash"] {
                background: rgba(17, 24, 39, 0.8) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                border-radius: 50% !important;
                width: 48px !important;
                height: 48px !important;
                padding: 0 !important;
                margin: 0.5rem !important;
              }
            `}</style>
            
            <div id="reader" className="w-full" />
            
            {scanDetected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-primary/20 border-t border-primary/30"
              >
                <div className="flex items-center justify-center gap-3">
                  <Scan size={20} className="text-primary" />
                  <p className="text-sm font-bold text-primary">
                    Barcode gedetecteerd! Product ophalen...
                  </p>
                </div>
              </motion.div>
            )}
            
            <div className="p-6 text-center bg-card/30 border-t border-white/5">
              <div className="flex items-center justify-center gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <Camera size={18} className="text-primary" />
                  <p className="text-xs text-muted-foreground">Camera</p>
                </div>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-2">
                  <Image size={18} className="text-primary" />
                  <p className="text-xs text-muted-foreground">Foto uploaden</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Ondersteunt EAN-13, UPC-A, UPC-E en meer
              </p>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-white/10 rounded-3xl p-8 text-center"
          >
            <Loader2 size={48} className="mx-auto text-primary animate-spin mb-4" />
            <p className="text-lg font-semibold">Product ophalen...</p>
            <p className="text-sm text-muted-foreground mt-2">Barcode: {scannedCode}</p>
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-red-500/20 rounded-3xl p-8 text-center"
          >
            <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <p className="text-lg font-semibold mb-2">Oeps!</p>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <button
              onClick={handleRescan}
              className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              Opnieuw scannen
            </button>
          </motion.div>
        )}

        {/* Product Data */}
        {productData && !isLoading && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-white/10 rounded-3xl overflow-hidden"
          >
            {productData.imageUrl && (
              <div className="relative h-48 bg-gradient-to-br from-primary/10 to-accent/10">
                <img
                  src={productData.imageUrl}
                  alt={productData.name}
                  className="w-full h-full object-contain p-4"
                />
              </div>
            )}
            
            <div className="p-5 space-y-3">
              <div>
                <div className="flex items-start gap-3 mb-2">
                  <Package size={24} className="text-primary mt-1" />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{productData.name}</h3>
                    {productData.brand && (
                      <p className="text-sm text-muted-foreground">{productData.brand}</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Barcode: {productData.barcode}</p>
              </div>

              <div className="bg-background/50 rounded-2xl p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Calorieën</span>
                  <span className="text-lg font-bold">{productData.calories} kcal</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Eiwitten</span>
                  <span className="text-lg font-bold text-pink-500">{productData.protein}g</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Koolhydraten</span>
                  <span className="text-lg font-bold text-blue-500">{productData.carbs}g</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Vetten</span>
                  <span className="text-lg font-bold text-amber-500">{productData.fats}g</span>
                </div>
                <p className="text-xs text-muted-foreground text-center pt-2 border-t border-white/5">
                  Per 100g
                </p>
              </div>

              {/* Portion Size Input */}
              <div className="bg-background/50 rounded-2xl p-3">
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">
                  Portiegrootte (gram)
                </label>
                <input
                  type="number"
                  value={portionSize}
                  onChange={(e) => setPortionSize(e.target.value)}
                  className="w-full bg-background border border-white/10 rounded-xl p-3 text-center text-lg font-bold focus:border-primary outline-none"
                  min="1"
                  step="1"
                />
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Dit geeft {Math.round(productData.calories * (parseFloat(portionSize) || 100) / 100)} kcal
                </p>
              </div>

              <div className="flex gap-3 pt-1 pb-2">
                <button
                  onClick={handleRescan}
                  className="px-6 py-4 bg-white/5 text-white rounded-xl font-semibold hover:bg-white/10 transition-all border border-white/10"
                >
                  Opnieuw scannen
                </button>
                <button
                  onClick={handleUseProduct}
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-primary to-red-600 text-white rounded-xl font-bold text-lg hover:from-red-600 hover:to-red-700 transition-all shadow-lg shadow-primary/50 hover:shadow-xl hover:shadow-primary/60 hover:scale-[1.02]"
                >
                  Gebruiken →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
