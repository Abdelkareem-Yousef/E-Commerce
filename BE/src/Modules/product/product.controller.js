import { productModel } from "../../DB/Models/product.model.js";
import cloudinary from "../../Services/cloudinary.config.js"
import { brandModel } from "../../DB/Models/brand.model.js";
import { subcategoryModel } from "../../DB/Models/subcategory.model.js";
import { CategoryModel } from "../../DB/Models/category.model.js";
import { pageParams, pageInfo } from "../../Services/paginate.js";
import { cached, listKey, productKey, catalogChanged } from "../../Services/cache.js";
import mongoose from "mongoose";


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
// cached: catalog:v<version>:products:p<page>:l<limit>
const get_all_product = async (req, res, next) => {
    try {
        const { page, limit, skip } = pageParams(req.query)
        const { products, total } = await cached(await listKey("products", `p${page}`, `l${limit}`), async () => {
            const [products, total] = await Promise.all([
                productModel.find(visibleOnly).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).populate("brandId", "name"),
                productModel.countDocuments(visibleOnly)
            ])
            return { products, total }
        })
        res.json({ message: "all products", products, ...pageInfo(page, limit, total) })
    } catch (error) {
        return next(error)
    }
}


// cached: product:<id>  (deleted with DEL when that product changes; "not found" is never cached)
const get_product=async(req,res,next)=>{
    try {
        const product=await cached(productKey(req.params.id), () =>
            productModel.findOne({ _id: req.params.id, ...visibleOnly }).populate("brandId", "name")
        )
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

    await catalogChanged()   // new product -> lists change
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
        await catalogChanged([product._id])

        res.json({message:"product has been updated successfully", product})

    } catch (error) {
        return next(error)
    }

}

const delete_product =async(req,res,next)=>{

    try {
        await Promise.all([req.product.image, ...(req.product.images ?? [])].map((i) => destroy(i?.public_id)))
        await productModel.deleteOne({_id:req.product._id})
        await catalogChanged([req.product._id])

        res.json({message:"product has been deleted successfully"})

    } catch (error) {
        return next(error)
    }

}


// GET /Product/Get_Products_By_Category/:id?page=1&sub=<subcategoryId>
// cached: catalog:v<version>:category:<id>:<sub or all>:p<page>:l<limit>
// products keep their own categoryId / subcategoryId, so no brand lookups are needed
// sub (optional) = only the products of that one subcategory
const get_products_by_category=async(req,res,next)=>{
    try {
        const { page, limit, skip } = pageParams(req.query)
        const sub = req.query.sub ? String(req.query.sub) : ""
        let notFound = null   // set on a miss when the category / subcategory doesn't exist (never cached)

        const data = await cached(await listKey("category", req.params.id, sub || "all", `p${page}`, `l${limit}`), async () => {
            const category = await CategoryModel.findById(req.params.id)
            if (!category) { notFound = "category not found"; return null }

            const subcategories = await subcategoryModel.find({ CategoryId: category._id }).sort({ name: 1 }).select("name slug")

            let filter = { categoryId: category._id, ...visibleOnly }
            if (sub) {
                const picked = subcategories.find((s) => String(s._id) === sub)
                if (!picked) { notFound = "subcategory not found in this category"; return null }
                filter = { subcategoryId: picked._id, ...visibleOnly }
            }

            const [products, total] = await Promise.all([
                productModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).populate("brandId", "name"),
                productModel.countDocuments(filter)
            ])
            return { category, subcategories, products, total }
        })
        if (!data) return res.status(404).json({ message: notFound })

        const { category, subcategories, products, total } = data
        res.json({ message: "category products", category, subcategories, products, ...pageInfo(page, limit, total) })
    } catch (error) {
        return next(error)
    }
}

// ================= search (Atlas Search, product name only) =================
// Atlas index "products_search" on the products collection (definition: BE/search-index.json)
//  - name: autocomplete ("iph" -> iPhone) + fuzzy text (typo "ipohne" -> iPhone)
//  - categoryId / brandId / price / visible / createdAt: filters and sorting inside the same $search
// If $search isn't available (not Atlas, or SEARCH_ENGINE=regex) a plain regex search is used instead.
const SEARCH_INDEX = process.env.SEARCH_INDEX || "products_search"
const MAX_QUERY = 60
const SORTS = {
    newest: { createdAt: -1, _id: -1 },
    price_asc: { price: 1, _id: 1 },
    price_desc: { price: -1, _id: -1 }
}

// user text inside a RegExp must be literal: "(a+)+" or ".*" must not become a pattern
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const oid = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(String(v)) : null)
const num = (v) => (v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Math.max(0, Number(v)))

// query string -> clean, safe search options
const readSearch = (query) => {
    const q = String(query.q ?? "").trim().slice(0, MAX_QUERY)
    let minPrice = num(query.minPrice)
    let maxPrice = num(query.maxPrice)
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice]
    const sort = SORTS[query.sort] ? query.sort : (q ? "relevance" : "newest")
    return { q, category: oid(query.category), brand: oid(query.brand), minPrice, maxPrice, sort }
}

// filters for normal (non-$search) queries
const mongoFilter = ({ q, category, brand, minPrice, maxPrice }) => ({
    ...visibleOnly,
    ...(q && { name: { $regex: escapeRegex(q), $options: "i" } }),
    ...(category && { categoryId: category }),
    ...(brand && { brandId: brand }),
    ...((minPrice !== null || maxPrice !== null) && {
        price: { ...(minPrice !== null && { $gte: minPrice }), ...(maxPrice !== null && { $lte: maxPrice }) }
    })
})

