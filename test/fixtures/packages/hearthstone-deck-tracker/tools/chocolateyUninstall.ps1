$ErrorActionPreference = 'Stop'

$shortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Hearthstone Deck Tracker.lnk'
Remove-Item $shortcut -Force -ErrorAction SilentlyContinue
