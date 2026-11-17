import mongoose, { Schema } from "mongoose";



const CartSchema= new Schema({
        products:[
            {
            productId:{
                type:Schema.ObjectId,
                ref:"product"
            },quantity:{
                type:Number,
                default:1,
                    min:1
            }
            ,_id:false
        }
        ],
        userId:{
            type:Schema.ObjectId,
            ref:"user"
        }
},{timestamps:true})

export const cartModel= mongoose.model("cart",CartSchema)