﻿$ErrorActionPreference = 'Stop'

$url64bit = "https://github.com/cryptomator/cryptomator/releases/download/1.12.4/Cryptomator-1.12.4-x64.msi"
$checksum64 = '939809d8bd0e8a31be311bd390c0d70c00196e22c83493a085285d72460474f4'

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
  $file = "C:\Program Files\Cryptomator\app\Cryptomator.cfg"

  # Disable the "Check for updates" dialog in Cryptomator
  # See: https://github.com/cryptomator/cryptomator/pull/3118
  # Check if the file exists
  if (Test-Path $file) {
    # Read the content of the file
    $content = Get-Content $file -Raw

    # Check if the [JavaOptions] section exists
    if ($content -match '\[JavaOptions\]') {
      # Add the line to the [JavaOptions] section
      $content += "`njava-options=-Dcryptomator.disableUpdateCheck=true"
      
      # Write the modified content back to the file
      $content | Set-Content $file -Force
      Write-Host "File modified successfully."
    }
    else {
      Write-Host "[JavaOptions] section not found in the file."
    }
  }
  else {
    Write-Host "File does not exist."
  }

}
else { Write-Warning "Can't find $PackageName install location" }
