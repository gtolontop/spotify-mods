[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$dirty = git -C $repoRoot status --porcelain
if ($LASTEXITCODE -ne 0) { throw 'Cannot read the repository.' }
if ($dirty) { throw 'Commit or save local changes before updating the pack.' }
git -C $repoRoot pull --ff-only
if ($LASTEXITCODE -ne 0) { throw 'Git update failed; preserving the currently installed pack.' }
& (Join-Path $PSScriptRoot 'Install.ps1')
