import {Router} from "express"
import { noSqlInjection } from "../../MIddlewares/security.middle.js";
import * as BC from "./brand.controller.js"
import { MulterWithCloud } from "../../Services/multerwithcloud.js";
import { authuntication } from "../../MIddlewares/authentication.middle.js";
import { authorization} from "../../MIddlewares/authorization.middle.js"


const router = Router();

router.post("/add_brand",authuntication,authorization(["admin"]),MulterWithCloud().single("logo"),noSqlInjection,BC.add_brand)
// logo is optional when updating
router.patch("/update_brand",authuntication,authorization(["admin"]),MulterWithCloud().single("logo"),noSqlInjection,BC.update_brand)
router.delete("/delete_brand",authuntication,authorization(["admin"]),BC.delete_brand)

router.get("/get_all_brand",BC.get_all_brand)
router.get("/get_brand",BC.get_brand)


export default router