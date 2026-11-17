import { Router } from "express";
import * as WC from "./wishlist.controller.js"
import { authuntication } from "../../MIddlewares/authentication.middle.js";
import { authorization } from "../../MIddlewares/authorization.middle.js";

const router = Router()

router.get("/get_wishlist", authuntication, authorization(["user"]), WC.get_wishlist)
router.post("/add_to_wishlist", authuntication, authorization(["user"]), WC.add_to_wishlist)
router.delete("/remove_from_wishlist", authuntication, authorization(["user"]), WC.remove_from_wishlist)

export default router
