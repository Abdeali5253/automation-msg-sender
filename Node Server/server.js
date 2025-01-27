// import express from 'express'
// import multer from 'multer'
// import path from 'path'
// import fs from 'fs'
// import XLSX from 'xlsx'
// import mime from 'mime-types'
// import QRCode from 'qrcode'
// import EventEmitter from 'events'
// import pkg from 'whatsapp-web.js'

// const { Client, LocalAuth, MessageMedia } = pkg

// const __dirname = path.resolve()
// const app = express()
// const upload = multer({ dest: 'uploads/' }) // Upload destination folder
// const progressEmitter = new EventEmitter()

// // Serve static files
// app.use(express.static(path.join(__dirname)))

// // Helper function to introduce delay
// const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// // Function to replace placeholders in the message
// const replacePlaceholders = (template = '', contact, dynamicColumnsMap) => {
//   return Object.entries(dynamicColumnsMap).reduce(
//     (message, [placeholder, column]) => {
//       const value = contact[column] || '' // Use empty string if undefined
//       return message.replace(`{${placeholder}}`, value)
//     },
//     template
//   )
// }

// // Function to ensure the file has a proper extension
// const ensureImageExtension = (filePath) => {
//   const newFilePath = `${filePath}.jpg` // Append .jpg extension
//   fs.renameSync(filePath, newFilePath) // Rename the file
//   return newFilePath
// }

// // Endpoint to handle progress updates
// app.get('/progress', (req, res) => {
//   progressEmitter.once('update', (data) => {
//     res.json(data)
//   })
// })

// // Endpoint to handle form submission and file upload
// app.post(
//   '/send-messages',
//   upload.fields([{ name: 'file' }, { name: 'image' }]),
//   async (req, res) => {
//     try {
//       const filePath = req.files?.file?.[0]?.path
//       let imageFile = req.files?.image?.[0]?.path
//       const mobileColumn = req.body.mobile_column
//       const dynamicColumns = req.body.dynamic_columns || ''
//       const messageTemplate = req.body.message || '' // Default to empty string

//       if (!filePath || !mobileColumn) {
//         return res.status(400).json({
//           status: 'error',
//           message: 'File and mobile column are required.',
//         })
//       }

//       // Ensure the image file has a .jpg extension
//       if (imageFile) {
//         imageFile = ensureImageExtension(imageFile)
//       }

//       // Parse dynamic columns input into an object mapping
//       const dynamicColumnsMap = dynamicColumns
//         .split(',')
//         .reduce((map, pair) => {
//           const [placeholder, column] = pair.split(':').map((str) => str.trim())
//           if (placeholder && column) map[placeholder] = column
//           return map
//         }, {})

//       // Read the uploaded Excel or CSV file
//       const workbook = XLSX.readFile(filePath)
//       const sheetName = workbook.SheetNames[0]
//       const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])

//       // Initialize WhatsApp client
//       const client = new Client({
//         authStrategy: new LocalAuth(),
//       })

//       // Generate QR code for WhatsApp authentication
//       client.on('qr', async (qr) => {
//         const qrImage = await QRCode.toDataURL(qr) // Convert QR code to base64 image
//         progressEmitter.emit('update', { status: 'qr', qrImage })
//       })

//       // When WhatsApp client is ready
//       client.on('ready', async () => {
//         progressEmitter.emit('update', {
//           status: 'ready',
//           message: 'WhatsApp client is ready!',
//         })

//         // Loop through the contacts and send messages
//         for (const [index, contact] of sheet.entries()) {
//           const phoneNumber = `${(contact[mobileColumn] || '')
//             .toString()
//             .replace(/[^\d]/g, '')}@c.us`

//           if (!phoneNumber.includes('@c.us')) {
//             progressEmitter.emit('update', {
//               status: 'error',
//               message: `Invalid phone number at row ${index + 1}`,
//             })
//             continue
//           }

//           const message = replacePlaceholders(
//             messageTemplate,
//             contact,
//             dynamicColumnsMap
//           )

//           try {
//             if (imageFile) {
//               // Ensure the file is properly encoded as a WhatsApp media object
//               const media = MessageMedia.fromFilePath(imageFile)

//               await client.sendMessage(phoneNumber, media, {
//                 caption: message || undefined, // Add a caption if a message exists
//               })
//             } else if (message) {
//               // Send only text message
//               await client.sendMessage(phoneNumber, message)
//             } else {
//               progressEmitter.emit('update', {
//                 status: 'error',
//                 message: `No message or image provided for row ${
//                   index + 1
//                 }. Skipping...`,
//               })
//               continue
//             }

