$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$spicetifyRoot = Join-Path $env:APPDATA 'spicetify'
$log = Join-Path $spicetifyRoot 'managed-auto-apply.log'
. (Join-Path $PSScriptRoot 'SpotifyState.ps1')
try {
    $needsInstall = $false
    $spotifyRoot = Join-Path $env:APPDATA 'Spotify'
    $spotifyExe = Join-Path $spotifyRoot 'Spotify.exe'
    if (!(Test-Path -LiteralPath $spotifyExe)) { throw 'Spotify executable is missing.' }
    $spotifyVersion = (Get-Item -LiteralPath $spotifyExe).VersionInfo.ProductVersion
    $configPath = Join-Path $spicetifyRoot 'config-xpui.ini'
    $backupVersion = ''
    if (!(Test-Path -LiteralPath $configPath)) { $needsInstall = $true }
    else {
        $config = Get-Content -LiteralPath $configPath -Raw
        $backup = [regex]::Match($config, '(?ms)^\[Backup\].*?^version\s*=\s*([^\r\n]+)')
        $backupVersion = ($backup.Groups[1].Value.Trim() -split '\.g')[0]
    }
    # A fresh Spotify update can coexist with the previous unpacked UI.
    $hasOriginalArchive = Test-Path -LiteralPath (Join-Path $spotifyRoot 'Apps\xpui.spa')
    foreach ($folder in @('Extensions', 'CustomApps', 'Themes')) {
        $sourceRoot = Join-Path $repoRoot $folder
        foreach ($file in Get-ChildItem -LiteralPath $sourceRoot -File -Recurse) {
            $relative = $file.FullName.Substring($sourceRoot.Length + 1)
            $installed = Join-Path (Join-Path $spicetifyRoot $folder) $relative
            if (!(Test-Path -LiteralPath $installed) -or
                (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash -ne
                (Get-FileHash -LiteralPath $installed -Algorithm SHA256).Hash) {
                $needsInstall = $true
                break
            }
        }
        if ($needsInstall) { break }
    }
    $indexPath = Join-Path $env:APPDATA 'Spotify\Apps\xpui\index.html'
    $hasInjection = $false
    if (!(Test-Path -LiteralPath $indexPath)) { $needsInstall = $true }
    else {
        $index = Get-Content -LiteralPath $indexPath -Raw
        $hasInjection = $index.Contains('extensions/adblock.js') -and $index.Contains('extensions/01-spicetify-compat.js')
        if (!$index.Contains('extensions/adblock.js') -or !$index.Contains('extensions/01-spicetify-compat.js')) {
            $needsInstall = $true
        }
    }
    if (Test-SpotifyReapplyRequired -InstalledVersion $spotifyVersion -BackupVersion $backupVersion -HasOriginalArchive $hasOriginalArchive -HasInjection $hasInjection) {
        $needsInstall = $true
    }
    if ($needsInstall) {
        $wasRunning = [bool](Get-Process Spotify -ErrorAction SilentlyContinue)
        & (Join-Path $PSScriptRoot 'Install.ps1') -NoLaunch:(!$wasRunning)
        "$(Get-Date -Format s) Pack restored from local repository." | Add-Content -LiteralPath $log
    } else {
        "$(Get-Date -Format s) Installed pack matches local repository." | Add-Content -LiteralPath $log
    }
} catch {
    "$(Get-Date -Format s) $($_.Exception.Message)" | Add-Content -LiteralPath $log
    throw
}
