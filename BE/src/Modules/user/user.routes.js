import { noSqlInjection } from "../../MIddlewares/security.middle.js";
import { Router } from "express";
import * as UC from "./user.controller.js"
import {authuntication} from "../../MIddlewares/authentication.middle.js"
import { authorization } from "../../MIddlewares/authorization.middle.js";
import { reathunticate } from "../../MIddlewares/reauthanticate.middle.js";
import { MulterWithCloud } from "../../Services/multerwithcloud.js";

const router=Router();
// both users and admins have a profile page
router.get("/Profile",authuntication,authorization(["user","admin"]),UC.get_user_profile)
router.patch("/Update_profile",authuntication,authorization(["user","admin"]),UC.update_profile)
router.post("/Change_password_user",authuntication,reathunticate,UC.change_password_user)
router.post("/Delete_profile",authuntication,reathunticate,UC.delete_profile)
router.post("/Upload_profile",authuntication,MulterWithCloud().single("image"),noSqlInjection,UC.upload_profile_picture)

// address book (customers)
router.get("/addresses",authuntication,authorization(["user"]),UC.get_addresses)
router.post("/addresses",authuntication,authorization(["user"]),UC.add_address)
router.patch("/addresses/:id",authuntication,authorization(["user"]),UC.update_address)
router.delete("/addresses/:id",authuntication,authorization(["user"]),UC.delete_address)
export default router
