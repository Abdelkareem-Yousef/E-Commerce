import mongoose, { Schema } from "mongoose";
import { typeRoles } from "../../MIddlewares/authentication.middle.js";

const userSchema= new Schema({
    name :{
        type:String,
        required:true,
        trim:true,
        minlength:[3,"Username must be at least 3 characters"],
        maxlength:[30,"Username must be at most 30 characters"]
    },
    email:{
        type:String,
        required:true,
        trim:true,
        unique:true,
        match:/^((?!\.)[\w\-_.]*[^.])(@\w+)(\.\w+(\.\w+)?[^.\W])$/,
        lowercase:true
    },
    password:{
        type:String
        ,required:true,
        minlength:[8,"passwoerd must be at least 8 character"]
    },
    gender:{
        type:String,
        enum:{
            values:["male","female"],
            message:"Gender must be male or female"
        }
    },
    confirmEmail:{
        type:Boolean,
        default:false
    },
    address:[String],
    // saved delivery addresses (address book used at checkout)
    addresses:[{
        label:{type:String,trim:true,default:"Home"},
        phone:{type:String,trim:true},
        city:{type:String,trim:true,required:true},
        area:{type:String,trim:true},
        street:{type:String,trim:true,required:true},
        building:{type:String,trim:true},
        notes:{type:String,trim:true},
        isDefault:{type:Boolean,default:false}
    }],
    phone:String,
    role:{
        type:String,
        enum:{
            values:Object.values(typeRoles),
            message:"role is required"
        },
        default:typeRoles.user
    },token:String,
    wishlist:[{
        type:Schema.Types.ObjectId,
        ref:"product"
    }],
    image:{
        secure_url:{
            type:String
        },
        public_id:{
            type:String
        }
    }
},{
    timestamps:true
})

export const userModel= mongoose.model("user",userSchema);