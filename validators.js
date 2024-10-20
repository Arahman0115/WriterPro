import { body, validationResult } from 'express-validator';

export const validateSearchTerm = [
    body('searchTerm').trim().isLength({ min: 1 }).escape(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

export const validatePrompt = [
    body('prompt').trim().isLength({ min: 1 }).escape(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];
