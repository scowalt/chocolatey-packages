$ErrorActionPreference = 'Stop'

$url64bit = "https://github.com/cryptomator/cryptomator/releases/download/1.7.5/Cryptomator-1.7.5-x64.msi"
$checksum64 = '0f8f14174967dcd804f9311cdc684cab8c91e1f84e3f99c89edee8e44880e030'

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
