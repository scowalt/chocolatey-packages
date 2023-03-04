$url = "https://www.listary.com/download/Listary.exe"
$hash = 'c8d2ee841fc21372d647cb4e9b8d06f054142d28f3d7bec545497f88583b30b5'

Install-ChocolateyPackage `
	-PackageName  'Listary' `
	-FileType     'exe' `
	-SilentArgs   '/SP /VERYSILENT /NORESTART /SUPPRESSMSGBOXES' `
	-Url          $url `
	-Checksum     $hash `
	-ChecksumType 'SHA256'
