

    export const validation_middle= (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
    });

    if (error) {
        return res.status(400).json({
        message: error.details?.map((d) => d.message).join(', ') ?? error.message,
        });
    }

    req.body = value;
    next();
    };