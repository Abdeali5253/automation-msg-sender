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
import ExcelJS from "exceljs";
import pkg from "whatsapp-web.js";

const { Client, LocalAuth, MessageMedia } = pkg;

// ---------- tiny logger helpers ----------
const ts = () => new Date().toISOString();
const log  = (...a) => console.log(ts(), "-", ...a);
const warn = (...a) => console.warn(ts(), "- WARN -", ...a);
const err  = (...a) => console.error(ts(), "- ERROR -", ...a);

// ---------- express setup ----------
const __dirname = path.resolve();
const app = express();
const progressEmitter = new EventEmitter();

app.use(express.static(path.join(__dirname)));

// Multer: 2MB cap; validate each field independently
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "file") {
      if (!/\.xlsx$/i.test(file.originalname)) {
        warn("Rejected upload (file not .xlsx):", file.originalname);
        return cb(null, false);
      }
    } else if (file.fieldname === "image") {
      if (!/\.(jpg|jpeg|png)$/i.test(file.originalname)) {
        warn("Rejected upload (image not jpg/png):", file.originalname);
        return cb(null, false);
      }
    }
    cb(null, true);
  }
});

// ---------- helpers ----------
const delay = (ms) => new Promise(r => setTimeout(r, ms));

const ensureImageExtension = (filePath) => {
  const newFilePath = `${filePath}.jpg`;
  try { fs.renameSync(filePath, newFilePath); }
  catch (e) { warn("Image rename failed (continuing with original):", e?.message); return filePath; }
  return newFilePath;
};

const replacePlaceholders = (template = "", contact, dynamicColumnsMap) => {
  return Object.entries(dynamicColumnsMap).reduce((message, [ph, col]) => {
    const value = contact[col] ?? "";
    return message.replace(`{${ph}}`, value);
  }, template);
};

// ---------- SSE: /progress ----------
app.get("/progress", (req, res) => {
  log("Client connected for progress updates");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); }
    catch (e) { err("SSE write failed:", e?.message); }
  };

  progressEmitter.on("update", send);

  req.on("close", () => {
    log("Client disconnected from progress updates");
    progressEmitter.removeListener("update", send);
    try { res.end(); } catch {}
  });
});

// ---------- Excel parsing ----------
async function parseXlsxToObjects(filePath, maxRows = 5000) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("No worksheet found");

  const header = [];
  ws.getRow(1).eachCell((cell, col) => header[col - 1] = String(cell.value ?? "").trim());

  const rows = [];
  const last = Math.min(ws.rowCount, 1 + maxRows);
  for (let r = 2; r <= last; r++) {
    const row = ws.getRow(r);
    const obj = {};
    header.forEach((key, i) => { if (key) obj[key] = row.getCell(i + 1).text ?? ""; });
    const empty = Object.values(obj).every(v => (v ?? "").toString().trim() === "");
    if (!empty) rows.push(obj);
  }
  return { header, rows };
}

// =====================================================
//          SINGLETON WHATSAPP CLIENT + QUEUE
// =====================================================
let client = null;
let clientReady = false;
let clientInitializing = false;
let readyTimer = null;
let readyEventFired = false;

// actively wait for CONNECTED + internal stores (or proceed after brief window)
async function waitUntilReady(timeoutMs = 300000) {
  const start = Date.now();
  let connectedAt = null;
  progressEmitter.emit("update", { status: "ready", message: "Waiting for WhatsApp to be fully ready..." });

  while (Date.now() - start < timeoutMs) {
    try {
      const state = await client.getState();
      log("WA getState:", state, "| readyEventFired:", readyEventFired);
      if (state === "CONNECTED") {
        if (!connectedAt) { connectedAt = Date.now(); log("WA connected; probing internal stores..."); }

        if (readyEventFired) {
          clientReady = true;
          progressEmitter.emit("update", { status: "ready", message: "WhatsApp is connected & ready. Starting batch..." });
          return;
        }

        try {
          await client.pupPage.waitForFunction(
            "window?.Store && Store.Msg && Store.Chat && Store.Contact",
            { timeout: 2000 }
          );
          log("WA internal stores are ready (detected via page check)");
          clientReady = true;
          progressEmitter.emit("update", { status: "ready", message: "WhatsApp is connected & ready. Starting batch..." });
          return;
        } catch {}

        if (Date.now() - connectedAt > 15000) {
          warn("Proceeding after CONNECTED>15s without 'ready' (store warm-up will be implicit)");
          clientReady = true;
          progressEmitter.emit("update", { status: "ready", message: "WhatsApp is connected. Preparing to start..." });
          return;
        }
      }
    } catch (e) {
      log("WA getState error (probably not launched yet):", e?.message);
    }
    await delay(2000);
  }
  throw new Error("WhatsApp not fully ready after waiting 5 minutes");
}

