$ErrorActionPreference = 'Stop'

$packageName = 'Arena Helper'
$url = 'https://github.com/rembound/Arena-Helper/releases/download/0.9.6/ArenaHelper.v0.9.6.zip'
$checksum = 'd3202fb08f90cf1a4aca533f2beb11ac96d48bcb5a6a544128d9029e68252585'

$pluginsDir = Join-Path $env:APPDATA 'HearthstoneDeckTracker\Plugins'

Install-ChocolateyZipPackage `
  -PackageName $packageName `
  -Url $url `
  -UnzipLocation $pluginsDir `
  -Checksum $checksum `
  -ChecksumType 'sha256'
