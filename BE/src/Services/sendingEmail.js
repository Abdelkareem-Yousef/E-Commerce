import nodemailer from "nodemailer"

export const  subjects={
    Register:"please activate your account",
    ResetPassword:"reset password "
}


export const SendEmail=async(to,subject,html)=>{

    const transport= nodemailer.createTransport({
        host:"smtp.gmail.com",
        port:465,
        secure:true,
        auth:{
            // stored in .env so the password is never committed to git
            user:process.env.EMAIL_USER,
            pass:process.env.EMAIL_PASS
        }
    })
    const info =await transport.sendMail({
        from:process.env.EMAIL_USER,
        to,
        subject,
        html
    })
    

}
