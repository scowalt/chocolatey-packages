$url = "https://www.listary.com/download/Listary.exe"
$hash = '3a23a01c8fcc70298e9f6f9d7c070c88d1da5eb441bcb422ef97f86a5710eb71'

Install-ChocolateyPackage `
	-PackageName  'Listary' `
	-FileType     'exe' `
	-SilentArgs   '/SP /VERYSILENT /NORESTART /SUPPRESSMSGBOXES' `
	-Url          $url `
	-Checksum     $hash `
	-ChecksumType 'SHA256'
