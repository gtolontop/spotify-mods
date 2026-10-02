$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$manifest = Get-Content -LiteralPath (Join-Path $repoRoot 'manifest.json') -Raw | ConvertFrom-Json
foreach ($extension in $manifest.extensions) {
    if (!(Test-Path -LiteralPath (Join-Path $repoRoot "Extensions\$extension"))) { throw "Missing extension: $extension" }
}
foreach ($app in $manifest.customApps) {
    if (!(Test-Path -LiteralPath (Join-Path $repoRoot "CustomApps\$app\manifest.json"))) { throw "Missing app: $app" }
}
Get-ChildItem -LiteralPath $repoRoot -Filter '*.ps1' -File -Recurse | ForEach-Object {
    $tokens = $null
    $errors = $null
    [Management.Automation.Language.Parser]::ParseFile($_.FullName, [ref]$tokens, [ref]$errors) | Out-Null
    if ($errors.Count) { throw "PowerShell syntax error in $($_.FullName): $($errors[0].Message)" }
}
foreach ($folder in @('Extensions', 'CustomApps', 'tools')) {
    Get-ChildItem -LiteralPath (Join-Path $repoRoot $folder) -File -Recurse |
        Where-Object { $_.Extension -in @('.js', '.mjs') } |
        ForEach-Object {
            & node --check $_.FullName
            if ($LASTEXITCODE -ne 0) { throw "JavaScript syntax error: $($_.FullName)" }
        }
}
Write-Host 'Manifest and script syntax validated.'