//             progressEmitter.emit('update', {
//               status: 'progress',
//               message: `Message sent to ${contact[mobileColumn]}`,
//             })
//           } catch (error) {
//             progressEmitter.emit('update', {
//               status: 'error',
//               message: `Failed to send message to ${contact[mobileColumn]}: ${error.message}`,
//             })
//           }

//           // Wait for 8 seconds before sending the next message
//           await delay(8000)
//         }

//         progressEmitter.emit('update', {
//           status: 'success',
//           message: 'All messages sent successfully!',
//         })
//       })

//       client.on('auth_failure', (error) => {
//         progressEmitter.emit('update', {
//           status: 'error',
//           message: 'Authentication failed. Please try again.',
//         })
//       })

//       client.on('disconnected', () => {
//         progressEmitter.emit('update', {
//           status: 'error',
//           message: 'WhatsApp client disconnected. Please reconnect.',
//         })
//       })

//       client.initialize()
//       res.json({
//         status: 'processing',
//         message: 'Processing your request. Please wait...',
//       })
//     } catch (error) {
//       res.status(500).json({
//         status: 'error',
//         message: 'An error occurred while processing your request.',
//       })
//     }
//   }
// )

// // Start the server
// app.listen(3000, '0.0.0.0', () => {
//   console.log('Server running on http://localhost:3000')
// })

// import express from 'express'
// import multer from 'multer'
// import path from 'path'
// import fs from 'fs'
// import XLSX from 'xlsx'
// import QRCode from 'qrcode'
// import EventEmitter from 'events'
// import pkg from 'whatsapp-web.js'

// const { Client, LocalAuth, MessageMedia } = pkg

// const __dirname = path.resolve()
// const app = express()
// const upload = multer({ dest: 'uploads/' })
// const progressEmitter = new EventEmitter()

// // Serve static files
// app.use(express.static(path.join(__dirname)))

// // Helper function to introduce delay
// const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// // Function to replace placeholders in the message
// const replacePlaceholders = (template = '', contact, dynamicColumnsMap) => {
//   return Object.entries(dynamicColumnsMap).reduce(
//     (message, [placeholder, column]) => {
//       const value = contact[column] || ''
//       return message.replace(`{${placeholder}}`, value)
//     },
//     template
//   )
// }

// // Function to ensure the file has a proper extension
// const ensureImageExtension = (filePath) => {
//   const newFilePath = `${filePath}.jpg`
//   fs.renameSync(filePath, newFilePath)
//   return newFilePath
// }

// // Endpoint to handle progress updates
// app.get('/progress', (req, res) => {
//   progressEmitter.once('update', (data) => {
//     res.json(data)
//   })
// })

// // Function to initialize and process a batch
// const initializeClientAndProcessBatch = async (
//   filePath,
//   imageFile,
//   mobileColumn,
//   dynamicColumnsMap,
//   messageTemplate
// ) => {
//   return new Promise((resolve, reject) => {
//     const client = new Client({
//       authStrategy: new LocalAuth(),
//     })

//     client.on('qr', async (qr) => {
//       const qrImage = await QRCode.toDataURL(qr)
//       progressEmitter.emit('update', { status: 'qr', qrImage })
//     })

//     client.on('ready', async () => {
//       progressEmitter.emit('update', {
//         status: 'ready',
//         message: 'WhatsApp client is ready!',
//       })

//       try {
//         const workbook = XLSX.readFile(filePath)
//         const sheetName = workbook.SheetNames[0]
//         const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])

//         for (const [index, contact] of sheet.entries()) {
//           const phoneNumber = `${(contact[mobileColumn] || '')
//             .toString()
//             .replace(/[^\d]/g, '')}@c.us`

//           if (!phoneNumber.includes('@c.us')) {
//             progressEmitter.emit('update', {
//               status: 'error',
//               message: `Invalid phone number at row ${index + 1}`,
//             })
//             continue
//           }

//           const message = replacePlaceholders(
//             messageTemplate,
//             contact,
//             dynamicColumnsMap
//           )

//           try {
//             if (imageFile) {
//               const media = MessageMedia.fromFilePath(imageFile)
//               await client.sendMessage(phoneNumber, media, {
//                 caption: message || undefined,
//               })
//             } else if (message) {
//               await client.sendMessage(phoneNumber, message)
//             }

//             progressEmitter.emit('update', {
//               status: 'progress',
//               message: `Message sent to ${contact[mobileColumn]}`,
//             })
//           } catch (error) {
//             progressEmitter.emit('update', {
//               status: 'error',
//               message: `Failed to send message to ${contact[mobileColumn]}: ${error.message}`,
//             })
//           }

