import { brandModel } from "../../DB/Models/brand.model.js"
import { subcategoryModel } from "../../DB/Models/subcategory.model.js"
import { productModel } from "../../DB/Models/product.model.js"
import cloudinary from "../../Services/cloudinary.config.js"
import slugify from "slugify"

// find by id (admin page) or by name (old Postman requests)
const findBrand = ({ id, name }) =>
    id ? brandModel.findById(id) : brandModel.findOne({ name: String(name ?? "") })

const add_brand=async(req,res,next)=>{
    try {
        const {name,subcategoryId}=req.body
        if(!req.file){
            return res.status(400).json({message:"brand logo is required"})
        }
        const subcategory = await subcategoryModel.findById(subcategoryId)
        if (!subcategory) {
            return res.status(400).json({ message: "subcategory not exist" })
        }
        const {secure_url,public_id}=await cloudinary.uploader.upload(req.file.path,{
            folder:`Ecommerce/${name}/brand logo`
        })

        const brand =await brandModel.create({
            name,
            slug:slugify(String(name),"+"),
            logo:{ secure_url, public_id },
            subcategoryId: subcategory._id
        })

        res.status(201).json({message:"brand added successfully",brand})
    } catch (error) {
        return next(error)
    }
}

const get_brand=async(req,res,next)=>{
    try {
        const brand= await findBrand({ id: req.query.id, name: req.body?.name ?? req.query.name })
        if(!brand){
            return res.status(404).json({message:"brand not found"})
        }
        res.json({message:"brand got successfully",brand})
    } catch (error) {
        return next(error)
    }
}

const get_all_brand=async(req,res,next)=>{
    try {
        const brands=await brandModel.find().sort({ name: 1 });
        res.json({message:"all brands",brands})
    } catch (error) {
        return  next(error)
    }
}

// body: { id or name, newname?, subcategoryId? (move), logo? (file) }
const update_brand=async(req,res,next)=>{
    try {
        const {newname,subcategoryId}=req.body
        const brand= await findBrand(req.body)
        if(!brand){
            return res.status(404).json({message:"brand not found"})
        }

        if (newname) {
            brand.name=newname;
            brand.slug=slugify(String(newname),"+")
        }
        if (subcategoryId) {
            const subcategory = await subcategoryModel.findById(subcategoryId)
            if (!subcategory) return res.status(400).json({ message: "subcategory not exist" })
            brand.subcategoryId = subcategory._id
        }
        if (req.file) {
            const { secure_url, public_id } = await cloudinary.uploader.upload(req.file.path, {
                folder: `Ecommerce/${brand.name}/brand logo`
            })
            if (brand.logo?.public_id) await cloudinary.uploader.destroy(brand.logo.public_id).catch(() => {})
            brand.logo = { secure_url, public_id }
        }
        await brand.save();

        res.json({message:"brand updated successfully",brand})
    } catch (error) {
        return next(error)
    }
}

// body: { id or name } -> refused while products still use it
const delete_brand=async(req,res,next)=>{
    try {
        const brand= await findBrand(req.body)
        if(!brand){
            return res.status(404).json({message:"brand not found"})
        }
        const products = await productModel.countDocuments({ brandId: brand._id })
        if (products) {
            return res.status(400).json({message:`"${brand.name}" is used by ${products} product${products === 1 ? "" : "s"}, change their brand or delete them first`})
        }
        if (brand.logo?.public_id) await cloudinary.uploader.destroy(brand.logo.public_id).catch(() => {})
        await brand.deleteOne()

        res.json({message:"brand deleted successfully"})
    } catch (error) {
        return next(error)
    }
}

export{
    add_brand,
    update_brand,
    delete_brand,
    get_brand,
    get_all_brand
}
