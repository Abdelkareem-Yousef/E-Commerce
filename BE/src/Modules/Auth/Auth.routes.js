import { Router } from "express";
import * as UC from "./Auth.controller.js"
import * as AuthMiddle from "../Auth/Auth.validation.js"
import { validation_middle } from './../../MIddlewares/Validation.middle.js';

const router=Router();
router.post("/Register",validation_middle(AuthMiddle.RegisterSchema),UC.Register)
router.post("/Login",validation_middle(AuthMiddle.LoginSchema),UC.Login)
router.get("/Activate_Account/:token",UC.Activate_Account)
router.post("/Reset_Password",validation_middle(AuthMiddle.ForgetPasswordSchema),UC.forget_password)
router.post("/Change_Password",validation_middle(AuthMiddle.ResetPasswordSchema),UC.Change_Password)
// sessions: the refresh token is in an httpOnly cookie, so these need no "x" header
router.post("/refresh",UC.Refresh)
router.post("/logout",UC.Logout)

export default router