import {Router} from "express"
import * as SC from "./subcategory.controller.js"
import { authuntication } from "../../MIddlewares/authentication.middle.js";
import { authorization} from "../../MIddlewares/authorization.middle.js"


const router = Router();

router.post("/add_subcategory",authuntication,authorization(["admin"]),SC.add_subcategory)
router.patch("/update_subcategory",authuntication,authorization(["admin"]),SC.update_subcategory)
router.delete("/delete_subcategory",authuntication,authorization(["admin"]),SC.delete_subcategory)

router.get("/get_all_subcategory",SC.get_all_subcategory)
router.get("/get_subcategory",SC.get_subcategory)


export default router