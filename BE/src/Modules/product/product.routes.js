import { noSqlInjection } from "../../MIddlewares/security.middle.js";
import { Router } from "express";
import * as UR from "./product.controller.js"
import { authorization } from "../../MIddlewares/authorization.middle.js";
import { authuntication } from "../../MIddlewares/authentication.middle.js";
import { access } from "../../MIddlewares/access.middle.js";
import { MulterWithCloud } from "../../Services/multerwithcloud.js";


const router = Router();

// cover image + up to 8 extra pictures
const productImages = () => MulterWithCloud().fields([{ name: "image", maxCount: 1 }, { name: "images", maxCount: 8 }])

router.post("/Add_Product",authuntication,authorization(["admin"]),productImages(),noSqlInjection,UR.add_product)
// multer must run BEFORE access, so req.body.id is read from the form data
router.post("/Update_Product",authuntication,authorization(["admin"]),productImages(),noSqlInjection,access,UR.update_product)
router.post("/Delete_Product", authuntication, authorization(["admin"]), access, UR.delete_product)
// search: navbar suggestions (top 5) + results page with filters
router.get("/search/suggest",UR.suggest_products)
router.get("/search",UR.search_products)
router.get("/Get_All_Product",UR.get_all_product)
router.get("/Get_Product/:id",UR.get_product)
router.get("/Get_Products_By_Category/:id",UR.get_products_by_category)


export default router
