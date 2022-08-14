$url = "https://www.listary.com/download/Listary.exe"
$hash = 'eed097d25bc653454fcf0b2896582d0a4d83c71a36b6b2acfbd171b970b9f5c8'

Install-ChocolateyPackage `
	-PackageName  'Listary' `
	-FileType     'exe' `
	-SilentArgs   '/SP /VERYSILENT /NORESTART /SUPPRESSMSGBOXES' `
	-Url          $url `
	-Checksum     $hash `
	-ChecksumType 'SHA256'
