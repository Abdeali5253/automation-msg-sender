// Function to apply WhatsApp-like formatting
function formatMessage(message) {
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
  const formattedMessage = formatMessage(rawMessage)
  document.getElementById('messagePreview').innerHTML = formattedMessage
})

function pollProgress() {
  fetch('http://localhost:3000/progress')
    .then((response) => response.json())
    .then((data) => {
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

      if (data.status === 'progress') {
        const counterElement = document.getElementById('counter')
        const currentCount = parseInt(counterElement.innerText, 10)
        counterElement.innerText = currentCount + 1 // Increment the counter
      }

      if (data.status !== 'success' && data.status !== 'error') {
        pollProgress() // Continue polling until process completes
      }
    })
    .catch(console.error)
}

document
  .getElementById('messageForm')
  .addEventListener('submit', function (event) {
    event.preventDefault()
    const formData = new FormData(this)

    fetch('http://localhost:3000/send-messages', {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === 'processing') {
          document.getElementById('status').innerText = data.message
          pollProgress() // Start polling for progress
        }
      })
      .catch((error) => {
        console.error('Error:', error)
        document.getElementById('status').innerText = 'An error occurred.'
      })
  })
