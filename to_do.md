# TODO

## CI/CD con GitHub Actions → Firebase Hosting

Configurar deploy automático en cada push a `main`.

El workflow ya está en `.github/workflows/deploy.yml`. Para activarlo:

1. Firebase Console → Project Settings → Service Accounts → **Generate new private key** → descargá el JSON
2. GitHub repo → Settings → Secrets and variables → Actions → **New repository secret**
   - Nombre: `FIREBASE_SERVICE_ACCOUNT`
   - Valor: contenido completo del JSON descargado
3. Hacer push a `main` — el workflow corre automáticamente
