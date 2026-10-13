[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$manifest = Get-Content -LiteralPath (Join-Path $repoRoot 'manifest.json') -Raw | ConvertFrom-Json
$spotifyRoot = [IO.Path]::GetFullPath((Join-Path $env:APPDATA 'Spotify'))
$spotifyExe = Join-Path $spotifyRoot 'Spotify.exe'
if ((Test-Path -LiteralPath $spotifyExe) -and
    (Get-Item -LiteralPath $spotifyExe).VersionInfo.ProductVersion -eq $manifest.spotifyVersion) {
    return $false
}

function Assert-SpotifySignature {
    param([string]$Path)
    $signature = Get-AuthenticodeSignature -LiteralPath $Path
    if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'CN=Spotify AB') {
        throw "Invalid Spotify signature: $Path"
    }
}

function Assert-ChildPath {
    param([string]$Path, [string]$Root)
    $prefix = [IO.Path]::GetFullPath($Root).TrimEnd('\') + '\'
    if (![IO.Path]::GetFullPath($Path).StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'File operation escaped its intended directory.'
    }
}

$cacheRoot = Join-Path $env:LOCALAPPDATA 'spotify-mods\cache'
New-Item -ItemType Directory -Path $cacheRoot -Force | Out-Null
$installer = Join-Path $cacheRoot ("Spotify-$($manifest.spotifyVersion)-x64.exe")
if (!(Test-Path -LiteralPath $installer)) {
    Invoke-WebRequest -UseBasicParsing $manifest.spotifyInstaller.url -OutFile $installer -TimeoutSec 180
}
if ((Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash -ne $manifest.spotifyInstaller.sha256) {
    throw 'Spotify installer checksum does not match the pinned release.'
}
Assert-SpotifySignature $installer
$clientRoot = Join-Path $cacheRoot ("client-$($manifest.spotifyVersion)")
if (!(Test-Path -LiteralPath (Join-Path $clientRoot 'Spotify.exe'))) {
    if (Test-Path -LiteralPath $clientRoot) { throw 'Incomplete cached client; preserving it for inspection.' }
    $process = Start-Process -FilePath $installer -ArgumentList ('/extract "{0}"' -f $clientRoot) -WindowStyle Hidden -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "Spotify extraction failed: $($process.ExitCode)" }
}
foreach ($name in @('Spotify.exe', 'Spotify.dll', 'chrome_elf.dll')) {
    Assert-SpotifySignature (Join-Path $clientRoot $name)
}
if ((Get-Item -LiteralPath (Join-Path $clientRoot 'Spotify.exe')).VersionInfo.ProductVersion -ne $manifest.spotifyVersion) {
    throw 'Cached Spotify version does not match the manifest.'
}
if (!(Test-Path -LiteralPath (Join-Path $clientRoot 'Apps\xpui.spa'))) { throw 'Original Spotify app archive is missing.' }
$entries = @(Get-ChildItem -LiteralPath $clientRoot)
$protected = @('prefs', 'Users', 'Storage', 'Data', 'Browser', 'Default')
if ($entries | Where-Object { $_.Name -in $protected }) { throw 'Installer contains a protected profile path.' }

$backupRoot = Join-Path $env:LOCALAPPDATA ('spotify-mods\ClientBackups\' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
Stop-Process -Name Spotify -Force -ErrorAction SilentlyContinue
Get-Process -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -and $_.Path.StartsWith($spotifyRoot + '\', [StringComparison]::OrdinalIgnoreCase)
} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500
$prefs = Join-Path $spotifyRoot 'prefs'
if (Test-Path -LiteralPath $prefs) { Copy-Item -LiteralPath $prefs -Destination (Join-Path $backupRoot 'prefs.before') }
foreach ($profile in @('Browser', 'Default')) {
    $storage = Join-Path $env:LOCALAPPDATA "Spotify\$profile\Local Storage"
    if (Test-Path -LiteralPath $storage) {
        Copy-Item -LiteralPath $storage -Destination (Join-Path $backupRoot ($profile + '-storage')) -Recurse
    }
}
$moved = @()
try {
    New-Item -ItemType Directory -Path $spotifyRoot -Force | Out-Null
    foreach ($entry in $entries) {
        $installed = Join-Path $spotifyRoot $entry.Name
        $saved = Join-Path $backupRoot $entry.Name
        Assert-ChildPath $installed $spotifyRoot
        Assert-ChildPath $saved $backupRoot
        if (Test-Path -LiteralPath $installed) {
            Move-Item -LiteralPath $installed -Destination $saved
            $moved += $entry.Name
        }
    }
    foreach ($entry in $entries) { Copy-Item -LiteralPath $entry.FullName -Destination $spotifyRoot -Recurse -Force }
    foreach ($name in @('Spotify.exe', 'Spotify.dll', 'chrome_elf.dll')) { Assert-SpotifySignature (Join-Path $spotifyRoot $name) }
} catch {
    foreach ($name in $moved) { Copy-Item -LiteralPath (Join-Path $backupRoot $name) -Destination $spotifyRoot -Recurse -Force }
    throw
}

# Initialize the release marker without resetting the profile.
Start-Process -FilePath $spotifyExe -ArgumentList $manifest.launchFlags -WindowStyle Hidden
$initialized = $false
try {
    for ($attempt = 0; $attempt -lt 50; $attempt++) {
        if (Test-Path -LiteralPath $prefs) {
            $version = [regex]::Match((Get-Content -LiteralPath $prefs -Raw), '(?m)^app.last-launched-version="([^"]+)"')
            if (($version.Groups[1].Value -split '\.g')[0] -eq $manifest.spotifyVersion) { $initialized = $true; break }
        }
        Start-Sleep -Milliseconds 200
    }
} finally {
    Stop-Process -Name Spotify -Force -ErrorAction SilentlyContinue
}
if (!$initialized) { throw "Official client restored, but profile initialization timed out. Backup: $backupRoot" }
Write-Host "Official Spotify $($manifest.spotifyVersion) restored. Backup: $backupRoot"
return $true
