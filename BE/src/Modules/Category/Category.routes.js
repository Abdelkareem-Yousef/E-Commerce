import {Router} from "express"
import { noSqlInjection } from "../../MIddlewares/security.middle.js";
import * as CC from "./Category.controller.js"
import { MulterWithCloud } from "../../Services/multerwithcloud.js";
import { authuntication } from "../../MIddlewares/authentication.middle.js";
import { authorization} from "../../MIddlewares/authorization.middle.js"

const router = Router();

router.post("/add_category",authuntication,authorization(["admin"]),MulterWithCloud().single("image"),noSqlInjection,CC.add_category)
// image is optional when updating
router.patch("/update_category",authuntication,authorization(["admin"]),MulterWithCloud().single("image"),noSqlInjection,CC.update_category)
router.delete("/delete_category",authuntication,authorization(["admin"]),CC.delete_category)

router.get("/get_all_category",CC.get_all_category)
router.get("/get_category",CC.get_category)


export default router