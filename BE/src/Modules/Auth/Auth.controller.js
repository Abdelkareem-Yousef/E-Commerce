import { userModel } from "../../DB/Models/user.model.js"
import bcrypt from "bcrypt"
import CryptoJS from "crypto-js"
import jwt from "jsonwebtoken"
import { typeRoles } from "../../MIddlewares/authentication.middle.js"
import { SendEmail, subjects } from "../../Services/sendingEmail.js"
import { SignUp_template } from "../../Services/templateEmail.js"
import { cartModel } from "../../DB/Models/cart.model.js"

const Register=async(req,res,next)=>{
    try {
        //data for email registration

        const {name,email,password,confirmPassword,phone,gender}=req.body



        //check before add the account
        const emailcheck =await userModel.findOne({
            email
        });
        if(emailcheck){
            return res.status(409).json({ message: 'Email already exists' });
        }
        
        if(password!==confirmPassword){
            return res.json({message:"two passwords don't match"})
        }



        //hashiing the data and password

        const hashedPassword=await bcrypt.hash(password,+process.env.Salt_Rounds)

        const encryptPhone= CryptoJS.AES.encrypt(phone,process.env.PHONE_KEY).toString()
        


        // create data model for (user) and making (cart)

        const user=await userModel.create({
            name,
            email,
            password:hashedPassword,
            phone:encryptPhone,
            gender,
            role:typeRoles.user
        })

        const cart= await cartModel.create({
            userId:user._id
        })




        //service for activation of email

        const token=jwt.sign({email},process.env.EMAIL_KEY,{expiresIn:60*60*24})

        // the backend's own address: localhost on your computer, the Render URL online
        const link=`${process.env.BACKEND_URL ?? "http://localhost:3000"}/Activate_Account/${token}`
        SendEmail(email,subjects.Register,SignUp_template("register",name,link))
        
        res.json({message:"user registered successfully",user})
        
    } catch (error) {
        return next(error)
    }
}

const Login=async(req,res,next)=>{
    try {
        const {email,password,remember}=req.body

        const emailcheck =await userModel.findOne({
            email
        });

        const invalid = () =>
        res.status(401).json({ message: 'Invalid email or password' });

        if(!emailcheck){
            return invalid();
        }
        if(emailcheck.confirmEmail==false){
            return res.status(403).json({
                message: 'Please activate your account first',
                code: 'EMAIL_NOT_CONFIRMED',
            });
        }
        
        const isPasswordMatch=bcrypt.compareSync(password,emailcheck.password)

        if(!isPasswordMatch){
            return invalid();
        }

        const token=jwt.sign({id:emailcheck._id,role:emailcheck.role},(emailcheck.role==typeRoles.user)?
        process.env.USER_KEY:process.env.ADMIN_KEY,{expiresIn: remember ? '30d' : '1d'});
        emailcheck.token=token;
        await emailcheck.save()
        
        res.status(200).json({message:`${emailcheck.name} Loged in succesfuly`,token,
            user:{name:emailcheck.name,email:emailcheck.email,role:emailcheck.role}})
        
    } catch (error) {
        return next(error)
        
    }

}

const Activate_Account=async (req,res,next)=>{

    try {

        const {token} = req.params;
    const {email} = jwt.verify(token,process.env.EMAIL_KEY)
    const user = await userModel.findOne({
        email
    })

    if(!user){
       return res.json({message:"email not found to activate"})
    }

    user.confirmEmail=true;
    await user.save()

    res.json({message:"account activated successfully"})
        
    } catch (error) {

        return next(error)
        
    }

    
}

// POST /Reset_Password  body: { email }
// sends an email with a link to the FRONTEND page /reset-password/<token>
const forget_password=async(req,res,next)=>{

    try {
            const {email}=req.body;
            // same answer whether the email exists or not, so nobody can check which emails are registered
            const answer={message:"if this email is registered, a reset link has been sent to it"}

            const user=await userModel.findOne({email})
            if(!user){
                return res.json(answer)
            }

            // signed with EMAIL_KEY + the current password hash:
            // once the password changes, this link stops working (one-time use)
            const token=jwt.sign({email:user.email},process.env.EMAIL_KEY+user.password,{expiresIn:"1h"})

            const frontendUrl=process.env.FRONTEND_URL ?? "http://localhost:4200"
            const link=`${frontendUrl}/reset-password/${token}`
            await SendEmail(user.email,subjects.ResetPassword,SignUp_template("reset",user.name,link))
            res.json(answer)

    } catch (error) {
        return next(error)
    }

}

// POST /Change_Password  body: { token, newpassword, confirmPassword }
const Change_Password=async(req,res,next)=>{

    try {
            const {token,newpassword} = req.body;

            const decoded = jwt.decode(token)
            if(!decoded?.email){
                return res.status(400).json({message:"invalid reset link"})
            }

            const user = await userModel.findOne({email:decoded.email})
            if(!user){
                return res.status(400).json({message:"invalid reset link"})
            }

            try {
                jwt.verify(token,process.env.EMAIL_KEY+user.password)
            } catch (err) {
                return res.status(400).json({
                    message: err.name=="TokenExpiredError"
                        ? "this reset link has expired, please request a new one"
                        : "this reset link was already used or is invalid"
                })
            }

            if(bcrypt.compareSync(newpassword,user.password)){
                return res.status(400).json({message:"new password can't be the same as the old one"})
            }

            user.password=await bcrypt.hash(newpassword,+process.env.Salt_Rounds)
            user.token=undefined   // log out any old sessions
            await user.save()

            res.json({message:"password changed successfully, you can log in now"})

    } catch (error) {
        return next(error)
    }

}

export{
    Register
    ,Login,
    Activate_Account,
    forget_password,
    Change_Password
}