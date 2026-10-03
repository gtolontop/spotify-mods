function Test-SpotifyReapplyRequired {
    param(
        [string]$InstalledVersion,
        [string]$BackupVersion,
        [bool]$HasOriginalArchive,
        [bool]$HasInjection
    )
    return !$HasInjection -or $HasOriginalArchive -or $InstalledVersion -ne $BackupVersion
}
