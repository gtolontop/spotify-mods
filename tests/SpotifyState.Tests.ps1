$ErrorActionPreference = 'Stop'
. (Join-Path (Split-Path $PSScriptRoot -Parent) 'scripts\SpotifyState.ps1')

# Spotify may leave the old injected index beside a new original archive.
if (!(Test-SpotifyReapplyRequired '1.3.3.264' '1.3.1.234' $true $true)) {
    throw 'A Spotify update was ignored because the old injection still existed.'
}
if (!(Test-SpotifyReapplyRequired '1.3.3.264' '1.3.3.264' $true $true)) {
    throw 'A fresh original archive was ignored.'
}
if (Test-SpotifyReapplyRequired '1.3.3.264' '1.3.3.264' $false $true) {
    throw 'An unchanged installation would be restarted unnecessarily.'
}
Write-Host 'Spotify update detection: PASS'
