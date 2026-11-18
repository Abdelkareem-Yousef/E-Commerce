// One-time update for the catalog rules (run it once: npm run migrate)
//  - category name: unique (unchanged)
//  - subcategory name: unique only inside its category
//  - brand: linked to MANY subcategories (subcategoryId becomes a list)
//  - product name: not unique; every product gets its own subcategoryId + categoryId
// Safe to run again: it only touches documents that still need it.
import { config } from "dotenv"
import mongoose from "mongoose"
import { CategoryModel } from "../DB/Models/category.model.js"
import { subcategoryModel } from "../DB/Models/subcategory.model.js"
import { brandModel } from "../DB/Models/brand.model.js"
import { productModel } from "../DB/Models/product.model.js"

config()

const run = async () => {
    await mongoose.connect(process.env.DB_CONNECTION)
    console.log("connected")

    // 1) brands: one subcategory id -> a list with that id
    const brands = await brandModel.collection.updateMany(
        { subcategoryId: { $exists: true, $not: { $type: "array" } } },
        [{ $set: { subcategoryId: { $cond: [{ $eq: ["$subcategoryId", null] }, [], ["$subcategoryId"]] } } }]
    )
    console.log(`brands converted to a list: ${brands.modifiedCount}`)

    // 2) products without a subcategory: take their brand's (first) subcategory
    const old = await productModel.collection
        .find({ $or: [{ subcategoryId: { $exists: false } }, { subcategoryId: null }] })
        .project({ brandId: 1, name: 1 })
        .toArray()
    let fixed = 0
    for (const p of old) {
        const brand = await brandModel.collection.findOne({ _id: p.brandId })
        const subId = brand?.subcategoryId?.[0]
        const sub = subId ? await subcategoryModel.collection.findOne({ _id: subId }) : null
        if (!sub) {
            console.log(`  ! "${p.name}" has no brand/subcategory, edit it in Manage products`)
            continue
        }
        await productModel.collection.updateOne({ _id: p._id }, { $set: { subcategoryId: sub._id, categoryId: sub.CategoryId } })
        fixed++
    }
    console.log(`products given a subcategory + category: ${fixed} of ${old.length}`)

    // 3) indexes: MongoDB keeps old unique indexes until they are dropped.
    //    syncIndexes() drops the ones the models no longer have (product name, subcategory name)
    //    and builds the new ones (subcategory name per category, ...)
    for (const model of [CategoryModel, subcategoryModel, brandModel, productModel]) {
        const dropped = await model.syncIndexes()
        console.log(`${model.collection.name}: indexes in sync${dropped.length ? `, dropped ${dropped.join(", ")}` : ""}`)
    }

    await mongoose.disconnect()
    console.log("done")
}

run().catch(async (error) => {
    // e.g. E11000 = two subcategories with the same name in one category: rename one, run again
    console.error("migration failed:", error.message)
    await mongoose.disconnect()
    process.exit(1)
})