//           await delay(8000)
//         }

//         progressEmitter.emit('update', {
//           status: 'success',
//           message: 'All messages sent successfully!',
//         })
//         resolve()
//       } catch (error) {
//         reject(error)
//       } finally {
//         client.destroy() // Cleanup client resources
//       }
//     })

//     client.on('auth_failure', (error) => {
//       progressEmitter.emit('update', {
//         status: 'error',
//         message: 'Authentication failed. Please try again.',
//       })
//       reject(error)
//     })

//     client.on('disconnected', () => {
//       progressEmitter.emit('update', {
//         status: 'error',
//         message: 'WhatsApp client disconnected.',
//       })
//       reject(new Error('WhatsApp client disconnected.'))
//     })

//     client.initialize()
//   })
// }

// // Endpoint to handle form submission and file upload
// app.post(
//   '/send-messages',
//   upload.fields([{ name: 'file' }, { name: 'image' }]),
//   async (req, res) => {
//     try {
//       const filePath = req.files?.file?.[0]?.path
//       let imageFile = req.files?.image?.[0]?.path
//       const mobileColumn = req.body.mobile_column
//       const dynamicColumns = req.body.dynamic_columns || ''
//       const messageTemplate = req.body.message || ''

//       if (!filePath || !mobileColumn) {
//         return res.status(400).json({
//           status: 'error',
//           message: 'File and mobile column are required.',
//         })
//       }

//       if (imageFile) {
//         imageFile = ensureImageExtension(imageFile)
//       }

//       const dynamicColumnsMap = dynamicColumns
//         .split(',')
//         .reduce((map, pair) => {
//           const [placeholder, column] = pair.split(':').map((str) => str.trim())
//           if (placeholder && column) map[placeholder] = column
//           return map
//         }, {})

//       await initializeClientAndProcessBatch(
//         filePath,
//         imageFile,
//         mobileColumn,
//         dynamicColumnsMap,
//         messageTemplate
//       )

//       res.json({
//         status: 'success',
//         message: 'Batch is being processed!',
//       })
//     } catch (error) {
//       res.status(500).json({
//         status: 'error',
//         message: error.message,
//       })
//     }
//   }
// )

// // Start the server
// app.listen(3000, '0.0.0.0', () => {
//   console.log('Server running on http://localhost:3000')
// })

import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import XLSX from 'xlsx'
import QRCode from 'qrcode'
import EventEmitter from 'events'
import pkg from 'whatsapp-web.js'

const { Client, LocalAuth, MessageMedia } = pkg

const __dirname = path.resolve()
const app = express()
const upload = multer({ dest: 'uploads/' })
const progressEmitter = new EventEmitter()

// Serve static files
app.use(express.static(path.join(__dirname)))

// Helper function to introduce delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Function to replace placeholders in the message
const replacePlaceholders = (template = '', contact, dynamicColumnsMap) => {
  return Object.entries(dynamicColumnsMap).reduce(
    (message, [placeholder, column]) => {
      const value = contact[column] || ''
      return message.replace(`{${placeholder}}`, value)
    },
    template
  )
}

// Function to ensure the file has a proper extension
const ensureImageExtension = (filePath) => {
  const newFilePath = `${filePath}.jpg`
  fs.renameSync(filePath, newFilePath)
  return newFilePath
}

// Store active connections
const clients = new Set() // Use a Set to ensure no duplicate connections

// Endpoint to handle progress updates
app.get('/progress', (req, res) => {
  console.log('Client connected for progress updates') // Debugging statement
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  // Add the new client to the Set
  clients.add(res)

  // Send an update to this client
  const sendProgressUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
    console.log('Progress update sent to client:', data) // Debugging statement
  }

  // Attach a listener for this client
  progressEmitter.on('update', sendProgressUpdate)

  // Remove client and listener on disconnect
  req.on('close', () => {
    console.log('Client disconnected from progress updates') // Debugging statement
    clients.delete(res) // Remove the client from the Set
    progressEmitter.removeListener('update', sendProgressUpdate)
    res.end()
  })
})

