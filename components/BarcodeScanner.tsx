'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { motion } from 'framer-motion'
import { Camera, Loader2, X, AlertCircle, Package, Scan } from 'lucide-react'

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
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isScanning = useRef(false)

  useEffect(() => {
    let scanner: Html5Qrcode | null = null

    const initScanner = async () => {
      try {
        scanner = new Html5Qrcode("reader")
        scannerRef.current = scanner

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          formatsToSupport: [
            0, // QR_CODE (we'll use this constant)
            // EAN formats for barcodes
          ]
        }

        await scanner.start(
          { facingMode: "environment" },
          config,
          async (decodedText) => {
            if (isScanning.current) return
            isScanning.current = true
            
            setScannedCode(decodedText)
            await scanner?.stop()
            await fetchProductData(decodedText)
            isScanning.current = false
          },
          (_errorMessage) => {
            // Quiet scan errors - happens continuously when not detecting
          }
        )
      } catch (err) {
        console.error("Scanner init error:", err)
        setError("Kon camera niet starten. Geef camera-toegang in je browserinstellingen.")
      }
    }

    initScanner()

    return () => {
      if (scanner) {
        if (scanner.isScanning) {
          scanner.stop().catch(console.error)
        }
        scanner.clear()
      }
    }
  }, [])

  const fetchProductData = async (barcode: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
      )
      
      if (!response.ok) {
        throw new Error('Product niet gevonden')
      }

      const data = await response.json()

      if (data.status === 0 || !data.product) {
        setError('Product niet gevonden in database. Probeer een ander product of voeg handmatig toe.')
        setIsLoading(false)
        return
      }

      const product = data.product
      const nutriments = product.nutriments || {}

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

      setProductData(productData)
      setIsLoading(false)
    } catch (err) {
      console.error('Error fetching product:', err)
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
        {!scannedCode && !error && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden"
          >
            <div id="reader" className="w-full" />
            <div className="p-6 text-center">
              <Camera size={32} className="mx-auto text-primary mb-3" />
              <p className="text-sm text-muted-foreground">
                Houd de barcode voor de camera
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                EAN-13, UPC-A en UPC-E formaten worden ondersteund
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
