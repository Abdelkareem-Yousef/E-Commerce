import mongoose,{Schema} from "mongoose";

const productSchema=new Schema({
    name:{
        type:String,
        required:true,
        trim:true
        // not unique: two brands can sell a product with the same name
    }
    ,price:{
        type:Number,
        required:true
    }
    ,size:[String]
    ,color:[String]
    ,description:{
        type:String,
        trim:true,
    },
    stock:{
        type:Number
    }
    ,available:{
        type:Boolean,
        enum:[true,false],
        default:true
    },userId:{

        type:Schema.Types.ObjectId,
        ref:"user"

    },brandId:{
        type:Schema.ObjectId,
        ref:"brand"
    }
    ,subcategoryId:{
        // one product = one brand + one subcategory (the brand must be linked to it)
        type:Schema.ObjectId,
        ref:"subcategory"
    }
    ,categoryId:{
        // copied from the subcategory when saved -> category pages need no extra lookups
        type:Schema.ObjectId,
        ref:"category"
    }
    ,image:{
            // cover image: shown on the product card
            secure_url:{
            type:String
            },
            public_id:{
            type:String
            }
        }
    ,images:[
        // extra pictures: shown in the slider on the product page
        {
            secure_url:String,
            public_id:String,
            _id:false
        }
    ]
    ,visible:{
        // admin can hide a product from the store without deleting it
        type:Boolean,
        default:true
    }
},{
    timestamps:true
})

// fast pages when there are many products
productSchema.index({ visible: 1, createdAt: -1 })
productSchema.index({ brandId: 1, createdAt: -1 })
productSchema.index({ categoryId: 1, createdAt: -1 })
productSchema.index({ subcategoryId: 1, createdAt: -1 })

export const productModel=mongoose.model("product",productSchema);