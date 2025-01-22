// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const XLSX = require('xlsx');
// const { Client, LocalAuth } = require('whatsapp-web.js');
// const QRCode = require('qrcode');

// const app = express();
// const upload = multer({ dest: 'uploads/' }); // Upload destination folder

// // Serve static files
// app.use(express.static(path.join(__dirname)));

// // Helper function to introduce delay
// const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// // Function to replace placeholders in the message
// const replacePlaceholders = (template, contact, dynamicColumnsMap) => {
//     let message = template;
//     for (const [placeholder, column] of Object.entries(dynamicColumnsMap)) {
//         const value = contact[column] || ''; // Get the value from the contact or use empty string if undefined
//         message = message.replace(`{${placeholder}}`, value);
//     }
//     return message;
// };

// // Endpoint to handle form submission and file upload
// app.post('/send-messages', upload.single('file'), async (req, res) => {
//     const filePath = req.file.path;  // Path to the uploaded file
//     const mobileColumn = req.body.mobile_column;  // Column for mobile numbers
//     const dynamicColumns = req.body.dynamic_columns || '';  // Column mappings for placeholders

//     const messageTemplate = req.body.message;  // Message template

//     // Parse dynamic columns input into an object mapping
//     const dynamicColumnsMap = {};
//     dynamicColumns.split(',').forEach(pair => {
//         const [placeholder, column] = pair.split(':');
//         if (placeholder && column) {
//             dynamicColumnsMap[placeholder.trim()] = column.trim();
//         }
//     });

//     // Read the uploaded Excel or CSV file
//     const workbook = XLSX.readFile(filePath);
//     const sheetName = workbook.SheetNames[0];
//     const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

//     // Initialize WhatsApp client
//     const client = new Client({
//         authStrategy: new LocalAuth()
//     });

//     // Generate QR code for WhatsApp authentication
//     client.on('qr', async (qr) => {
//         console.log('QR Code received, generating...');
//         const qrImage = await QRCode.toDataURL(qr);  // Convert QR code to base64 image
//         res.json({ status: 'qr', qrImage });  // Send QR code to frontend
//     });

//     // When WhatsApp client is ready
//     client.on('ready', async () => {
//         console.log('Client is ready!');

//         // Loop through the contacts and send messages with a delay
//         for (const contact of sheet) {
//             const phoneNumber = contact[mobileColumn].toString().replace(/[^\d]/g, '') + '@c.us';  // Format the phone number
            
//             // Customize message by replacing dynamic placeholders
//             const message = replacePlaceholders(messageTemplate, contact, dynamicColumnsMap);

//             try {
//                 await client.sendMessage(phoneNumber, message);
//                 console.log(`Message sent to ${contact[mobileColumn]}`);
//             } catch (error) {
//                 console.error(`Failed to send message to ${contact[mobileColumn]}:`, error);
//             }

//             // Wait for 8 seconds before sending the next message
//             await delay(8000);
//         }

//         res.json({ status: 'success', message: 'Messages sent successfully!' });
//     });

//     client.initialize();
// });

// // Start the server
// app.listen(3000, () => {
//     console.log('Server running on http://localhost:3000');
// });

// const cors = require('cors');

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const EventEmitter = require('events');

const app = express();
const upload = multer({ dest: 'uploads/' }); // Upload destination folder

const progressEmitter = new EventEmitter();

// Serve static files
app.use(express.static(path.join(__dirname)));

// app.use(cors());

// Helper function to introduce delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to replace placeholders in the message
const replacePlaceholders = (template, contact, dynamicColumnsMap) => {
    let message = template;
    for (const [placeholder, column] of Object.entries(dynamicColumnsMap)) {
        const value = contact[column] || ''; // Get the value from the contact or use empty string if undefined
        message = message.replace(`{${placeholder}}`, value);
    }
    return message;
};

// Endpoint to handle progress updates
app.get('/progress', (req, res) => {
    progressEmitter.once('update', (data) => {
        res.json(data);
    });
});

// Endpoint to handle form submission and file upload
app.post('/send-messages', upload.single('file'), async (req, res) => {
    const filePath = req.file.path;  // Path to the uploaded file
    const mobileColumn = req.body.mobile_column;  // Column for mobile numbers
    const dynamicColumns = req.body.dynamic_columns || '';  // Column mappings for placeholders
    const messageTemplate = req.body.message;  // Message template

    // Parse dynamic columns input into an object mapping
    const dynamicColumnsMap = {};
    dynamicColumns.split(',').forEach(pair => {
        const [placeholder, column] = pair.split(':');
        if (placeholder && column) {
            dynamicColumnsMap[placeholder.trim()] = column.trim();
        }
    });

    // Read the uploaded Excel or CSV file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Initialize WhatsApp client
    const client = new Client({
        authStrategy: new LocalAuth()
    });

    // Generate QR code for WhatsApp authentication
    client.on('qr', async (qr) => {
        console.log('QR Code received, generating...');
        const qrImage = await QRCode.toDataURL(qr);  // Convert QR code to base64 image
        progressEmitter.emit('update', { status: 'qr', qrImage });
    });

    // When WhatsApp client is ready
    client.on('ready', async () => {
        console.log('Client is ready!');
        progressEmitter.emit('update', { status: 'ready', message: 'WhatsApp client is ready!' });

        // Loop through the contacts and send messages with a delay
        for (const [index, contact] of sheet.entries()) {
            const phoneNumber = contact[mobileColumn]?.toString().replace(/[^\d]/g, '') + '@c.us';  // Format the phone number
            
            if (!phoneNumber) {
                progressEmitter.emit('update', { status: 'error', message: `Invalid phone number at row ${index + 1}` });
                continue;
            }

            // Customize message by replacing dynamic placeholders
            const message = replacePlaceholders(messageTemplate, contact, dynamicColumnsMap);

            try {
                await client.sendMessage(phoneNumber, message);
                progressEmitter.emit('update', { status: 'progress', message: `Message sent to ${contact[mobileColumn]}` });
            } catch (error) {
                progressEmitter.emit('update', { status: 'error', message: `Failed to send message to ${contact[mobileColumn]}: ${error.message}` });
            }
            

            // Wait for 8 seconds before sending the next message
            await delay(8000);
        }

        progressEmitter.emit('update', { status: 'success', message: 'All messages sent successfully!' });
    });

    client.on('auth_failure', (error) => {
        console.error('Authentication failed:', error);
        progressEmitter.emit('update', { status: 'error', message: 'Authentication failed. Please try again.' });
    });

    client.on('disconnected', () => {
        console.log('Client disconnected.');
        progressEmitter.emit('update', { status: 'error', message: 'WhatsApp client disconnected. Please reconnect.' });
    });

    client.initialize();
    res.json({ status: 'processing', message: 'Processing your request. Please wait...' });
});

// Start the server
app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://localhost:3000');
});
