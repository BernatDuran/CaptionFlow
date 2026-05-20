param(
    [int] $Port = 8765,
    [switch] $NoBrowser
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Web = Join-Path $Root "web"
$HostName = "127.0.0.1"
$Url = "http://${HostName}:${Port}"

function Write-Step($Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-Executable($FilePath, $Arguments) {
    try {
        & $FilePath @Arguments *> $null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Resolve-Python {
    if (Test-Executable "python" @("--version")) {
        return @{ Exe = "python"; Prefix = @() }
    }
    if (Test-Executable "py" @("-3", "--version")) {
        return @{ Exe = "py"; Prefix = @("-3") }
    }
    $PgAdminPython = "C:\Program Files\PostgreSQL\18\pgAdmin 4\python\python.exe"
    if ((Test-Path $PgAdminPython) -and (Test-Executable $PgAdminPython @("--version"))) {
        return @{ Exe = $PgAdminPython; Prefix = @() }
    }
    throw "No se ha encontrado Python. Instala Python 3.10+ o revisa la ruta de pgAdmin Python."
}

function Resolve-Npm {
    $NodeNpm = "C:\Program Files\nodejs\npm.cmd"
    if (Test-Path $NodeNpm) {
        return $NodeNpm
    }
    if (Test-Executable "npm.cmd" @("--version")) {
        return "npm.cmd"
    }
    throw "No se ha encontrado npm. Instala Node.js LTS para ejecutar la app web local."
}

Write-Host "CaptionFlow local launcher" -ForegroundColor Green
Write-Host "Repo: $Root"

$Python = Resolve-Python
$Npm = Resolve-Npm

Write-Step "Preparando frontend"
Push-Location $Web
try {
    if (-not (Test-Path (Join-Path $Web "node_modules"))) {
        Write-Host "Instalando dependencias frontend..."
        & $Npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install ha fallado."
        }
    }

    Write-Host "Compilando frontend..."
    & $Npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build ha fallado."
    }
} finally {
    Pop-Location
}

Write-Step "Arrancando CaptionFlow"
Write-Host "URL: $Url"
Write-Host "Deja esta ventana abierta mientras uses la app."
Write-Host "Para cerrar CaptionFlow, pulsa Ctrl+C aqui."

if (-not $NoBrowser) {
    $OpenBrowser = {
        param($TargetUrl)
        Start-Sleep -Seconds 2
        Start-Process $TargetUrl
    }
    Start-Job -ScriptBlock $OpenBrowser -ArgumentList $Url | Out-Null
}

$env:CAPTIONFLOW_ROOT = $Root
$env:CAPTIONFLOW_HOST = $HostName
$env:CAPTIONFLOW_PORT = [string] $Port
$Code = "import os, pathlib, sys; root = pathlib.Path(os.environ['CAPTIONFLOW_ROOT']); sys.path.insert(0, str(root)); from subtitle_pipeline.__main__ import main; main(['app', 'serve', '--host', os.environ['CAPTIONFLOW_HOST'], '--port', os.environ['CAPTIONFLOW_PORT'], '--static-dir', str(root / 'web' / 'dist')])"

$PythonArgs = @()
$PythonArgs += $Python.Prefix
$PythonArgs += @("-c", $Code)
& $Python.Exe @PythonArgs
