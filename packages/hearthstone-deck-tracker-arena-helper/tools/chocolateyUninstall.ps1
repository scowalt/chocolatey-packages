$ErrorActionPreference = 'Stop'

$pluginDir = Join-Path $env:APPDATA 'HearthstoneDeckTracker\Plugins\ArenaHelper'
if (Test-Path $pluginDir) {
  Remove-Item $pluginDir -Recurse -Force
}
