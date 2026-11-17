import multer from  "multer"
import { customAlphabet } from "nanoid"
import path from "path"

export const allowedextensions={
    Images:["image/jpeg","image/png","image/avif"],
    Files:["application/pdf"],
    Videos:["video/mp4"]
}


const nanoid=customAlphabet("abcdefgh1234567890",5);

export const multerFunction=(AllowedEx=[])=>{

    const storage=multer.diskStorage({
        destination:function (req,file,cb) {

            const fullpath=path.resolve("Media")
            cb(null,fullpath)
            
        },
        filename:function(req,file,cb){
            const uniqueid=nanoid()+file.originalname
            cb(null,uniqueid)
        }
    })

    const fileFilter=function(req,file,cb){
        if(AllowedEx.includes(file.mimetype)){
            return cb(null,true)
        }
        cb (new Error ("invalid file extension"),false)
    }



    const fileUpload=  multer({fileFilter,storage})

    return fileUpload;

}