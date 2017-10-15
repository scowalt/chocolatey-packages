$ErrorActionPreference = 'Stop';

$packageName   = 'Depressurizer'
$unzipLocation = Join-Path "C:" $packageName
$url           = "https://github.com/Theo47/depressurizer/releases/download/v$env:chocolateyPackageVersion/depressurizer-$env:chocolateyPackageVersion.zip"

$packageArgs = @{
  packageName   = $packageName
  unzipLocation = $unzipLocation
  url           = $url

  softwareName  = 'Depressurizer*'

  checksum      = '769EC7FF1EBDDFD6FDE323D7876E0A42763675FD48E53558303F9E2DF32D425E'
  checksumType  = 'sha256'
}

Install-ChocolateyZipPackage @packageArgs

$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutFile = Join-Path $desktop "$packageName.lnk"
$exeFile = Join-Path $unzipLocation "$packageName.exe"
Install-ChocolateyShortcut -shortcutFilePath $shortcutFile -targetPath $exeFile
