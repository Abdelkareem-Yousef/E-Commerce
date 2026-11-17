import mongoose, { Schema } from "mongoose";



const orderSchema= new Schema({
        products:[
            {
            productId:{
                type:Schema.ObjectId,
                ref:"product"
            },quantity:{
                type:Number,
                default:1,
                    min:1
            },price:{
                // price at the moment of ordering (used for revenue in the dashboard)
                type:Number
            }
            ,_id:false
        }
        ],
        userId:{
            type:Schema.ObjectId,
            ref:"user"
        },
        status:{
            type:String,
            enum:["pending","completed","canceled"],
            default:"pending"
        },
        address:{
            // the full address as one line of text (easy to show anywhere)
            type:String,
            required:true
        },
        shippingAddress:{
            // the same address split into fields
            label:String,
            city:String,
            area:String,
            street:String,
            building:String,
            notes:String
        }
        ,paymentMethod:{
            type:String,
            enum:["cash","card"],
            default:"cash"
        },
        paymentStatus:{
            // card: "paid" after Stripe confirms | cash: "paid" when the order is completed
            // "refunded": a paid card order that was canceled
            type:String,
            enum:["unpaid","paid","refunded"],
            default:"unpaid"
        },
        // Stripe
        stripeSessionId:String,     // the latest Stripe payment page for this order
        paymentIntentId:String,     // Stripe's id for the payment (needed for refunds)
        paidAt:Date,
        refundId:String,
        phone:{
            type:String,
            required:true
        },
        subtotal:Number,
        discount:{
            type:Number,
            default:0
        },
        total:Number,
        coupon:{
            code:String,
            couponId:{
                type:Schema.ObjectId,
                ref:"coupon"
            }
        }
},{timestamps:true})

export const orderModel= mongoose.model("order",orderSchema)