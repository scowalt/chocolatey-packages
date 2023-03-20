$ErrorActionPreference = 'Stop';

$packageName = 'depressurizer'
$url = "https://github.com/Depressurizer/Depressurizer/releases/download/v5.3.0/Depressurizer-v5.3.0.exe"
$checksum = '1e6ec910eff6fb904a6a24a72387d2e2f8fdf2bc4f5997a554a4457c0252c5bd'


$destination = "$env:LOCALAPPDATA\programs\Depressurizer"
mkdir $destination -Force

Get-ChocolateyWebFile `
    -PackageName $packageName `
    -FileFullPath "$destination\Depressurizer.exe" `
    -ForceDownload `
    -Url $url `
    -Checksum $checksum `
    -ChecksumType 'sha256' `

Install-ChocolateyShortcut -ShortcutFilePath "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Depressuzizer.lnk" -TargetPath "$destination\Depressurizer.exe"
