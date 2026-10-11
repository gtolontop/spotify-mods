$ErrorActionPreference = 'Stop'
$launchScript = Join-Path $PSScriptRoot 'Launch.ps1'
$shell = New-Object -ComObject WScript.Shell
$programs = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$desktop = [Environment]::GetFolderPath('Desktop')
$backups = Join-Path $env:APPDATA 'spicetify\LauncherBackups'
New-Item -ItemType Directory -Path $backups -Force | Out-Null
foreach ($directory in @($desktop, $programs)) {
    $path = Join-Path $directory 'Spotify.lnk'
    $backup = Join-Path $backups ((Split-Path $directory -Leaf) + '-Spotify.lnk')
    if ((Test-Path -LiteralPath $path) -and !(Test-Path -LiteralPath $backup)) {
        Copy-Item -LiteralPath $path -Destination $backup
    }
    $link = $shell.CreateShortcut($path)
    $link.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $link.Arguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $launchScript + '"'
    $link.WorkingDirectory = Split-Path $PSScriptRoot -Parent
    $link.IconLocation = (Join-Path $env:APPDATA 'Spotify\Spotify.exe') + ',0'
    $link.Save()
}
