$url = "https://www.listary.com/download/Listary.exe"
$hash = '62e1ed1d67b9c9b250ecbab667556a3a149d55e363b3563a197a60c10b523fe6'

Install-ChocolateyPackage `
	-PackageName  'Listary' `
	-FileType     'exe' `
	-SilentArgs   '/SP /VERYSILENT /NORESTART /SUPPRESSMSGBOXES' `
	-Url          $url `
	-Checksum     $hash `
	-ChecksumType 'SHA256'
