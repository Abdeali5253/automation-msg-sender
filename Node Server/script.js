// // Function to apply WhatsApp-like formatting
// function formatMessage(message) {
//   return message
//     .replace(/\*(.*?)\*/g, '<b>$1</b>') // Bold: *text*
//     .replace(/_(.*?)_/g, '<i>$1</i>') // Italic: _text_
//     .replace(/~(.*?)~/g, '<s>$1</s>') // Strikethrough: ~text~
//     .replace(/```(.*?)```/gs, '<pre>$1</pre>') // Monospace: ```text```
//     .replace(/(?:\r\n|\r|\n)/g, '<br>') // Line breaks
// }

// // Real-time preview of the message
// document.getElementById('message').addEventListener('input', function () {
//   const rawMessage = this.value
//   const formattedMessage = formatMessage(rawMessage)
//   document.getElementById('messagePreview').innerHTML = formattedMessage
// })

// function pollProgress() {
//   fetch('http://localhost:3000/progress')
//     .then((response) => response.json())
//     .then((data) => {
//       if (data.status === 'qr') {
//         document.getElementById(
//           'status1'
//         ).innerHTML = `<img src="${data.qrImage}" alt="Scan QR Code" />`
//       } else {
//         const statusDiv = document.getElementById('status')
//         const message = document.createElement('p')
//         message.innerText = data.message

//         // Append new message to status
//         statusDiv.appendChild(message)

//         // Limit to the last 10 messages
//         const messages = statusDiv.getElementsByTagName('p')
//         if (messages.length > 10) {
//           statusDiv.removeChild(messages[0])
//         }
//       }

//       if (data.status === 'progress') {
//         const counterElement = document.getElementById('counter')
//         const currentCount = parseInt(counterElement.innerText, 10)
//         counterElement.innerText = currentCount + 1 // Increment the counter
//       }

//       if (data.status !== 'success' && data.status !== 'error') {
//         pollProgress() // Continue polling until process completes
//       }
//     })
//     .catch(console.error)
// }

// document
//   .getElementById('messageForm')
//   .addEventListener('submit', function (event) {
//     event.preventDefault()
//     const formData = new FormData(this)

//     fetch('http://localhost:3000/send-messages', {
//       method: 'POST',
//       body: formData,
//     })
//       .then((response) => response.json())
//       .then((data) => {
//         if (data.status === 'processing') {
//           document.getElementById('status').innerText = data.message
//           pollProgress() // Start polling for progress
//         }
//       })
//       .catch((error) => {
//         console.error('Error:', error)
//         document.getElementById('status').innerText = 'An error occurred.'
//       })
//   })

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
      console.log('Final status received:', data.status) // Debugging statement
      eventSource.close() // Close the EventSource connection
      eventSource = null // Reset the EventSource for future connections
    }
  }

  eventSource.onerror = (error) => {
    console.error('Error receiving progress updates:', error) // Debugging statement
    eventSource.close()
    eventSource = null // Reset the EventSource for future connections
  }
}

document
  .getElementById('messageForm')
  .addEventListener('submit', function (event) {
    event.preventDefault()

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
        }
      })
      .catch((error) => {
        console.error('Error submitting form:', error) // Debugging statement
        document.getElementById('status').innerText = 'An error occurred.'
      })
  })
