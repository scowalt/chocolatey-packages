$ErrorActionPreference = 'Stop'

$packageName = 'Hearthstone Deck Tracker'
$url = 'https://github.com/HearthSim/Hearthstone-Deck-Tracker/releases/download/v1.55.6/Hearthstone.Deck.Tracker-v1.55.6.zip'
$checksum = '3ebf12fa3d5e842f1fa8ce433758640e3ce2903a400dac5fb096822149d2bb60'

$toolsDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$shortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) "$packageName.lnk"
$target = Join-Path $toolsDir "$packageName\$packageName.exe"

Install-ChocolateyZipPackage `
  -PackageName $packageName `
  -Url $url `
  -UnzipLocation $toolsDir `
  -Checksum $checksum `
  -ChecksumType 'sha256'

Get-ChildItem -Path (Join-Path $toolsDir $packageName) -Filter '*.exe' -Recurse |
  ForEach-Object { New-Item -ItemType File -Path "$($_.FullName).ignore" -Force | Out-Null }

Install-ChocolateyShortcut -ShortcutFilePath $shortcut -TargetPath $target
