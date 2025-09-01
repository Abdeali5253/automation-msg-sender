// import express from "express";
// import multer from "multer";
// import path from "path";
// import fs from "fs";
// import XLSX from "xlsx";
// import QRCode from "qrcode";
// import EventEmitter from "events";
// import pkg from "whatsapp-web.js";

// const { Client, LocalAuth, MessageMedia } = pkg;

// const __dirname = path.resolve();
// const app = express();
// const upload = multer({ dest: "uploads/" });
// const progressEmitter = new EventEmitter();

// // Serve static files
// app.use(express.static(path.join(__dirname)));

// // Helper function to introduce delay
// const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// // Function to replace placeholders in the message
// const replacePlaceholders = (template = "", contact, dynamicColumnsMap) => {
//   return Object.entries(dynamicColumnsMap).reduce(
//     (message, [placeholder, column]) => {
//       const value = contact[column] || "";
//       return message.replace(`{${placeholder}}`, value);
//     },
//     template
//   );
// };

// // Function to ensure the file has a proper extension
// const ensureImageExtension = (filePath) => {
//   const newFilePath = `${filePath}.jpg`;
//   fs.renameSync(filePath, newFilePath);
//   return newFilePath;
// };

// // Store active connections
// const clients = new Set(); // Use a Set to ensure no duplicate connections

// // Endpoint to handle progress updates
// app.get("/progress", (req, res) => {
//   console.log("Client connected for progress updates"); // Debugging statement
//   res.setHeader("Content-Type", "text/event-stream");
//   res.setHeader("Cache-Control", "no-cache");
//   res.setHeader("Connection", "keep-alive");

//   // Add the new client to the Set
//   clients.add(res);

//   // Send an update to this client
//   const sendProgressUpdate = (data) => {
//     res.write(`data: ${JSON.stringify(data)}\n\n`);
//     //console.log('Progress update sent to client:', data) // Debugging statement
//   };

//   // Attach a listener for this client
//   progressEmitter.on("update", sendProgressUpdate);

//   // Remove client and listener on disconnect
//   req.on("close", () => {
//     console.log("Client disconnected from progress updates"); // Debugging statement
//     clients.delete(res); // Remove the client from the Set
//     progressEmitter.removeListener("update", sendProgressUpdate);
//     res.end();
//   });
// });

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
//     });

//     client.on("qr", async (qr) => {
//       const qrImage = await QRCode.toDataURL(qr);
//       progressEmitter.emit("update", { status: "qr", qrImage });
//     });

//     client.on("ready", async () => {
//       progressEmitter.emit("update", {
//         status: "ready",
//         message: "WhatsApp client is ready!",
//       });

//       try {
//         const workbook = XLSX.readFile(filePath);
//         const sheetName = workbook.SheetNames[0];
//         const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

//         for (const [index, contact] of sheet.entries()) {
//           const phoneNumber = `${(contact[mobileColumn] || "")
//             .toString()
//             .replace(/[^\d]/g, "")}@c.us`;

//           if (!phoneNumber.includes("@c.us")) {
//             progressEmitter.emit("update", {
//               status: "error",
//               message: `Invalid phone number at row ${index + 1}`,
//             });
//             console.error(`Invalid phone number at row ${index + 1}`); // Debugging statement
//             continue;
//           }

//           const message = replacePlaceholders(
//             messageTemplate,
//             contact,
//             dynamicColumnsMap
//           );

//           try {
//             if (imageFile) {
//               const media = MessageMedia.fromFilePath(imageFile);
//               await client.sendMessage(phoneNumber, media, {
//                 caption: message || undefined,
//               });
//             } else if (message) {
//               await client.sendMessage(phoneNumber, message);
//             }

//             progressEmitter.emit("update", {
//               status: "progress",
//               message: `Message sent to ${contact[mobileColumn]}`,
//             });
//           } catch (error) {
//             progressEmitter.emit("update", {
//               status: "error",
//               message: `Failed to send message to ${contact[mobileColumn]}: ${error.message}`,
//             });
//             console.error(
//               `Failed to send message to ${contact[mobileColumn]}: ${error.message}`
//             ); // Debugging statement
//           }

