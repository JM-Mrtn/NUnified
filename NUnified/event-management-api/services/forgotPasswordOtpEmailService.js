import nodemailer from "nodemailer";

/* =====================================================
   EMAIL CONFIGURATION
===================================================== */

function getEmailCredentials() {
  const user =
    process.env.EMAIL_USER ||
    process.env.GMAIL_USER ||
    process.env.SMTP_USER ||
    process.env.EMAIL_USERNAME ||
    "";

  const pass =
    process.env.EMAIL_PASS ||
    process.env.EMAIL_PASSWORD ||
    process.env.EMAIL_APP_PASSWORD ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.SMTP_PASS ||
    "";

  return {
    user,
    pass,
  };
}

/* =====================================================
   TRANSPORTER
===================================================== */

function createTransporter() {
  const {
    user,
    pass,
  } = getEmailCredentials();

  if (!user || !pass) {
    throw new Error(
      "Email credentials are missing from the backend .env file."
    );
  }

  return nodemailer.createTransport({
    service: "gmail",

    auth: {
      user,
      pass,
    },
  });
}

/* =====================================================
   SEND FORGOT PASSWORD OTP
===================================================== */

export async function sendForgotPasswordOtp({
  to,
  displayName,
  otp,
}) {
  const {
    user,
  } = getEmailCredentials();

  if (!to) {
    throw new Error(
      "Recovery email address is required."
    );
  }

  if (!otp) {
    throw new Error(
      "OTP is required."
    );
  }

  const transporter =
    createTransporter();

  const safeName =
    displayName ||
    "NUnified User";

  const mailOptions = {
    from: `"NUnified Event Management" <${user}>`,

    to,

    subject:
      "NUnified Password Reset Verification",

    text: `
Hello ${safeName},

We received a request to reset the password for your NUnified account.

Your verification code is:

${otp}

This code expires in 5 minutes.

If you did not request a password reset, you may safely ignore this email.

NUnified Event Management System
`.trim(),

    html: `
      <div
        style="
          margin:0;
          padding:30px;
          background:#f3f4f6;
          font-family:Arial,Helvetica,sans-serif;
        "
      >
        <div
          style="
            max-width:560px;
            margin:0 auto;
            background:#ffffff;
            border-radius:18px;
            overflow:hidden;
            box-shadow:0 8px 30px rgba(15,23,42,.08);
          "
        >
          <div
            style="
              background:#001f3f;
              padding:28px;
              text-align:center;
            "
          >
            <div
              style="
                display:inline-block;
                background:#174a91;
                color:#facc15;
                font-size:24px;
                font-weight:900;
                padding:15px 18px;
                border-radius:14px;
              "
            >
              NU
            </div>

            <h1
              style="
                margin:18px 0 0;
                color:#ffffff;
                font-size:24px;
              "
            >
              Password Reset
            </h1>
          </div>

          <div
            style="
              padding:30px;
              color:#172554;
            "
          >
            <p>
              Hello <strong>${safeName}</strong>,
            </p>

            <p
              style="
                color:#64748b;
                line-height:1.6;
              "
            >
              We received a request to reset your
              NUnified account password.
            </p>

            <p
              style="
                color:#64748b;
                line-height:1.6;
              "
            >
              Enter the verification code below:
            </p>

            <div
              style="
                margin:28px 0;
                padding:20px;
                text-align:center;
                background:#f8fafc;
                border:2px dashed #facc15;
                border-radius:14px;
              "
            >
              <div
                style="
                  font-size:34px;
                  font-weight:900;
                  letter-spacing:10px;
                  color:#172554;
                "
              >
                ${otp}
              </div>
            </div>

            <p
              style="
                color:#64748b;
                font-size:14px;
                line-height:1.6;
              "
            >
              This verification code expires in
              <strong>5 minutes</strong>.
            </p>

            <div
              style="
                margin-top:24px;
                padding:14px;
                background:#fff7ed;
                border-radius:10px;
                color:#9a3412;
                font-size:13px;
                line-height:1.5;
              "
            >
              If you did not request this password reset,
              you can safely ignore this email. Do not
              share this verification code with anyone.
            </div>
          </div>

          <div
            style="
              border-top:1px solid #e5e7eb;
              padding:18px;
              text-align:center;
              font-size:12px;
              color:#94a3b8;
            "
          >
            NUnified Event Management System
          </div>
        </div>
      </div>
    `,
  };

  const info =
    await transporter.sendMail(
      mailOptions
    );

  return info;
}