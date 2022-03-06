$ErrorActionPreference = 'Stop';

$packageName   = 'depressurizer'

$packageArgs = @{
  packageName   = $packageName
  unzipLocation = $toolsDir
  fileType      = 'exe'
  url           = 'https://github.com/Depressurizer/Depressurizer/releases/download/$env:chocolateyPackageVersion/Depressurizer-v$env:chocolateyPackageVersion.zip'

  softwareName  = 'Depressurizer*'

  checksum = '178c3edf3d49f4e76b67e1ee9b9984eef21a079cbf1a732b99c7bc42a7eec762'
  checksumType  = 'sha256'

  silentArgs   = '/S'
  validExitCodes= @(0)
}

Install-ChocolateyPackage @packageArgs
