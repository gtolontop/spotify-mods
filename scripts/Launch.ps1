[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$log = Join-Path $env:APPDATA 'spicetify\managed-launch.log'
try {
    & (Join-Path $PSScriptRoot 'AutoApply.ps1') -NoLaunch
    $manifest = Get-Content -LiteralPath (Join-Path (Split-Path $PSScriptRoot -Parent) 'manifest.json') -Raw | ConvertFrom-Json
    $spotify = Join-Path $env:APPDATA 'Spotify\Spotify.exe'
    if (!(Test-Path -LiteralPath $spotify)) { throw 'Spotify executable is missing.' }
    Start-Process -FilePath $spotify -ArgumentList $manifest.launchFlags
} catch {
    "$(Get-Date -Format s) $($_.Exception.Message)" | Add-Content -LiteralPath $log
    throw
}
