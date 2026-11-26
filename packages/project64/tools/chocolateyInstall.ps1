$ErrorActionPreference = 'Stop'

$url = 'https://www.pj64-emu.com/file/setup-project64-3-0-1-5664-2df3434/'
$checksum = '30ba4527a14415f78cf986181f0f2a61535a635561c850ff63f2ac5c3682cde3'

$packageArgs = @{
  packageName    = 'project64'
  fileType       = 'exe'
  url            = $url
  softwareName   = 'Project64*'
  checksum       = $checksum
  checksumType   = 'sha256'
  silentArgs     = '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP-'
  validExitCodes = @(0)
}
Install-ChocolateyPackage @packageArgs
