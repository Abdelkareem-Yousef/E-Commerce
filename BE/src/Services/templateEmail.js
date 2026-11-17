export const SignUp_template=(flag,name,link)=>{
  const template={
    register:`<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Confirm your email to finish registering</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0; mso-table-rspace: 0; }
  img { border: 0; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
  a { color: #0F4C5C; }

  @media only screen and (max-width: 620px) {
    .container { width: 100% !important; }
    .px { padding-left: 24px !important; padding-right: 24px !important; }
    .h1 { font-size: 26px !important; line-height: 32px !important; }
    .btn a { display: block !important; }
  }

  @media (prefers-color-scheme: dark) {
    .bg-page { background-color: #0E1417 !important; }
    .bg-card { background-color: #172126 !important; }
    .bg-soft { background-color: #1E2B31 !important; }
    .text-main { color: #F1F5F6 !important; }
    .text-muted { color: #A9B6BB !important; }
    .rule { border-color: #2A3A41 !important; }
    .btn-cell { background-color: #7CCBDB !important; }
    .btn-cell a { color: #0E1417 !important; }
    a.link { color: #7CCBDB !important; }
  }
</style>
</head>
<body class="bg-page" style="margin:0;padding:0;background-color:#EEF2F3;">

<!-- Preheader (inbox preview text) -->
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
  One click to confirm your email and activate your account. The link works for 24 hours.
  &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
</div>

<table role="presentation" class="bg-page" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#EEF2F3" style="background-color:#EEF2F3;">
  <tr>
    <td align="center" style="padding:32px 12px;">

      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

        <!-- Logo -->
        <tr>
          <td class="px" align="left" style="padding:0 8px 20px 8px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;color:#0F4C5C;">
            <span class="text-main" style="color:#0F4C5C;">Nour Store</span>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td class="bg-card" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border-radius:12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

              <!-- Accent bar -->
              <tr>
                <td height="6" style="height:6px;line-height:6px;font-size:0;background-color:#0F4C5C;border-radius:12px 12px 0 0;">&nbsp;</td>
              </tr>

              <!-- Heading -->
              <tr>
                <td class="px" style="padding:40px 48px 8px 48px;">
                  <h1 class="h1 text-main" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:38px;font-weight:normal;color:#14262D;">
                    Confirm your email, ${name}
                  </h1>
                </td>
              </tr>

              <!-- Intro -->
              <tr>
                <td class="px text-muted" style="padding:12px 48px 28px 48px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:26px;color:#4A5A61;">
                  Thanks for signing up. Confirm your email address and your account is ready to use.
                </td>
              </tr>

              <!-- Button (bulletproof) -->
              <tr>
                <td class="px btn" style="padding:0 48px 12px 48px;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${link}" style="height:52px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="f" fillcolor="#0F4C5C">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Confirm email</center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-- -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td class="btn-cell" align="center" bgcolor="#0F4C5C" style="background-color:#0F4C5C;border-radius:10px;">
                        <a href="${link}" target="_blank" style="display:inline-block;padding:16px 36px;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;line-height:20px;color:#FFFFFF;text-decoration:none;border-radius:10px;">Confirm email</a>
                      </td>
                    </tr>
                  </table>
                  <!--<![endif]-->
                </td>
              </tr>

              <!-- Expiry note -->
              <tr>
                <td class="px text-muted" style="padding:12px 48px 32px 48px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:22px;color:#6B7A80;">
                  This link expires in 24 hours.
                </td>
              </tr>

              <!-- Next steps -->
              <tr>
                <td class="px" style="padding:0 48px 36px 48px;">
                  <table role="presentation" class="bg-soft" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F3F7F8" style="background-color:#F3F7F8;border-radius:10px;">
                    <tr>
                      <td style="padding:20px 24px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:#14262D;">
                        <strong class="text-main" style="color:#14262D;">After you confirm</strong>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
                          <tr>
                            <td class="text-muted" width="24" valign="top" style="font-size:15px;line-height:24px;color:#4A5A61;">1.</td>
                            <td class="text-muted" style="font-size:15px;line-height:24px;color:#4A5A61;padding-bottom:4px;">Sign in with your email and password.</td>
                          </tr>
                          <tr>
                            <td class="text-muted" width="24" valign="top" style="font-size:15px;line-height:24px;color:#4A5A61;">2.</td>
                            <td class="text-muted" style="font-size:15px;line-height:24px;color:#4A5A61;padding-bottom:4px;">Finish your profile.</td>
                          </tr>
                          <tr>
                            <td class="text-muted" width="24" valign="top" style="font-size:15px;line-height:24px;color:#4A5A61;">3.</td>
                            <td class="text-muted" style="font-size:15px;line-height:24px;color:#4A5A61;">Start using Nour Store.</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Divider -->
              <tr>
                <td class="px" style="padding:0 48px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr><td class="rule" style="border-top:1px solid #E1E8EA;font-size:0;line-height:0;height:1px;">&nbsp;</td></tr>
                  </table>
                </td>
              </tr>

              <!-- Fallback link -->
              <tr>
                <td class="px text-muted" style="padding:24px 48px 40px 48px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:21px;color:#6B7A80;">
                  If the button doesn't work, copy this link into your browser:<br>
                  <a class="link" href="${link}" style="color:#0F4C5C;word-break:break-all;">${link}</a>
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="px text-muted" align="left" style="padding:24px 8px 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:19px;color:#6B7A80;">
            You received this because someone registered with this email address. If that wasn't you, ignore this message and no account will be created.
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`,
  reset:`<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Reset your password</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0; mso-table-rspace: 0; }
  img { border: 0; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
  a { color: #0F4C5C; }

  @media only screen and (max-width: 620px) {
    .container { width: 100% !important; }
    .px { padding-left: 24px !important; padding-right: 24px !important; }
    .h1 { font-size: 26px !important; line-height: 32px !important; }
    .btn a { display: block !important; }
  }

  @media (prefers-color-scheme: dark) {
    .bg-page { background-color: #0E1417 !important; }
    .bg-card { background-color: #172126 !important; }
    .bg-soft { background-color: #1E2B31 !important; }
    .text-main { color: #F1F5F6 !important; }
    .text-muted { color: #A9B6BB !important; }
    .rule { border-color: #2A3A41 !important; }
    .btn-cell { background-color: #7CCBDB !important; }
    .btn-cell a { color: #0E1417 !important; }
    a.link { color: #7CCBDB !important; }
  }
</style>
</head>
<body class="bg-page" style="margin:0;padding:0;background-color:#EEF2F3;">

<!-- Preheader (inbox preview text) -->
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
  Use the link inside to choose a new password. It works for 1 hour.
  &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
</div>

<table role="presentation" class="bg-page" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#EEF2F3" style="background-color:#EEF2F3;">
  <tr>
    <td align="center" style="padding:32px 12px;">

      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

        <!-- Logo -->
        <tr>
          <td class="px" align="left" style="padding:0 8px 20px 8px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;color:#0F4C5C;">
            <span class="text-main" style="color:#0F4C5C;">Nour Store</span>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td class="bg-card" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border-radius:12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

              <!-- Accent bar -->
              <tr>
                <td height="6" style="height:6px;line-height:6px;font-size:0;background-color:#0F4C5C;border-radius:12px 12px 0 0;">&nbsp;</td>
              </tr>

              <!-- Heading -->
              <tr>
                <td class="px" style="padding:40px 48px 8px 48px;">
                  <h1 class="h1 text-main" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:38px;font-weight:normal;color:#14262D;">
                    Reset your password, ${name}
                  </h1>
                </td>
              </tr>

              <!-- Intro -->
              <tr>
                <td class="px text-muted" style="padding:12px 48px 28px 48px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:26px;color:#4A5A61;">
                  Thanks for signing up. We received a request to reset the password for your account. Click the button below to choose a new one.
                </td>
              </tr>

              <!-- Button (bulletproof) -->
              <tr>
                <td class="px btn" style="padding:0 48px 12px 48px;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${link}" style="height:52px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="f" fillcolor="#0F4C5C">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Reset password</center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-- -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td class="btn-cell" align="center" bgcolor="#0F4C5C" style="background-color:#0F4C5C;border-radius:10px;">
                        <a href="${link}" target="_blank" style="display:inline-block;padding:16px 36px;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;line-height:20px;color:#FFFFFF;text-decoration:none;border-radius:10px;">Reset password</a>
                      </td>
                    </tr>
                  </table>
                  <!--<![endif]-->
                </td>
              </tr>

              <!-- Expiry note -->
              <tr>
                <td class="px text-muted" style="padding:12px 48px 32px 48px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:22px;color:#6B7A80;">
                  This link expires in 1 hour and can be used once.
                </td>
              </tr>

              <!-- Next steps -->
              <tr>
                <td class="px" style="padding:0 48px 36px 48px;">
                  <table role="presentation" class="bg-soft" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F3F7F8" style="background-color:#F3F7F8;border-radius:10px;">
                    <tr>
                      <td style="padding:20px 24px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:#14262D;">
                        <strong class="text-main" style="color:#14262D;">Didn't request this?</strong>
                        <div class="text-muted" style="margin-top:6px;font-size:15px;line-height:24px;color:#4A5A61;">You can safely ignore this email. Your password will stay the same and no changes will be made to your account.</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Divider -->
              <tr>
                <td class="px" style="padding:0 48px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr><td class="rule" style="border-top:1px solid #E1E8EA;font-size:0;line-height:0;height:1px;">&nbsp;</td></tr>
                  </table>
                </td>
              </tr>

              <!-- Fallback link -->
              <tr>
                <td class="px text-muted" style="padding:24px 48px 40px 48px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:21px;color:#6B7A80;">
                  If the button doesn't work, copy this link into your browser:<br>
                  <a class="link" href="${link}" style="color:#0F4C5C;word-break:break-all;">${link}</a>
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="px text-muted" align="left" style="padding:24px 8px 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:19px;color:#6B7A80;">
            You received this because a password reset was requested for your account. For your security, never share this link with anyone.
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`
  }

    return (flag=="register")?template.register:template.reset
}