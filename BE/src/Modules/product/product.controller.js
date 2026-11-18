import { productModel } from "../../DB/Models/product.model.js";
import cloudinary from "../../Services/cloudinary.config.js"
import { brandModel } from "../../DB/Models/brand.model.js";
import { subcategoryModel } from "../../DB/Models/subcategory.model.js";
import { CategoryModel } from "../../DB/Models/category.model.js";
import { pageParams, pageInfo } from "../../Services/paginate.js";


// "a, b ,c" or ["a","b"] -> ["a","b","c"]  (multipart forms send arrays as text)
const toList = (value) => {
    if (value === undefined) return undefined
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
    return String(value).split(",").map((v) => v.trim()).filter(Boolean)
}


// product = one brand + one subcategory, and the brand must be linked to that subcategory
// returns { brand, subcategory } or { error }
const checkBrandAndSubcategory = async (brandId, subcategoryId) => {
    const [brand, subcategory] = await Promise.all([
        brandModel.findById(brandId).catch(() => null),
        subcategoryModel.findById(subcategoryId).catch(() => null)
    ])
    if (!subcategory) return { error: "please choose a valid subcategory" }
    if (!brand) return { error: "please choose a valid brand" }
    if (!brand.subcategoryId.some((id) => id.equals(subcategory._id))) {
        return { error: `"${brand.name}" is not in "${subcategory.name}", link it in Categories & brands first` }
    }
    return { brand, subcategory }
}

const MAX_GALLERY = 8
const visibleOnly = { visible: { $ne: false } }   // old products have no "visible" field -> treated as visible

const upload = async (file, name) => {
    const { secure_url, public_id } = await cloudinary.uploader.upload(file.path, {
        folder: `Ecommerce/Products/${name}/product picture`
    })
    return { secure_url, public_id }
}
const destroy = (public_id) => public_id ? cloudinary.uploader.destroy(public_id).catch(() => {}) : null

// store: only visible products, 20 per page (?page=1&limit=20)
// newest first; _id breaks ties so a product never shows on two pages
const get_all_product = async (req, res, next) => {
    try {
        const { page, limit, skip } = pageParams(req.query)
        const [products, total] = await Promise.all([
            productModel.find(visibleOnly).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).populate("brandId", "name"),
            productModel.countDocuments(visibleOnly)
        ])
        res.json({ message: "all products", products, ...pageInfo(page, limit, total) })
    } catch (error) {
        return next(error)
    }
}


const get_product=async(req,res,next)=>{
    try {
        const product=await productModel.findOne({ _id: req.params.id, ...visibleOnly }).populate("brandId", "name")
        if(!product) return res.status(404).json({ message: "product not found" });
        res.json({message:"here the product details", product})
    } catch (error) {
        return next(error)
    }
}


const add_product=async(req,res,next)=>{

    try {

        const { name, price, stock, description, size, color, brandId, subcategoryId } = req.body

        // multer .fields(): req.files.image = [cover], req.files.images = [gallery...]
        const cover = req.files?.image?.[0]
        const gallery = (req.files?.images ?? []).slice(0, MAX_GALLERY)
        if(!cover){
            return res.status(400).json({message:"product cover image is required"})
        }

        // every product has one brand and one subcategory (-> its category)
        const { brand, subcategory, error } = await checkBrandAndSubcategory(brandId, subcategoryId)
        if (error) {
            return res.status(400).json({ message: error })
        }

        const [coverImg, ...galleryImgs] = await Promise.all([cover, ...gallery].map((f) => upload(f, name)))

        const product = await productModel.create({
                name,
                price,
                stock,
                description,
                size: toList(size),
                color: toList(color),
                brandId: brand._id,
                subcategoryId: subcategory._id,
                categoryId: subcategory.CategoryId,
                available: Number(stock) > 0,
                visible: req.body.visible === undefined ? true : String(req.body.visible) === "true",
                userId:req.user._id,
                image: coverImg,
                images: galleryImgs
            })

    res.status(201).json({message:"product added successfully", product})
    } catch (error) {
       return next(error)
    }
}

