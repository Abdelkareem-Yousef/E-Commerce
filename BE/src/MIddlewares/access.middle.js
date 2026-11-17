import { productModel } from "../DB/Models/product.model.js";


// finds the product by id (body.id or :id param) and puts it on req.product.
// Any admin can manage any product (authorization(["admin"]) runs before this).
export const access=async(req,res,next)=>{
    try {
        const id = req.params.id ?? req.body.id
        const product = await productModel.findById(id)

        if(!product){
            return res.status(404).json({message:"there is no  product"})
        }

        req.product=product;
        return next();

    } catch (error) {
        return next(error);
    }
}
