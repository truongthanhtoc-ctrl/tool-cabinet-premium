const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const IS_SERVERLESS = Boolean(process.env.VERCEL) || process.env.SERVERLESS === 'true';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';
const MAX_UPLOAD_SIZE_BYTES = Number.parseInt(process.env.MAX_UPLOAD_SIZE_BYTES || `${5 * 1024 * 1024}`, 10);
const DEFAULT_CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'];
if (process.env.VERCEL_URL) {
    DEFAULT_CORS_ORIGINS.push(`https://${process.env.VERCEL_URL}`);
}
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || (IS_SERVERLESS ? '*' : DEFAULT_CORS_ORIGINS.join(',')))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const DATA_FILE = path.join(__dirname, 'quotes.json');
const memoryQuotes = [];
const canPersistQuotes = !IS_SERVERLESS;

let resend = null;
if (RESEND_API_KEY && NOTIFY_EMAIL) {
    resend = new Resend(RESEND_API_KEY);
    console.log('Email notifications enabled via Resend API');
} else {
    console.log('Email notifications disabled (missing RESEND_API_KEY or NOTIFY_EMAIL)');
}

const isAllowedOrigin = (origin) => {
    if (!origin) {
        return true;
    }

    if (ALLOWED_ORIGINS.includes('*')) {
        return true;
    }

    return ALLOWED_ORIGINS.includes(origin);
};

const readQuotes = () => {
    if (!canPersistQuotes) {
        return memoryQuotes;
    }

    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Error reading quotes file:', error);
    }

    return [];
};

const saveQuotes = (quotes) => {
    if (!canPersistQuotes) {
        memoryQuotes.length = 0;
        memoryQuotes.push(...quotes);
        return;
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(quotes, null, 2), 'utf8');
};

const sendEmailNotification = async (quote, attachment) => {
    if (!resend) {
        return false;
    }

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0056b3; border-bottom: 2px solid #0056b3; padding-bottom: 10px;">
                New Quote Request
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f5f5f5;">
                    <td style="padding: 10px; font-weight: bold; width: 120px;">Name:</td>
                    <td style="padding: 10px;">${quote.name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Email:</td>
                    <td style="padding: 10px;"><a href="mailto:${quote.email}">${quote.email}</a></td>
                </tr>
                <tr style="background: #f5f5f5;">
                    <td style="padding: 10px; font-weight: bold;">WhatsApp:</td>
                    <td style="padding: 10px;">${quote.whatsapp || 'Not provided'}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Company:</td>
                    <td style="padding: 10px;">${quote.company || 'Not provided'}</td>
                </tr>
                <tr style="background: #f5f5f5;">
                    <td style="padding: 10px; font-weight: bold; vertical-align: top;">Message:</td>
                    <td style="padding: 10px; white-space: pre-wrap;">${quote.message}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Time:</td>
                    <td style="padding: 10px;">${new Date(quote.createdAt).toLocaleString()}</td>
                </tr>
            </table>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
                Quote ID: ${quote.id}
            </p>
        </div>
    `;

    try {
        const payload = {
            from: 'Safewell Quote <noreply@jeresupplies.com>',
            to: [NOTIFY_EMAIL],
            subject: `New Quote Request from ${quote.name}`,
            html: htmlContent,
            reply_to: quote.email
        };

        if (attachment) {
            payload.attachments = [{
                filename: attachment.originalname,
                content: attachment.buffer
            }];
        }

        const { data, error } = await resend.emails.send(payload);

        if (error) {
            console.error('Resend API error:', JSON.stringify(error, null, 2));
            return false;
        }

        console.log('Email notification sent successfully. ID:', data.id);
        return true;
    } catch (error) {
        console.error('Email sending failed:', error.message);
        return false;
    }
};

app.use(cors({
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error('Not allowed by CORS'));
    },
    methods: ['POST', 'GET'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const allowedMimeTypes = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_UPLOAD_SIZE_BYTES
    },
    fileFilter: (_request, file, callback) => {
        if (allowedMimeTypes.has(file.mimetype)) {
            callback(null, true);
            return;
        }

        callback(new Error('Unsupported file type'));
    }
});

app.post('/api/quote', upload.single('attachment'), async (req, res, next) => {
    try {
        const name = (req.body.name || '').trim();
        const email = (req.body.email || '').trim();
        const company = (req.body.company || '').trim();
        const whatsapp = (req.body.whatsapp || '').trim();
        const message = (req.body.message || '').trim();
        const attachment = req.file;

        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, email, message'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        const quote = {
            id: Date.now().toString(),
            name,
            email,
            company,
            whatsapp,
            message,
            hasAttachment: Boolean(attachment),
            createdAt: new Date().toISOString(),
            status: 'new'
        };

        const quotes = readQuotes();
        quotes.push(quote);
        saveQuotes(quotes);

        console.log('New quote received:', quote.id);

        sendEmailNotification(quote, attachment).catch((error) => {
            console.error('Async email notification failed:', error.message);
        });

        res.json({
            success: true,
            message: 'Quote request received successfully',
            quoteId: quote.id
        });
    } catch (error) {
        next(error);
    }
});

const extractBearerToken = (authorizationHeader = '') => {
    if (!authorizationHeader.startsWith('Bearer ')) {
        return '';
    }

    return authorizationHeader.slice('Bearer '.length).trim();
};

app.get('/api/quotes', (req, res) => {
    if (!canPersistQuotes) {
        return res.status(501).json({
            success: false,
            error: 'Quote list is unavailable in serverless mode. Please connect a database if needed.'
        });
    }

    if (!ADMIN_API_KEY) {
        return res.status(403).json({
            success: false,
            error: 'Admin endpoint is disabled'
        });
    }

    const token = extractBearerToken(req.headers.authorization || '');
    if (!token || token !== ADMIN_API_KEY) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });
    }

    const quotes = readQuotes();
    res.json({
        success: true,
        count: quotes.length,
        quotes: quotes.slice().reverse()
    });
});

app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        emailEnabled: Boolean(resend)
    });
});

app.use((error, _req, res, _next) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            error: `Attachment exceeds ${Math.floor(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024))}MB limit`
        });
    }

    if (error.message === 'Unsupported file type') {
        return res.status(400).json({
            success: false,
            error: 'Unsupported attachment type. Please upload PDF, JPG, PNG, WEBP, DOC, or DOCX.'
        });
    }

    if (error.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            error: 'Origin not allowed'
        });
    }

    console.error('Unhandled API error:', error);
    return res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Quote API server running on port ${PORT}`);
        console.log(`POST /api/quote - Submit a quote`);
        console.log(`GET  /api/quotes - List quotes (requires Bearer token)`);
        console.log(`Allowed CORS origins: ${ALLOWED_ORIGINS.join(', ')}`);
        console.log(`Serverless mode: ${IS_SERVERLESS}`);
    });
}

module.exports = app;
