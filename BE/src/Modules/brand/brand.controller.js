import { brandModel } from "../../DB/Models/brand.model.js"
import { subcategoryModel } from "../../DB/Models/subcategory.model.js"
import { productModel } from "../../DB/Models/product.model.js"
import cloudinary from "../../Services/cloudinary.config.js"
import slugify from "slugify"
import mongoose from "mongoose"
import { catalogChanged } from "../../Services/cache.js"

// form data sends one id as text and many ids as an array; "a,b" also works
const toIds = (value) => {
    if (value === undefined || value === null || value === "") return []
    const list = Array.isArray(value) ? value : String(value).split(",")
    return [...new Set(list.map((v) => String(v).trim()).filter(Boolean))]
}

// every id must be a real subcategory -> returns the subcategories, or null if one is wrong
const findSubcategories = async (ids) => {
    if (!ids.length || ids.some((id) => !mongoose.isValidObjectId(id))) return null
    const subs = await subcategoryModel.find({ _id: { $in: ids } })
    return subs.length === ids.length ? subs : null
}

// find by id (admin page) or by name (old Postman requests)
const findBrand = ({ id, name }) =>
    id ? brandModel.findById(id) : brandModel.findOne({ name: String(name ?? "") })

const add_brand=async(req,res,next)=>{
    try {
        const {name}=req.body
        if(!req.file){
            return res.status(400).json({message:"brand logo is required"})
        }
        // brand names are unique: the same brand is linked to more subcategories, not added twice
        const existing = await brandModel.findOne({ name: String(name ?? "").trim() })
        if (existing) {
            return res.status(409).json({ message: `"${existing.name}" already exists, link it to this subcategory instead of adding it again` })
        }
        const subcategories = await findSubcategories(toIds(req.body.subcategoryId))
        if (!subcategories) {
            return res.status(400).json({ message: "choose at least one valid subcategory" })
        }
        const {secure_url,public_id}=await cloudinary.uploader.upload(req.file.path,{
            folder:`Ecommerce/${name}/brand logo`
        })

        const brand =await brandModel.create({
            name,
            slug:slugify(String(name),"+"),
            logo:{ secure_url, public_id },
            subcategoryId: subcategories.map((s) => s._id)
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
        // ?subcategoryId=... -> only the brands linked to that subcategory (product form)
        const filter = mongoose.isValidObjectId(req.query.subcategoryId) ? { subcategoryId: req.query.subcategoryId } : {}
        const brands=await brandModel.find(filter).sort({ name: 1 });
        res.json({message:"all brands",brands})
    } catch (error) {
        return  next(error)
    }
}

// body: { id or name, newname?, subcategoryId? (the FULL new list of subcategories), logo? (file) }
const update_brand=async(req,res,next)=>{
    try {
        const {newname}=req.body
        const brand= await findBrand(req.body)
        if(!brand){
            return res.status(404).json({message:"brand not found"})
        }

        if (newname) {
            brand.name=newname;
            brand.slug=slugify(String(newname),"+")
        }
        if (req.body.subcategoryId !== undefined) {
            const subcategories = await findSubcategories(toIds(req.body.subcategoryId))
            if (!subcategories) {
                return res.status(400).json({ message: "a brand needs at least one valid subcategory (to remove it everywhere, delete it)" })
            }
            const ids = subcategories.map((s) => s._id)
            // can't unlink a subcategory while this brand still has products in it
            const stuck = await productModel.countDocuments({ brandId: brand._id, subcategoryId: { $exists: true, $nin: ids } })
            if (stuck) {
                return res.status(400).json({ message: `${stuck} product${stuck === 1 ? "" : "s"} of "${brand.name}" ${stuck === 1 ? "is" : "are"} in a subcategory you removed, move or delete ${stuck === 1 ? "it" : "them"} first` })
            }
            brand.subcategoryId = ids
        }
        if (req.file) {
            const { secure_url, public_id } = await cloudinary.uploader.upload(req.file.path, {
                folder: `Ecommerce/${brand.name}/brand logo`
            })
            if (brand.logo?.public_id) await cloudinary.uploader.destroy(brand.logo.public_id).catch(() => {})
            brand.logo = { secure_url, public_id }
        }
        await brand.save();
        // product pages show the brand name -> refresh lists + this brand's product pages
        await catalogChanged(await productModel.find({ brandId: brand._id }).distinct("_id"))

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
