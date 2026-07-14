param(
    [Parameter(Position = 0)]
    [string]$Source = (Get-Location).Path,

    [Parameter(Position = 1)]
    [string]$Output = "",

    [switch]$KeepRetiredFiles
)

$ErrorActionPreference = "Stop"

$sourcePath = (Resolve-Path -LiteralPath $Source).Path.TrimEnd('\', '/')
if (-not (Test-Path -LiteralPath $sourcePath -PathType Container)) {
    throw "Source must be a project directory: $sourcePath"
}

$rootName = Split-Path -Leaf $sourcePath
if ([string]::IsNullOrWhiteSpace($rootName)) {
    throw "Could not determine the source folder name."
}

$requiredFile = "index.html"
$runtimeDirectories = @(
    "css",
    "js",
    "data",
    "assets"
)

$optionalRootFiles = @(
    "favicon.ico",
    "manifest.webmanifest",
    "site.webmanifest",
    "service-worker.js",
    "sw.js",
    "robots.txt"
)

if (-not (Test-Path -LiteralPath (Join-Path $sourcePath $requiredFile) -PathType Leaf)) {
    throw "Missing required runtime file: $requiredFile"
}

foreach ($directory in $runtimeDirectories) {
    $directoryPath = Join-Path $sourcePath $directory
    if (-not (Test-Path -LiteralPath $directoryPath -PathType Container)) {
        throw "Missing required runtime directory: $directory"
    }
}

if ([string]::IsNullOrWhiteSpace($Output)) {
    $parent = Split-Path -Parent $sourcePath
    $time = Get-Date -Format "HHmm"

    $versions = @(
        Get-ChildItem -LiteralPath $parent -File -Filter "future_backup_*.zip" -ErrorAction SilentlyContinue |
            ForEach-Object {
                if ($_.BaseName -match '^future_backup_(\d+)_\d{4}$') {
                    [int]$Matches[1]
                }
            }
    )

    $lastVersion = if ($versions.Count -gt 0) {
        [int](($versions | Measure-Object -Maximum).Maximum)
    }
    else {
        0
    }

    $version = $lastVersion + 1
    $Output = Join-Path $parent ("future_backup_{0}_{1}.zip" -f $version, $time)
}

$outputPath = [System.IO.Path]::GetFullPath($Output)
$outputDirectory = Split-Path -Parent $outputPath
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

if (Test-Path -LiteralPath $outputPath) {
    Remove-Item -LiteralPath $outputPath -Force
}

function Convert-ToNormalizedRelativePath {
    param([string]$Path)

    return $Path.Replace('\', '/').TrimStart('/')
}

$retiredPaths = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
)

$deleteManifestPath = Join-Path $sourcePath "DELETE_FILES.txt"
if (-not $KeepRetiredFiles -and (Test-Path -LiteralPath $deleteManifestPath -PathType Leaf)) {
    Get-Content -LiteralPath $deleteManifestPath | ForEach-Object {
        $line = $_.Trim()
        if (-not [string]::IsNullOrWhiteSpace($line) -and -not $line.StartsWith('#')) {
            [void]$retiredPaths.Add((Convert-ToNormalizedRelativePath -Path $line))
        }
    }
}

$excludedFileNames = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
)
@(
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini"
) | ForEach-Object {
    [void]$excludedFileNames.Add($_)
}

function Test-ExcludedRuntimeFile {
    param(
        [System.IO.FileInfo]$File,
        [string]$RelativePath
    )

    if ([System.IO.Path]::GetFullPath($File.FullName) -eq $outputPath) {
        return $true
    }

    if ($excludedFileNames.Contains($File.Name)) {
        return $true
    }

    $normalized = Convert-ToNormalizedRelativePath -Path $RelativePath
    if (-not $KeepRetiredFiles -and $retiredPaths.Contains($normalized)) {
        return $true
    }

    return $false
}

# Validate direct local dependencies declared by index.html.
$indexPath = Join-Path $sourcePath "index.html"
$indexContent = Get-Content -LiteralPath $indexPath -Raw
$referencePattern = @'
(?i)(?:src|href)\s*=\s*["']([^"']+)["']
'@

