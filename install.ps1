# Installs every stable Glowup feature into your Claude Code commands folder.
# Run it in PowerShell:
#   irm https://raw.githubusercontent.com/drewguitarist18-lang/glowup/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

$base = "https://raw.githubusercontent.com/drewguitarist18-lang/glowup/main/features"
$dest = Join-Path $HOME ".claude\commands"

New-Item -ItemType Directory -Force -Path $dest | Out-Null

$manifest = Invoke-RestMethod -Uri "$base/features.json"

foreach ($feature in $manifest.features) {
    if ($feature.status -ne "stable") { continue }

    $out = Join-Path $dest $feature.file
    Invoke-WebRequest -Uri "$base/$($feature.file)" -OutFile $out -UseBasicParsing
    Write-Host "Installed /$($feature.command) -> $out"

    # what the command runs (the scanner): kept beside the commands folder, not in it
    foreach ($extra in @($feature.extras)) {
        if (-not $extra) { continue }
        $to = Join-Path (Join-Path $HOME ".claude") $extra.to
        New-Item -ItemType Directory -Force -Path (Split-Path $to) | Out-Null
        Invoke-WebRequest -Uri "$base/$($extra.file)" -OutFile $to -UseBasicParsing
    }
}

Write-Host ""
Write-Host "Done. Open Claude Code in any project and type /glowup"
