$ErrorActionPreference = 'Stop'

$url = 'https://github.com/cryptomator/cryptomator/releases/download/1.19.7/Cryptomator-1.19.7-x64.msi'
$checksum = 'e8079987c521549ed32ca37db2480417f31824ef847771428590f01c9e2442f5'

$packageArgs = @{
  packageName            = 'cryptomator'
  fileType               = 'msi'
  url64bit               = $url
  checksum64             = $checksum
  checksumType64         = 'sha256'
  silentArgs             = '/qn /norestart DISABLEUPDATECHECK=1'
  validExitCodes         = @(0, 3010, 1641)
  registryUninstallerKey = 'Cryptomator'
}
Install-ChocolateyPackage @packageArgs
