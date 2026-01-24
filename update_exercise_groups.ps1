# Update exercisesv3.json with correct muscle groups based on targetMuscleGroup
# This script updates the 'group' field to match our muscleGroup schema

$jsonPath = "exercisesv3.json"
$backupPath = "exercisesv3.backup.json"

# Create backup
Write-Host "Creating backup: $backupPath" -ForegroundColor Yellow
Copy-Item $jsonPath $backupPath -Force

# Load JSON
$json = Get-Content $jsonPath -Raw | ConvertFrom-Json

# Define muscle group mapping
$muscleGroupMap = @{
    "Abs" = "abs"
    "Obliques" = "obliques"
    "Biceps" = "biceps"
    "Triceps" = "triceps"
    "Forearms" = "forearms"
    "Chest" = "chest"
    "Lats" = "lats"
    "Upper Back" = "middle-back"
    "Middle Back" = "middle-back"
    "Lower Back" = "lower-back"
    "Traps" = "traps"
    "Shoulders" = "shoulders"
    "Quads" = "quads"
    "Quadriceps" = "quads"
    "Hamstrings" = "hamstrings"
    "Glutes" = "glutes"
    "Calves" = "calves"
    "Hip Flexors" = "hip-flexors"
    "Adductors" = "adductors"
    "Abductors" = "abductors"
    # Unmapped ones - keep original
    "IT Band" = "legs"
    "Palmar Fascia" = "forearms"
    "Plantar Fascia" = "calves"
    "Neck" = "traps"
}

Write-Host "`nUpdating exercises..." -ForegroundColor Cyan

$updated = 0
$skipped = 0

foreach ($exercise in $json) {
    $targetMuscle = $exercise.profile.targetMuscleGroup
    
    if ($muscleGroupMap.ContainsKey($targetMuscle)) {
        $newGroup = $muscleGroupMap[$targetMuscle]
        
        if ($exercise.group -ne $newGroup) {
            Write-Verbose "Updating: $($exercise.name.Substring(0, [Math]::Min(50, $exercise.name.Length))) | $($exercise.group) -> $newGroup"
            $exercise.group = $newGroup
            $updated++
        } else {
            $skipped++
        }
    } else {
        Write-Warning "No mapping for: $targetMuscle (exercise: $($exercise.name))"
    }
}

Write-Host "`nSummary:" -ForegroundColor Green
Write-Host "  Updated: $updated exercises" -ForegroundColor Green
Write-Host "  Already correct: $skipped exercises" -ForegroundColor Yellow
Write-Host "  Total: $($json.Count) exercises" -ForegroundColor Cyan

# Save updated JSON
Write-Host "`nSaving updated JSON to: $jsonPath" -ForegroundColor Yellow
$json | ConvertTo-Json -Depth 10 -Compress:$false | Set-Content $jsonPath -Encoding UTF8

Write-Host "`n✅ Update complete!" -ForegroundColor Green
Write-Host "Backup saved to: $backupPath" -ForegroundColor Yellow
