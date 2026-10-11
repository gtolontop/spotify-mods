[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$log = Join-Path $env:APPDATA 'spicetify\managed-launch.log'
try {
    & (Join-Path $PSScriptRoot 'AutoApply.ps1') -NoLaunch
    $spotify = Join-Path $env:APPDATA 'Spotify\Spotify.exe'
    if (!(Test-Path -LiteralPath $spotify)) { throw 'Spotify executable is missing.' }
    Start-Process -FilePath $spotify
} catch {
    "$(Get-Date -Format s) $($_.Exception.Message)" | Add-Content -LiteralPath $log
    throw
}
