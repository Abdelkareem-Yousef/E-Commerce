import mongoose, { Schema } from "mongoose";


const subcategorySchema= new Schema({
    
        name:{
            type:String
            ,trim:true,
            unique:true,
            required:true,
            minlength:[3,"should be at least three char "]
        },slug:{
            type:String,
            lowercase:true
        },CategoryId:{
            type:Schema.ObjectId,
            ref:"category"
        }
    



},{timestamps:true})

export const subcategoryModel= mongoose.model("subcategory",subcategorySchema)