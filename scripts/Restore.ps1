[CmdletBinding()]
param([string]$BackupPath)

$ErrorActionPreference = 'Stop'
$spicetifyRoot = Join-Path $env:APPDATA 'spicetify'
$managedRoot = Join-Path $spicetifyRoot 'ManagedBackups'
if (!$BackupPath) {
    $last = Get-ChildItem -LiteralPath $managedRoot -Directory | Sort-Object Name -Descending | Select-Object -First 1
    if (!$last) { throw 'No managed backup found.' }
    $BackupPath = $last.FullName
}
$resolved = (Resolve-Path -LiteralPath $BackupPath).Path
$allowed = [IO.Path]::GetFullPath($managedRoot).TrimEnd('\') + '\'
if (!$resolved.StartsWith($allowed, [StringComparison]::OrdinalIgnoreCase)) { throw 'Select a snapshot from ManagedBackups.' }
if (!(Test-Path -LiteralPath (Join-Path $resolved 'config-xpui.ini'))) { throw 'Invalid backup: configuration is missing.' }
Stop-Process -Name Spotify -Force -ErrorAction SilentlyContinue
foreach ($name in @('config-xpui.ini', 'Extensions', 'CustomApps', 'Themes')) {
    $source = Join-Path $resolved $name
    if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination $spicetifyRoot -Recurse -Force }
}
foreach ($profile in @('Browser', 'Default')) {
    $storage = Join-Path $resolved ($profile + '-storage')
    if (Test-Path -LiteralPath $storage) {
        $destination = Join-Path $env:LOCALAPPDATA "Spotify\$profile\Local Storage"
        New-Item -ItemType Directory -Path $destination -Force | Out-Null
        Get-ChildItem -LiteralPath $storage | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $destination -Recurse -Force }
    }
}
$spicetifyExe = Join-Path $env:LOCALAPPDATA 'spicetify\spicetify.exe'
& $spicetifyExe apply
if ($LASTEXITCODE -ne 0) { throw 'Previous files were restored, but Spicetify apply failed.' }
Write-Host "Restored $resolved"
