$ErrorActionPreference = 'Stop'

$url = 'https://github.com/stepmania/stepmania/releases/download/v5.0.12/StepMania-5.0.12-win32.exe'
$checksum = 'b3a6c5f70cc35fa5a756e489b545d495309b2abdc5efaa7a78abbacdc2aa8f2c'

$packageArgs = @{
  packageName    = 'stepmania'
  fileType       = 'exe'
  url            = $url
  softwareName   = 'StepMania*'
  checksum       = $checksum
  checksumType   = 'sha256'
  silentArgs     = '/S'
  validExitCodes = @(0)
}
Install-ChocolateyPackage @packageArgs
