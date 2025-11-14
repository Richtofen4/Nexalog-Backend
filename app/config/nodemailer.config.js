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

const fromAddress = MAIL_FROM || SMTP_USER || "no-reply@example.com";
const frontendUrl = FRONTEND_URL || "http://localhost:5173";
const backendUrl = BACKEND_URL || "http://localhost:4000";

// --- TRANSPORT ---

// dla Gmaila wystarczy service: 'gmail'
const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// sprawdzenie po starcie czy logowanie do SMTP działa
transport.verify((err, success) => {
  if (err) {
    console.error("SMTP VERIFY ERROR:", err);
  } else {
    console.log("SMTP READY:", success);
  }
});

// pomocnicza funkcja z mocniejszym logowaniem
function sendMailSafe(options) {
  console.log("SENDING MAIL TO:", options.to, "SUBJECT:", options.subject);

  return transport
    .sendMail(options)
    .then((info) => {
      console.log("MAIL SENT OK:", info.messageId);
      return info;
    })
    .catch((err) => {
      console.error("MAIL ERROR:", err); // tu chcemy pełny błąd
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
