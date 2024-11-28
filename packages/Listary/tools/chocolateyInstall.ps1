$url = "https://www.listary.com/download/Listary.exe"
$hash = '9eb1b926c4b68732f7da621f6f6fcbfce8919fc87f64d8f3ba091b01bbc3e8e2'

Install-ChocolateyPackage `
	-PackageName  'Listary' `
	-FileType     'exe' `
	-SilentArgs   '/SP /VERYSILENT /NORESTART /SUPPRESSMSGBOXES' `
	-Url          $url `
	-Checksum     $hash `
	-ChecksumType 'SHA256'
