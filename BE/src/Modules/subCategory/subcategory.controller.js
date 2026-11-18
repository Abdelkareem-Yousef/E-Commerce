import { CategoryModel } from "../../DB/Models/category.model.js"
import { subcategoryModel } from "../../DB/Models/subcategory.model.js"
import { brandModel } from "../../DB/Models/brand.model.js"
import { productModel } from "../../DB/Models/product.model.js"
import slugify from "slugify"

// the same name may exist in different categories, but only once inside one category
const nameTaken = (name, CategoryId, exceptId) =>
    subcategoryModel.exists({ name: String(name ?? "").trim(), CategoryId, ...(exceptId && { _id: { $ne: exceptId } }) })

// find by id (admin page) or by name (old Postman requests; first match if the name is in several categories)
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
        if (await nameTaken(name, checkCategory._id)) {
            return res.status(409).json({message:`"${name}" already exists in ${checkCategory.name}`})
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

        const oldCategory = String(subcategory.CategoryId)
        let category = null
        if (CategoryId) {
            category = await CategoryModel.findById(CategoryId)
            if (!category) return res.status(400).json({ message: "category not exist" })
            subcategory.CategoryId = category._id
        }
        if (newname) {
            subcategory.name=newname;
            subcategory.slug=slugify(String(newname),"+")
        }
        if ((newname || CategoryId) && await nameTaken(subcategory.name, subcategory.CategoryId, subcategory._id)) {
            const where = category ?? await CategoryModel.findById(subcategory.CategoryId)
            return res.status(409).json({ message: `"${subcategory.name}" already exists in ${where?.name ?? "this category"}` })
        }
        await subcategory.save();

        // moved to another category -> its products move with it
        if (String(subcategory.CategoryId) !== oldCategory) {
            await productModel.updateMany({ subcategoryId: subcategory._id }, { categoryId: subcategory.CategoryId })
        }

        res.json({message:"subcategory updated successfully",subcategory})
    } catch (error) {
        return next(error)
    }
}

// body: { id or name } -> refused while products are in it; brands just lose this subcategory
const delete_subcategory=async(req,res,next)=>{
    try {
        const subcategory= await findSubcategory(req.body)
        if(!subcategory){
            return res.status(404).json({message:"subcategory not found"})
        }
        const products = await productModel.countDocuments({ subcategoryId: subcategory._id })
        if (products) {
            return res.status(400).json({message:`"${subcategory.name}" still has ${products} product${products === 1 ? "" : "s"}, move or delete them first`})
        }
        // a brand linked ONLY to this subcategory would be left with none
        const lonely = await brandModel.countDocuments({ subcategoryId: { $all: [subcategory._id], $size: 1 } })
        if (lonely) {
            return res.status(400).json({message:`${lonely} brand${lonely === 1 ? " is" : "s are"} only in "${subcategory.name}", link ${lonely === 1 ? "it" : "them"} to another subcategory or delete ${lonely === 1 ? "it" : "them"} first`})
        }
        await brandModel.updateMany({ subcategoryId: subcategory._id }, { $pull: { subcategoryId: subcategory._id } })
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
