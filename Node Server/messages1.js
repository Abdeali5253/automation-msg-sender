const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');  // Using qrcode package to generate an image
const XLSX = require('xlsx');
const fs = require('fs');  // To save the image
const path = require('path');

// Initialize the client
const client = new Client({
    authStrategy: new LocalAuth()  // This will save your session
});

// Show QR code for authentication but save it as an image
client.on('qr', (qr) => {
    console.log('QR code received. Saving it as an image...');
    QRCode.toFile('qr_code.png', qr, (err) => {
        if (err) {
            console.error('Failed to save QR code image:', err);
        } else {
            console.log('QR code saved as qr_code.png');
        }
    });
});

client.on('ready', () => {
    console.log('Client is ready!');
    // After client is ready, call the function to send messages
    sendBulkMessages();
});

client.initialize();

// Helper function to introduce delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to read Excel file and send bulk messages
const sendBulkMessages = async () => {
    const filePath = path.resolve(__dirname, 'test.xlsx');  // Path to your Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Loop through the contacts in the Excel file
    for (const contact of sheet) {
        // Fix phone number formatting (convert from scientific notation and string)
        let phoneNumber = parseInt(contact['Telephone']).toString();

        // Ensure the phone number starts with the correct country code
        phoneNumber = phoneNumber.replace(/[^\d]/g, '');  // Remove non-digit characters

        if (!phoneNumber.startsWith('92')) {  // Adjust the country code if needed
            console.error(`Invalid phone number for ${contact['NAMES']}: ${phoneNumber}`);
            continue;  // Skip if invalid
        }

        const formattedNumber = phoneNumber + '@c.us';  // WhatsApp number format
        const name = contact['NAMES'];
        const message = `Hello ${name}, this is your customized message!`;

        try {
            await client.sendMessage(formattedNumber, message);
            console.log(`Message sent to ${name}`);
        } catch (error) {
            console.error(`Failed to send message to ${name}:`, error);
        }

        // Introduce a delay of 6 seconds (6000 milliseconds) between each message
        await delay(12000);  // Wait 6 seconds before sending the next message
    }
};
