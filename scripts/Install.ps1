[CmdletBinding()]
param([switch]$Diagnostics, [switch]$NoLaunch)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$manifest = Get-Content -LiteralPath (Join-Path $repoRoot 'manifest.json') -Raw | ConvertFrom-Json
$spicetifyRoot = Join-Path $env:APPDATA 'spicetify'
$spicetifyExe = Join-Path $env:LOCALAPPDATA 'spicetify\spicetify.exe'
$spotifyRoot = Join-Path $env:APPDATA 'Spotify'
$spotifyExe = Join-Path $spotifyRoot 'Spotify.exe'
$configPath = Join-Path $spicetifyRoot 'config-xpui.ini'
$snapshotRoot = $null
$wasRunning = [bool](Get-Process Spotify -ErrorAction SilentlyContinue)
$installationStarted = $false

function Invoke-Spicetify {
    param([string[]]$Arguments)
    $previousPreference = $ErrorActionPreference
    try {
        # Windows PowerShell treats native progress written to stderr as errors.
        $ErrorActionPreference = 'Continue'
        $output = & $spicetifyExe @Arguments 2>&1
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    $output | ForEach-Object {
        $message = if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message } else { [string]$_ }
        if (![string]::IsNullOrWhiteSpace($message)) { Write-Host $message }
    }
    if ($code -ne 0 -or ($output -join "`n") -match 'backup version are mismatched|Please run "spicetify backup apply"') {
        throw "Spicetify $($Arguments -join ' ') failed (exit $code)."
    }
}

function Get-NativeHashes {
    $hashes = @{}
    foreach ($name in @('Spotify.exe', 'Spotify.dll', 'chrome_elf.dll')) {
        $path = Join-Path $spotifyRoot $name
        if (!(Test-Path -LiteralPath $path)) { throw "Spotify file missing: $name" }
        $signature = Get-AuthenticodeSignature -LiteralPath $path
        if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'CN=Spotify AB') {
            throw "Official Spotify signature invalid: $name"
        }
        $hashes[$name] = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
    }
    return $hashes
}

try {
    & (Join-Path $PSScriptRoot 'Validate.ps1')
    if (!(Test-Path -LiteralPath $spicetifyExe)) { throw 'Spicetify is not installed.' }
    $nativeHashes = Get-NativeHashes
    $spotifyVersion = (Get-Item -LiteralPath $spotifyExe).VersionInfo.ProductVersion
    if ($spotifyVersion -ne $manifest.spotifyVersion) {
        throw "This pack supports Spotify $($manifest.spotifyVersion); installed version is $spotifyVersion. Update and verify the pack first."
    }
    $cliVersion = (& $spicetifyExe -v).Trim()
    if ($cliVersion -ne $manifest.spicetifyVersion) {
        throw "This pack supports Spicetify $($manifest.spicetifyVersion); installed version is $cliVersion."
    }
    if ($wasRunning) { Stop-Process -Name Spotify -Force; Start-Sleep -Seconds 1 }
    $installationStarted = $true
    $snapshotRoot = Join-Path $spicetifyRoot ('ManagedBackups\' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
    New-Item -ItemType Directory -Path $snapshotRoot -Force | Out-Null
    foreach ($name in @('config-xpui.ini', 'Extensions', 'CustomApps', 'Themes', 'Backup', 'AutoApply.ps1')) {
        $source = Join-Path $spicetifyRoot $name
        if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination $snapshotRoot -Recurse }
    }
    foreach ($profile in @('Browser', 'Default')) {
        $storage = Join-Path $env:LOCALAPPDATA "Spotify\$profile\Local Storage"
        if (Test-Path -LiteralPath $storage) {
            Copy-Item -LiteralPath $storage -Destination (Join-Path $snapshotRoot ($profile + '-storage')) -Recurse
        }
    }
    $prefs = Join-Path $spotifyRoot 'prefs'
    if (Test-Path -LiteralPath $prefs) { Copy-Item -LiteralPath $prefs -Destination $snapshotRoot }

    foreach ($folder in @('Extensions', 'CustomApps', 'Themes')) {
        $destination = Join-Path $spicetifyRoot $folder
        New-Item -ItemType Directory -Path $destination -Force | Out-Null
        Get-ChildItem -LiteralPath (Join-Path $repoRoot $folder) | ForEach-Object {
            Copy-Item -LiteralPath $_.FullName -Destination $destination -Recurse -Force
        }
    }
    if ($Diagnostics) {
        Copy-Item -LiteralPath (Join-Path $repoRoot 'tools\00-plugin-diagnostics.js') -Destination (Join-Path $spicetifyRoot 'Extensions\00-plugin-diagnostics.js') -Force
    }
    foreach ($property in $manifest.settings.PSObject.Properties) {
        Invoke-Spicetify -Arguments @('config', $property.Name, [string]$property.Value)
    }
    # The CLI's extensions field accepts one value at a time.
    foreach ($extension in $manifest.extensions) { Invoke-Spicetify -Arguments @('config', 'extensions', $extension) }
    if ($Diagnostics) { Invoke-Spicetify -Arguments @('config', 'extensions', '00-plugin-diagnostics.js') }
    else { Invoke-Spicetify -Arguments @('config', 'extensions', '00-plugin-diagnostics.js-') }
    foreach ($app in $manifest.customApps) { Invoke-Spicetify -Arguments @('config', 'custom_apps', $app) }

    $config = Get-Content -LiteralPath $configPath -Raw
    $backup = [regex]::Match($config, '(?ms)^\[Backup\].*?^version\s*=\s*([^\r\n]+)')
    $backupVersion = ($backup.Groups[1].Value.Trim() -split '\.g')[0]
    if ($backupVersion -ne $spotifyVersion -or (Test-Path -LiteralPath (Join-Path $spotifyRoot 'Apps\xpui.spa'))) {
        $launched = [regex]::Match((Get-Content -LiteralPath $prefs -Raw), '(?m)^app.last-launched-version="([^"]+)"')
        if (($launched.Groups[1].Value -split '\.g')[0] -ne $spotifyVersion) {
            throw 'Open Spotify once before rebuilding its backup, then run this installer again.'
        }
        if (!(Test-Path -LiteralPath (Join-Path $spotifyRoot 'Apps\xpui.spa'))) {
            throw 'The original Spotify app archive is missing; preserving the existing backup.'
        }
        Invoke-Spicetify -Arguments @('backup', 'apply', '--no-restart')
    } else {
        Invoke-Spicetify -Arguments @('apply', '--no-restart')
    }
    $afterHashes = Get-NativeHashes
    foreach ($name in $nativeHashes.Keys) {
        if ($afterHashes[$name] -ne $nativeHashes[$name]) { throw "Spotify executable changed unexpectedly: $name" }
    }
    $autoApplyPath = Join-Path $spicetifyRoot 'AutoApply.ps1'
    $entrypoint = (Join-Path $repoRoot 'scripts\AutoApply.ps1').Replace("'", "''")
    [IO.File]::WriteAllText($autoApplyPath, "& '$entrypoint'`r`n", [Text.UTF8Encoding]::new($false))
    Write-Host "Pack $($manifest.packVersion) installed. Backup: $snapshotRoot"
} catch {
    if ($snapshotRoot) { Write-Host "Previous files are saved in $snapshotRoot" }
    throw
} finally {
    if ($installationStarted -and !$NoLaunch -and !(Get-Process Spotify -ErrorAction SilentlyContinue)) {
        Start-Process -FilePath $spotifyExe
    }
}
