$url = "https://www.listary.com/download/Listary.exe"
$hash = 'fb36f42383a56179a3e28da94c0c1b4feffbfcd2f71163c2ef9982394ae3a66e'

Install-ChocolateyPackage `
	-PackageName  'Listary' `
	-FileType     'exe' `
	-SilentArgs   '/SP /VERYSILENT /NORESTART /SUPPRESSMSGBOXES' `
	-Url          $url `
	-Checksum     $hash `
	-ChecksumType 'SHA256'
