// Single confirmation template for student addition
const studentConfirmationTemplate = (data) => {
  const {
    guardianName,
    guardianEmail,
    temporaryPassword,
    studentName,
    studentId,
    className,
    guardianFullName,
    relationship,
    routeName,
    stopName,
    pickupTime,
    dropoffTime,
    portalUrl,
    playStoreUrl,
    schoolName = "SchoolRun",
    schoolLogo = "https://www.eaglesvale.ac.zw/wp-content/uploads/2023/12/Copy-of-Eaglesvale-Logo-FULL-COLOUR.png",
  } = data;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Student Bus Enrollment Confirmation</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 0;
        background: #f4f6f9;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
      }
      .wrapper {
        max-width: 600px;
        margin: 20px auto;
        background: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 24px rgba(0,0,0,0.1);
      }
      .header {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        padding: 28px 40px;
        text-align: center;
      }
      .header img.logo {
        max-height: 40px;
        margin-bottom: 14px;
      }
      .header h1 {
        margin: 0;
        color: #ffffff;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.3px;
      }
      .header .badge {
        display: inline-block;
        background: #48bb78;
        color: white;
        padding: 4px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        margin-top: 10px;
        letter-spacing: 0.3px;
        text-transform: uppercase;
      }
      .header p.school-name {
        margin: 10px 0 0;
        color: #a0aec0;
        font-size: 13px;
        letter-spacing: 0.3px;
      }
      .body {
        padding: 36px 40px;
      }
      .body p {
        color: #4a5568;
        font-size: 15px;
        margin: 0 0 16px;
      }
      .body .greeting {
        font-size: 16px;
        font-weight: 500;
        color: #1a1a2e;
      }
      .section-title {
        font-size: 14px;
        font-weight: 700;
        color: #1a1a2e;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin: 28px 0 12px;
        padding-bottom: 8px;
        border-bottom: 2px solid #e2e8f0;
      }
      .section-title:first-of-type {
        margin-top: 0;
      }
      .credentials-box {
        background: #f0f4ff;
        border: 1px solid #b3cfff;
        border-radius: 10px;
        padding: 16px 20px;
        margin: 12px 0 16px;
      }
      .credentials-box p {
        margin: 6px 0;
        font-size: 14px;
        color: #2d3748;
      }
      .credentials-box strong {
        color: #1a1a2e;
      }
      .credentials-box .password-display {
        background: #e2e8f0;
        padding: 2px 10px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-weight: 600;
        color: #1a1a2e;
        letter-spacing: 0.5px;
        display: inline-block;
      }
      .credentials-box .security-note {
        margin-top: 10px;
        color: #718096;
        font-size: 12px;
      }
      .info-table {
        width: 100%;
        border-collapse: collapse;
        margin: 8px 0 4px;
      }
      .info-table td {
        padding: 6px 0;
        font-size: 14px;
        color: #2d3748;
        vertical-align: top;
      }
      .info-table td.label {
        color: #718096;
        width: 38%;
        font-weight: 500;
      }
      .route-details {
        background: #f7fafc;
        border-radius: 10px;
        padding: 16px 20px;
        margin: 8px 0;
        border-left: 4px solid #48bb78;
      }
      .route-details table {
        width: 100%;
        border-collapse: collapse;
      }
      .route-details td {
        padding: 4px 0;
        font-size: 14px;
        color: #2d3748;
      }
      .route-details td.label {
        color: #718096;
        width: 40%;
      }
      .divider {
        border-top: 1px solid #e2e8f0;
        margin: 24px 0;
      }
      .btn-wrap {
        text-align: center;
        margin: 24px 0 8px;
      }
      .btn {
        display: inline-block;
        background: #1a1a2e;
        color: #ffffff;
        text-decoration: none;
        padding: 14px 40px;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }
      .app-section {
        text-align: center;
        margin: 24px 0 4px;
      }
      .app-section .label {
        font-size: 13px;
        color: #718096;
        margin-bottom: 14px;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        font-weight: 600;
      }
      .app-buttons {
        text-align: center;
      }
      .app-buttons img {
        height: 48px;
        display: inline-block;
      }
      .notice {
        background: #fffbeb;
        border: 1px solid #f6d860;
        border-radius: 10px;
        padding: 14px 18px;
        margin: 16px 0 0;
      }
      .notice p {
        margin: 0;
        color: #92400e;
        font-size: 13px;
      }
      .notice.info {
        background: #ebf8ff;
        border-color: #90cdf4;
      }
      .notice.info p {
        color: #2c5282;
      }
      .notice strong {
        display: block;
        margin-bottom: 2px;
      }
      .footer {
        background: #f7fafc;
        padding: 22px 40px;
        text-align: center;
        border-top: 1px solid #edf2f7;
      }
      .footer p {
        margin: 0;
        color: #a0aec0;
        font-size: 12px;
      }
      .footer .legal-links {
        margin-top: 10px;
        font-size: 11px;
      }
      .footer .legal-links a {
        color: #a0aec0;
        text-decoration: none;
      }
      .link-fallback {
        word-break: break-all;
        color: #4299e1;
        font-size: 13px;
        text-decoration: underline;
      }
      .text-muted {
        color: #718096;
        font-size: 13px;
      }
      .closing {
        margin-top: 32px;
        padding-top: 20px;
        border-top: 1px solid #e2e8f0;
      }

      @media only screen and (max-width: 480px) {
        .wrapper {
          margin: 10px;
          border-radius: 12px;
        }
        .header {
          padding: 24px 20px;
        }
        .body {
          padding: 24px 20px;
        }
        .footer {
          padding: 18px 20px;
        }
        .btn {
          display: block;
          padding: 14px 20px;
        }
        .credentials-box {
          padding: 12px 16px;
        }
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <!-- Header -->
      <div class="header">
        ${schoolLogo ? `<img src="${schoolLogo}" alt="${schoolName}" class="logo" />` : ""}
        <h1>Student Bus Enrollment Confirmed</h1>
        <span class="badge">Successfully Enrolled</span>
        <p class="school-name">${schoolName}</p>
      </div>

      <!-- Body -->
      <div class="body">
        <p class="greeting">Dear ${guardianName},</p>
        <p>
          We are pleased to confirm that <strong>${studentName}</strong> has been
          successfully enrolled at <strong>${schoolName}</strong>.
          Below are your account details and important information.
        </p>

        <!-- Login Credentials -->
        <div class="section-title">Account Credentials</div>
        <div class="credentials-box">
          <p><strong>Email:</strong> ${guardianEmail}</p>
          <p>
            <strong>Temporary Password:</strong>
            <span class="password-display">${temporaryPassword}</span>
          </p>
          <p class="security-note">For security, please change your password after your first login.</p>
        </div>

        <!-- Student Information -->
        <div class="section-title">Student Information</div>
        <table class="info-table">
          <tr>
            <td class="label">Name</td>
            <td>${studentName}</td>
          </tr>
          <tr>
            <td class="label">Student ID</td>
            <td>${studentId}</td>
          </tr>
          ${className ? `<tr><td class="label">Class</td><td>${className}</td></tr>` : ""}
          ${guardianFullName ? `<tr><td class="label">Guardian</td><td>${guardianFullName}</td></tr>` : ""}
          ${relationship ? `<tr><td class="label">Relationship</td><td>${relationship}</td></tr>` : ""}
        </table>

        <!-- Transportation Details -->
        ${
          routeName
            ? `
        <div class="divider"></div>
        <div class="section-title">Transportation Details</div>
        <div class="route-details">
          <table>
            <tr>
              <td class="label">Route</td>
              <td>${routeName}</td>
            </tr>
            ${stopName ? `<tr><td class="label">Bus Stop</td><td>${stopName}</td></tr>` : ""}
            ${pickupTime ? `<tr><td class="label">Estimated Pickup</td><td>${pickupTime}</td></tr>` : ""}
            ${dropoffTime ? `<tr><td class="label">Estimated Dropoff</td><td>${dropoffTime}</td></tr>` : ""}
          </table>
        </div>
        `
            : ""
        }

        <!-- Access Options -->
        <div class="divider"></div>
        <div class="section-title">Access Your Account</div>
        <p>You can access the parent portal and mobile app using your email and temporary password.</p>

        <!-- Portal Login Button -->
        <div class="btn-wrap">
          <a href="${portalUrl}" class="btn">Login to Parent Portal</a>
        </div>

        <!-- Mobile App Download -->
        <div class="app-section">
          <p class="label">Download the Mobile App</p>
          <div class="app-buttons">
            <a href="${playStoreUrl}">
              <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" />
            </a>
          </div>
          <p class="text-muted" style="margin-top: 10px;">Available on iOS and Android</p>
        </div>

        <!-- Quick Links -->
        <div style="text-align: center; margin: 20px 0 0;">
          <p class="text-muted" style="margin-bottom: 4px;">Direct link to portal:</p>
          <a href="${portalUrl}" class="link-fallback">${portalUrl}</a>
        </div>

        <!-- Important Notice -->
        <div class="notice">
          <p>
            <strong>Important</strong>
            You can track your child's current bus location, communicate with drivers and
            school admin, and receive real-time updates through the parent portal and mobile app.
          </p>
        </div>

        <div class="notice info">
          <p>
            <strong>Need help?</strong>
            Contact our support team at
            <a href="mailto:support@schoolrun.co.zw" style="color: #2c5282; text-decoration: underline;">support@schoolrun.co.zw</a>
          </p>
        </div>

        <!-- Welcome Message -->
        <div class="closing">
          <p style="margin: 0;">
            Welcome to the <strong>${schoolName}</strong> community!
            We look forward to a wonderful journey together.
          </p>
          <p class="text-muted" style="margin-top: 10px;">
            Best regards,<br/>
            <strong style="color: #1a1a2e;">School Administration Team</strong>
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>© ${new Date().getFullYear()} ${schoolName}. All rights reserved.</p>
        <p style="margin-top: 6px; font-size: 11px; color: #cbd5e0;">
          This is an automated message, please do not reply directly to this email.
        </p>
        <p class="legal-links">
          <a href="${portalUrl}/privacy">Privacy Policy</a>
          &nbsp;&bull;&nbsp;
          <a href="${portalUrl}/terms">Terms of Service</a>
        </p>
      </div>
    </div>
  </body>
  </html>
  `;
};

const forgotPasswordTemplate = (data) => {
  const {
    fullname,
    resetLink,
    expiryHours = 1,
    schoolName = "SchoolRun",
    schoolLogo = "https://www.eaglesvale.ac.zw/wp-content/uploads/2023/12/Copy-of-Eaglesvale-Logo-FULL-COLOUR.png",
    supportEmail = "support@schoolrun.co.zw",
  } = data;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Reset Your Password</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 0;
        background: #f4f6f9;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
      }
      .wrapper {
        max-width: 600px;
        margin: 20px auto;
        background: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 24px rgba(0,0,0,0.1);
      }
      .header {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        padding: 28px 40px;
        text-align: center;
      }
      .header img.logo {
        max-height: 40px;
        margin-bottom: 14px;
      }
      .header h1 {
        margin: 0;
        color: #ffffff;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.3px;
      }
      .header p.school-name {
        margin: 10px 0 0;
        color: #a0aec0;
        font-size: 13px;
        letter-spacing: 0.3px;
      }
      .body {
        padding: 36px 40px;
      }
      .body p {
        color: #4a5568;
        font-size: 15px;
        margin: 0 0 16px;
      }
      .body .greeting {
        font-size: 16px;
        font-weight: 500;
        color: #1a1a2e;
      }
      .section-title {
        font-size: 14px;
        font-weight: 700;
        color: #1a1a2e;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin: 28px 0 12px;
        padding-bottom: 8px;
        border-bottom: 2px solid #e2e8f0;
      }
      .section-title:first-of-type {
        margin-top: 0;
      }
      .info-box {
        background: #f7fafc;
        border-radius: 10px;
        padding: 16px 20px;
        margin: 12px 0 16px;
        border-left: 4px solid #4299e1;
      }
      .info-box p {
        margin: 4px 0;
        font-size: 14px;
        color: #2d3748;
      }
      .btn-wrap {
        text-align: center;
        margin: 28px 0 20px;
      }
      .btn {
        display: inline-block;
        background: #1a1a2e;
        color: #ffffff;
        text-decoration: none;
        padding: 14px 40px;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }
      .btn:hover {
        background: #2d2d44;
      }
      .notice {
        background: #fffbeb;
        border: 1px solid #f6d860;
        border-radius: 10px;
        padding: 14px 18px;
        margin: 16px 0 0;
      }
      .notice p {
        margin: 0;
        color: #92400e;
        font-size: 13px;
      }
      .notice.info {
        background: #ebf8ff;
        border-color: #90cdf4;
      }
      .notice.info p {
        color: #2c5282;
      }
      .notice strong {
        display: block;
        margin-bottom: 2px;
      }
      .footer {
        background: #f7fafc;
        padding: 22px 40px;
        text-align: center;
        border-top: 1px solid #edf2f7;
      }
      .footer p {
        margin: 0;
        color: #a0aec0;
        font-size: 12px;
      }
      .footer .legal-links {
        margin-top: 10px;
        font-size: 11px;
      }
      .footer .legal-links a {
        color: #a0aec0;
        text-decoration: none;
      }
      .link-fallback {
        word-break: break-all;
        color: #4299e1;
        font-size: 13px;
        text-decoration: underline;
      }
      .text-muted {
        color: #718096;
        font-size: 13px;
      }
      .closing {
        margin-top: 32px;
        padding-top: 20px;
        border-top: 1px solid #e2e8f0;
      }
      .icon {
        font-size: 48px;
        text-align: center;
        display: block;
        margin-bottom: 8px;
      }

      @media only screen and (max-width: 480px) {
        .wrapper {
          margin: 10px;
          border-radius: 12px;
        }
        .header {
          padding: 24px 20px;
        }
        .body {
          padding: 24px 20px;
        }
        .footer {
          padding: 18px 20px;
        }
        .btn {
          display: block;
          padding: 14px 20px;
        }
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <!-- Header -->
      <div class="header">
        ${schoolLogo ? `<img src="${schoolLogo}" alt="${schoolName}" class="logo" />` : ""}
        <h1>Reset Your Password</h1>
        <p class="school-name">${schoolName}</p>
      </div>

      <!-- Body -->
      <div class="body">
        <span class="icon">🔐</span>
        <p class="greeting">Hello ${fullname},</p>
        <p>
          We received a request to reset the password for your account associated
          with <strong>${schoolName}</strong>.
        </p>
        <p>
          Click the button below to reset your password. This link will expire in
          <strong>${expiryHours} hour${expiryHours > 1 ? "s" : ""}</strong>.
        </p>

        <!-- Reset Button -->
        <div class="btn-wrap">
          <a href="${resetLink}" class="btn">Reset Password</a>
        </div>

        <!-- Fallback Link -->
        <div style="text-align: center; margin: 12px 0 0;">
          <p class="text-muted" style="margin-bottom: 4px;">If the button doesn't work, copy and paste this link:</p>
          <a href="${resetLink}" class="link-fallback">${resetLink}</a>
        </div>

        <!-- Security Notice -->
        <div class="notice">
          <p>
            <strong>🔒 Security Notice</strong>
            If you did not request a password reset, please ignore this email or
            contact our support team immediately.
          </p>
        </div>

        <div class="notice info">
          <p>
            <strong>💡 Tips for a strong password:</strong>
            • Use at least 8 characters<br/>
            • Include uppercase and lowercase letters<br/>
            • Add numbers and special characters<br/>
            • Avoid common words or personal information
          </p>
        </div>

        <!-- Help Section -->
        <div class="closing">
          <p style="margin: 0;">
            Need additional help? Contact our support team at
            <a href="mailto:${supportEmail}" style="color: #4299e1; text-decoration: underline;">${supportEmail}</a>
          </p>
          <p class="text-muted" style="margin-top: 10px;">
            Best regards,<br/>
            <strong style="color: #1a1a2e;">${schoolName} Support Team</strong>
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>© ${new Date().getFullYear()} ${schoolName}. All rights reserved.</p>
        <p style="margin-top: 6px; font-size: 11px; color: #cbd5e0;">
          This is an automated message, please do not reply directly to this email.
        </p>
        <p class="legal-links">
          <a href="${resetLink.replace(/\/reset-password.*$/, "/privacy")}">Privacy Policy</a>
          &nbsp;&bull;&nbsp;
          <a href="${resetLink.replace(/\/reset-password.*$/, "/terms")}">Terms of Service</a>
        </p>
      </div>
    </div>
  </body>
  </html>
  `;
};

