const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const app = express();
const upload = multer({ dest: 'uploads/' }); // Upload destination folder

// Serve static files
app.use(express.static(path.join(__dirname)));

// Helper function to introduce delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Endpoint to handle form submission and file upload
app.post('/send-messages', upload.single('file'), async (req, res) => {
    const filePath = req.file.path;  // Path to the uploaded file
    const mobileColumn = req.body.mobile_column;  // Column for mobile numbers
    const messageTemplate = req.body.message;  // Message template

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
        res.json({ status: 'qr', qrImage });  // Send QR code to frontend
    });

    // When WhatsApp client is ready
    client.on('ready', async () => {
        console.log('Client is ready!');

        // Loop through the contacts and send messages with an 8-second delay
        for (const contact of sheet) {
            const phoneNumber = contact[mobileColumn].toString().replace(/[^\d]/g, '') + '@c.us';  // Format the phone number
            const message = messageTemplate.replace('{name}', contact['NAMES']);  // Customize message with placeholder

            try {
                await client.sendMessage(phoneNumber, message);
                console.log(`Message sent to ${contact['NAMES']}`);
            } catch (error) {
                console.error(`Failed to send message to ${contact['NAMES']}:`, error);
            }

            // Wait for 8 seconds before sending the next message
            await delay(8000);
        }

        res.json({ status: 'success', message: 'Messages sent successfully!' });
    });

    client.initialize();
});

// Start the server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
