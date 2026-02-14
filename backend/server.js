// Emergency SOS Web Application - Backend Server
// Node.js + Express + MongoDB + Twilio

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Twilio Client
let twilioClient;
let twilioPhoneNumber;

function initTwilio() {
    if (process.env.TWILIO_ACCOUNT_SID && 
        process.env.TWILIO_AUTH_TOKEN && 
        process.env.TWILIO_PHONE_NUMBER &&
        !process.env.TWILIO_ACCOUNT_SID.startsWith('your_')) {
        twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
        console.log('✅ Twilio initialized successfully');
    } else {
        console.log('⚠️  Twilio credentials not configured. SMS will be simulated.');
    }
}

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emergency_sos')
    .then(() => {
        console.log('✅ MongoDB connected successfully');
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
    });

// ============ MONGOOSE MODELS ============

// SOS Schema
const sosSchema = new mongoose.Schema({
    lat: {
        type: Number,
        required: true
    },
    lng: {
        type: Number,
        required: true
    },
    time: {
        type: Date,
        default: Date.now
    }
});

const SOS = mongoose.model('SOS', sosSchema);

// Contact Schema
const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Contact = mongoose.model('Contact', contactSchema);

// ============ API ROUTES ============

// POST /api/contacts - Add or sync contacts
app.post('/api/contacts', async (req, res) => {
    try {
        const { contacts } = req.body;
        
        if (!contacts || !Array.isArray(contacts)) {
            return res.status(400).json({ error: 'Invalid contacts data' });
        }

        console.log('📥 Received contacts:', contacts);

        const savedContacts = [];
        
        for (const contact of contacts) {
            // Check if contact already exists (by phone number)
            let existingContact = await Contact.findOne({ phone: contact.phone });
            
            if (existingContact) {
                // Update name if exists
                existingContact.name = contact.name;
                await existingContact.save();
                savedContacts.push(existingContact);
                console.log(`✅ Updated contact: ${contact.name}`);
            } else {
                // Create new contact
                const newContact = new Contact({
                    name: contact.name,
                    phone: contact.phone
                });
                await newContact.save();
                savedContacts.push(newContact);
                console.log(`✅ Created contact: ${contact.name}`);
            }
        }

        res.json({ 
            message: 'Contacts saved successfully',
            contacts: savedContacts
        });
    } catch (error) {
        console.error('❌ Error saving contacts:', error);
        res.status(500).json({ error: 'Failed to save contacts' });
    }
});

// GET /api/contacts - Get all contacts
app.get('/api/contacts', async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        res.json(contacts);
    } catch (error) {
        console.error('❌ Error fetching contacts:', error);
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
});

// POST /api/sos - Send SOS
app.post('/api/sos', async (req, res) => {
    try {
        const { lat, lng, contacts } = req.body;

        console.log('🆘 SOS RECEIVED!');
        console.log('📍 Location:', lat, lng);
        console.log('📱 Contacts:', contacts);

        // Validate input
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Location coordinates required' });
        }

        // Save SOS to database
        const sos = new SOS({
            lat: parseFloat(lat),
            lng: parseFloat(lng)
        });
        await sos.save();
        console.log('✅ SOS saved to database');

        // Get all contacts from database (fallback to provided contacts)
        let contactsToNotify = contacts;
        
        if (!contactsToNotify || contactsToNotify.length === 0) {
            contactsToNotify = await Contact.find();
        }

        console.log(`📤 Sending SMS to ${contactsToNotify.length} contacts...`);

        // Send SMS to all contacts
        const googleMapsLink = `https://maps.google.com/?q=${lat},${lng}`;
        const sosMessage = `🚨 EMERGENCY SOS! Location: ${googleMapsLink}`;

        const smsResults = [];

        for (const contact of contactsToNotify) {
            const phone = contact.phone;
            const name = contact.name || 'Emergency Contact';

            try {
                if (twilioClient) {
                    // Send actual SMS via Twilio
                    const result = await twilioClient.messages.create({
                        body: sosMessage,
                        from: twilioPhoneNumber,
                        to: phone
                    });
                    console.log(`✅ SMS sent to ${name} (${phone}): ${result.sid}`);
                    smsResults.push({ 
                        phone, 
                        name, 
                        status: 'sent', 
                        sid: result.sid 
                    });
                } else {
                    // Simulate SMS (no Twilio credentials)
                    console.log(`📱 [SIMULATED] SMS to ${name} (${phone}): ${sosMessage}`);
                    smsResults.push({ 
                        phone, 
                        name, 
                        status: 'simulated',
                        message: sosMessage
                    });
                }
            } catch (smsError) {
                console.error(`❌ Failed to send SMS to ${name} (${phone}):`, smsError.message);
                smsResults.push({ 
                    phone, 
                    name, 
                    status: 'failed',
                    error: smsError.message 
                });
            }
        }

        res.json({
            message: 'SOS processed successfully',
            sos: {
                lat,
                lng,
                time: sos.time
            },
            smsResults,
            googleMapsLink
        });

    } catch (error) {
        console.error('❌ Error processing SOS:', error);
        res.status(500).json({ error: 'Failed to process SOS' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Start server
app.listen(PORT, () => {
    console.log('\n🚨 Emergency SOS Server Running 🚨');
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`🗄️  MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/emergency_sos'}`);
    initTwilio();
    console.log('👂 Waiting for SOS requests...\n');
});
