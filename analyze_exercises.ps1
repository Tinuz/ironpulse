# Exercise Muscle Group Analysis Script
# Analyzes exercisesv3.json and maps targetMuscleGroup to our muscleGroup schema

$json = Get-Content "exercisesv3.json" -Raw | ConvertFrom-Json

# Define our muscle group mapping
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
}

Write-Host "`n=== ANALYSIS RESULTS ===" -ForegroundColor Cyan
Write-Host "Total exercises: $($json.Count)" -ForegroundColor Yellow

# Analyze each exercise
$results = @()
$unmapped = @()

foreach ($exercise in $json) {
    $targetMuscle = $exercise.profile.targetMuscleGroup
    $currentGroup = $exercise.group
    
    if ($muscleGroupMap.ContainsKey($targetMuscle)) {
        $suggestedGroup = $muscleGroupMap[$targetMuscle]
        
        $results += [PSCustomObject]@{
            Name = $exercise.name
            CurrentGroup = $currentGroup
            TargetMuscle = $targetMuscle
            SuggestedGroup = $suggestedGroup
            NeedsUpdate = ($currentGroup -ne $suggestedGroup)
        }
    } else {
        $unmapped += $targetMuscle
    }
}

# Count exercises that need updating
$needsUpdate = ($results | Where-Object { $_.NeedsUpdate }).Count
Write-Host "Exercises that need muscle group update: $needsUpdate / $($results.Count)" -ForegroundColor Green

# Show breakdown by suggested muscle group
Write-Host "`n=== DISTRIBUTION BY SUGGESTED MUSCLE GROUP ===" -ForegroundColor Cyan
$results | Group-Object -Property SuggestedGroup | 
    Select-Object Name, Count | 
    Sort-Object Count -Descending | 
    Format-Table -AutoSize

# Show unmapped target muscles
if ($unmapped.Count -gt 0) {
    Write-Host "`n=== UNMAPPED TARGET MUSCLES ===" -ForegroundColor Yellow
    $unmapped | Group-Object | Select-Object Name, Count | Sort-Object Count -Descending | Format-Table -AutoSize
}

# Show sample of exercises that need updating
Write-Host "`n=== SAMPLE: EXERCISES NEEDING UPDATE (first 20) ===" -ForegroundColor Cyan
$results | Where-Object { $_.NeedsUpdate } | 
    Select-Object -First 20 Name, CurrentGroup, TargetMuscle, SuggestedGroup | 
    Format-Table -AutoSize

# Export full results to CSV for review
$results | Export-Csv -Path "exercise_analysis.csv" -NoTypeInformation
Write-Host "`nFull analysis exported to: exercise_analysis.csv" -ForegroundColor Green