//           await delay(8000);
//         }

//         progressEmitter.emit("update", {
//           status: "success",
//           message: "All messages sent successfully!",
//         });
//         console.log("All messages sent successfully!"); // Debugging statement
//         resolve();
//       } catch (error) {
//         progressEmitter.emit("update", {
//           status: "error",
//           message: `Batch processing failed: ${error.message}`,
//         });
//         console.error(`Batch processing failed: ${error.message}`); // Debugging statement
//         reject(error);
//       } finally {
//         client.destroy();
//       }
//     });

//     client.on("auth_failure", (error) => {
//       progressEmitter.emit("update", {
//         status: "error",
//         message: "Authentication failed. Please try again.",
//       });
//       console.error("Authentication failed:", error); // Debugging statement
//       reject(error);
//     });

//     client.on("disconnected", () => {
//       progressEmitter.emit("update", {
//         status: "error",
//         message: "WhatsApp client disconnected.",
//       });
//       console.error("WhatsApp client disconnected"); // Debugging statement
//       reject(new Error("WhatsApp client disconnected."));
//     });

//     client.initialize();
//   });
// };

// // Endpoint to handle form submission and file upload
// app.post(
//   "/send-messages",
//   upload.fields([{ name: "file" }, { name: "image" }]),
//   async (req, res) => {
//     try {
//       const filePath = req.files?.file?.[0]?.path;
//       let imageFile = req.files?.image?.[0]?.path;
//       const mobileColumn = req.body.mobile_column;
//       const dynamicColumns = req.body.dynamic_columns || "";
//       const messageTemplate = req.body.message || "";

//       if (!filePath || !mobileColumn) {
//         return res.status(400).json({
//           status: "error",
//           message: "File and mobile column are required.",
//         });
//       }

//       if (imageFile) {
//         imageFile = ensureImageExtension(imageFile);
//       }

//       const dynamicColumnsMap = dynamicColumns
//         .split(",")
//         .reduce((map, pair) => {
//           const [placeholder, column] = pair
//             .split(":")
//             .map((str) => str.trim());
//           if (placeholder && column) map[placeholder] = column;
//           return map;
//         }, {});

//       progressEmitter.emit("update", {
//         status: "ready",
//         message: `Processing your request. Please wait...`,
//       });
//       console.log("Starting batch processing..."); // Debugging statement

//       await initializeClientAndProcessBatch(
//         filePath,
//         imageFile,
//         mobileColumn,
//         dynamicColumnsMap,
//         messageTemplate
//       );

//       res.json({
//         status: "success",
//         message: "Batch is being processed!",
//       });
//     } catch (error) {
//       progressEmitter.emit("update", {
//         status: "error",
//         message: `An error occurred: ${error.message}`,
//       });
//       console.error("Error during batch processing:", error); // Debugging statement
//       res.status(500).json({
//         status: "error",
//         message: error.message,
//       });
//     }
//   }
// );

// // Start the server
// app.listen(3000, "0.0.0.0", () => {
//   console.log("Server running on http://localhost:3000");
// });

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import QRCode from "qrcode";
import EventEmitter from "events";
import ExcelJS from "exceljs"; // ✅ new library
import pkg from "whatsapp-web.js";

const { Client, LocalAuth, MessageMedia } = pkg;

// --- basic logger helpers ---
const log = (...args) => console.log(new Date().toISOString(), "-", ...args);
const warn = (...args) =>
  console.warn(new Date().toISOString(), "- WARN -", ...args);
const error = (...args) =>
  console.error(new Date().toISOString(), "- ERROR -", ...args);

const __dirname = path.resolve();
const app = express();
const progressEmitter = new EventEmitter();

// Serve static files
app.use(express.static(path.join(__dirname)));

// Multer: 2MB cap and .xlsx only (adjust if you need bigger files)
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/\.xlsx$/i.test(file.originalname)) {
      warn("Rejected upload (not .xlsx):", file.originalname);
      return cb(null, false);
    }
    cb(null, true);
  },
});

