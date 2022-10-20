$url = "https://www.listary.com/download/Listary.exe"
$hash = 'e73438a015a4519ebdcbc428f9e12c5b591279e22edf8d78908d1ce0ca815922'

Install-ChocolateyPackage `
	-PackageName  'Listary' `
	-FileType     'exe' `
	-SilentArgs   '/SP /VERYSILENT /NORESTART /SUPPRESSMSGBOXES' `
	-Url          $url `
	-Checksum     $hash `
	-ChecksumType 'SHA256'
