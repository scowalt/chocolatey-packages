$ErrorActionPreference = 'Stop'

$url64bit = "https://github.com/cryptomator/cryptomator/releases/download/1.19.2/Cryptomator-1.19.2-x64.msi"
$checksum64 = '4b34ba8d6525ad258de34c8098f9af2240b1874c6151862f1db1f4f2193911d4'

$packageArgs = @{
  packageName            = 'cryptomator'
  fileType               = 'msi'
  url64bit               = $url64bit
  checksum64             = $checksum64
  checksumType64         = 'sha256'
  silentArgs             = '/qn /norestart DISABLEUPDATECHECK=1'
  validExitCodes         = @(0)
  registryUninstallerKey = 'Cryptomator'
}
Install-ChocolateyPackage @packageArgs