// Initialize once and keep alive
async function ensureClient() {
  if (client && clientReady) return client;
  if (clientInitializing) {
    let spins = 0;
    while (clientInitializing && spins++ < 180) { await delay(1000); }
    return client;
  }

  clientInitializing = true;

  client = new Client({
    authStrategy: new LocalAuth({
      clientId: "primary",
      dataPath: path.join(__dirname, ".wwebjs_auth"),
    }),
    // This keeps a compatible web build cached locally so Store hooks stay stable:
    webVersionCache: { type: "local" },           // <-- important
    restartOnAuthFail: true,
    puppeteer: {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-gpu",
      ],
    },
  });

  client.on("loading_screen", (percent, message) => {
    log(`WA loading_screen: ${percent}% - ${message}`);
  });

  client.on("qr", async (qr) => {
    try {
      const qrImage = await QRCode.toDataURL(qr);
      progressEmitter.emit("update", { status: "qr", qrImage });
      log("QR generated and sent to client");
      if (readyTimer) clearTimeout(readyTimer);
      readyTimer = setTimeout(() => {
        warn("Ready timeout after QR (2 min) — still not ready");
        progressEmitter.emit("update", {
          status: "error",
          message: "Still waiting for WhatsApp. Please ensure the phone is online and the QR is scanned."
        });
      }, 120000);
    } catch (e) {
      err("Failed to generate QR image:", e?.message);
    }
  });

  client.on("authenticated", () => log("WA authenticated"));
  client.on("remote_session_saved", () => log("WA remote_session_saved"));
  client.on("change_state", (state) => log("WA state:", state));

  client.on("ready", () => {
    if (readyTimer) clearTimeout(readyTimer);
    clientReady = true;
    readyEventFired = true;
    clientInitializing = false;
    log("WA client is READY");
    progressEmitter.emit("update", { status: "ready", message: "WhatsApp client is ready!" });
  });

  client.on("auth_failure", (m) => {
    clientReady = false;
    readyEventFired = false;
    clientInitializing = false;
    err("WA auth_failure:", m);
    progressEmitter.emit("update", { status: "error", message: "Authentication failed. Reload and scan again." });
  });

  client.on("disconnected", (reason) => {
    clientReady = false;
    readyEventFired = false;
    warn("WA disconnected:", reason);
    progressEmitter.emit("update", { status: "error", message: "WhatsApp disconnected. Reinitializing..." });
    setTimeout(() => client.initialize().catch(e => err("Reinitialize failed:", e?.message)), 2000);
  });

  client.on("error", (e) => err("WA client error:", e?.message || e));

  try {
    await client.initialize();
    log("WA initialize() called");
  } catch (e) {
    clientInitializing = false;
    err("Client initialization failed:", e?.message || e);
    throw e;
  }
  return client;
}

// -------------- simple FIFO job queue --------------
const queue = [];
let processing = false;

async function runQueue() {
  if (processing) return;
  processing = true;
  while (queue.length) {
    const job = queue[0]; // peek
    try {
      await processBatch(job);
    } catch (e) {
      err("Batch failed:", e?.message || e);
      progressEmitter.emit("update", { status: "error", message: `Batch failed: ${e?.message || e}` });
    } finally {
      queue.shift(); // remove current job
    }
  }
  processing = false;
}

