$url = 'http://www.listary.com/download/Listary.exe?version=5.00.2843'
$hash = '83060DD1E3DFE2A345BFBEC2265E6D6DAC5BC7AD0AD037C26B082972D95DB4C4'

Install-ChocolateyPackage `
	-PackageName  'Listary' `
	-FileType     'exe' `
	-SilentArgs   '/SP /VERYSILENT /NORESTART /SUPPRESSMSGBOXES' `
	-Url          $url `
	-Checksum     $hash `
	-ChecksumType 'SHA256'
