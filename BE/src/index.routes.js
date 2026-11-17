import AuthRouter from "../src/Modules/Auth/Auth.routes.js"
import userRouter from "../src/Modules/user/user.routes.js"
import  productRouter from "../src/Modules/product/product.routes.js"
import CategoryRouter from "../src/Modules/Category/Category.routes.js"
import subcategoryRouter from "../src/Modules/subCategory/subcategory.routes.js"
import brandRouter from "../src/Modules/brand/brand.routes.js"
import cartrRouter from "../src/Modules/Cart/cart.routes.js"
import orderRouter from "../src/Modules/Order/order.routes.js"
import wishlistRouter from "../src/Modules/wishlist/wishlist.routes.js"
import adminRouter from "../src/Modules/admin/admin.routes.js"
import couponRouter from "../src/Modules/coupon/coupon.routes.js"
import paymentRouter from "../src/Modules/payment/payment.routes.js"






export{
    AuthRouter,
    userRouter,
    productRouter,
    CategoryRouter,
    subcategoryRouter,
    brandRouter,
    cartrRouter,
    orderRouter,
    wishlistRouter,
    adminRouter,
    couponRouter,
    paymentRouter
}