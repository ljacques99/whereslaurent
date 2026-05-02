'use strict';

const DEV_MODE = process.env.DEV_MODE === 'true';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_ADDRESS = 'Where\'s Laurent <noreply@evolversfr.com>';

async function sendMagicLink(email, token, frontendUrl) {
  const magicLink = `${frontendUrl}/auth/verify?token=${token}`;

  if (DEV_MODE) {
    console.log(`[DEV_MODE] Magic link for ${email}: ${magicLink}`);
    return { devLink: magicLink };
  }

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#1e293b;padding:24px 32px;border-bottom:1px solid #334155;">
            <h1 style="margin:0;color:#3b82f6;font-size:22px;font-weight:700;">
              Where's <span style="color:#60a5fa;">Laurent</span>
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#e2e8f0;font-size:16px;">Bonjour,</p>
            <p style="margin:0 0 28px;color:#94a3b8;font-size:15px;line-height:1.6;">
              Cliquez sur le bouton ci-dessous pour vous connecter à <strong style="color:#e2e8f0;">Where's Laurent</strong>.
              Ce lien est valable <strong style="color:#e2e8f0;">15 minutes</strong>.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
              <tr>
                <td align="center" style="border-radius:8px;background:#3b82f6;">
                  <a href="${magicLink}"
                     style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                    Se connecter →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;color:#64748b;font-size:12px;">
              Si vous n'avez pas demandé ce lien, ignorez cet email.
            </p>
            <p style="margin:0;color:#475569;font-size:11px;word-break:break-all;">
              Lien direct : ${magicLink}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [email],
      subject: "Where's Laurent — votre lien de connexion",
      html,
      text: `Connectez-vous à Where's Laurent :\n\n${magicLink}\n\nCe lien est valable 15 minutes.`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }

  return {};
}

module.exports = { sendMagicLink };
