$url = "https://www.listary.com/download/Listary.exe"
$hash = 'c7c9733d1dbc95cd29f35809f8f55169f1e958d1cb42432fcf92f4af6d4373d1'

Install-ChocolateyPackage `
	-PackageName  'Listary' `
	-FileType     'exe' `
	-SilentArgs   '/SP /VERYSILENT /NORESTART /SUPPRESSMSGBOXES' `
	-Url          $url `
	-Checksum     $hash `
	-ChecksumType 'SHA256'
