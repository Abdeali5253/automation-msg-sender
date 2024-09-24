document.getElementById('messageForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const formData = new FormData(this);

    // Send the form data to the server
    const response = await fetch('/send-messages', {
        method: 'POST',
        body: formData
    });

    const result = await response.json();

    // Handle QR code or success message
    if (result.status === 'qr') {
        // Display the QR code
        document.getElementById('status').innerHTML = `<img src="${result.qrImage}" alt="Scan QR Code" />`;
    } else if (result.status === 'success') {
        // Display success message
        document.getElementById('status').innerHTML = '<p class="success">Messages sent successfully!</p>';
    }
});
