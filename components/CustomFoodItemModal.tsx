'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Utensils, AlertCircle } from 'lucide-react';
import { useLanguage } from './context/LanguageContext';
import { useAuth } from './context/AuthContext';
import { getAuthenticatedClient } from '@/lib/supabase'
import { createCustomFoodItem } from '@/lib/customFoodItems';
import { CustomFoodItem } from '@/types/nutrition';

interface CustomFoodItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemCreated: (item: CustomFoodItem) => void;
}

const SERVING_UNITS = ['g', 'ml', 'piece', 'portion', 'cup', 'tbsp', 'tsp', 'oz'];
const CATEGORIES = ['meal', 'snack', 'drink', 'dessert', 'other'];

export default function CustomFoodItemModal({ isOpen, onClose, onItemCreated }: CustomFoodItemModalProps) {
  const { t } = useLanguage();
  const { session } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
    servingSize: '100',
    servingUnit: 'g',
    category: 'meal',
    notes: ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        brand: '',
        calories: '',
        protein: '',
        carbs: '',
        fats: '',
        servingSize: '100',
        servingUnit: 'g',
        category: 'meal',
        notes: ''
      });
      setValidationErrors({});
      setError(null);
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = t.customFood.errors.nameRequired;
    }

    const calories = parseFloat(formData.calories);
    if (isNaN(calories) || calories < 0) {
      errors.calories = t.customFood.errors.caloriesInvalid;
    }

    const protein = parseFloat(formData.protein);
    if (isNaN(protein) || protein < 0) {
      errors.protein = t.customFood.errors.proteinInvalid;
    }

    const carbs = parseFloat(formData.carbs);
    if (isNaN(carbs) || carbs < 0) {
      errors.carbs = t.customFood.errors.carbsInvalid;
    }

    const fats = parseFloat(formData.fats);
    if (isNaN(fats) || fats < 0) {
      errors.fats = t.customFood.errors.fatsInvalid;
    }

    const servingSize = parseFloat(formData.servingSize);
    if (isNaN(servingSize) || servingSize <= 0) {
      errors.servingSize = t.customFood.errors.servingSizeInvalid;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !session?.user) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const supabase = getAuthenticatedClient(session.access_token)

      const newItem = await createCustomFoodItem(supabase, session.user.id, {
        name: formData.name.trim(),
        brand: formData.brand.trim() || undefined,
        calories: parseFloat(formData.calories),
        protein: parseFloat(formData.protein),
        carbs: parseFloat(formData.carbs),
        fats: parseFloat(formData.fats),
        servingSize: parseFloat(formData.servingSize),
        servingUnit: formData.servingUnit,
        category: formData.category || undefined,
        notes: formData.notes.trim() || undefined
      });

      if (newItem) {
        onItemCreated(newItem);
        onClose();
      } else {
        setError(t.customFood.errors.createFailed);
      }
    } catch (err) {
      console.error('Error creating custom food item:', err);
      setError(t.customFood.errors.createFailed);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <Utensils className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">{t.customFood.addTitle}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                {t.customFood.basicInfo}
              </h3>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  {t.customFood.name} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t.customFood.namePlaceholder}
                  className={`w-full bg-zinc-800/50 border ${
                    validationErrors.name ? 'border-red-500' : 'border-zinc-700'
                  } rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
                />
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.name}</p>
                )}
              </div>

              {/* Brand */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  {t.customFood.brand}
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder={t.customFood.brandPlaceholder}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  {t.customFood.category}
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {t.customFood.categories[cat as keyof typeof t.customFood.categories]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Serving Size */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                {t.customFood.servingInfo}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    {t.customFood.servingSize} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.servingSize}
                    onChange={(e) => setFormData({ ...formData, servingSize: e.target.value })}
                    className={`w-full bg-zinc-800/50 border ${
                      validationErrors.servingSize ? 'border-red-500' : 'border-zinc-700'
                    } rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
                  />
                  {validationErrors.servingSize && (
                    <p className="mt-1 text-sm text-red-400">{validationErrors.servingSize}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    {t.customFood.unit}
                  </label>
                  <select
                    value={formData.servingUnit}
                    onChange={(e) => setFormData({ ...formData, servingUnit: e.target.value })}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    {SERVING_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Nutritional Values */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                {t.customFood.nutritionInfo} <span className="text-xs font-normal">({t.customFood.perServing})</span>
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Calories */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    {t.customFood.calories} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.calories}
                    onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                    placeholder="0"
                    className={`w-full bg-zinc-800/50 border ${
                      validationErrors.calories ? 'border-red-500' : 'border-zinc-700'
                    } rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
                  />
                  {validationErrors.calories && (
                    <p className="mt-1 text-sm text-red-400">{validationErrors.calories}</p>
                  )}
                </div>

                {/* Protein */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    {t.customFood.protein} (g) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.protein}
                    onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                    placeholder="0"
                    className={`w-full bg-zinc-800/50 border ${
                      validationErrors.protein ? 'border-red-500' : 'border-zinc-700'
                    } rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
                  />
                  {validationErrors.protein && (
                    <p className="mt-1 text-sm text-red-400">{validationErrors.protein}</p>
                  )}
                </div>

                {/* Carbs */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    {t.customFood.carbs} (g) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.carbs}
                    onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
                    placeholder="0"
                    className={`w-full bg-zinc-800/50 border ${
                      validationErrors.carbs ? 'border-red-500' : 'border-zinc-700'
                    } rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
                  />
                  {validationErrors.carbs && (
                    <p className="mt-1 text-sm text-red-400">{validationErrors.carbs}</p>
                  )}
                </div>

                {/* Fats */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    {t.customFood.fats} (g) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.fats}
                    onChange={(e) => setFormData({ ...formData, fats: e.target.value })}
                    placeholder="0"
                    className={`w-full bg-zinc-800/50 border ${
                      validationErrors.fats ? 'border-red-500' : 'border-zinc-700'
                    } rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
                  />
                  {validationErrors.fats && (
                    <p className="mt-1 text-sm text-red-400">{validationErrors.fats}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                {t.customFood.notes}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t.customFood.notesPlaceholder}
                rows={3}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-medium transition-colors"
              disabled={isSaving}
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  {t.common.saving}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t.common.save}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
