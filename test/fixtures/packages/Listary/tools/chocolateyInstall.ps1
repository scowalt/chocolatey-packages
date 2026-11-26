$ErrorActionPreference = 'Stop'

$url = 'https://www.listary.com/download/Listary.exe'
$checksum = 'c62249e0d4d49bd3f062d55635cf6a3ab089ea8ee7f6c03947f6febfafaa0288'

$packageArgs = @{
  packageName  = 'Listary'
  fileType     = 'exe'
  url          = $url
  checksum     = $checksum
  checksumType = 'sha256'
  silentArgs   = '/SP /VERYSILENT /NORESTART /SUPPRESSMSGBOXES'
  validExitCodes = @(0)
}
Install-ChocolateyPackage @packageArgs