// the $search stage: name must match (autocomplete OR fuzzy text, whole-word matches rank higher),
// filters don't change the score, hidden products are left out
const searchStage = ({ q, category, brand, minPrice, maxPrice, sort }, { withCount = false } = {}) => {
    const filter = []
    if (category) filter.push({ equals: { path: "categoryId", value: category } })
    if (brand) filter.push({ equals: { path: "brandId", value: brand } })
    if (minPrice !== null || maxPrice !== null) {
        filter.push({ range: { path: "price", ...(minPrice !== null && { gte: minPrice }), ...(maxPrice !== null && { lte: maxPrice }) } })
    }
    return {
        $search: {
            index: SEARCH_INDEX,
            compound: {
                should: [
                    { autocomplete: { query: q, path: "name", fuzzy: { maxEdits: 1, prefixLength: 1 } } },
                    { text: { query: q, path: "name", fuzzy: { maxEdits: 2 }, score: { boost: { value: 3 } } } }
                ],
                minimumShouldMatch: 1,
                filter,
                mustNot: [{ equals: { path: "visible", value: false } }]
            },
            // Atlas sorts only on indexed fields (createdAt, price), so no _id tie-breaker here
            ...(sort !== "relevance" && { sort: sort === "newest" ? { createdAt: -1 } : { price: sort === "price_asc" ? 1 : -1 } }),
            ...(withCount && { count: { type: "total" } })
        }
    }
}

const useAtlas = (q) => Boolean(q) && process.env.SEARCH_ENGINE !== "regex"
// "$search is only allowed on Atlas" / missing index -> fall back to regex instead of failing
const isSearchUnavailable = (error) => /\$search|search index|SearchNotEnabled|not allowed|Unrecognized pipeline stage/i.test(error?.message ?? "")

const brandLookup = [
    { $lookup: { from: "brands", localField: "brandId", foreignField: "_id", as: "brandId", pipeline: [{ $project: { name: 1 } }] } },
    { $set: { brandId: { $first: "$brandId" } } }
]

// one page of results: { products, total }
const runSearch = async (opts, skip, limit) => {
    if (useAtlas(opts.q)) {
        try {
            const [res] = await productModel.aggregate([
                searchStage(opts, { withCount: true }),
                {
                    $facet: {
                        products: [{ $skip: skip }, { $limit: limit }, ...brandLookup],
                        meta: [{ $replaceWith: "$$SEARCH_META" }, { $limit: 1 }]
                    }
                }
            ])
            return { products: res?.products ?? [], total: res?.meta?.[0]?.count?.total ?? 0 }
        } catch (error) {
            if (!isSearchUnavailable(error)) throw error
            console.warn("Atlas Search unavailable, using regex search:", error.message)
        }
    }
    const filter = mongoFilter(opts)
    const sort = SORTS[opts.sort] ?? SORTS.newest
    const [products, total] = await Promise.all([
        productModel.find(filter).sort(sort).skip(skip).limit(limit).populate("brandId", "name"),
        productModel.countDocuments(filter)
    ])
    return { products, total }
}

// GET /Product/search?q=iph&category=&brand=&minPrice=&maxPrice=&sort=relevance|newest|price_asc|price_desc&page=1
// empty q = browse with filters only. Cached like every list (catalog version -> refreshed when products change)
const search_products = async (req, res, next) => {
    try {
        const opts = readSearch(req.query)
        const { page, limit, skip } = pageParams(req.query)
        const key = await listKey("search", encodeURIComponent(opts.q.toLowerCase()), opts.category ?? "-", opts.brand ?? "-",
            opts.minPrice ?? "-", opts.maxPrice ?? "-", opts.sort, `p${page}`, `l${limit}`)

        const { products, total } = await cached(key, () => runSearch(opts, skip, limit))
        res.json({ message: "search results", q: opts.q, sort: opts.sort, products, ...pageInfo(page, limit, total) })
    } catch (error) {
        return next(error)
    }
}

// GET /Product/search/suggest?q=iph -> top 5 { _id, name, price, image } for the navbar dropdown
const suggest_products = async (req, res, next) => {
    try {
        const opts = { ...readSearch({ q: req.query.q }), sort: "relevance" }
        if (opts.q.length < 2) return res.json({ suggestions: [] })

        const key = await listKey("suggest", encodeURIComponent(opts.q.toLowerCase()))
        const suggestions = await cached(key, async () => {
            const fields = { name: 1, price: 1, "image.secure_url": 1 }
            if (useAtlas(opts.q)) {
                try {
                    return await productModel.aggregate([searchStage(opts), { $limit: 5 }, { $project: fields }])
                } catch (error) {
                    if (!isSearchUnavailable(error)) throw error
                }
            }
            return productModel.find(mongoFilter(opts)).sort(SORTS.newest).limit(5).select(fields).lean()
        })
        res.json({ suggestions })
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
        await catalogChanged([product._id])   // shown / hidden in the store
        res.json({ message: product.visible ? "product is visible in the store" : "product is hidden from the store", product })
    } catch (error) {
        return next(error)
    }
}

export{
    search_products,
    suggest_products,
    admin_all_products,
    set_visibility,
    get_products_by_category,

    add_product,
    update_product,
    delete_product,
    get_all_product,
    get_product
}
