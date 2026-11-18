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
        },subcategoryId:[{
            // a brand can be in many subcategories (Samsung: Phones, TVs, Tablets...)
            type:Schema.ObjectId,
            ref:"subcategory"
        }]
},{timestamps:true})

brandSchema.index({ subcategoryId: 1 })

export const brandModel= mongoose.model("brand",brandSchema)