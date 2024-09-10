// script.js
document.getElementById('messageForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const formData = new FormData();
    formData.append('file', document.getElementById('file').files[0]);
    formData.append('name_column', document.getElementById('name_column').value);
    formData.append('phone_column', document.getElementById('phone_column').value);
    formData.append('message', document.getElementById('message').value);
    formData.append('balance_column', document.getElementById('balance_column').value);


    fetch('http://localhost:5000/send-messages', {
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
        document.getElementById('status').innerText = data.status;
    })
    .catch(error => {
        if (error.error) {
            document.getElementById('status').innerText = 'Error: ' + error.error;
        } else {
            document.getElementById('status').innerText = 'Unknown error occurred';
        }
    });
});
