'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { motion } from 'framer-motion'
import { Camera, Loader2, X, AlertCircle, Package, Scan, Flashlight, FlashlightOff } from 'lucide-react'

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
  const [isScannerActive, setIsScannerActive] = useState(true)
  const [scanDetected, setScanDetected] = useState(false)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isScanning = useRef(false)

  useEffect(() => {
    let scanner: Html5Qrcode | null = null

    const initScanner = async () => {
      try {
        scanner = new Html5Qrcode("reader", {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
          verbose: false
        })
        scannerRef.current = scanner

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        }

        await scanner.start(
          { 
            facingMode: "environment"
          },
          config,
          async (decodedText) => {
            if (isScanning.current) return
            isScanning.current = true
            
            // Visual feedback: barcode detected!
            setScanDetected(true)
            
            setScannedCode(decodedText)
            setIsScannerActive(false)
            
            // Stop scanner before fetching - with proper check
            try {
              if (scanner && scanner.isScanning) {
                await scanner.stop()
                console.log('✅ Scanner stopped successfully')
              }
            } catch (err) {
              console.warn('⚠️ Scanner stop warning:', err)
              // Continue anyway, scanner might already be stopped
            }
            
            await fetchProductData(decodedText)
            isScanning.current = false
            setScanDetected(false)
          },
          (_errorMessage) => {
            // Quiet scan errors - happens continuously when not detecting
          }
        )
        
        // Check torch support
        try {
          const capabilities = await scanner.getRunningTrackCameraCapabilities()
          setTorchSupported(capabilities.torchFeature().isSupported())
          console.log('🔦 Torch supported:', capabilities.torchFeature().isSupported())
        } catch (err) {
          console.warn('Could not check torch support:', err)
        }
        
        setIsScannerActive(true)
      } catch (err) {
        console.error("Scanner init error:", err)
        setError("Kon camera niet starten. Geef camera-toegang in je browserinstellingen.")
        setIsScannerActive(false)
      }
    }

    initScanner()

    return () => {
      if (!scanner || !scannerRef.current) return
      
      const state = scanner.getState()
      console.log('🧹 Scanner cleanup, current state:', state)
      
      // Stop scanner if it's running (state = 2 is SCANNING)
      if (state === 2) {
        scanner.stop()
          .then(() => {
            console.log('✅ Scanner stopped successfully')
            if (scanner) {
              scanner.clear()
              console.log('✅ Scanner cleared successfully')
            }
          })
          .catch((err) => {
            console.warn('⚠️ Scanner cleanup warning:', err)
          })
      } else {
        // If not scanning, just clear
        try {
          scanner.clear()
          console.log('✅ Scanner cleared (was not running)')
        } catch (err) {
          console.warn('⚠️ Clear warning:', err)
        }
      }
    }
  }, [])

  const toggleTorch = async () => {
    if (!scannerRef.current || !torchSupported) return
    
    try {
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: !torchEnabled } as any]
      })
      setTorchEnabled(!torchEnabled)
      console.log('🔦 Torch toggled:', !torchEnabled)
    } catch (err) {
      console.error('Failed to toggle torch:', err)
    }
  }

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
    window.location.reload() // Simple reset - kan later eleganter
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-lg space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
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
        {!scannedCode && !error && isScannerActive && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden relative"
          >
            <div id="reader" className="w-full relative" />
            
            {/* Torch Button */}
            {torchSupported && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={toggleTorch}
                className="absolute top-4 right-4 z-20 p-3 bg-black/50 backdrop-blur-sm rounded-full border border-white/20 hover:bg-black/70 transition-colors"
              >
                {torchEnabled ? (
                  <Flashlight size={24} className="text-yellow-400" />
                ) : (
                  <FlashlightOff size={24} className="text-white" />
                )}
              </motion.button>
            )}
            
            {/* Overlay container - positioned over the video */}
            <div className="absolute inset-0 pointer-events-none z-10">
              {/* Detection Flash Effect */}
              {scanDetected && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 bg-primary/30"
                />
              )}

              {/* Center the scan area overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative" style={{ width: '250px', height: '250px' }}>
                  {/* Scan Line Animation - moves within the 250x250 box */}
                  <motion.div
                    animate={{
                      y: [0, 250],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                    style={{ left: 0 }}
                  />
                  
                  {/* Corner Guides - exactly 250x250 */}
                  <div className="absolute inset-0">
                    {/* Top Left */}
                    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                    {/* Top Right */}
                    <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                    {/* Bottom Left */}
                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                    {/* Bottom Right */}
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-xl" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 text-center relative">
              {scanDetected ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center justify-center gap-3"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Scan size={18} className="text-primary" />
                  </div>
                  <p className="text-lg font-bold text-primary">
                    Barcode gedetecteerd! 
                  </p>
                </motion.div>
              ) : (
                <>
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Camera size={32} className="mx-auto text-primary mb-3" />
                  </motion.div>
                  <p className="text-sm text-muted-foreground">
                    Houd de barcode voor de camera
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="h-2 w-2 rounded-full bg-primary"
                    />
                    <p className="text-xs text-primary font-semibold">
                      Aan het scannen...
                    </p>
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                      className="h-2 w-2 rounded-full bg-primary"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    EAN-13, UPC-A en UPC-E formaten worden ondersteund
                  </p>
                </>
              )}
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
            
            <div className="p-6 space-y-4">
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

              <div className="bg-background/50 rounded-2xl p-4 space-y-3">
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
              <div className="bg-background/50 rounded-2xl p-4">
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

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleRescan}
                  className="flex-1 px-6 py-3 bg-white/5 text-white rounded-xl font-semibold hover:bg-white/10 transition-colors"
                >
                  Opnieuw scannen
                </button>
                <button
                  onClick={handleUseProduct}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                >
                  Gebruiken
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
