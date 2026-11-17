import { DBconnection } from "./DB/connection.js";
import { config } from "dotenv";
import express from "express";
import cors from "cors"
import * as allRoutes from "./index.routes.js"
import { stripe_webhook } from "./Modules/payment/payment.controller.js"
import { apiLimiter, authLimiter, couponLimiter, noSqlInjection } from "./MIddlewares/security.middle.js"

export const bootstrap=()=>{
    
    config()
    DBconnection()
    const app = express();

    // behind Render's proxy: use the visitor's real IP (needed for the request limits)
    if (process.env.NODE_ENV === "production") app.set("trust proxy", 1)

    // allowed frontends: FRONTEND_URL (can be several, comma separated) + localhost for development
    const allowedOrigins = [
        ...(process.env.FRONTEND_URL ?? "").split(",").map((u) => u.trim().replace(/\/$/, "")).filter(Boolean),
        "http://localhost:4200"
    ]

    app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type','x' ,'Authorization'],
    }));

    // Stripe webhook needs the RAW body to check the signature, so it comes BEFORE express.json()
    app.post("/payment/webhook", express.raw({ type: "application/json" }), stripe_webhook)

    // JSON bodies up to 100kb (big bodies are refused instead of slowing the server)
    app.use(express.json({ limit: "100kb" }))

    // security: refuse "$" / "." keys (NoSQL injection) and limit how many requests one IP can send
    app.use(noSqlInjection)
    app.use(apiLimiter)
    app.use(["/Login", "/Register", "/Reset_Password", "/Change_Password", "/Change_password_user", "/Delete_profile"], authLimiter)
    app.use("/apply_coupon", couponLimiter)

    app.use(allRoutes.AuthRouter)
    app.use(allRoutes.userRouter)
    app.use("/Product",allRoutes.productRouter)
    app.use(allRoutes.CategoryRouter)
    app.use(allRoutes.subcategoryRouter)
    app.use(allRoutes.brandRouter)
    app.use(allRoutes.cartrRouter)
    app.use(allRoutes.orderRouter)
    app.use(allRoutes.wishlistRouter)
    app.use(allRoutes.adminRouter)
    app.use(allRoutes.couponRouter)
    app.use(allRoutes.paymentRouter)

    app.use((err,req,res,next)=>{
        // duplicate unique field (e.g. product name already used)
        if(err.code===11000){
            return res.status(409).json({message:`${Object.keys(err.keyValue ?? {}).join(", ") || "value"} already exists`})
        }
        if(err.name==="ValidationError" || err.name==="CastError"){
            return res.status(400).json({message:err.message})
        }
        return res.status(500).json({message:err.message})
    })
    const port = process.env.PORT || 3000
    app.listen(port,()=>{
        console.log(`port ${port} is working`);
    })

}