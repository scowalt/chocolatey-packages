$ErrorActionPreference = 'Stop'

$url64bit = "https://github.com/cryptomator/cryptomator/releases/download/1.19.1/Cryptomator-1.19.1-x64.msi"
$checksum64 = '77ff121b725938bc05efaa842cfd7db2bbe0f32ca76c93b98c65b225d226d7fd'

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