// Password Reset Confirmation Template
const passwordResetConfirmationTemplate = (data) => {
  const {
    fullname,
    schoolName = "SchoolRun",
    schoolLogo = "https://www.eaglesvale.ac.zw/wp-content/uploads/2023/12/Copy-of-Eaglesvale-Logo-FULL-COLOUR.png",
    portalUrl,
    supportEmail = "support@schoolrun.co.zw",
  } = data;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Password Reset Confirmation</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 0;
        background: #f4f6f9;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
      }
      .wrapper {
        max-width: 600px;
        margin: 20px auto;
        background: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 24px rgba(0,0,0,0.1);
      }
      .header {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        padding: 28px 40px;
        text-align: center;
      }
      .header img.logo {
        max-height: 40px;
        margin-bottom: 14px;
      }
      .header h1 {
        margin: 0;
        color: #ffffff;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.3px;
      }
      .header .badge {
        display: inline-block;
        background: #48bb78;
        color: white;
        padding: 4px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        margin-top: 10px;
        letter-spacing: 0.3px;
        text-transform: uppercase;
      }
      .header p.school-name {
        margin: 10px 0 0;
        color: #a0aec0;
        font-size: 13px;
        letter-spacing: 0.3px;
      }
      .body {
        padding: 36px 40px;
      }
      .body p {
        color: #4a5568;
        font-size: 15px;
        margin: 0 0 16px;
      }
      .body .greeting {
        font-size: 16px;
        font-weight: 500;
        color: #1a1a2e;
      }
      .section-title {
        font-size: 14px;
        font-weight: 700;
        color: #1a1a2e;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin: 28px 0 12px;
        padding-bottom: 8px;
        border-bottom: 2px solid #e2e8f0;
      }
      .section-title:first-of-type {
        margin-top: 0;
      }
      .success-box {
        background: #f0fff4;
        border: 1px solid #c6f6d5;
        border-radius: 10px;
        padding: 16px 20px;
        margin: 12px 0 16px;
        text-align: center;
      }
      .success-box .icon {
        font-size: 48px;
        display: block;
        margin-bottom: 4px;
      }
      .success-box p {
        margin: 4px 0;
        font-size: 14px;
        color: #22543d;
      }
      .btn-wrap {
        text-align: center;
        margin: 28px 0 20px;
      }
      .btn {
        display: inline-block;
        background: #1a1a2e;
        color: #ffffff;
        text-decoration: none;
        padding: 14px 40px;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }
      .notice.info {
        background: #ebf8ff;
        border: 1px solid #90cdf4;
        border-radius: 10px;
        padding: 14px 18px;
        margin: 16px 0 0;
      }
      .notice.info p {
        margin: 0;
        color: #2c5282;
        font-size: 13px;
      }
      .notice.info strong {
        display: block;
        margin-bottom: 2px;
      }
      .footer {
        background: #f7fafc;
        padding: 22px 40px;
        text-align: center;
        border-top: 1px solid #edf2f7;
      }
      .footer p {
        margin: 0;
        color: #a0aec0;
        font-size: 12px;
      }
      .text-muted {
        color: #718096;
        font-size: 13px;
      }
      .closing {
        margin-top: 32px;
        padding-top: 20px;
        border-top: 1px solid #e2e8f0;
      }

      @media only screen and (max-width: 480px) {
        .wrapper {
          margin: 10px;
          border-radius: 12px;
        }
        .header {
          padding: 24px 20px;
        }
        .body {
          padding: 24px 20px;
        }
        .footer {
          padding: 18px 20px;
        }
        .btn {
          display: block;
          padding: 14px 20px;
        }
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <!-- Header -->
      <div class="header">
        ${schoolLogo ? `<img src="${schoolLogo}" alt="${schoolName}" class="logo" />` : ""}
        <h1>Password Reset Successful</h1>
        <span class="badge">✓ Password Updated</span>
        <p class="school-name">${schoolName}</p>
      </div>

      <!-- Body -->
      <div class="body">
        <div class="success-box">
          <span class="icon">✅</span>
          <p><strong>Your password has been successfully reset!</strong></p>
        </div>

        <p class="greeting">Hello ${fullname},</p>
        <p>
          This is a confirmation that your password has been successfully changed
          for your account at <strong>${schoolName}</strong>.
        </p>

        <!-- Login Button -->
        <div class="btn-wrap">
          <a href="${portalUrl}" class="btn">Login to Your Account</a>
        </div>

        <div class="notice info">
          <p>
            <strong>🔒 Security Reminder</strong>
            If you did not initiate this password change, please contact our
            support team immediately.
          </p>
        </div>

        <!-- Help Section -->
        <div class="closing">
          <p style="margin: 0;">
            Need help? Contact our support team at
            <a href="mailto:${supportEmail}" style="color: #4299e1; text-decoration: underline;">${supportEmail}</a>
          </p>
          <p class="text-muted" style="margin-top: 10px;">
            Best regards,<br/>
            <strong style="color: #1a1a2e;">${schoolName} Support Team</strong>
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>© ${new Date().getFullYear()} ${schoolName}. All rights reserved.</p>
        <p style="margin-top: 6px; font-size: 11px; color: #cbd5e0;">
          This is an automated message, please do not reply directly to this email.
        </p>
      </div>
    </div>
  </body>
  </html>
  `;
};

// emailTemplate.js - Add this new template

const passwordChangeConfirmationTemplate = (data) => {
  const {
    fullname,
    email,
    schoolName = "SchoolRun",
    schoolLogo = "https://www.eaglesvale.ac.zw/wp-content/uploads/2023/12/Copy-of-Eaglesvale-Logo-FULL-COLOUR.png",
    portalUrl,
    supportEmail = "support@schoolrun.co.zw",
    deviceInfo,
    changedVia = "Profile Settings",
    isReset = false,
  } = data;

  const actionType = isReset ? "reset" : "changed";
  const actionTitle = isReset ? "Password Reset" : "Password Changed";
  const actionEmoji = isReset ? "🔄" : "🔐";

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${actionTitle} Confirmation</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 0;
        background: #f4f6f9;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
      }
      .wrapper {
        max-width: 600px;
        margin: 20px auto;
        background: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 24px rgba(0,0,0,0.1);
      }
      .header {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        padding: 28px 40px;
        text-align: center;
      }
      .header img.logo {
        max-height: 40px;
        margin-bottom: 14px;
      }
      .header h1 {
        margin: 0;
        color: #ffffff;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.3px;
      }
      .header .badge {
        display: inline-block;
        background: #48bb78;
        color: white;
        padding: 4px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        margin-top: 10px;
        letter-spacing: 0.3px;
        text-transform: uppercase;
      }
      .header p.school-name {
        margin: 10px 0 0;
        color: #a0aec0;
        font-size: 13px;
        letter-spacing: 0.3px;
      }
      .body {
        padding: 36px 40px;
      }
      .body p {
        color: #4a5568;
        font-size: 15px;
        margin: 0 0 16px;
      }
      .body .greeting {
        font-size: 16px;
        font-weight: 500;
        color: #1a1a2e;
      }
      .section-title {
        font-size: 14px;
        font-weight: 700;
        color: #1a1a2e;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin: 28px 0 12px;
        padding-bottom: 8px;
        border-bottom: 2px solid #e2e8f0;
      }
      .section-title:first-of-type {
        margin-top: 0;
      }
      .success-box {
        background: #f0fff4;
        border: 1px solid #c6f6d5;
        border-radius: 10px;
        padding: 16px 20px;
        margin: 12px 0 16px;
        text-align: center;
      }
      .success-box .icon {
        font-size: 48px;
        display: block;
        margin-bottom: 4px;
      }
      .success-box p {
        margin: 4px 0;
        font-size: 14px;
        color: #22543d;
      }
      .info-table {
        width: 100%;
        border-collapse: collapse;
        margin: 8px 0 4px;
        background: #f7fafc;
        border-radius: 10px;
        overflow: hidden;
      }
      .info-table td {
        padding: 10px 16px;
        font-size: 14px;
        color: #2d3748;
        vertical-align: top;
        border-bottom: 1px solid #edf2f7;
      }
      .info-table tr:last-child td {
        border-bottom: none;
      }
      .info-table td.label {
        color: #718096;
        width: 35%;
        font-weight: 500;
        background: #f7fafc;
      }
      .info-table td.value {
        background: #ffffff;
        font-family: ${deviceInfo?.browser?.includes("Unknown") ? "inherit" : "monospace"};
        word-break: break-all;
      }
      .btn-wrap {
        text-align: center;
        margin: 28px 0 20px;
      }
      .btn {
        display: inline-block;
        background: #1a1a2e;
        color: #ffffff;
        text-decoration: none;
        padding: 14px 40px;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }
      .btn:hover {
        background: #2d2d44;
      }
      .notice {
        background: #fffbeb;
        border: 1px solid #f6d860;
        border-radius: 10px;
        padding: 14px 18px;
        margin: 16px 0 0;
      }
      .notice p {
        margin: 0;
        color: #92400e;
        font-size: 13px;
      }
      .notice.info {
        background: #ebf8ff;
        border-color: #90cdf4;
      }
      .notice.info p {
        color: #2c5282;
      }
      .notice.warning {
        background: #fff5f5;
        border-color: #feb2b2;
      }
      .notice.warning p {
        color: #9b2c2c;
      }
      .notice strong {
        display: block;
        margin-bottom: 2px;
      }
      .footer {
        background: #f7fafc;
        padding: 22px 40px;
        text-align: center;
        border-top: 1px solid #edf2f7;
      }
      .footer p {
        margin: 0;
        color: #a0aec0;
        font-size: 12px;
      }
      .footer .legal-links {
        margin-top: 10px;
        font-size: 11px;
      }
      .footer .legal-links a {
        color: #a0aec0;
        text-decoration: none;
      }
      .text-muted {
        color: #718096;
        font-size: 13px;
      }
      .closing {
        margin-top: 32px;
        padding-top: 20px;
        border-top: 1px solid #e2e8f0;
      }
      .device-icon {
        font-size: 20px;
        margin-right: 6px;
      }

      @media only screen and (max-width: 480px) {
        .wrapper {
          margin: 10px;
          border-radius: 12px;
        }
        .header {
          padding: 24px 20px;
        }
        .body {
          padding: 24px 20px;
        }
        .footer {
          padding: 18px 20px;
        }
        .btn {
          display: block;
          padding: 14px 20px;
        }
        .info-table td {
          padding: 8px 12px;
          font-size: 13px;
        }
        .info-table td.label {
          width: 40%;
        }
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <!-- Header -->
      <div class="header">
        ${schoolLogo ? `<img src="${schoolLogo}" alt="${schoolName}" class="logo" />` : ""}
        <h1>${actionEmoji} ${actionTitle} Confirmation</h1>
        <span class="badge">✓ ${isReset ? "Password Reset" : "Password Updated"}</span>
        <p class="school-name">${schoolName}</p>
      </div>

      <!-- Body -->
      <div class="body">
        <div class="success-box">
          <span class="icon">✅</span>
          <p><strong>Your password has been successfully ${actionType}!</strong></p>
          ${isReset ? "<p>You can now log in with your new password.</p>" : ""}
        </div>

        <p class="greeting">Hello ${fullname},</p>
        <p>
          This is a confirmation that your password has been successfully ${actionType}
          for your account at <strong>${schoolName}</strong>.
        </p>

        <!-- Device Information -->
        ${
          deviceInfo
            ? `
        <div class="section-title">Device Information</div>
        <table class="info-table">
          <tr>
            <td class="label">📱 Device</td>
            <td class="value">${deviceInfo.platform || "Unknown"}</td>
          </tr>
          <tr>
            <td class="label">🌐 Browser</td>
            <td class="value">${deviceInfo.browser || "Unknown"}</td>
          </tr>
          <tr>
            <td class="label">📍 IP Address</td>
            <td class="value">${deviceInfo.ip || "Unknown"}</td>
          </tr>
          ${
            deviceInfo.location && deviceInfo.location !== "Unknown"
              ? `
          <tr>
            <td class="label">🌍 Location</td>
            <td class="value">${deviceInfo.location}</td>
          </tr>
          `
              : ""
          }
          <tr>
            <td class="label">⏰ Date & Time</td>
            <td class="value">${deviceInfo.timestamp ? new Date(deviceInfo.timestamp).toLocaleString() : "Unknown"}</td>
          </tr>
          <tr>
            <td class="label">📝 Changed Via</td>
            <td class="value">${changedVia || "Unknown"}</td>
          </tr>
        </table>
        `
            : ""
        }

        <!-- Login Button -->
        <div class="btn-wrap">
          <a href="${portalUrl}" class="btn">🔐 Login to Your Account</a>
        </div>

        <!-- Security Notice -->
        <div class="notice warning">
          <p>
            <strong>⚠️ Security Alert</strong>
            If you did not ${actionType} your password, please contact our
            support team immediately.
          </p>
        </div>

        <div class="notice info">
          <p>
            <strong>🔒 Security Tips</strong>
            • Never share your password with anyone<br/>
            • Use a unique password for each account<br/>
            • Enable two-factor authentication if available<br/>
            • Log out from shared devices
          </p>
        </div>

        <!-- Help Section -->
        <div class="closing">
          <p style="margin: 0;">
            Need help? Contact our support team at
            <a href="mailto:${supportEmail}" style="color: #4299e1; text-decoration: underline;">${supportEmail}</a>
          </p>
          <p class="text-muted" style="margin-top: 10px;">
            Best regards,<br/>
            <strong style="color: #1a1a2e;">${schoolName} Support Team</strong>
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>© ${new Date().getFullYear()} ${schoolName}. All rights reserved.</p>
        <p style="margin-top: 6px; font-size: 11px; color: #cbd5e0;">
          This is an automated message, please do not reply directly to this email.
        </p>
        <p class="legal-links">
          <a href="${portalUrl}/privacy">Privacy Policy</a>
          &nbsp;&bull;&nbsp;
          <a href="${portalUrl}/terms">Terms of Service</a>
        </p>
      </div>
    </div>
  </body>
  </html>
  `;
};

module.exports = {
  studentConfirmationTemplate,
  forgotPasswordTemplate,
  passwordResetConfirmationTemplate,
  passwordChangeConfirmationTemplate,
};