// Function to initialize and process a batch
const initializeClientAndProcessBatch = async (
  filePath,
  imageFile,
  mobileColumn,
  dynamicColumnsMap,
  messageTemplate
) => {
  return new Promise((resolve, reject) => {
    const client = new Client({
      authStrategy: new LocalAuth(),
    })

    client.on('qr', async (qr) => {
      const qrImage = await QRCode.toDataURL(qr)
      progressEmitter.emit('update', { status: 'qr', qrImage })
    })

    client.on('ready', async () => {
      progressEmitter.emit('update', {
        status: 'ready',
        message: 'WhatsApp client is ready!',
      })

      try {
        const workbook = XLSX.readFile(filePath)
        const sheetName = workbook.SheetNames[0]
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])

        for (const [index, contact] of sheet.entries()) {
          const phoneNumber = `${(contact[mobileColumn] || '')
            .toString()
            .replace(/[^\d]/g, '')}@c.us`

          console.log(
            `Processing row ${index + 1}: Phone Number - ${phoneNumber}`
          ) // Debugging statement

          if (!phoneNumber.includes('@c.us')) {
            progressEmitter.emit('update', {
              status: 'error',
              message: `Invalid phone number at row ${index + 1}`,
            })
            console.error(`Invalid phone number at row ${index + 1}`) // Debugging statement
            continue
          }

          const message = replacePlaceholders(
            messageTemplate,
            contact,
            dynamicColumnsMap
          )

          try {
            if (imageFile) {
              const media = MessageMedia.fromFilePath(imageFile)
              await client.sendMessage(phoneNumber, media, {
                caption: message || undefined,
              })
            } else if (message) {
              await client.sendMessage(phoneNumber, message)
            }

            progressEmitter.emit('update', {
              status: 'progress',
              message: `Message sent to ${contact[mobileColumn]}`,
            })
            console.log(`Message sent to ${contact[mobileColumn]}`) // Debugging statement
          } catch (error) {
            progressEmitter.emit('update', {
              status: 'error',
              message: `Failed to send message to ${contact[mobileColumn]}: ${error.message}`,
            })
            console.error(
              `Failed to send message to ${contact[mobileColumn]}: ${error.message}`
            ) // Debugging statement
          }

          await delay(8000)
        }

        progressEmitter.emit('update', {
          status: 'success',
          message: 'All messages sent successfully!',
        })
        console.log('All messages sent successfully!') // Debugging statement
        resolve()
      } catch (error) {
        progressEmitter.emit('update', {
          status: 'error',
          message: `Batch processing failed: ${error.message}`,
        })
        console.error(`Batch processing failed: ${error.message}`) // Debugging statement
        reject(error)
      } finally {
        client.destroy()
      }
    })

    client.on('auth_failure', (error) => {
      progressEmitter.emit('update', {
        status: 'error',
        message: 'Authentication failed. Please try again.',
      })
      console.error('Authentication failed:', error) // Debugging statement
      reject(error)
    })

    client.on('disconnected', () => {
      progressEmitter.emit('update', {
        status: 'error',
        message: 'WhatsApp client disconnected.',
      })
      console.error('WhatsApp client disconnected') // Debugging statement
      reject(new Error('WhatsApp client disconnected.'))
    })

    client.initialize()
  })
}

// Endpoint to handle form submission and file upload
app.post(
  '/send-messages',
  upload.fields([{ name: 'file' }, { name: 'image' }]),
  async (req, res) => {
    try {
      const filePath = req.files?.file?.[0]?.path
      let imageFile = req.files?.image?.[0]?.path
      const mobileColumn = req.body.mobile_column
      const dynamicColumns = req.body.dynamic_columns || ''
      const messageTemplate = req.body.message || ''

      if (!filePath || !mobileColumn) {
        return res.status(400).json({
          status: 'error',
          message: 'File and mobile column are required.',
        })
      }

      if (imageFile) {
        imageFile = ensureImageExtension(imageFile)
      }

      const dynamicColumnsMap = dynamicColumns
        .split(',')
        .reduce((map, pair) => {
          const [placeholder, column] = pair.split(':').map((str) => str.trim())
          if (placeholder && column) map[placeholder] = column
          return map
        }, {})

      progressEmitter.emit('update', {
        status: 'ready',
        message: `Processing your request. Please wait...`,
      })
      console.log('Starting batch processing...') // Debugging statement

      await initializeClientAndProcessBatch(
        filePath,
        imageFile,
        mobileColumn,
        dynamicColumnsMap,
        messageTemplate
      )

      res.json({
        status: 'success',
        message: 'Batch is being processed!',
      })
    } catch (error) {
      progressEmitter.emit('update', {
        status: 'error',
        message: `An error occurred: ${error.message}`,
      })
      console.error('Error during batch processing:', error) // Debugging statement
      res.status(500).json({
        status: 'error',
        message: error.message,
      })
    }
  }
)

// Start the server
app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on http://localhost:3000')
})
