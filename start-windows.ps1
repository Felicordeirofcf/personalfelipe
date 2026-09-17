$ErrorActionPreference = "Stop"

Write-Host "ConsultoriaFit - preparação do ambiente" -ForegroundColor Green

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker não foi encontrado. Instale e inicie o Docker Desktop antes de continuar." -ForegroundColor Red
    exit 1
}

docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "O Docker Desktop está instalado, mas o mecanismo não está em execução." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Arquivo .env criado a partir de .env.example (modo IA simulado)." -ForegroundColor Yellow
}

Write-Host "Construindo e iniciando os containers..." -ForegroundColor Cyan
docker compose up --build -d
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Aguardando a API ficar pronta..." -ForegroundColor Cyan
$ready = $false
for ($attempt = 1; $attempt -le 30; $attempt++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3333/health" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}

if (-not $ready) {
    Write-Host "A API não respondeu dentro do prazo. Consulte: docker compose logs api" -ForegroundColor Red
    exit 1
}

Write-Host "Aplicando o seed do banco..." -ForegroundColor Cyan
docker compose exec -T api npm run db:seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "" 
Write-Host "ConsultoriaFit está pronto." -ForegroundColor Green
Write-Host "Aplicação: http://localhost:3000"
Write-Host "API:       http://localhost:3333"
Write-Host "Swagger:   http://localhost:3333/docs"
Write-Host "" 
Write-Host "Para acompanhar logs: docker compose logs -f" -ForegroundColor DarkGray
