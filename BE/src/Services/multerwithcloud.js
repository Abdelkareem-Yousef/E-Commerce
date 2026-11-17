import multer from "multer"
export const MulterWithCloud=()=>{
    const storage = multer.diskStorage({

    })

    const fileupload=multer({storage})
    return fileupload
}