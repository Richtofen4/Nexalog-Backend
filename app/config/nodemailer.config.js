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

const nodemailer = require("nodemailer");

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
  FRONTEND_URL,
  BACKEND_URL,
} = process.env;

// fallbacki awaryjne
const fromAddress = MAIL_FROM || SMTP_USER || "no-reply@example.com";
const frontendUrl = FRONTEND_URL || "http://localhost:5173";
const backendUrl = BACKEND_URL || "http://localhost:4000";

// transporter SMTP
const transport = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// pomocnicza funkcja
function sendMailSafe(options) {
  return transport.sendMail(options).catch((err) => {
    console.error("Mail error:", err);
  });
}

module.exports.sendConfirmationEmail = (name, email, confirmationCode) => {
  const confirmLink = `${backendUrl}/api/auth/confirm/${confirmationCode}`;

  return sendMailSafe({
    from: fromAddress,
    to: email,
    subject: "Weryfikacja e-mail: Nexalog",
    html: `
      <h1>Potwierdzenie e-mail</h1>
      <h2>Cześć ${name}</h2>
      <p>Dziękujemy za rejestrację na naszej platformie. 
      Proszę potwierdź swój e-mail klikając poniższy link:</p>
      <p><a href="${confirmLink}">Potwierdź e-mail</a></p>
    `,
  });
};

module.exports.sendResetEmail = (email, confirmationCode) => {
  const resetLink = `${frontendUrl}/reset/${confirmationCode}`;

  return sendMailSafe({
    from: fromAddress,
    to: email,
    subject: "Resetowanie hasła: Nexalog",
    html: `
      <h1>Resetowanie hasła</h1>
      <p>Aby zresetować hasło, kliknij w poniższy link:</p>
      <p><a href="${resetLink}">Resetuj hasło</a></p>
    `,
  });
};

module.exports.sendQuestion = (title, message) => {
  return sendMailSafe({
    from: fromAddress,
    to: fromAddress,
    subject: title,
    text: message,
  });
};
