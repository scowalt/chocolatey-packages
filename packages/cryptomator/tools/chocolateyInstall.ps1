$ErrorActionPreference = 'Stop'

$url64bit = "https://github.com/cryptomator/cryptomator/releases/download/1.10.1/Cryptomator-1.10.1-x64.msi"
$checksum64 = '9712f6622f7cbe84c90f0135c4b53c76ea7feb398c2ecf2a3a04cd2cb17550f1'

$packageArgs = @{
  packageName            = 'cryptomator'
  fileType               = 'msi'
  url64bit               = $url64bit
  checksum64             = $checksum64
  checksumType64         = 'sha256'
  silentArgs             = '/qn /norestart'
  validExitCodes         = @(0)
  registryUninstallerKey = 'Cryptomator'
}
Install-ChocolateyPackage @packageArgs

$installLocation = Get-AppInstallLocation $packageArgs.registryUninstallerKey
if ($installLocation) {
  Write-Host "$packageName installed to '$installLocation'"
}
else { Write-Warning "Can't find $PackageName install location" }
