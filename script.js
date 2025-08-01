// Function to apply WhatsApp-like formatting
function formatMessage(message) {
  console.log('Formatting message:', message) // Debugging statement
  return message
    .replace(/\*(.*?)\*/g, '<b>$1</b>') // Bold: *text*
    .replace(/_(.*?)_/g, '<i>$1</i>') // Italic: _text_
    .replace(/~(.*?)~/g, '<s>$1</s>') // Strikethrough: ~text~
    .replace(/```(.*?)```/gs, '<pre>$1</pre>') // Monospace: ```text```
    .replace(/(?:\r\n|\r|\n)/g, '<br>') // Line breaks
}

// Real-time preview of the message
document.getElementById('message').addEventListener('input', function () {
  const rawMessage = this.value
  console.log('Message input updated:', rawMessage) // Debugging statement
  const formattedMessage = formatMessage(rawMessage)
  document.getElementById('messagePreview').innerHTML = formattedMessage
})

document.getElementById('image').addEventListener('change', function () {
  const file = this.files[0]
  const imagePreview = document.getElementById('imagePreview')

  if (file) {
    const reader = new FileReader()
    reader.onload = function (e) {
      imagePreview.src = e.target.result
      imagePreview.style.display = 'block' // Show the image preview
    }
    reader.readAsDataURL(file)
  } else {
    imagePreview.style.display = 'none' // Hide the image preview if no file is selected
  }
})

// document.getElementById('video').addEventListener('change', function () {
//   const file = this.files[0];
//   const videoPreview = document.getElementById('videoPreview');

//   if (file) {
//     const reader = new FileReader();
//     reader.onload = function (e) {
//       videoPreview.src = e.target.result;
//       videoPreview.style.display = 'block';
//     };
//     reader.readAsDataURL(file);
//   } else {
//     videoPreview.style.display = 'none';
//   }
// });


let eventSource // Global variable for EventSource

function listenToProgress() {
  if (eventSource) {
    console.log('EventSource already active. Reusing existing connection.') // Debugging statement
    return
  }

  console.log('Listening for progress updates...') // Debugging statement
  eventSource = new EventSource('http://localhost:3000/progress')

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data)
    console.log('Progress data received:', data) // Debugging statement

    if (data.status === 'qr') {
      document.getElementById(
        'status1'
      ).innerHTML = `<img src="${data.qrImage}" alt="Scan QR Code" />`
    } else {
      const statusDiv = document.getElementById('status')
      const message = document.createElement('p')
      message.innerText = data.message

      // Append new message to status
      statusDiv.appendChild(message)

      // Limit to the last 10 messages
      const messages = statusDiv.getElementsByTagName('p')
      if (messages.length > 10) {
        statusDiv.removeChild(messages[0])
      }
    }

    if (data.status === 'progress' && data.message.includes('Message sent')) {
      const counterElement = document.getElementById('counter')
      const currentCount = parseInt(counterElement.innerText, 10)
      counterElement.innerText = currentCount + 1 // Increment the counter
      console.log('Message counter incremented') // Debugging statement
    }

    if (data.status === 'success' || data.status === 'error') {
      console.log('Final status received:', data.status)

      // ✅ Re-enable the send button after batch is done
      const sendButton = document.getElementById('sendButton')
      sendButton.disabled = false
      sendButton.innerText = 'Send Messages'

      eventSource.close()
      eventSource = null
    }
  }

  eventSource.onerror = (error) => {
    console.error('Error receiving progress updates:', error) // Debugging statement

    const sendButton = document.getElementById('sendButton')
    sendButton.disabled = false
    sendButton.innerText = 'Send Messages'

    eventSource.close()
    eventSource = null
  }
}

document
  .getElementById('messageForm')
  .addEventListener('submit', function (event) {
    event.preventDefault()

    // ✅ Reset the counter and clear previous status
    const counterElement = document.getElementById('counter')
    counterElement.innerText = '0'
    document.getElementById('status').innerHTML = ''
    document.getElementById('status1').innerHTML = ''

    // ✅ Disable the send button
    const sendButton = document.getElementById('sendButton')
    sendButton.disabled = true
    sendButton.innerText = 'Processing...'

    const formData = new FormData(this)

    console.log('Form submitted. Sending data to server...') // Debugging statement
    listenToProgress() // Start listening for progress before the server processes

    fetch('http://localhost:3000/send-messages', {
      method: 'POST',
      body: formData,
    })
      .then((response) => {
        console.log('Server response status:', response.status) // Debugging statement
        return response.json()
      })
      .then((data) => {
        console.log('Response from server:', data) // Debugging statement
        if (data.status === 'success') {
          console.log('Batch is being processed!') // Debugging statement
        } else {
          sendButton.disabled = false
          sendButton.innerText = 'Send Messages'
        }
      })
      .catch((error) => {
        console.error('Error submitting form:', error) // Debugging statement
        document.getElementById('status').innerText = 'An error occurred.'
        sendButton.disabled = false
        sendButton.innerText = 'Send Messages'
      })

      return false
  })
