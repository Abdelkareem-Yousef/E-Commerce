import mongoose, { Schema } from "mongoose";



const brandSchema= new Schema({
    name:{
            type:String
            ,trim:true,
            unique:true,
            required:true,
            minlength:[3,"should be at least three char "]
        },logo:{
            secure_url:{
            type:String
            },
            public_id:{
            type:String
            }
        },slug:{
            type:String,
            lowercase:true
        },subcategoryId:{
            type:Schema.ObjectId,
            ref:"subcategory"
        }
},{timestamps:true})

export const brandModel= mongoose.model("brand",brandSchema)