'use strict';

const DEV_MODE = process.env.DEV_MODE === 'true';
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';

async function sendMagicLink(email, token, frontendUrl) {
  const magicLink = `${frontendUrl}/auth/verify?token=${token}`;

  if (DEV_MODE) {
    console.log(`[DEV_MODE] Magic link for ${email}: ${magicLink}`);
    return { devLink: magicLink };
  }

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:8px;padding:32px;border:1px solid #e0e0e0;">
    <h2 style="margin:0 0 24px;color:#1a1a1a;font-size:20px;">Where's Laurent — Connexion</h2>
    <p style="margin:0 0 16px;color:#333;font-size:15px;">Bonjour,</p>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
      Cliquez sur le lien ci-dessous pour vous connecter. Ce lien est valable <strong>15 minutes</strong>.
    </p>
    <p style="margin:0 0 24px;">
      <a href="${magicLink}" style="color:#2563eb;font-size:15px;">Se connecter à Where's Laurent</a>
    </p>
    <p style="margin:0;color:#999;font-size:12px;">
      Si vous n'avez pas demandé ce lien, ignorez cet email.
    </p>
  </div>
</body>
</html>`;

  const payload = {
    sender: { name: "Where's Laurent", email: 'noreply@evolversfr.com' },
    to: [{ email }],
    subject: "Where's Laurent — votre lien de connexion",
    htmlContent: html,
    textContent: `Connectez-vous à Where's Laurent :\n\n${magicLink}\n\nCe lien est valable 15 minutes.`,
  };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await res.text();
  console.log(`Brevo response ${res.status}: ${responseText}`);

  if (!res.ok) {
    throw new Error(`Brevo error ${res.status}: ${responseText}`);
  }

  return {};
}

module.exports = { sendMagicLink };
