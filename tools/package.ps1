$ErrorActionPreference = 'Stop'
$gameRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $gameRoot '..'))
$oldEntry = Join-Path $gameRoot 'legacy-prototype.html'
if (-not (Test-Path -LiteralPath $oldEntry)) { Copy-Item -LiteralPath (Join-Path $gameRoot 'index.html') -Destination $oldEntry }
Copy-Item -LiteralPath (Join-Path $gameRoot 'play-3d.html') -Destination (Join-Path $gameRoot 'index.html') -Force
$license = Join-Path $gameRoot 'tools/node_modules/three/LICENSE'
$notice = "Three.js 0.186.1 - https://threejs.org/`r`nBundled WebGL renderer. License follows.`r`n`r`n" + [IO.File]::ReadAllText($license)
[IO.File]::WriteAllText((Join-Path $gameRoot 'THIRD-PARTY-NOTICES.txt'), $notice, [Text.UTF8Encoding]::new($false))
$files = @('index.html','world.css','controls.css','world.bundle.js','simulation.js','marketplace.js','assets/coco.jpg','assets/atlas.jpg','assets/nova.jpg','THIRD-PARTY-NOTICES.txt','README-3D.md','CONTROLLER-AUDIT.md')
$archive = Join-Path $workspaceRoot 'Breed-and-Beyond-browser.zip'
$backupRoot = Join-Path $workspaceRoot 'build-backups'
if (Test-Path -LiteralPath $archive) {
 New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
 Copy-Item -LiteralPath $archive -Destination (Join-Path $backupRoot ('Breed-and-Beyond-before-3D-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.zip'))
}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stream = [IO.File]::Open($archive,[IO.FileMode]::Create)
$zip = [IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Create)
try { foreach($relative in $files) { [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,(Join-Path $gameRoot $relative),$relative,[IO.Compression.CompressionLevel]::Optimal) | Out-Null } }
finally { $zip.Dispose(); $stream.Dispose() }
$check = [IO.Compression.ZipFile]::OpenRead($archive)
try {
 if ($check.Entries.Count -ne $files.Count) { throw 'Unexpected package entry count' }
 foreach($relative in $files) {
  $entry = $check.GetEntry($relative)
  if (-not $entry -or $entry.FullName.Contains('\')) { throw "Missing or invalid entry: $relative" }
  $inputStream = $entry.Open(); $ms = [IO.MemoryStream]::new()
  try { $inputStream.CopyTo($ms); $a = [Convert]::ToBase64String($ms.ToArray()); $b = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $gameRoot $relative))); if($a -ne $b){throw "Package mismatch: $relative"} }
  finally { $inputStream.Dispose(); $ms.Dispose() }
 }
 $check.Entries | Select-Object FullName,Length
} finally { $check.Dispose() }
Write-Output 'Verified: every packaged byte matches current source; root index and portable asset paths.'
