$url = "https://www.listary.com/download/Listary.exe"
$hash = 'b9aeec86cf11187817aca50804d423d2f61dd8049fb2bc2e1b0397f0c246c600'

Install-ChocolateyPackage `
	-PackageName  'Listary' `
	-FileType     'exe' `
	-SilentArgs   '/SP /VERYSILENT /NORESTART /SUPPRESSMSGBOXES' `
	-Url          $url `
	-Checksum     $hash `
	-ChecksumType 'SHA256'
