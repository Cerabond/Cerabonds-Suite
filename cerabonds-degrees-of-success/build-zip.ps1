Set-Location $PSScriptRoot
Compress-Archive -Path ".\*" -DestinationPath ".\module.zip" -Force
Write-Host "module.zip rebuilt successfully"
