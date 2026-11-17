import mongoose from "mongoose";

export const DBconnection=async()=>{

    return await mongoose.connect(process.env.DB_CONNECTION).then(()=>{
        console.log("DB connected successfully")
    }).catch((error)=>{
        console.log("can't to connect to database",error);
        
    })
    

}