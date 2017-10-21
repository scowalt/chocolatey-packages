import-module au

# Borrow from https://github.com/majkinetor/au-packages/blob/master/cantata/update.ps1

function global:au_SearchReplace {
    @{
         ".\tools\chocolateyInstall.ps1" = @{
             "(?i)(^\s*url\s*=\s*)('.*')"          = "`$1'$($Latest.URL32)'"
             "(?i)(^\s*url64bit\s*=\s*)('.*')"     = "`$1'$($Latest.URL64)'"
             "(?i)(^\s*checksum\s*=\s*)('.*')"     = "`$1'$($Latest.Checksum32)'"
             "(?i)(^\s*checksum64\s*=\s*)('.*')"   = "`$1'$($Latest.Checksum64)'"
             "(?i)(^\s*packageName\s*=\s*)('.*')"  = "`$1'$($Latest.PackageName)'"
             "(?i)(^\s*fileType\s*=\s*)('.*')"     = "`$1'$($Latest.FileType)'"
         }
     }
 }