// Helper function to introduce delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to replace placeholders in the message
const replacePlaceholders = (template = "", contact, dynamicColumnsMap) => {
  return Object.entries(dynamicColumnsMap).reduce(
    (message, [placeholder, column]) => {
      const value = contact[column] ?? "";
      return message.replace(`{${placeholder}}`, value);
    },
    template
  );
};

// Function to ensure the file has a proper extension
const ensureImageExtension = (filePath) => {
  const newFilePath = `${filePath}.jpg`;
  fs.renameSync(filePath, newFilePath);
  return newFilePath;
};

// Store active SSE connections
const clients = new Set();

// Endpoint to handle progress updates (SSE)
app.get("/progress", (req, res) => {
  log("Client connected for progress updates");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  clients.add(res);

  const sendProgressUpdate = (data) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      error("SSE write failed:", e?.message);
    }
  };

  progressEmitter.on("update", sendProgressUpdate);

  req.on("close", () => {
    log("Client disconnected from progress updates");
    clients.delete(res);
    progressEmitter.removeListener("update", sendProgressUpdate);
    try {
      res.end();
    } catch {}
  });
});

// Parse .xlsx → array of row objects using ExcelJS
async function parseXlsxToObjects(filePath, maxRows = 2000) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const ws = workbook.worksheets[0];
  if (!ws) throw new Error("No worksheet found in uploaded file");

  // header row
  const header = [];
  ws.getRow(1).eachCell((cell, col) => {
    header[col - 1] = String(cell.value ?? "").trim();
  });

  // build objects
  const rows = [];
  const lastRow = Math.min(ws.rowCount, 1 + maxRows);
  for (let r = 2; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const obj = {};
    header.forEach((key, i) => {
      if (!key) return;
      // .text ensures we get formatted string when possible
      obj[key] = row.getCell(i + 1).text ?? "";
    });
    // skip completely empty rows
    const isEmpty = Object.values(obj).every(
      (v) => (v ?? "").toString().trim() === ""
    );
    if (!isEmpty) rows.push(obj);
  }
  return { header, rows };
}

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
    });

    client.on("qr", async (qr) => {
      try {
        const qrImage = await QRCode.toDataURL(qr);
        progressEmitter.emit("update", { status: "qr", qrImage });
        log("QR generated and sent to client");
      } catch (e) {
        error("Failed to generate QR image:", e?.message);
      }
    });

    client.on("ready", async () => {
      progressEmitter.emit("update", {
        status: "ready",
        message: "WhatsApp client is ready!",
      });
      log("WhatsApp client ready, starting batch...");

      try {
        const { header, rows } = await parseXlsxToObjects(filePath, 5000);
        log(
          `Parsed worksheet: header=[${header.join(", ")}], rows=${rows.length}`
        );

        // Validate dynamic columns against header to avoid bad keys
        const allowed = new Set(header.map(String));
        const validatedMap = {};
        for (const [ph, col] of Object.entries(dynamicColumnsMap)) {
          if (!/^[A-Za-z0-9_]{1,32}$/.test(ph)) {
            warn("Skipping invalid placeholder:", ph);
            continue;
          }
          if (!allowed.has(col)) {
            warn(`Skipping mapping: column "${col}" not found in header`);
            continue;
          }
          validatedMap[ph] = col;
        }

        let index = 0;
        for (const contact of rows) {
          index++;
          const raw = (contact[mobileColumn] ?? "").toString();
          const digits = raw.replace(/[^\d]/g, "");
          const phoneNumber = `${digits}@c.us`;

          log(
            `Row ${index}: mobile raw="${raw}", digits="${digits}" -> ${phoneNumber}`
          );

          if (!digits) {
            progressEmitter.emit("update", {
              status: "error",
              message: `Invalid phone number at row ${index}`,
            });
            warn(`Invalid phone number at row ${index}`);
            continue;
          }

          const message = replacePlaceholders(
            messageTemplate,
            contact,
            validatedMap
          );

          try {
            if (imageFile) {
              const media = MessageMedia.fromFilePath(imageFile);
              await client.sendMessage(phoneNumber, media, {
                caption: message || undefined,
              });
              log(`Sent media to ${digits}`);
            } else if (message) {
              await client.sendMessage(phoneNumber, message);
              log(`Sent text to ${digits}`);
            } else {
              progressEmitter.emit("update", {
                status: "error",
                message: `No message or image for row ${index}. Skipping...`,
              });
              warn(`No content for row ${index}, skipped`);
              continue;
            }

            progressEmitter.emit("update", {
              status: "progress",
              message: `Message sent to ${contact[mobileColumn]}`,
            });
          } catch (err) {
            const msg = err?.message || String(err);
            progressEmitter.emit("update", {
              status: "error",
              message: `Failed to send message to ${contact[mobileColumn]}: ${msg}`,
            });
            error(`Send failed (row ${index} → ${digits}):`, msg);
          }

          await delay(8000);
        }

        progressEmitter.emit("update", {
          status: "success",
          message: "All messages sent successfully!",
        });
        log("Batch finished successfully");
        resolve();
      } catch (err) {
        const msg = err?.message || String(err);
        progressEmitter.emit("update", {
          status: "error",
          message: `Batch processing failed: ${msg}`,
        });
        error("Batch processing failed:", msg);
        reject(err);
      } finally {
        // Tear down the client after the batch (you may switch to a long-lived client later)
        try {
          await client.destroy();
          log("WhatsApp client destroyed");
        } catch (e) {
          warn("Client destroy error:", e?.message);
        }
      }
    });

    client.on("auth_failure", (e) => {
      progressEmitter.emit("update", {
        status: "error",
        message: "Authentication failed. Please try again.",
      });
      error("Authentication failed:", e?.message || e);
      reject(e);
    });

    client.on("disconnected", (reason) => {
      progressEmitter.emit("update", {
        status: "error",
        message: "WhatsApp client disconnected.",
      });
      warn("WhatsApp client disconnected:", reason);
      reject(new Error("WhatsApp client disconnected."));
    });

    client.initialize().catch((e) => {
      error("Client initialization failed:", e?.message || e);
      reject(e);
    });
  });
};

