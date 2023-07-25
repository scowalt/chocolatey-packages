$ErrorActionPreference = 'Stop'

$url64bit = "https://github.com/cryptomator/cryptomator/releases/download/1.9.2/Cryptomator-1.9.2-x64.msi"
$checksum64 = 'b82f99aebc470fb540418a0c560f7e33a2c9f4d2582ab34a6ee757e57f18c3e7'

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