$missingReferences = [System.Collections.Generic.List[string]]::new()
foreach ($match in [regex]::Matches($indexContent, $referencePattern.Trim())) {
    $reference = $match.Groups[1].Value.Trim()

    if ([string]::IsNullOrWhiteSpace($reference) -or
        $reference.StartsWith('#') -or
        $reference.StartsWith('//') -or
        $reference -match '^(?i)(https?:|data:|mailto:|javascript:)') {
        continue
    }

    $localReference = ($reference -split '[?#]', 2)[0]
    if ([string]::IsNullOrWhiteSpace($localReference)) {
        continue
    }

    $normalizedReference = Convert-ToNormalizedRelativePath -Path $localReference
    $dependencyPath = Join-Path $sourcePath ($normalizedReference.Replace('/', [System.IO.Path]::DirectorySeparatorChar))

    if (-not (Test-Path -LiteralPath $dependencyPath -PathType Leaf) -or
        (-not $KeepRetiredFiles -and $retiredPaths.Contains($normalizedReference))) {
        $missingReferences.Add($reference)
    }
}

if ($missingReferences.Count -gt 0) {
    $details = ($missingReferences | Sort-Object -Unique) -join [Environment]::NewLine
    throw "Runtime validation failed. Missing or retired index.html dependencies:`n$details"
}

$filesByPath = @{}

# Include all root HTML pages so a future multi-page runtime is backed up too.
foreach ($file in Get-ChildItem -LiteralPath $sourcePath -File -Filter "*.html" -Force) {
    $relative = $file.FullName.Substring($sourcePath.Length).TrimStart('\', '/')
    if (-not (Test-ExcludedRuntimeFile -File $file -RelativePath $relative)) {
        $filesByPath[$file.FullName] = $file
    }
}

foreach ($optionalFile in $optionalRootFiles) {
    $optionalPath = Join-Path $sourcePath $optionalFile
    if (Test-Path -LiteralPath $optionalPath -PathType Leaf) {
        $file = Get-Item -LiteralPath $optionalPath -Force
        $relative = $file.FullName.Substring($sourcePath.Length).TrimStart('\', '/')
        if (-not (Test-ExcludedRuntimeFile -File $file -RelativePath $relative)) {
            $filesByPath[$file.FullName] = $file
        }
    }
}

foreach ($directory in $runtimeDirectories) {
    $directoryPath = Join-Path $sourcePath $directory
    foreach ($file in Get-ChildItem -LiteralPath $directoryPath -Recurse -File -Force) {
        $relative = $file.FullName.Substring($sourcePath.Length).TrimStart('\', '/')
        if (-not (Test-ExcludedRuntimeFile -File $file -RelativePath $relative)) {
            $filesByPath[$file.FullName] = $file
        }
    }
}

if ($filesByPath.Count -eq 0) {
    throw "No runtime files were selected for backup."
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$fileCount = 0
$sourceBytes = 0L
$fileStream = [System.IO.File]::Open($outputPath, [System.IO.FileMode]::CreateNew)

try {
    $archive = [System.IO.Compression.ZipArchive]::new(
        $fileStream,
        [System.IO.Compression.ZipArchiveMode]::Create,
        $false
    )

    try {
        foreach ($file in ($filesByPath.Values | Sort-Object FullName)) {
            $relative = $file.FullName.Substring($sourcePath.Length).TrimStart('\', '/')
            $entryName = $rootName + "/" + (Convert-ToNormalizedRelativePath -Path $relative)

            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $archive,
                $file.FullName,
                $entryName,
                [System.IO.Compression.CompressionLevel]::Optimal
            ) | Out-Null

            $fileCount++
            $sourceBytes += $file.Length
        }
    }
    finally {
        $archive.Dispose()
    }
}
finally {
    $fileStream.Dispose()
}

$zipBytes = (Get-Item -LiteralPath $outputPath).Length
Write-Host "Created runtime backup: $outputPath"
Write-Host "Included: index/root HTML + css + js + data + assets"
Write-Host "Excluded: Git, docs, tests, developer tooling, dependencies and generated reports"
if (-not $KeepRetiredFiles -and $retiredPaths.Count -gt 0) {
    Write-Host ("Retired files skipped: {0}" -f $retiredPaths.Count)
}
Write-Host "Files:   $fileCount"
Write-Host ("Source:  {0:N0} bytes" -f $sourceBytes)
Write-Host ("ZIP:     {0:N0} bytes" -f $zipBytes)
