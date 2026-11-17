import Joi from "joi";


export const RegisterSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(3)
        .max(30)
        .required()
        .messages({
        'string.empty': 'Name is required',
        'string.min': 'Name must be at least 3 characters',
        'string.max': 'Name must be at most 30 characters',
        'any.required': 'Name is required',
        }),

    email: Joi.string()
        .trim()
        .lowercase()
        .email()
        .max(254)
        .required()
        .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required',
        }),

    password: Joi.string()
        .min(8)
        .max(128)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
        .required()
        .messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base':
            'Password must contain an uppercase letter, a lowercase letter, and a number',
        'any.required': 'Password is required',
        }),

    confirmPassword: Joi.any()
        .valid(Joi.ref('password'))
        .required()
        .messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Please confirm your password',
        }),

    phone:
        Joi.string()
            .trim()
            .pattern(/^\+?[0-9]{8,15}$/)
            .messages({ 'string.pattern.base': 'Each phone number must be 8-15 digits' })
       ,

    gender: Joi.string()
        .trim()
        .lowercase()
        .valid('male', 'female')
        .messages({ 'any.only': 'Gender must be male or female' }),
    }).options({ abortEarly: false, stripUnknown: true });

export const LoginSchema=Joi.object({

email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } }) // or remove this option to validate TLDs
    .max(254)
    .required()
    .messages({
    'string.empty': 'Email is required',
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required',
    }),

password: Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 8 characters',
    'any.required': 'Password is required',
    }),

// was missing, so stripUnknown removed it and "remember me" never worked
remember: Joi.boolean().default(false),
}).options({ abortEarly: false, stripUnknown: true });

export const ForgetPasswordSchema = Joi.object({
    email: Joi.string()
        .trim()
        .lowercase()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required',
        }),
}).options({ abortEarly: false, stripUnknown: true });

export const ResetPasswordSchema = Joi.object({
    token: Joi.string().required().messages({ 'any.required': 'Reset link is invalid' }),

    newpassword: Joi.string()
        .min(8)
        .max(128)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
        .required()
        .messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base':
            'Password must contain an uppercase letter, a lowercase letter, and a number',
        'any.required': 'Password is required',
        }),

    confirmPassword: Joi.any()
        .valid(Joi.ref('newpassword'))
        .required()
        .messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Please confirm your password',
        }),
}).options({ abortEarly: false, stripUnknown: true });