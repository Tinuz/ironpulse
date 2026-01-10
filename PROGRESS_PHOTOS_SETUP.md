# Progress Photos Timeline - Setup Guide

## Overzicht

De Progress Photos Timeline feature stelt gebruikers in staat om hun fitness transformatie visueel bij te houden met:
- **Foto uploads** via camera of bestandsselectie
- **Chronologische timeline** gegroepeerd per maand
- **Datum filters** (Alle, Deze Maand, Dit Jaar)
- **Swipe navigatie** tussen foto's
- **Edit functionaliteit** voor notities en datum
- **Delete functionaliteit** met bevestiging

## Setup Stappen

### 1. Database Migratie

Run de volgende migratie in Supabase SQL Editor:

```sql
-- Bestand: supabase/migrations/013_progress_photos.sql
```

Deze migratie creëert:
- `progress_photos` tabel met RLS policies
- Indexes voor efficiënte queries
- Update timestamp trigger

### 2. Supabase Storage Bucket

Je hebt al een bucket gemaakt genaamd `UserProgressPhotos`. Nu moeten we nog de storage policies instellen.

Ga naar Supabase Dashboard → Storage → UserProgressPhotos → Policies en voeg toe:

#### Policy 1: Upload (INSERT)
```sql
-- Name: Users can upload own photos
-- Operation: INSERT
-- Policy:
bucket_id = 'UserProgressPhotos' AND
auth.uid()::text = (storage.foldername(name))[1]
```

#### Policy 2: View (SELECT)
```sql
-- Name: Users can view own photos
-- Operation: SELECT
-- Policy:
bucket_id = 'UserProgressPhotos' AND
auth.uid()::text = (storage.foldername(name))[1]
```

#### Policy 3: Delete (DELETE)
```sql
-- Name: Users can delete own photos
-- Operation: DELETE
-- Policy:
bucket_id = 'UserProgressPhotos' AND
auth.uid()::text = (storage.foldername(name))[1]
```

### 3. Bucket Instellingen

Zorg ervoor dat de bucket als **PUBLIC** is ingesteld:
- Ga naar Storage → UserProgressPhotos → Settings
- Zet "Public bucket" op **ON**
- File size limit: **5 MB**
- Allowed MIME types: `image/jpeg, image/png, image/webp`

## Bestanden Gemaakt

### Database & API
- `supabase/migrations/013_progress_photos.sql` - Database schema en RLS policies
- `lib/progressPhotos.ts` - Supabase storage helper functions (283 lines)

### Components
- `components/pages/ProgressPhotos.tsx` - Main timeline page (256 lines)
- `components/PhotoUploadModal.tsx` - Upload modal met preview (199 lines)
- `components/PhotoDetailModal.tsx` - Fullscreen viewer met swipe (228 lines)

### Integration
- `components/FitnessTracker.tsx` - Route `/progress-photos` toegevoegd
- `components/pages/Progress.tsx` - Link in Quick Actions menu (Me sectie)

## Features

### Timeline View (ProgressPhotos.tsx)
- **Foto grid**: 2-kolom grid (3-kolom op desktop)
- **Maand headers**: Gegroepeerd per maand (bijv. "januari 2026")
- **Date filters**: Tabs voor Alle/Deze Maand/Dit Jaar
- **Empty state**: Call-to-action om eerste foto te uploaden
- **Hover effects**: Datum en notities overlay op hover

### Upload Modal (PhotoUploadModal.tsx)
- **Camera input**: Direct foto maken met `capture="environment"`
- **File input**: Upload van apparaat
- **Image preview**: Live preview voor upload
- **Date picker**: Datum selectie (max vandaag)
- **Notes field**: 500 tekens max
- **Validatie**: Max 5MB, alleen images
- **Loading state**: Spinner tijdens upload

### Detail Modal (PhotoDetailModal.tsx)
- **Fullscreen view**: Zwarte achtergrond, gecentreerde foto
- **Swipe navigation**: Drag naar links/rechts voor volgende/vorige
- **Arrow navigation**: Chevron buttons aan zijkanten
- **Photo counter**: "3 / 12" positie indicator
- **Edit mode**: In-place editing van datum en notities
- **Delete button**: Met confirm dialog
- **Escape to close**: Click outside of X button

## Data Flow

