import "dotenv/config";

import {
  verifyEmailConnection,
  sendOrganizationCredentials,
} from "./services/emailService.js";

async function testEmail() {
  try {
    console.log(
      "========================================"
    );

    console.log(
      "NUnified Email Test"
    );

    console.log(
      "========================================"
    );

    console.log("");

    /* =====================================
       CHECK REQUIRED ENV VALUES
    ====================================== */

    if (
      !process.env.EMAIL_USER
    ) {
      throw new Error(
        "EMAIL_USER is missing from .env"
      );
    }

    if (
      !process.env.EMAIL_PASS
    ) {
      throw new Error(
        "EMAIL_PASS is missing from .env"
      );
    }

    console.log(
      "Sender:",
      process.env.EMAIL_USER
    );

    console.log("");

    /* =====================================
       TEST GMAIL LOGIN
    ====================================== */

    console.log(
      "Checking Gmail connection..."
    );

    await verifyEmailConnection();

    console.log(
      "✅ Gmail authentication successful."
    );

    console.log("");

    /* =====================================
       SEND TEST EMAIL
    ====================================== */

    console.log(
      "Sending test email..."
    );

    await sendOrganizationCredentials({
      /*
        The test email is sent to the
        same Gmail address configured
        as EMAIL_USER.
      */

      email:
        process.env.EMAIL_USER,

      organizationName:
        "NUnified Test Organization",

      acronym:
        "TEST",

      username:
        "test_eventmanagement",

      password:
        "TemporaryTest123!",
    });

    console.log(
      "✅ Test email sent successfully."
    );

    console.log("");

    console.log(
      "Check the inbox of:"
    );

    console.log(
      process.env.EMAIL_USER
    );

    console.log("");

    console.log(
      "========================================"
    );

    process.exit(0);
  } catch (error) {
    console.log("");

    console.error(
      "❌ EMAIL TEST FAILED"
    );

    console.error("");

    console.error(
      error?.message ||
        error
    );

    console.log("");

    /*
      Helpful Gmail error hints.
    */

    if (
      String(
        error?.message ||
          ""
      ).includes("534")
    ) {
      console.error(
        "Gmail is asking for additional authentication."
      );

      console.error(
        "Use a Google App Password, not your normal Gmail password."
      );
    }

    if (
      String(
        error?.message ||
          ""
      ).includes("535")
    ) {
      console.error(
        "Gmail rejected the username/password."
      );

      console.error(
        "Check EMAIL_USER and use a valid Google App Password in EMAIL_PASS."
      );
    }

    process.exit(1);
  }
}

testEmail();