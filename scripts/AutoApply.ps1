$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$spicetifyRoot = Join-Path $env:APPDATA 'spicetify'
$log = Join-Path $spicetifyRoot 'managed-auto-apply.log'
try {
    $needsInstall = $false
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
    if (!(Test-Path -LiteralPath $indexPath)) { $needsInstall = $true }
    else {
        $index = Get-Content -LiteralPath $indexPath -Raw
        if (!$index.Contains('extensions/adblock.js') -or !$index.Contains('extensions/01-spicetify-compat.js')) {
            $needsInstall = $true
        }
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
