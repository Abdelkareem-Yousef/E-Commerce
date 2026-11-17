import { CategoryModel } from "../../DB/Models/category.model.js"
import { subcategoryModel } from "../../DB/Models/subcategory.model.js"
import { brandModel } from "../../DB/Models/brand.model.js"
import slugify from "slugify"

// find by id (admin page) or by name (old Postman requests)
const findSubcategory = ({ id, name }) =>
    id ? subcategoryModel.findById(id) : subcategoryModel.findOne({ name: String(name ?? "") })

const add_subcategory=async(req,res,next)=>{
    try {
        const {name,CategoryId}=req.body
        const checkCategory= await CategoryModel.findById(CategoryId);
        if(!checkCategory){
            // "return" was missing: the request kept going and crashed
            return res.status(400).json({message:"category not exist"})
        }
        const subcategory =await subcategoryModel.create({
            name,
            slug:slugify(String(name),"+"),
            CategoryId
        })

        res.status(201).json({message:"subcategory added successfully",subcategory})
    } catch (error) {
        return next(error)
    }
}

const get_subcategory=async(req,res,next)=>{
    try {
        const subcategory= await findSubcategory({ id: req.query.id, name: req.body?.name ?? req.query.name })
        if(!subcategory){
            return res.status(404).json({message:"subcategory not found"})
        }
        res.json({message:"subcategory got successfully",subcategory})
    } catch (error) {
        return next(error)
    }
}

const get_all_subcategory=async(req,res,next)=>{
    try {
        const subCategories=await subcategoryModel.find().sort({ name: 1 });
        res.json({message:"all subcategories",subCategories})
    } catch (error) {
        return  next(error)
    }
}

// body: { id or name, newname?, CategoryId? (move to another category) }
const update_subcategory=async(req,res,next)=>{
    try {
        const {newname,CategoryId}=req.body
        const subcategory= await findSubcategory(req.body)
        if(!subcategory){
            return res.status(404).json({message:"subcategory not found"})
        }

        if (newname) {
            subcategory.name=newname;
            subcategory.slug=slugify(String(newname),"+")
        }
        if (CategoryId) {
            const category = await CategoryModel.findById(CategoryId)
            if (!category) return res.status(400).json({ message: "category not exist" })
            subcategory.CategoryId = category._id
        }
        await subcategory.save();

        res.json({message:"subcategory updated successfully",subcategory})
    } catch (error) {
        return next(error)
    }
}

// body: { id or name } -> refused while it still has brands
const delete_subcategory=async(req,res,next)=>{
    try {
        const subcategory= await findSubcategory(req.body)
        if(!subcategory){
            return res.status(404).json({message:"subcategory not found"})
        }
        const children = await brandModel.countDocuments({ subcategoryId: subcategory._id })
        if (children) {
            return res.status(400).json({message:`"${subcategory.name}" still has ${children} brand${children === 1 ? "" : "s"}, delete or move them first`})
        }
        await subcategory.deleteOne()

        res.json({message:"subcategory deleted successfully"})
    } catch (error) {
        return next(error)
    }
}

export{
    add_subcategory,
    update_subcategory,
    delete_subcategory,
    get_subcategory,
    get_all_subcategory
}