// update any field that was sent (name, price, stock, description, size, color, available, image)
const update_product=async(req,res,next)=>{

    try {
        const product = req.product
        const { name, price, stock, description, size, color, available, brandId, subcategoryId } = req.body

        // brand and/or subcategory changed -> check the pair together
        if (brandId !== undefined || subcategoryId !== undefined) {
            const { brand, subcategory, error } = await checkBrandAndSubcategory(
                brandId ?? product.brandId,
                subcategoryId ?? product.subcategoryId
            )
            if (error) return res.status(400).json({ message: error })
            product.brandId = brand._id
            product.subcategoryId = subcategory._id
            product.categoryId = subcategory.CategoryId
        }

        if (name !== undefined) product.name = name
        if (price !== undefined) product.price = price
        if (description !== undefined) product.description = description
        if (size !== undefined) product.size = toList(size)
        if (color !== undefined) product.color = toList(color)
        if (stock !== undefined) {
            product.stock = stock
            product.available = Number(stock) > 0
        }
        if (available !== undefined) product.available = available === true || available === "true"
        if (req.body.visible !== undefined) product.visible = String(req.body.visible) === "true"

        // new cover image
        const cover = req.files?.image?.[0]
        if (cover) {
            const img = await upload(cover, product.name)
            await destroy(product.image?.public_id)
            product.image = img
        }

        // remove gallery pictures: removeImages = "id1,id2" (public_ids)
        const remove = toList(req.body.removeImages) ?? []
        if (remove.length) {
            await Promise.all(remove.map(destroy))
            product.images = (product.images ?? []).filter((i) => !remove.includes(i.public_id))
        }

        // add gallery pictures
        const room = MAX_GALLERY - (product.images?.length ?? 0)
        const extra = (req.files?.images ?? []).slice(0, Math.max(0, room))
        if (extra.length) {
            const uploaded = await Promise.all(extra.map((f) => upload(f, product.name)))
            product.images = [...(product.images ?? []), ...uploaded]
        }

        await product.save()

        res.json({message:"product has been updated successfully", product})

    } catch (error) {
        return next(error)
    }

}

const delete_product =async(req,res,next)=>{

    try {
        await Promise.all([req.product.image, ...(req.product.images ?? [])].map((i) => destroy(i?.public_id)))
        await productModel.deleteOne({_id:req.product._id})

        res.json({message:"product has been deleted successfully"})

    } catch (error) {
        return next(error)
    }

}


// GET /Product/Get_Products_By_Category/:id?page=1&sub=<subcategoryId>
// products keep their own categoryId / subcategoryId, so no brand lookups are needed
// sub (optional) = only the products of that one subcategory
const get_products_by_category=async(req,res,next)=>{
    try {
        const category = await CategoryModel.findById(req.params.id)
        if(!category) return res.status(404).json({ message: "category not found" })

        const subcategories = await subcategoryModel.find({ CategoryId: category._id }).sort({ name: 1 }).select("name slug")

        let filter = { categoryId: category._id, ...visibleOnly }
        if (req.query.sub) {
            const picked = subcategories.find((s) => String(s._id) === String(req.query.sub))
            if (!picked) return res.status(404).json({ message: "subcategory not found in this category" })
            filter = { subcategoryId: picked._id, ...visibleOnly }
        }

        const { page, limit, skip } = pageParams(req.query)
        const [products, total] = await Promise.all([
            productModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).populate("brandId", "name"),
            productModel.countDocuments(filter)
        ])

        res.json({ message: "category products", category, subcategories, products, ...pageInfo(page, limit, total) })
    } catch (error) {
        return next(error)
    }
}

// GET /admin/products  -> every product, hidden ones too (admin manage page)
const admin_all_products = async (req, res, next) => {
    try {
        const products = await productModel.find().sort({ createdAt: -1 }).populate("brandId", "name")
        res.json({ message: "all products", products })
    } catch (error) {
        return next(error)
    }
}

// PATCH /admin/products/:id/visibility  body: { visible: true/false }
const set_visibility = async (req, res, next) => {
    try {
        const product = await productModel.findByIdAndUpdate(
            req.params.id, { visible: req.body.visible === true || req.body.visible === "true" }, { returnDocument: "after" }
        ).populate("brandId", "name")
        if (!product) return res.status(404).json({ message: "product not found" })
        res.json({ message: product.visible ? "product is visible in the store" : "product is hidden from the store", product })
    } catch (error) {
        return next(error)
    }
}

export{
    admin_all_products,
    set_visibility,
    get_products_by_category,

    add_product,
    update_product,
    delete_product,
    get_all_product,
    get_product
}
