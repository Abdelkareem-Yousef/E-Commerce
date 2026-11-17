export const authorization=(Roles=[])=>{

    return (req,res,next)=>{
        try {
            // "return" is important: without it the request continued to the controller anyway
            if(!Roles.includes(req.user.role)){
                return res.status(403).json({message:"you are not authorized"})
            }
            return next();
        } catch (error) {
            return next(error)
        }
    }

}
