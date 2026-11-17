import { userModel } from "../../DB/Models/user.model.js"
import { productModel } from "../../DB/Models/product.model.js"


const get_wishlist = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.user._id).populate("wishlist")
        // drop products that were deleted or hidden by the admin
        const wishlist = (user.wishlist ?? []).filter((p) => p && p.visible !== false)
        res.json({ message: "wishlist", wishlist })
    } catch (error) {
        return next(error)
    }
}

const add_to_wishlist = async (req, res, next) => {
    try {
        const { productId } = req.body
        const product = await productModel.findById(productId)
        if (!product || product.visible === false) return res.status(404).json({ message: "product not found" })

        // $addToSet never adds the same product twice
        await userModel.updateOne({ _id: req.user._id }, { $addToSet: { wishlist: product._id } })
        res.json({ message: "added to wishlist" })
    } catch (error) {
        return next(error)
    }
}

const remove_from_wishlist = async (req, res, next) => {
    try {
        const { productId } = req.body
        await userModel.updateOne({ _id: req.user._id }, { $pull: { wishlist: productId } })
        res.json({ message: "removed from wishlist" })
    } catch (error) {
        return next(error)
    }
}

export {
    get_wishlist,
    add_to_wishlist,
    remove_from_wishlist
}
