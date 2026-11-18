import mongoose, { Schema } from "mongoose";


const subcategorySchema= new Schema({
    
        name:{
            type:String
            ,trim:true,
            // not unique on its own: "Accessories" can exist in Electronics AND in Fashion
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

subcategorySchema.index({ CategoryId: 1 })
// ...but unique inside one category: no two "Phones" in Electronics
subcategorySchema.index({ CategoryId: 1, name: 1 }, { unique: true })

export const subcategoryModel= mongoose.model("subcategory",subcategorySchema)