// -------------- the actual batch sender --------------
async function processBatch({ filePath, imageFile, mobileColumn, dynamicColumnsMap, messageTemplate }) {
  await ensureClient();
  await waitUntilReady();

  const { header, rows } = await parseXlsxToObjects(filePath, 5000);
  log(`Parsed sheet: header=[${header.join(", ")}], rows=${rows.length}`);

  // validate mapping keys
  const allowed = new Set(header.map(String));
  const validatedMap = {};
  for (const [ph, col] of Object.entries(dynamicColumnsMap || {})) {
    if (!/^[A-Za-z0-9_]{1,32}$/.test(ph)) { warn("Invalid placeholder:", ph); continue; }
    if (!allowed.has(col)) { warn(`Column "${col}" not in header`); continue; }
    validatedMap[ph] = col;
  }

  let sent = 0;
  let idx = 0;
  for (const contact of rows) {
    idx++;
    const raw = (contact[mobileColumn] ?? "").toString();
    const digits = raw.replace(/[^\d]/g, "");
    const jid = `${digits}@c.us`;

    log(`Row ${idx}: raw="${raw}", digits="${digits}", jid="${jid}"`);
    if (!digits) {
      progressEmitter.emit("update", { status: "error", message: `Invalid phone number at row ${idx}` });
      continue;
    }

    // Verify WhatsApp registration to avoid internal eval errors
    let wid = null;
    try { wid = await client.getNumberId(digits); }
    catch (e) { warn(`getNumberId failed for ${digits}:`, e?.message); }
    if (!wid) {
      progressEmitter.emit("update", { status: "error", message: `Not a WhatsApp number: ${contact[mobileColumn]}` });
      warn(`Not a WhatsApp user: ${digits}`);
      continue;
    }

    const targetId = wid._serialized || jid; // prefer verified serialized id
    const msg = replacePlaceholders(messageTemplate, contact, validatedMap);

    try {
      if (imageFile) {
        const media = MessageMedia.fromFilePath(imageFile);
        await client.sendMessage(targetId, media, { caption: msg || undefined });
        log(`Sent media → ${digits}`);
      } else if (msg) {
        await client.sendMessage(targetId, msg);
        log(`Sent text → ${digits}`);
      } else {
        warn(`No message or image at row ${idx}; skipping`);
        progressEmitter.emit("update", { status: "error", message: `No message or image at row ${idx}. Skipped.` });
        continue;
      }
      sent++;
      progressEmitter.emit("update", { status: "progress", message: `Message sent to ${contact[mobileColumn]}` });
    } catch (e) {
      err(`Send failed (row ${idx} → ${digits}):`, e?.message || e);
      progressEmitter.emit("update", { status: "error", message: `Failed to send to ${contact[mobileColumn]}: ${e?.message || e}` });
    }

    await delay(8000);
  }

  progressEmitter.emit("update", { status: "success", message: `All done. Sent ${sent}/${rows.length}.` });
  log(`Batch finished: ${sent}/${rows.length} sent`);
}

// ---------- route: queue a batch ----------
app.post(
  "/send-messages",
  upload.fields([{ name: "file" }, { name: "image" }]),
  async (req, res) => {
    const filePath = req.files?.file?.[0]?.path;
    let imageFile = req.files?.image?.[0]?.path;
    const mobileColumn = req.body.mobile_column;
    const dynamicColumns = req.body.dynamic_columns || "";
    const messageTemplate = req.body.message || "";

    log("Incoming batch request:", { hasFile: !!filePath, hasImage: !!imageFile, mobileColumn, dynamicColumns });

    if (!filePath || !mobileColumn) {
      warn("Missing required fields: file or mobile_column");
      return res.status(400).json({ status: "error", message: "File and mobile column are required." });
    }

    if (imageFile) {
      imageFile = ensureImageExtension(imageFile);
      log("Image prepared:", imageFile);
    }

    const dynamicColumnsMap = dynamicColumns.split(",").reduce((map, pair) => {
      const [placeholder, column] = pair.split(":").map((s) => (s || "").trim());
      if (placeholder && column) map[placeholder] = column;
      return map;
    }, {});

    progressEmitter.emit("update", { status: "ready", message: "Queued. If QR shows, scan it. Keep phone online." });

    queue.push({ filePath, imageFile, mobileColumn, dynamicColumnsMap, messageTemplate });
    runQueue();

    return res.json({ status: "success", message: "Batch queued!" });
  }
);

// ---------- server start ----------
app.listen(3000, "0.0.0.0", () => {
  log("Server running on http://localhost:3000");
});

