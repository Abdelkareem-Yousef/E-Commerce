import { userModel } from "../DB/Models/user.model.js";
import jwt from "jsonwebtoken"

export const typeRoles={
    user:"user",
    admin:"admin"
}


export  const authuntication= async (req,res,next)=>{

    const {x}=req.headers;

    // check the header exists BEFORE splitting it (splitting undefined crashed the server)
    if(!x) return res.status(401).json({ message: "no token provided" });

    const [bearer,token]=x.split(" ")
    let tokenSignature=undefined

    switch (bearer) {
        case typeRoles.user:
            tokenSignature=process.env.USER_KEY
            break;
        case typeRoles.admin:
            tokenSignature=process.env.ADMIN_KEY
            break;
        default:
            return res.status(401).json({ message: "invalid token prefix" });
    }

    if(!token) return res.status(401).json({ message: "no token provided" });

    try {
        const decoded=jwt.verify(token,tokenSignature)

        const user= await userModel.findById(decoded.id)

        if(!user) return res.status(401).json({message:"Profile doesn't exist"})

        req.user=user
        return next();

    } catch (error) {
        if(error.name=="TokenExpiredError"){
            const find_user = await userModel.findOne({token})
            if(!find_user){
                return res.status(401).json({message:"Profile doesn't exist"})
            }

            const Refreshtoken=jwt.sign({id:find_user._id,role:find_user.role},(find_user.role==typeRoles.user)?
            process.env.USER_KEY:process.env.ADMIN_KEY,{expiresIn:"1h"});
            find_user.token=Refreshtoken;
            await find_user.save()

            // the frontend interceptor saves this token and retries the request
            return res.status(401).json({message:"refreshed token",Refreshtoken})
        }
        return res.status(401).json({message:"authentication failed"})
    }
}
