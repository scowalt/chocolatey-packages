$ErrorActionPreference = 'Stop'

$url64bit = "https://github.com/cryptomator/cryptomator/releases/download/1.7.0/Cryptomator-1.7.0-x64.msi"
$checksum64 = 'ab0f7e69239054c56db55a48091e91991c5db599368f08275f539475529d519a'

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
