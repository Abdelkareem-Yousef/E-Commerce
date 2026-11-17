import { cartModel } from "../../DB/Models/cart.model.js"
import { productModel } from "../../DB/Models/product.model.js"

const get_cart = async (req, res, next) => {
    try {
        const cart = await cartModel.findOne({ userId: req.user._id }).populate("products.productId")
        res.json({ message: "Cart retrieved successfully", cart })
    } catch (error) {
        return next(error)
    }
}

const add_to_cart = async (req, res, next) => {
    try {
        const { productId, quantity } = req.body

        // must be a whole number, and not 0 (use 1 to add, -1 to reduce)
        if (!Number.isInteger(quantity) || quantity === 0) {
            return res.status(400).json({ message: "invalid quantity" })
        }

        const product = await productModel.findById(productId)
        if (!product || product.visible === false) return res.status(404).json({ message: "product not found" })

        const cart = (await cartModel.findOne({ userId: req.user._id }))

        const item = cart.products.find((p) => p.productId.toString() === productId)

        // the total AFTER this change
        const newQty = (item?.quantity ?? 0) + quantity

        if (newQty < 1) {
            return res.status(400).json({ message: "quantity can't be less than 1" })
        }
        if (newQty > product.stock) {
            return res.status(400).json({ message: "no more in stock" })
        }

        

        if (item) item.quantity = newQty
        else cart.products.push({ productId, quantity: newQty })

        await cart.save()
        res.json({ message: "Added to cart" })
    } catch (error) {
        return next(error)
    }
}

const delete_item=async(req,res,next)=>{
    try {
        const {productId}=req.body

        const cart=await cartModel.findOne({userId:req.user._id})

        const index = cart.products.findIndex(
            (p)=> p.productId.toString() === productId
        )

        if(index==-1){
            return res.json({message:"item not found"})
        }

        cart.products.splice(index,1)

        await cart.save()
        res.json({message:"item deleted "})
        
    } catch (error) {
        return next(error)
    }
}

const clear_cart=async(req,res,next)=>{
    try {
        const cart=await cartModel.findOne({userId:req.user._id})

        cart.products=[]

        await cart.save()

        res.json({message:"cart cleared "})
        
    } catch (error) {
        return next(error)
    }
}

export{
    add_to_cart,
    delete_item,
    clear_cart,
    get_cart
}