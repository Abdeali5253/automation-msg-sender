// document.getElementById('messageForm').addEventListener('submit', function(event) {
//     event.preventDefault();
    
//     const formData = new FormData(this);

//     fetch('http://localhost:3000/send-messages', {
//         method: 'POST',
//         body: formData
//     })
//     .then(async response => {
//         if (!response.ok) {
//             const err = await response.json();
//             throw err;
//         }
//         return response.json();
//     })
//     .then(data => {
//         if (data.status === 'qr') {
//             document.getElementById('status').innerHTML = `<img src="${data.qrImage}" alt="Scan QR Code" />`;
//         } else if (data.status === 'success') {
//             document.getElementById('status').innerText = 'Messages sent successfully!';
//         }
//     })
//     .catch(error => {
//         if (error.error) {
//             document.getElementById('status').innerText = 'Error: ' + error.error;
//         } else {
//             document.getElementById('status').innerText = 'Unknown error occurred';
//         }
//     });
// });

function pollProgress() {
    fetch('http://localhost:3000/progress')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'qr') {
                document.getElementById('status').innerHTML = `<img src="${data.qrImage}" alt="Scan QR Code" />`;
            } else {
                const statusDiv = document.getElementById('status');
                const message = document.createElement('p');
                message.innerText = data.message;
                statusDiv.appendChild(message);
            }

            if (data.status !== 'success' && data.status !== 'error') {
                pollProgress(); // Continue polling until process completes
            }
        })
        .catch(console.error);
}

document.getElementById('messageForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const formData = new FormData(this);

    fetch('http://localhost:3000/send-messages', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'processing') {
            document.getElementById('status').innerText = data.message;
            pollProgress(); // Start polling for progress
        }
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('status').innerText = 'An error occurred.';
    });
});
