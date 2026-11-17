import { userModel } from "../../DB/Models/user.model.js"
import bcrypt from "bcrypt"
import CryptoJS from "crypto-js"
import jwt from "jsonwebtoken"
import cloudinary from "../../Services/cloudinary.config.js"

const decryptPhone = (phone) => {
    if (!phone) return ""
    try {
        return CryptoJS.AES.decrypt(phone, process.env.PHONE_KEY).toString(CryptoJS.enc.Utf8)
    } catch {
        return ""
    }
}

const profileData = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    gender: user.gender,
    role: user.role,
    address: user.address,
    addresses: user.addresses ?? [],
    phone: decryptPhone(user.phone),
    image: user.image,
    createdAt: user.createdAt
})

const get_user_profile=async(req,res,next)=>{
    try {
        res.json({
            message:"user profile exist",
            user_data: profileData(req.user)
        })
    } catch (error) {
        return next(error)
    }
}

// update name / phone / address (all optional)
const update_profile=async(req,res,next)=>{
    try {
        const user = req.user
        const { name, phone, address } = req.body

        if (name !== undefined) {
            if (String(name).trim().length < 3) {
                return res.status(400).json({ message: "name must be at least 3 characters" })
            }
            user.name = String(name).trim()
        }
        if (phone !== undefined) {
            if (!/^\+?[0-9]{8,15}$/.test(phone)) {
                return res.status(400).json({ message: "invalid phone number" })
            }
            user.phone = CryptoJS.AES.encrypt(phone, process.env.PHONE_KEY).toString()
        }
        if (address !== undefined) {
            user.address = Array.isArray(address) ? address.filter(Boolean) : [address].filter(Boolean)
        }

        await user.save()
        res.json({ message: "profile updated successfully", user_data: profileData(user) })
    } catch (error) {
        return next(error)
    }
}


const upload_profile_picture=async(req,res,next)=>{
    try {
            const user=req.user
            if(!req.file){
                return res.status(400).json({message:"image is required"})
            }
            const {secure_url,public_id}=await cloudinary.uploader.upload(req.file.path,{
                folder:`Ecommerce/${user._id}/profile picture`
            })

            if (user.image?.public_id) {
                await cloudinary.uploader.destroy(user.image.public_id).catch(() => {})
            }

            user.image={
                secure_url,
                public_id
            }
            await user.save()   // was missing, so the picture was never stored

            res.json({message:"profile picture updated successfully",user_data: profileData(user)})

    } catch (error) {
        return next(error)
    }
}


// const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
const passwordRegex = /^.{8,}$/;

const change_password_user=async(req,res,next)=>{
    try {
        const {newpassword,confirmpassword}=req.body;

        if(newpassword!=confirmpassword){
            return res.status(400).json({message:"two passwords not the same"})
        }

        if(req.body.password==newpassword){
            return res.status(400).json({message:"password can't be the same as old one"})
        }

        if(!passwordRegex.test(newpassword)){
            return res.status(400).json({message:"password must be at least 8 characters"})
        }
        const hashedPassword=await bcrypt.hash(newpassword,+process.env.Salt_Rounds)

        await userModel.updateOne({_id:req.user._id},{password:hashedPassword})
        res.json({message:"password changed successfully"})

    } catch (error) {
        return next(error)
    }
}

const delete_profile=async(req,res,next)=>{
    try {

        await userModel.deleteOne({
            _id:req.user._id
        })

        res.json({message:"profile deleted successfully"})

    } catch (error) {
        return next(error)
    }

}


// ---------- address book ----------

const phoneRegex = /^\+?[0-9]{8,15}$/
const addressFields = ["label", "phone", "city", "area", "street", "building", "notes"]

const cleanAddress = (body) => {
    const a = {}
    for (const k of addressFields) if (body[k] !== undefined) a[k] = String(body[k]).trim()
    return a
}

const validateAddress = (a, partial = false) => {
    if (a.label !== undefined && (!a.label || a.label.length > 30)) return "address name must be 1-30 characters"
    if (!partial || a.city !== undefined) if (!a.city) return "city is required"
    if (!partial || a.street !== undefined) if (!a.street) return "street is required"
    if (!partial || a.phone !== undefined) if (!phoneRegex.test(a.phone ?? "")) return "enter a valid phone number"
    return null
}

// only one default address
const setDefault = (user, id) => {
    user.addresses.forEach((a) => { a.isDefault = a._id.toString() === id.toString() })
}

const get_addresses = async (req, res, next) => {
    try {
        res.json({ message: "addresses", addresses: req.user.addresses ?? [] })
    } catch (error) {
        return next(error)
    }
}

const add_address = async (req, res, next) => {
    try {
        const user = req.user
        const a = cleanAddress(req.body)
        const problem = validateAddress(a)
        if (problem) return res.status(400).json({ message: problem })
        if (user.addresses.length >= 10) return res.status(400).json({ message: "you can save up to 10 addresses" })

        user.addresses.push(a)
        const added = user.addresses[user.addresses.length - 1]
        if (req.body.isDefault || user.addresses.length === 1) setDefault(user, added._id)
        await user.save()
        res.status(201).json({ message: "address added", address: added, addresses: user.addresses })
    } catch (error) {
        return next(error)
    }
}

const update_address = async (req, res, next) => {
    try {
        const user = req.user
        const address = user.addresses.id(req.params.id)
        if (!address) return res.status(404).json({ message: "address not found" })

        const a = cleanAddress(req.body)
        const problem = validateAddress(a, true)
        if (problem) return res.status(400).json({ message: problem })

        Object.assign(address, a)
        if (req.body.isDefault) setDefault(user, address._id)
        await user.save()
        res.json({ message: "address updated", addresses: user.addresses })
    } catch (error) {
        return next(error)
    }
}

const delete_address = async (req, res, next) => {
    try {
        const user = req.user
        const address = user.addresses.id(req.params.id)
        if (!address) return res.status(404).json({ message: "address not found" })

        const wasDefault = address.isDefault
        address.deleteOne()
        if (wasDefault && user.addresses.length) user.addresses[0].isDefault = true
        await user.save()
        res.json({ message: "address deleted", addresses: user.addresses })
    } catch (error) {
        return next(error)
    }
}

export{
    get_addresses,
    add_address,
    update_address,
    delete_address,
    cleanAddress,
    validateAddress,

    get_user_profile,
    update_profile,
    change_password_user,
    delete_profile,
    upload_profile_picture

}
