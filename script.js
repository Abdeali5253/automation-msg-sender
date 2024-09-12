// script.js
document.getElementById('messageForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const formData = new FormData();
    formData.append('file', document.getElementById('file').files[0]);
    formData.append('name_column', document.getElementById('name_column').value);
    formData.append('mumin_id_column', document.getElementById('mumin_id_column').value);
    formData.append('registered_for_column', document.getElementById('registered_for_column').value);
    formData.append('mobile_column', document.getElementById('mobile_column').value);
    formData.append('message', document.getElementById('message').value);

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
