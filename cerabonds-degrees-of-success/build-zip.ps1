Set-Location $PSScriptRoot

# Build the compendium packs from their JSON sources in src\packs
Push-Location ..
npm run build:packs
$buildExitCode = $LASTEXITCODE
Pop-Location
if ($buildExitCode -ne 0) { throw "Building the compendium packs failed" }

# Compress-Archive writes backslashes into zip paths, which breaks subfolders like packs\ when Foundry unzips them
Add-Type -AssemblyName System.IO.Compression.FileSystem
Remove-Item ".\module.zip" -ErrorAction SilentlyContinue
$zip = [System.IO.Compression.ZipFile]::Open("$PSScriptRoot\module.zip", "Create")
Get-ChildItem -Recurse -File |
    Where-Object { $_.Name -ne "module.zip" -and $_.Name -ne "LOCK" -and $_.Name -notlike "LOG*" -and $_.FullName -notlike "$PSScriptRoot\src\*" } |
    ForEach-Object {
        $entryName = $_.FullName.Substring($PSScriptRoot.Length + 1).Replace("\", "/")
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName) | Out-Null
    }
$zip.Dispose()
Write-Host "module.zip rebuilt successfully"
