import nodemailer from "nodemailer";

function createTransporter() {
  const port =
    Number(
      process.env.EMAIL_PORT
    ) || 465;

  const secure =
    String(
      process.env.EMAIL_SECURE
    ).toLowerCase() ===
    "true";

  if (
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_PASS
  ) {
    throw new Error(
      "EMAIL_USER or EMAIL_PASS is missing from .env"
    );
  }

  return nodemailer.createTransport({
    host:
      process.env.EMAIL_HOST ||
      "smtp.gmail.com",

    port,

    secure,

    auth: {
      user:
        process.env.EMAIL_USER,

      pass:
        process.env.EMAIL_PASS,
    },
  });
}

/* =====================================================
   SEND PASSWORD CHANGE OTP
===================================================== */

export async function sendPasswordChangeOtp({
  to,
  organizationName,
  otp,
}) {
  const transporter =
    createTransporter();

  const fromName =
    process.env.EMAIL_FROM_NAME ||
    "NUnified Event Management";

  const fromAddress =
    process.env.EMAIL_FROM_ADDRESS ||
    process.env.EMAIL_USER;

  await transporter.sendMail({
    from:
      `"${fromName}" <${fromAddress}>`,

    to,

    subject:
      "NUnified Password Change OTP",

    text: `
NUnified Event Management

Hello ${organizationName || "Organization"},

We received a request to change the password of your NUnified account.

Your verification code is:

${otp}

This OTP will expire in 5 minutes.

If you did not request this password change, please ignore this email.

NUnified Event Management
    `.trim(),

    html: `
      <div
        style="
          max-width:600px;
          margin:0 auto;
          font-family:Arial,sans-serif;
          background:#f4f6f8;
          padding:30px;
        "
      >
        <div
          style="
            background:#071c47;
            border-radius:16px 16px 0 0;
            padding:25px;
            text-align:center;
          "
        >
          <div
            style="
              display:inline-block;
              background:#ffcc00;
              color:#071c47;
              font-size:20px;
              font-weight:900;
              padding:12px 15px;
              border-radius:10px;
            "
          >
            NU
          </div>

          <h1
            style="
              color:white;
              margin:15px 0 5px;
              font-size:24px;
            "
          >
            Password Change Verification
          </h1>

          <p
            style="
              color:#cbd5e1;
              margin:0;
              font-size:13px;
            "
          >
            NUnified Event Management
          </p>
        </div>

        <div
          style="
            background:white;
            padding:30px;
            border-radius:0 0 16px 16px;
          "
        >
          <p style="color:#334155;">
            Hello
            <strong>
              ${organizationName || "Organization"}
            </strong>,
          </p>

          <p style="color:#475569;">
            A password change was requested for your
            NUnified organization account.
          </p>

          <p style="color:#475569;">
            Enter this verification code to continue:
          </p>

          <div
            style="
              margin:25px 0;
              padding:20px;
              text-align:center;
              background:#f8fafc;
              border:2px dashed #ffcc00;
              border-radius:12px;
            "
          >
            <div
              style="
                font-size:34px;
                font-weight:900;
                letter-spacing:8px;
                color:#071c47;
              "
            >
              ${otp}
            </div>
          </div>

          <p
            style="
              color:#dc2626;
              font-size:13px;
              font-weight:bold;
            "
          >
            This OTP expires in 5 minutes.
          </p>

          <p
            style="
              color:#64748b;
              font-size:13px;
            "
          >
            If you did not request this password change,
            simply ignore this email. Your current password
            will remain unchanged.
          </p>
        </div>
      </div>
    `,
  });
}