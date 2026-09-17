# Testar a nova Landing Page

A Landing Page está em `services/web/src/app/page.tsx` e a URL pública é `/`.

## Docker Desktop / Windows

No PowerShell, dentro da pasta `ConsultoriaFit`, execute:

```powershell
docker compose down
docker compose build --no-cache web
docker compose up -d
```

Depois abra `http://localhost:3000/` em uma janela anônima ou faça um hard refresh (`Ctrl+F5`).

> O `docker-compose.yml` não monta o código local como volume. Por isso, apenas `docker compose up -d` pode continuar usando a imagem antiga; o `build --no-cache web` é necessário após trocar os arquivos.

## Desenvolvimento sem Docker

```powershell
cd services/web
npm install
npm run dev
```

Abra `http://localhost:3000/`.

## Conferência visual

A página deve mostrar o título **“Treine com um plano que entende você.”**, os links **Como funciona**, **Benefícios**, **Planos**, o botão **Área do aluno**, os cards de planos e o botão **Contratar agora**.
