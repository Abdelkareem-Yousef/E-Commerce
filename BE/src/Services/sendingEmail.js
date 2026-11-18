// import nodemailer from "nodemailer"
// Render free servers block SMTP ports (25, 465, 587), so Gmail SMTP times out there.
// Emails now go through Brevo's HTTPS API instead (port 443 is never blocked).
// The old SMTP code is kept below, commented, in case you move to a paid server.

export const  subjects={
    Register:"please activate your account",
    ResetPassword:"reset password "
}


// ---------- old way: Gmail SMTP (works locally / on paid Render, blocked on free Render) ----------
// export const SendEmail=async(to,subject,html)=>{
//
//     const transport= nodemailer.createTransport({
//         host:"smtp.gmail.com",
//         port:465,
//         secure:true,
//         auth:{
//             // stored in .env so the password is never committed to git
//             user:process.env.EMAIL_USER,
//             pass:process.env.EMAIL_PASS
//         }
//     })
//     const info =await transport.sendMail({
//         from:process.env.EMAIL_USER,
//         to,
//         subject,
//         html
//     })
//
//
// }


// ---------- new way: Brevo HTTPS API ----------
// .env: BREVO_API_KEY = key from Brevo -> SMTP & API -> API keys
//       EMAIL_USER    = the sender address you verified in Brevo (your Gmail)
//       EMAIL_FROM_NAME (optional) = name shown in the inbox
export const SendEmail=async(to,subject,html)=>{

    if (!process.env.BREVO_API_KEY) throw new Error("BREVO_API_KEY is missing in .env")

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "api-key": process.env.BREVO_API_KEY,
            "content-type": "application/json",
            accept: "application/json"
        },
        body: JSON.stringify({
            sender: { email: process.env.EMAIL_USER, name: process.env.EMAIL_FROM_NAME || "E-Commerce" },
            to: [{ email: to }],
            subject,
            htmlContent: html
        }),
        signal: AbortSignal.timeout(15000)   // never hang the request forever
    })

    // throw like nodemailer did, so the caller's catch still sees the failure
    if (!res.ok) {
        const detail = await res.text().catch(() => "")
        throw new Error(`Brevo email failed (${res.status}): ${detail}`)
    }
    return res.json()
}
