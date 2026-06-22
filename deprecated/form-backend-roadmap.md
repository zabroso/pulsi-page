# Roadmap: Backend para formulario de demo

Estado actual: el formulario usa `mailto:` como solución temporal.
Este documento registra lo que fue construido, por qué falló, y los pasos para retomarlo.

---

## Lo que fue construido

### Firebase Cloud Function (`functions/index.js`)

Función `sendDemoEmail` (Gen 2, `us-central1`) que:

1. Recibe `POST /api/send-demo` con los campos del formulario
2. Verifica el token de reCAPTCHA v3 contra la API de Google (`score >= 0.5`)
3. Valida campos y formato de email
4. Envía el email via Nodemailer + Gmail SMTP a `contacto@pulsi.cl`

Los tres secrets están configurados en **Firebase Secret Manager** del proyecto `pulsi-2e80d`:
- `EMAIL_USER` — cuenta Gmail remitente
- `EMAIL_PASS` — contraseña SMTP (ver problema abajo)
- `RECAPTCHA_SECRET` — clave privada de reCAPTCHA v3

El rewrite en `firebase.json` mapea `/api/send-demo` → función. El CI/CD en `.github/workflows/deploy.yml` deploya la función con `FIREBASE_TOKEN` en cada push a `main`.

### Lo que falló

**Credenciales SMTP inválidas.** El secret `EMAIL_PASS` contiene la contraseña normal de la cuenta Gmail. Desde 2022, Gmail bloquea autenticación SMTP con contraseña plana (`535 5.7.8 Username and Password not accepted`). El error apareció en los logs de Cloud Functions en cada intento de envío.

**Lo único que falta para que funcione:** reemplazar `EMAIL_PASS` con una App Password de 16 caracteres.

---

## Opción A — Arreglar Gmail SMTP (más rápido)

**Requisito:** la cuenta `EMAIL_USER` debe tener 2FA activo.

1. Ir a `https://myaccount.google.com/apppasswords`
2. Crear App Password: Mail → Other → "Pulsi Firebase"
3. Copiar la contraseña de 16 caracteres generada
4. Actualizar el secret:
   ```bash
   firebase functions:secrets:set EMAIL_PASS --project pulsi-2e80d
   # pegar la App Password cuando lo pida (sin espacios)
   ```
5. Forzar redeploy para que levante el nuevo secret:
   ```bash
   firebase deploy --only functions --project pulsi-2e80d
   ```
6. Restaurar el formulario a la versión con `fetch('/api/send-demo', ...)` desde el commit `ab0ada2`

**Limitación:** si alguna vez se desactiva 2FA o se rota la contraseña de la cuenta, el secret queda inválido y vuelve el error silenciosamente.

---

## Opción B — Resend (recomendada a futuro)

Resend es un servicio de email transaccional con SDK oficial, tier gratuito de 3.000 emails/mes, y mucho mejor DX que Nodemailer+Gmail.

### Cambios necesarios

**1. Instalar SDK:**
```bash
cd functions && npm install resend
```

**2. Reemplazar el bloque de Nodemailer en `functions/index.js`:**
```js
const { Resend } = require('resend');
const resendKey = defineSecret('RESEND_API_KEY');

// dentro del handler:
const resend = new Resend(resendKey.value());
await resend.emails.send({
  from: 'Pulsi Web <no-reply@pulsi.cl>',
  to: 'contacto@pulsi.cl',
  reply_to: email,
  subject: `Nueva solicitud de demo — ${escapeHtml(empresa)}`,
  html: '...', // mismo HTML que ya existe
});
```

**3. Secrets a configurar:**
- Eliminar `EMAIL_USER` y `EMAIL_PASS`
- Agregar `RESEND_API_KEY`:
  ```bash
  firebase functions:secrets:set RESEND_API_KEY --project pulsi-2e80d
  ```

**4. Dominio:** para enviar desde `@pulsi.cl` hay que verificar el dominio en Resend (agregar registros DNS). Alternativa mientras tanto: usar el dominio de prueba `onboarding@resend.dev`.

---

## Opción C — Formspree / EmailJS (sin backend)

Si se quiere eliminar Firebase Functions completamente:

- **Formspree** (`https://formspree.io`): el `<form>` apunta a un endpoint de Formspree con `action="https://formspree.io/f/<ID>"`. Sin JS adicional necesario.
- **EmailJS** (`https://emailjs.com`): SDK de cliente que envía el email directo desde el browser. Tier gratuito de 200 emails/mes.

Ambas opciones eliminan la necesidad de mantener `functions/` y los secrets en Firebase.

---

## Archivos relevantes

| Archivo | Descripción |
|---|---|
| `functions/index.js` | Cloud Function completa con reCAPTCHA + Nodemailer |
| `functions/package.json` | Dependencias: `nodemailer`, `firebase-functions` |
| `firebase.json` | Rewrite `/api/send-demo` → `sendDemoEmail` |
| `.github/workflows/deploy.yml` | Job `deploy-functions` con `FIREBASE_TOKEN` |
| `src/components/CTASection.astro` | Formulario frontend (actualmente con `mailto:`) |

Commit de referencia con la versión completa del pipeline: `ab0ada2`
