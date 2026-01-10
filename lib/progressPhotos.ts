import { supabase } from './supabase';

export interface ProgressPhoto {
  id: string;
  user_id: string;
  photo_url: string;
  date: string; // ISO date string
  notes?: string;
  visibility: 'private' | 'friends' | 'public';
  created_at: string;
  updated_at: string;
}

/**
 * Upload a progress photo to Supabase Storage
 * @param userId - The user's ID
 * @param file - The image file to upload
 * @param date - The date for the photo (ISO string)
 * @param notes - Optional notes about the photo
 * @returns The photo metadata or null if failed
 */
export async function uploadProgressPhoto(
  userId: string,
  file: File,
  date: string,
  notes?: string
): Promise<ProgressPhoto | null> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('Image must be smaller than 5MB');
    }

    // Generate unique filename: userId/timestamp_random.ext
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `${userId}/${timestamp}_${random}.${extension}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('UserProgressPhotos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Save metadata to database
    const { data: photoData, error: dbError } = await supabase
      .from('progress_photos')
      .insert({
        user_id: userId,
        photo_url: fileName, // Store path, not full URL
        date,
        notes: notes || null,
        visibility: 'private'
      })
      .select()
      .single();

    if (dbError) {
      // If database insert fails, delete the uploaded file
      await supabase.storage.from('UserProgressPhotos').remove([fileName]);
      console.error('Database error:', dbError);
      throw dbError;
    }

    return photoData as ProgressPhoto;
  } catch (error) {
    console.error('Error uploading progress photo:', error);
    return null;
  }
}

/**
 * Get all progress photos for a user
 * @param userId - The user's ID
 * @returns Array of progress photos, sorted by date descending
 */
export async function getProgressPhotos(userId: string): Promise<ProgressPhoto[]> {
  try {
    const { data, error } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching progress photos:', error);
      return [];
    }

    return data as ProgressPhoto[];
  } catch (error) {
    console.error('Error in getProgressPhotos:', error);
    return [];
  }
}

/**
 * Get public URL for a progress photo
 * @param photoUrl - The photo path from database
 * @returns The public URL to display the image
 */
export function getProgressPhotoUrl(photoUrl: string): string {
  const { data } = supabase.storage
    .from('UserProgressPhotos')
    .getPublicUrl(photoUrl);
  
  return data.publicUrl;
}

/**
 * Update progress photo metadata
 * @param photoId - The photo's ID
 * @param updates - Fields to update (date, notes, visibility)
 * @returns Updated photo or null if failed
 */
export async function updateProgressPhoto(
  photoId: string,
  updates: Partial<Pick<ProgressPhoto, 'date' | 'notes' | 'visibility'>>
): Promise<ProgressPhoto | null> {
  try {
    const { data, error } = await supabase
      .from('progress_photos')
      .update(updates)
      .eq('id', photoId)
      .select()
      .single();

    if (error) {
      console.error('Error updating progress photo:', error);
      return null;
    }

    return data as ProgressPhoto;
  } catch (error) {
    console.error('Error in updateProgressPhoto:', error);
    return null;
  }
}

/**
 * Delete a progress photo (both storage and database)
 * @param photoId - The photo's ID
 * @param photoUrl - The photo's storage path
 * @returns True if successful, false otherwise
 */
export async function deleteProgressPhoto(
  photoId: string,
  photoUrl: string
): Promise<boolean> {
  try {
    // Delete from storage first
    const { error: storageError } = await supabase.storage
      .from('UserProgressPhotos')
      .remove([photoUrl]);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Continue anyway - metadata should be deleted
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('progress_photos')
      .delete()
      .eq('id', photoId);

    if (dbError) {
      console.error('Error deleting from database:', dbError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteProgressPhoto:', error);
    return false;
  }
}

/**
 * Get photos within a date range
 * @param userId - The user's ID
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @returns Array of progress photos in date range
 */
export async function getProgressPhotosByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<ProgressPhoto[]> {
  try {
    const { data, error } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching photos by date range:', error);
      return [];
    }

    return data as ProgressPhoto[];
  } catch (error) {
    console.error('Error in getProgressPhotosByDateRange:', error);
    return [];
  }
}

/**
 * Get photo count for a user
 * @param userId - The user's ID
 * @returns Total number of photos
 */
export async function getProgressPhotoCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('progress_photos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error counting photos:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getProgressPhotoCount:', error);
    return 0;
  }
}
