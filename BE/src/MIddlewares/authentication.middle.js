import { userModel } from "../DB/Models/user.model.js";
import jwt from "jsonwebtoken"
import { sessionModel } from "../DB/Models/session.model.js";

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

    let decoded
    try {
        decoded=jwt.verify(token,tokenSignature)
    } catch (error) {
        // no refreshing here any more: the frontend calls POST /refresh (httpOnly cookie) and retries
        if(error.name=="TokenExpiredError"){
            return res.status(401).json({message:"token expired",code:"TOKEN_EXPIRED"})
        }
        return res.status(401).json({message:"authentication failed"})
    }

    try {
        // tokens from before sessions existed have no sid -> log in again
        if(!decoded.sid) return res.status(401).json({message:"please log in again",code:"SESSION_ENDED"})

        // the session must still exist: logout / password change delete it, so the token stops working at once
        const [user, session]=await Promise.all([
            userModel.findById(decoded.id),
            sessionModel.exists({ _id: decoded.sid, userId: decoded.id })
        ])

        if(!user) return res.status(401).json({message:"Profile doesn't exist"})
        if(!session) return res.status(401).json({message:"your session has ended, please log in again",code:"SESSION_ENDED"})

        req.user=user
        req.sessionId=decoded.sid
        return next();
    } catch (error) {
        return next(error)
    }
}