// Endpoint to handle form submission and file upload
app.post(
  "/send-messages",
  upload.fields([{ name: "file" }, { name: "image" }]),
  async (req, res) => {
    try {
      const filePath = req.files?.file?.[0]?.path;
      let imageFile = req.files?.image?.[0]?.path;
      const mobileColumn = req.body.mobile_column;
      const dynamicColumns = req.body.dynamic_columns || "";
      const messageTemplate = req.body.message || "";

      log("Incoming batch request:", {
        hasFile: !!filePath,
        hasImage: !!imageFile,
        mobileColumn,
        dynamicColumns,
      });

      if (!filePath || !mobileColumn) {
        warn("Missing required fields: file or mobile_column");
        return res
          .status(400)
          .json({
            status: "error",
            message: "File and mobile column are required.",
          });
      }

      if (imageFile) {
        imageFile = ensureImageExtension(imageFile);
        log("Image renamed to:", imageFile);
      }

      const dynamicColumnsMap = dynamicColumns
        .split(",")
        .reduce((map, pair) => {
          const [placeholder, column] = pair
            .split(":")
            .map((str) => (str || "").trim());
          if (placeholder && column) map[placeholder] = column;
          return map;
        }, {});

      progressEmitter.emit("update", {
        status: "ready",
        message: "Processing your request. Please wait...",
      });
      log("Starting batch processing...");

      await initializeClientAndProcessBatch(
        filePath,
        imageFile,
        mobileColumn,
        dynamicColumnsMap,
        messageTemplate
      );

      res.json({ status: "success", message: "Batch is being processed!" });
    } catch (err) {
      const msg = err?.message || String(err);
      progressEmitter.emit("update", {
        status: "error",
        message: `An error occurred: ${msg}`,
      });
      error("Error during batch processing:", msg);
      res.status(500).json({ status: "error", message: msg });
    }
  }
);

// Start the server
app.listen(3000, "0.0.0.0", () => {
  log("Server running on http://localhost:3000");
});
