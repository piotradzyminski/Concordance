param(
    [Parameter(Position = 0)]
    [string]$Source = (Get-Location).Path,

    [Parameter(Position = 1)]
    [string]$Output = "",

    [switch]$KeepWipAssets,
    [switch]$KeepLocalTooling
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

if ([string]::IsNullOrWhiteSpace($Output)) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $parent = Split-Path -Parent $sourcePath
    $Output = Join-Path $parent ("{0}_patch_input_{1}.zip" -f $rootName, $stamp)
}

$outputPath = [System.IO.Path]::GetFullPath($Output)
if (Test-Path -LiteralPath $outputPath) {
    Remove-Item -LiteralPath $outputPath -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$excludedPrefixes = @(
    ".git/",
    "node_modules/",
    "playwright-report/",
    "test-results/",
    "blob-report/",
    ".test-results/"
)

if (-not $KeepLocalTooling) {
    $excludedPrefixes += ".codex/"
    $excludedPrefixes += ".agents/"
}

$excludedFiles = @(
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini"
)

if (-not $KeepWipAssets) {
    $excludedFiles += "assets/wip2_front.jpg"
    $excludedFiles += "assets/wip2_back.jpg"
}

function Test-ExcludedPath {
    param([string]$RelativePath)

    $normalized = $RelativePath.Replace('\', '/')

    foreach ($prefix in $excludedPrefixes) {
        if ($normalized.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            return $true
        }
    }

    foreach ($file in $excludedFiles) {
        if ($normalized.Equals($file, [System.StringComparison]::OrdinalIgnoreCase) -or
            [System.IO.Path]::GetFileName($normalized).Equals($file, [System.StringComparison]::OrdinalIgnoreCase)) {
            return $true
        }
    }

    return $false
}

$outputDirectory = Split-Path -Parent $outputPath
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

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
        Get-ChildItem -LiteralPath $sourcePath -Recurse -File -Force | ForEach-Object {
            $fullPath = $_.FullName
            if ([System.IO.Path]::GetFullPath($fullPath) -eq $outputPath) {
                return
            }

            $relative = $fullPath.Substring($sourcePath.Length).TrimStart('\', '/')
            if (Test-ExcludedPath -RelativePath $relative) {
                return
            }

            $entryName = ($rootName + "/" + $relative.Replace('\', '/'))
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $archive,
                $fullPath,
                $entryName,
                [System.IO.Compression.CompressionLevel]::Optimal
            ) | Out-Null

            $script:fileCount++
            $script:sourceBytes += $_.Length
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
Write-Host "Created: $outputPath"
Write-Host "Files:   $fileCount"
Write-Host ("Source:  {0:N0} bytes" -f $sourceBytes)
Write-Host ("ZIP:     {0:N0} bytes" -f $zipBytes)
