$ErrorActionPreference = 'Stop'

$url64bit = "https://github.com/cryptomator/cryptomator/releases/download/1.18.1/Cryptomator-1.18.1-x64.msi"
$checksum64 = '491fdba6a5e45e47fb7ac6f437b8f749b95ee6f58997b854ac7072a7ff45310e'

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