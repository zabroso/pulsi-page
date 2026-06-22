const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const nodemailer = require('nodemailer');
const https = require('https');
const querystring = require('querystring');

const emailUser = defineSecret('EMAIL_USER');
const emailPass = defineSecret('EMAIL_PASS');
const recaptchaSecret = defineSecret('RECAPTCHA_SECRET');

function verifyRecaptcha(token, secret) {
  return new Promise((resolve, reject) => {
    const body = querystring.stringify({ secret, response: token });
    const options = {
      hostname: 'www.google.com',
      path: '/recaptcha/api/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid reCAPTCHA response'));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

exports.sendDemoEmail = onRequest(
  { cors: true, secrets: [emailUser, emailPass, recaptchaSecret] },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { nombre, apellido, empresa, email, tamano, mensaje, recaptchaToken } = req.body || {};

    if (!nombre || !apellido || !empresa || !email || !tamano || !recaptchaToken) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'El correo ingresado no es válido' });
    }

    // Verificar reCAPTCHA
    try {
      const captcha = await verifyRecaptcha(recaptchaToken, recaptchaSecret.value());
      if (!captcha.success || captcha.score < 0.5) {
        return res.status(400).json({ error: 'Verificación de seguridad fallida' });
      }
    } catch (err) {
      console.error('reCAPTCHA error', err);
      return res.status(500).json({ error: 'Error al verificar seguridad' });
    }

    // Enviar email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser.value(),
        pass: emailPass.value(),
      },
    });

    const mailOptions = {
      from: `"Pulsi Web" <${emailUser.value()}>`,
      to: 'contacto@pulsi.cl',
      replyTo: email,
      subject: `Nueva solicitud de demo — ${escapeHtml(empresa)}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #004ac6; margin-bottom: 24px;">Nueva solicitud de demo</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; color: #6b7280; width: 160px;">Nombre</td>
              <td style="padding: 12px 0; color: #111827;">${escapeHtml(nombre)} ${escapeHtml(apellido)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; color: #6b7280;">Empresa</td>
              <td style="padding: 12px 0; color: #111827;">${escapeHtml(empresa)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; color: #6b7280;">Correo</td>
              <td style="padding: 12px 0; color: #111827;">
                <a href="mailto:${escapeHtml(email)}" style="color: #004ac6;">${escapeHtml(email)}</a>
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; color: #6b7280;">Tamaño del equipo</td>
              <td style="padding: 12px 0; color: #111827;">${escapeHtml(tamano)}</td>
            </tr>
            ${mensaje ? `
            <tr>
              <td style="padding: 12px 0; color: #6b7280; vertical-align: top;">Mensaje</td>
              <td style="padding: 12px 0; color: #111827;">${escapeHtml(mensaje)}</td>
            </tr>` : ''}
          </table>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Error sending email', err);
      return res.status(500).json({ error: 'Error al enviar el correo' });
    }
  }
);
