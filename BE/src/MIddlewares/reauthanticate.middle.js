import bcrypt from "bcrypt"


export const reathunticate=async(req,res,next)=>{
    try {
                const{password}=req.body
                if(!password){
                    return res.status(400).json({message:"current password is required"})
                }
                const isPasswordMatch=bcrypt.compareSync(password,req.user.password)
                
                        if(!isPasswordMatch){
                            return res.status(400).json({message:"wrong password"})
                        }
                    
                        return next()


        
    } catch (error) {
        return next(error)
    }
}