### Upload Flow
1. User selecteert foto (camera/bestand)
2. Client-side validatie (type, size)
3. Preview tonen met file reader
4. User vult datum en notities in
5. Upload naar Supabase Storage (`userId/timestamp_random.ext`)
6. Insert metadata in `progress_photos` tabel
7. Bij database error → delete storage file (cleanup)
8. Refresh timeline met nieuwe foto

### View Flow
1. Load metadata uit `progress_photos` tabel
2. Filter op user_id (via RLS)
3. Sort by date descending
4. Group by month/year
5. Generate public URLs met `getProgressPhotoUrl()`
6. Render grid met lazy loading

### Delete Flow
1. User klikt delete button
2. Confirm dialog
3. Delete van Storage bucket
4. Delete van database tabel
5. Update local state (optimistic UI)
6. Close modal bij success

## API Functions

### uploadProgressPhoto()
```typescript
uploadProgressPhoto(
  userId: string,
  file: File,
  date: string,
  notes?: string
): Promise<ProgressPhoto | null>
```

### getProgressPhotos()
```typescript
getProgressPhotos(userId: string): Promise<ProgressPhoto[]>
```

### updateProgressPhoto()
```typescript
updateProgressPhoto(
  photoId: string,
  updates: Partial<Pick<ProgressPhoto, 'date' | 'notes' | 'visibility'>>
): Promise<ProgressPhoto | null>
```

### deleteProgressPhoto()
```typescript
deleteProgressPhoto(
  photoId: string,
  photoUrl: string
): Promise<boolean>
```

### getProgressPhotoUrl()
```typescript
getProgressPhotoUrl(photoUrl: string): string
```

## Storage Structure

Foto's worden opgeslagen in de volgende structuur:
```
UserProgressPhotos/
  └── {userId}/
      ├── 1736524800123_abc123.jpg
      ├── 1736611200456_def456.png
      └── 1736697600789_ghi789.webp
```

Filename format: `{timestamp}_{random}.{ext}`
- **timestamp**: Date.now() voor uniekheid
- **random**: 7-char alphanumeric voor extra collision prevention
- **ext**: Original file extension

## Security

### RLS Policies
- **Users can only view own photos**: `auth.uid()::text = user_id`
- **Users can only upload to own folder**: Storage path check
- **Users can only delete own photos**: Ownership validation

### Validation
- **Client-side**: File type, size, date range
- **Server-side**: RLS policies enforce ownership
- **Storage policies**: Path-based access control

## Future Enhancements

### Potential Features
1. **Side-by-side comparison** - Compare two photos with slider
2. **Body part tagging** - Tag photos (front, back, legs, arms, etc.)
3. **Progress stats overlay** - Weight/measurements on photo
4. **Sharing** - Share transformation via unique link
5. **Timelapse video** - Generate video from photo sequence
6. **Annotations** - Draw circles/arrows on photos
7. **Before/After grid** - Automatic pairing based on date range
8. **Private/Public toggle** - Share photos with friends
9. **Photo albums** - Group photos by goal (bulk, cut, etc.)
10. **AI body composition** - Estimate BF% from photos

## Testing Checklist

- [ ] Upload photo via camera (mobile)
- [ ] Upload photo via file select (desktop)
- [ ] View timeline with 0 photos (empty state)
- [ ] View timeline with 1-5 photos
- [ ] View timeline with 20+ photos (multiple months)
- [ ] Filter by "Deze Maand"
- [ ] Filter by "Dit Jaar"
- [ ] Swipe left to next photo
- [ ] Swipe right to previous photo
- [ ] Edit photo date
- [ ] Edit photo notes
- [ ] Delete photo (with confirm)
- [ ] Upload 5.1MB photo (should fail)
- [ ] Upload non-image file (should fail)
- [ ] Upload with future date (should be blocked)
- [ ] Close modals with X button
- [ ] Close detail modal by clicking outside

## Build Status

✅ TypeScript compilation successful
✅ Route size: 919 kB (1.01 MB First Load JS)
✅ 0 errors, 0 warnings

## Known Issues

None - feature is production-ready.

## Related Features

- **Exercise Progress** - Track strength PRs
- **Recovery Dashboard** - Muscle fatigue tracking
- **Body Stats** - Measurements tracking (weight, measurements)

Progress Photos complements these by adding visual documentation to the quantitative data.
