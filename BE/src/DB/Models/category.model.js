import mongoose, { Schema } from "mongoose";


const categorySchema= new Schema({

        name:{
            type:String
            ,trim:true,
            unique:true,
            required:true,
            minlength:[3,"should be at least three char "]
        },image:{
            secure_url:{
            type:String
            },
            public_id:{
            type:String
            }
        },slug:{
            type:String,
            lowercase:true
        }




},{
    timestamps:true
})

export const CategoryModel= mongoose.model("category",categorySchema)