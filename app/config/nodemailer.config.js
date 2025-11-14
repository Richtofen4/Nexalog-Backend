/*
const nodemailer = require("nodemailer");
const config = require("../config/auth.config");

const user = config.key.user;
const pass = config.key.pass;

const transport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: user,
        pass: pass,
    }
});

module.exports.sendConfirmationEmail = (name, email, confirmationCode) => {
    transport.sendMail({
        from: user,
        to: email,
        subject: "Weryfikacja e-mail: Nexalog",
        html: `<h1>Potwierdzenie e-mail</h1>
          <h2>Cześć ${name}</h2>
          <p>Dziękujemy za rejestrację na naszej platformie. Proszę potwierdź swój e-mail klikająć poniższy link</p>
          <a href=http://localhost:4000/api/auth/confirm/${confirmationCode}> Potwierdź email</a>
          </div>`,
    }).catch(err => console.log(err));
};

module.exports.sendResetEmail = (email, confirmationCode) => {
    transport.sendMail({
        from: user,
        to: email,
        subject: "Resetowanie hasla: Nexalog",
        html: `<h1>Resetowanie hasła</h1><a href="http://localhost:4000/api/auth/reset/${confirmationCode}">Kliknij, aby potwierdzić</a>`,

    }).catch(err => console.log(err));
};

module.exports.sendQuestion = (title, message ) => {
    transport.sendMail({
        from: user,
        to: user,
        subject: title,
        text: message,
    }).catch(err => console.log(err));
};
*/

const { Resend } = require('resend');

const {
  RESEND_API_KEY,
  MAIL_FROM,
  FRONTEND_URL,
  BACKEND_URL,
} = process.env;

const resend = new Resend(RESEND_API_KEY);

const fromAddress = MAIL_FROM || "onboarding@resend.dev";
const frontendUrl = FRONTEND_URL || "http://localhost:5173";
const backendUrl = BACKEND_URL || "http://localhost:4000";

async function sendMailSafe(options) {
  try {
    const result = await resend.emails.send({
      from: options.from || fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.log("Email sent:", result);
    return result;

  } catch (err) {
    console.error("Mail error:", err);
  }
}

/* ———————————————————————————————— */
/*     MAILS USED IN THE BACKEND       */
/* ———————————————————————————————— */

module.exports.sendConfirmationEmail = (name, email, confirmationCode) => {
  const confirmLink = `${backendUrl}/api/auth/confirm/${confirmationCode}`;

  return sendMailSafe({
    to: email,
    subject: "Weryfikacja e-mail: Nexalog",
    html: `
      <h1>Potwierdzenie e-mail</h1>
      <h2>Cześć ${name}</h2>
      <p>Dziękujemy za rejestrację!</p>
      <p>Kliknij tu, aby potwierdzić email:</p>
      <p><a href="${confirmLink}">${confirmLink}</a></p>
    `,
  });
};

module.exports.sendResetEmail = (email, confirmationCode) => {
  const resetLink = `${frontendUrl}/reset/${confirmationCode}`;

  return sendMailSafe({
    to: email,
    subject: "Resetowanie hasła: Nexalog",
    html: `
      <h1>Resetowanie hasła</h1>
      <p>Kliknij poniżej, aby zmienić hasło:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
    `,
  });
};

module.exports.sendQuestion = (title, message) => {
  return sendMailSafe({
    to: fromAddress,
    subject: title,
    text: message,
  });
};
