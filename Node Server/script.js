// document.getElementById('messageForm').addEventListener('submit', async function (event) {
//     event.preventDefault();

//     const formData = new FormData(this);

//     // Send the form data to the server
//     const response = await fetch('/send-messages', {
//         method: 'POST',
//         body: formData
//     });

//     const result = await response.json();

//     // Handle QR code or success message
//     if (result.status === 'qr') {
//         // Display the QR code
//         document.getElementById('status').innerHTML = `<img src="${result.qrImage}" alt="Scan QR Code" />`;
//     } else if (result.status === 'success') {
//         // Display success message
//         document.getElementById('status').innerHTML = '<p class="success">Messages sent successfully!</p>';
//     }
// });


document.getElementById('messageForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const formData = new FormData(this);

    fetch('http://localhost:3000/send-messages', {
        method: 'POST',
        body: formData
    })
    .then(async response => {
        if (!response.ok) {
            const err = await response.json();
            throw err;
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'qr') {
            document.getElementById('status').innerHTML = `<img src="${data.qrImage}" alt="Scan QR Code" />`;
        } else if (data.status === 'success') {
            document.getElementById('status').innerText = 'Messages sent successfully!';
        }
    })
    .catch(error => {
        if (error.error) {
            document.getElementById('status').innerText = 'Error: ' + error.error;
        } else {
            document.getElementById('status').innerText = 'Unknown error occurred';
        }
    });
});


const darkModeToggle = document.getElementById('darkModeToggle');

// Check if the user has previously selected dark mode
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
}

// Toggle dark mode on button click
darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');

    // Save the user's preference to local storage
    if (document.body.classList.contains('dark')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
});
