import { CategoryModel } from "../../DB/Models/category.model.js"
import { subcategoryModel } from "../../DB/Models/subcategory.model.js"
import cloudinary from "../../Services/cloudinary.config.js"
import slugify from "slugify"

// find by id (admin page) or by name (old Postman requests)
const findCategory = ({ id, name }) =>
    id ? CategoryModel.findById(id) : CategoryModel.findOne({ name: String(name ?? "") })

const add_category=async(req,res,next)=>{
    try {
        const {name}=req.body
        if(!req.file){
            return res.status(400).json({message:"category image is required"})
        }
        const {secure_url,public_id}=await cloudinary.uploader.upload(req.file.path,{
            folder:`Ecommerce/${name}/category picture`
        })

        const category =await CategoryModel.create({
            name,
            slug:slugify(String(name),"+"),
            image:{ secure_url, public_id }
        })
        res.status(201).json({message:"category added successfully",category})
    } catch (error) {
        return next(error)
    }
}

const get_category=async(req,res,next)=>{
    try {
        const category= await findCategory({ id: req.query.id, name: req.body?.name ?? req.query.name })
        if(!category){
            return res.status(404).json({message:"category not found"})
        }
        res.json({message:"category got successfully",category})
    } catch (error) {
        return next(error)
    }
}

const get_all_category=async(req,res,next)=>{
    try {
        const Categories=await CategoryModel.find().sort({ name: 1 });
        res.json({message:"all categories",Categories})
    } catch (error) {
        return  next(error)
    }
}

// body: { id or name, newname?, image? (file) }
const update_category=async(req,res,next)=>{
    try {
        const {newname}=req.body
        const category= await findCategory(req.body)
        if(!category){
            return res.status(404).json({message:"category not found"})
        }

        if (newname) {
            category.name=newname;
            category.slug=slugify(String(newname),"+")
        }
        if (req.file) {
            const { secure_url, public_id } = await cloudinary.uploader.upload(req.file.path, {
                folder: `Ecommerce/${category.name}/category picture`
            })
            if (category.image?.public_id) await cloudinary.uploader.destroy(category.image.public_id).catch(() => {})
            category.image = { secure_url, public_id }
        }
        await category.save();

        res.json({message:"category updated successfully",category})
    } catch (error) {
        return next(error)
    }
}

// body: { id or name } -> refused while it still has subcategories
const delete_category=async(req,res,next)=>{
    try {
        const category= await findCategory(req.body)
        if(!category){
            return res.status(404).json({message:"category not found"})
        }
        const children = await subcategoryModel.countDocuments({ CategoryId: category._id })
        if (children) {
            return res.status(400).json({message:`"${category.name}" still has ${children} subcategor${children === 1 ? "y" : "ies"}, delete or move them first`})
        }
        if (category.image?.public_id) await cloudinary.uploader.destroy(category.image.public_id).catch(() => {})
        await category.deleteOne()

        res.json({message:"category deleted successfully"})
    } catch (error) {
        return next(error)
    }
}

export{
    add_category,
    update_category,
    delete_category,
    get_category,
    get_all_category
}
