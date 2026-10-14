import nodemailer from "nodemailer";

/* =====================================================
   CREATE EMAIL TRANSPORTER
===================================================== */

function createTransporter() {
  const emailUser =
    process.env.EMAIL_USER;

  const emailPass =
    process.env.EMAIL_PASS;

  if (!emailUser) {
    throw new Error(
      "EMAIL_USER is missing from your .env file."
    );
  }

  if (!emailPass) {
    throw new Error(
      "EMAIL_PASS is missing from your .env file."
    );
  }

  return nodemailer.createTransport({
    service: "gmail",

    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
}

/* =====================================================
   VERIFY GMAIL CONNECTION

   Used by:
   testEmail.js
===================================================== */

export async function verifyEmailConnection() {
  const transporter =
    createTransporter();

  await transporter.verify();

  return true;
}

/* =====================================================
   SAFE HTML
===================================================== */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll(
      "'",
      "&#039;"
    );
}

/* =====================================================
   SEND ORGANIZATION LOGIN CREDENTIALS

   Used after Admin creates organization.
===================================================== */

export async function sendOrganizationCredentials({
  email,
  organizationName,
  acronym,
  username,
  password,
}) {
  if (!email) {
    throw new Error(
      "Organization email address is required."
    );
  }

  if (!username) {
    throw new Error(
      "Generated username is missing."
    );
  }

  if (!password) {
    throw new Error(
      "Temporary password is missing."
    );
  }

  const transporter =
    createTransporter();

  const safeOrganizationName =
    escapeHtml(
      organizationName
    );

  const safeAcronym =
    escapeHtml(acronym);

  const safeUsername =
    escapeHtml(username);

  const safePassword =
    escapeHtml(password);

  const clientUrl =
    process.env.CLIENT_URL ||
    "http://localhost:5173";

  const loginUrl =
    `${clientUrl}/login`;

  const fromName =
    process.env.EMAIL_FROM_NAME ||
    "NUnified Event Management";

  const fromAddress =
    process.env.EMAIL_FROM_ADDRESS ||
    process.env.EMAIL_USER;

  const result =
    await transporter.sendMail({
      from:
        `"${fromName}" <${fromAddress}>`,

      to: email,

      subject:
        "Your NUnified Organization Account",

      /* =================================================
         PLAIN TEXT VERSION
      ================================================= */

      text: `
Welcome to NUnified Event Management System.

Your organization account has been created.

Organization:
${organizationName}

Acronym:
${acronym}

Username:
${username}

Temporary Password:
${password}

Login:
${loginUrl}

Please sign in and change your temporary password as soon as possible.

Do not share your credentials with unauthorized users.

NUnified Event Management System
NU MOA RSO AND CSC
      `.trim(),

      /* =================================================
         HTML EMAIL VERSION
      ================================================= */

      html: `
<!doctype html>

<html lang="en">
  <head>
    <meta charset="UTF-8" />

    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />

    <title>
      NUnified Organization Account
    </title>
  </head>

  <body
    style="
      margin: 0;
      padding: 0;
      background: #f3f4f6;
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
    "
  >
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="
        width: 100%;
        background: #f3f4f6;
        padding: 30px 15px;
      "
    >
      <tr>
        <td align="center">

          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              max-width: 600px;
              background: #ffffff;
              border-radius: 20px;
              overflow: hidden;
              box-shadow:
                0 10px 30px
                rgba(15, 23, 42, 0.12);
            "
          >
            <!-- ==========================================
                 HEADER
            =========================================== -->

            <tr>
              <td
                style="
                  padding: 28px 30px;
                  background: #002b5c;
                "
              >
                <table
                  role="presentation"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                >
                  <tr>
                    <td>
                      <div
                        style="
                          display: inline-block;
                          padding: 12px 14px;
                          border-radius: 12px;
                          background: #1746b9;
                          color: #ffd21c;
                          font-size: 22px;
                          font-weight: 900;
                        "
                      >
                        NU
                      </div>
                    </td>

                    <td
                      style="
                        padding-left: 12px;
                      "
                    >
                      <div
                        style="
                          color: #ffffff;
                          font-size: 24px;
                          font-weight: 900;
                        "
                      >
                        NUnified
                      </div>

                      <div
                        style="
                          margin-top: 4px;
                          color: #bfdbfe;
                          font-size: 10px;
                          font-weight: 700;
                          letter-spacing: 1px;
                        "
                      >
                        NU MOA RSO AND CSC
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ==========================================
                 CONTENT
            =========================================== -->

            <tr>
              <td
                style="
                  padding: 32px;
                "
              >
                <div
                  style="
                    color: #ca8a04;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 1.5px;
                  "
                >
                  ORGANIZATION ACCOUNT
                </div>

                <h1
                  style="
                    margin: 10px 0 0;
                    color: #10245f;
                    font-size: 28px;
                  "
                >
                  Welcome to NUnified
                </h1>

                <p
                  style="
                    margin-top: 14px;
                    color: #64748b;
                    font-size: 14px;
                    line-height: 1.7;
                  "
                >
                  Your organization account
                  has been created by the
                  NUnified system administrator.
                </p>

                <!-- ======================================
                     ORGANIZATION
                ======================================= -->

                <div
                  style="
                    margin-top: 24px;
                    padding: 18px;
                    border: 1px solid #e2e8f0;
                    border-radius: 14px;
                    background: #f8fafc;
                  "
                >
                  <div
                    style="
                      color: #94a3b8;
                      font-size: 10px;
                      font-weight: 800;
                      letter-spacing: 1px;
                    "
                  >
                    ORGANIZATION
                  </div>

                  <div
                    style="
                      margin-top: 6px;
                      color: #10245f;
                      font-size: 18px;
                      font-weight: 900;
                    "
                  >
                    ${safeOrganizationName}
                  </div>

                  <div
                    style="
                      margin-top: 4px;
                      color: #64748b;
                      font-size: 12px;
                      font-weight: 700;
                    "
                  >
                    ${safeAcronym}
                  </div>
                </div>

                <!-- ======================================
                     LOGIN CREDENTIALS
                ======================================= -->

                <h2
                  style="
                    margin-top: 28px;
                    margin-bottom: 12px;
                    color: #10245f;
                    font-size: 18px;
                  "
                >
                  Login Credentials
                </h2>

                <!-- USERNAME -->

                <div
                  style="
                    padding: 16px;
                    border-radius: 12px;
                    background: #eff6ff;
                  "
                >
                  <div
                    style="
                      color: #64748b;
                      font-size: 10px;
                      font-weight: 800;
                      letter-spacing: 1px;
                    "
                  >
                    USERNAME
                  </div>

                  <div
                    style="
                      margin-top: 6px;
                      color: #10245f;
                      font-family: monospace;
                      font-size: 16px;
                      font-weight: 900;
                    "
                  >
                    ${safeUsername}
                  </div>
                </div>

                <!-- TEMP PASSWORD -->

                <div
                  style="
                    margin-top: 12px;
                    padding: 16px;
                    border-radius: 12px;
                    background: #fef9c3;
                  "
                >
                  <div
                    style="
                      color: #92400e;
                      font-size: 10px;
                      font-weight: 800;
                      letter-spacing: 1px;
                    "
                  >
                    TEMPORARY PASSWORD
                  </div>

                  <div
                    style="
                      margin-top: 6px;
                      color: #713f12;
                      font-family: monospace;
                      font-size: 16px;
                      font-weight: 900;
                    "
                  >
                    ${safePassword}
                  </div>
                </div>

                <!-- ======================================
                     SECURITY MESSAGE
                ======================================= -->

                <div
                  style="
                    margin-top: 22px;
                    padding: 16px;
                    border: 1px solid #fed7aa;
                    border-radius: 12px;
                    background: #fff7ed;
                    color: #9a3412;
                    font-size: 13px;
                    line-height: 1.6;
                  "
                >
                  <strong>
                    Security reminder:
                  </strong>

                  Please sign in using your
                  temporary password and change
                  it as soon as possible.
                </div>

                <!-- ======================================
                     LOGIN BUTTON
                ======================================= -->

                <div
                  style="
                    margin-top: 28px;
                    text-align: center;
                  "
                >
                  <a
                    href="${loginUrl}"
                    style="
                      display: inline-block;
                      padding: 14px 28px;
                      border-radius: 999px;
                      background: #facc15;
                      color: #082f49;
                      text-decoration: none;
                      font-size: 14px;
                      font-weight: 900;
                    "
                  >
                    Sign In to NUnified
                  </a>
                </div>
              </td>
            </tr>

            <!-- ==========================================
                 FOOTER
            =========================================== -->

            <tr>
              <td
                style="
                  padding: 18px 30px;
                  background: #020617;
                  color: #94a3b8;
                  text-align: center;
                  font-size: 11px;
                  line-height: 1.7;
                "
              >
                NUnified Event Management System
                <br />
                NU MOA RSO AND CSC
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
</html>
      `,
    });

  return result;
}