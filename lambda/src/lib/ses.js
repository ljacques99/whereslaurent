'use strict';

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({ region: process.env.AWS_REGION || 'eu-west-3' });

const DEV_MODE = process.env.DEV_MODE === 'true';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'laurent.jacques79@gmail.com';

async function sendMagicLink(email, token, frontendUrl) {
  const magicLink = `${frontendUrl}/auth/verify?token=${token}`;

  if (DEV_MODE) {
    console.log(`[DEV_MODE] Magic link for ${email}: ${magicLink}`);
    return { devLink: magicLink };
  }

  const params = {
    Source: ADMIN_EMAIL,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: "Where's Laurent - Your Magic Link",
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 8px;">
              <h1 style="color: #3b82f6; text-align: center;">Where's Laurent</h1>
              <p>Hello,</p>
              <p>Click the button below to sign in to Where's Laurent. This link is valid for 15 minutes.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${magicLink}"
                   style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Sign In
                </a>
              </div>
              <p style="color: #94a3b8; font-size: 0.875rem;">If you didn't request this, you can safely ignore this email.</p>
              <p style="color: #64748b; font-size: 0.75rem; word-break: break-all;">Or copy this link: ${magicLink}</p>
            </div>
          `,
          Charset: 'UTF-8',
        },
        Text: {
          Data: `Sign in to Where's Laurent:\n\n${magicLink}\n\nThis link is valid for 15 minutes.`,
          Charset: 'UTF-8',
        },
      },
    },
  };

  await sesClient.send(new SendEmailCommand(params));
  return {};
}

module.exports = { sendMagicLink };
