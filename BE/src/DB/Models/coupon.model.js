import mongoose, { Schema } from "mongoose";

const couponSchema = new Schema({
    code:{
        type:String,
        required:true,
        unique:true,
        uppercase:true,
        trim:true,
        minlength:[3,"code must be at least 3 characters"]
    },
    type:{
        // percent: value is 1-100   |   fixed: value is an amount of money
        type:String,
        enum:["percent","fixed"],
        default:"percent"
    },
    value:{
        type:Number,
        required:true,
        min:0
    },
    maxDiscount:Number,      // optional cap for percent coupons
    minOrder:{
        type:Number,
        default:0
    },
    expiresAt:Date,          // optional
    usageLimit:Number,       // optional: total uses allowed
    usedCount:{
        type:Number,
        default:0
    },
    onePerUser:{
        type:Boolean,
        default:true
    },
    usedBy:[{
        type:Schema.ObjectId,
        ref:"user"
    }],
    active:{
        type:Boolean,
        default:true
    }
},{timestamps:true})

export const couponModel = mongoose.model("coupon", couponSchema)
