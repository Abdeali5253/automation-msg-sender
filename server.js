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

const app = express();
const __dirname = path.resolve();
const upload = multer({ dest: "uploads/" });
const progressEmitter = new EventEmitter();

// ------------ Config ------------
const AUTH_DIR =
  process.env.WWEBJS_AUTH_DIR ||
  (process.platform === "win32" ? "C:\\wwebjs_data\\auth" : "/var/tmp/wwebjs/auth");
const CACHE_DIR =
  process.env.WWEBJS_CACHE_DIR ||
  (process.platform === "win32" ? "C:\\wwebjs_data\\cache" : "/var/tmp/wwebjs/cache");
const SEND_DELAY_MS = 8000;
const STORE_PROBE_TIMEOUT_MS = 8000;
const CONNECTED_GRACE_MS = 20000;
const OVERALL_READY_TIMEOUT_MS = 90000;
const WWEBJS_INJECT_TIMEOUT_MS = 10000;
const SEND_RETRIES = 2;
// ----------------------------------

function log(...args) {
  const line = `[SRV ${new Date().toISOString()}] ${args.join(" ")}`;
  console.log(line);
}

function push(data) {
  progressEmitter.emit("update", data);
  if (data?.message) log(data.message);
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Serve static UI
app.use(express.static(path.join(__dirname)));

// SSE: multi-client stream
const clients = new Set();
app.get("/progress", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  clients.add(res);
  progressEmitter.on("update", send);
  req.on("close", () => {
    clients.delete(res);
    progressEmitter.removeListener("update", send);
    res.end();
  });
  log("[SSE] client connected");
});

// ---------- helpers ----------
function formatPhone(raw) {
  const digits = (raw ?? "").toString().replace(/[^\d]/g, "");
  return digits ? `${digits}@c.us` : null;
}

function ensureImageExtension(filePath) {
  const withExt = `${filePath}.jpg`;
  try { fs.renameSync(filePath, withExt); } catch {}
  return withExt;
}

async function storesReady(page, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await page.evaluate(() => !!(window.Store && Store.Chat && Store.Msg && Store.Contact));
      if (ok) return true;
    } catch {}
    await delay(250);
  }
  return false;
}

async function wwebjsInjected(page, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await page.evaluate(() => typeof window.WWebJS !== "undefined" && !!window.WWebJS.getChat);
      if (ok) return true;
    } catch {}
    await delay(250);
  }
  return false;
}

function isGetChatUndefinedError(err) {
  const msg = String(err?.message || err || "");
  return msg.includes("reading 'getChat'") || msg.includes("getChat is not a function");
}

/** Wait for: 'ready' OR CONNECTED+stores OR CONNECTED for a grace window */
async function waitForClientReadyOrConnected(client) {
  log("[READY] wait start");
  let resolved = false;
  let connectedAt = null;

  const whenReady = new Promise((resolve) => {
    client.once("ready", async () => {
      if (resolved) return;
      log("[READY] event 'ready' fired; probing stores...");
      try {
        const page = await client.pupPage;
        if (await storesReady(page, STORE_PROBE_TIMEOUT_MS)) {
          resolved = true;
          push({ status: "ready", message: "WhatsApp client is ready!" });
          return resolve();
        }
      } catch {}
      resolved = true;
      push({ status: "ready", message: "WhatsApp client reported ready (grace)." });
      resolve();
    });
  });

  const pollState = (async () => {
    const start = Date.now();
    while (!resolved && Date.now() - start < OVERALL_READY_TIMEOUT_MS) {
      const state = await client.getState().catch(() => null);
      log(`[READY] state=${state}`);
      if (state === "CONNECTED") {
        if (!connectedAt) {
          connectedAt = Date.now();
          push({ status: "progress", message: "WhatsApp CONNECTED; warming internal stores..." });
        }
        try {
          const page = await client.pupPage;
          if (await storesReady(page, 1500)) {
            if (!resolved) {
              resolved = true;
              push({ status: "ready", message: "WhatsApp internal stores are ready." });
              return;
            }
          }
        } catch {}
        if (Date.now() - connectedAt >= CONNECTED_GRACE_MS) {
          if (!resolved) {
            resolved = true;
            push({ status: "ready", message: "Proceeding after connection grace period." });
            return;
          }
        }
      }
      await delay(500);
    }
  })();

  const timeout = new Promise((_, reject) =>
    setTimeout(() => {
      if (!resolved) {
        log("[READY] timeout");
        reject(new Error("WhatsApp client didn't become ready in time"));
      }
    }, OVERALL_READY_TIMEOUT_MS)
  );

  await Promise.race([whenReady, pollState, timeout]);
  log("[READY] wait complete");
}

async function ensureWWebJSInjected(client) {
  const page = await client.pupPage;
  log("[INJECT] checking window.WWebJS...");
  if (await wwebjsInjected(page, 1)) {
    log("[INJECT] window.WWebJS present");
    return;
  }
  if (await wwebjsInjected(page, WWEBJS_INJECT_TIMEOUT_MS)) {
    log("[INJECT] window.WWebJS appeared after wait");
    return;
  }
  log("[INJECT] window.WWebJS missing; soft reload...");
  await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
  await delay(2000);
  for (let i = 0; i < 30; i++) {
    const state = await client.getState().catch(() => null);
    log(`[INJECT] post-reload state=${state}`);
    if (state === "CONNECTED") break;
    await delay(500);
  }
  if (await wwebjsInjected(page, WWEBJS_INJECT_TIMEOUT_MS)) {
    log("[INJECT] window.WWebJS available after reload");
    return;
  }
  throw new Error("WWebJS helpers failed to inject");
}

// ---------- WhatsApp client factory ----------
async function newClient() {
  log(`[INIT] starting client; AUTH_DIR=${AUTH_DIR} CACHE_DIR=${CACHE_DIR}`);
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: "primary",
      dataPath: AUTH_DIR,
    }),
    webVersion: "2.2412.54",
    webVersionCache: { type: "local", path: CACHE_DIR },
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

  let loggedOut = false;

  client.on("qr", async (qr) => {
    log("[EVT] qr received");
    const qrImage = await QRCode.toDataURL(qr);
    push({ status: "qr", qrImage });
  });

  client.on("authenticated", () => {
    push({ status: "progress", message: "WA authenticated" });
  });

  client.on("disconnected", (reason) => {
    loggedOut = true;
    push({ status: "error", message: `WhatsApp disconnected: ${reason}` });
  });

  client.on("auth_failure", (e) => {
    push({ status: "error", message: `Authentication failed: ${e?.message || e}` });
  });

  await client.initialize();
  log("[INIT] initialize() called");
  return {
    client,
    get loggedOut() { return loggedOut; },
  };
}

// ---------- Batch sender ----------
async function sendMessageWithRetry(client, jid, payload) {
  for (let attempt = 0; attempt <= SEND_RETRIES; attempt++) {
    try {
      if (payload.type === "media") {
        await client.sendMessage(jid, payload.media, { caption: payload.caption || undefined });
      } else {
        await client.sendMessage(jid, payload.text || "");
      }
      return true;
    } catch (e) {
      const last = attempt === SEND_RETRIES;
      if (isGetChatUndefinedError(e) && !last) {
        log(`[SEND] getChat undefined; re-checking injection (attempt ${attempt + 1}/${SEND_RETRIES})`);
        try {
          await ensureWWebJSInjected(client);
        } catch (injErr) {
          log(`[SEND] reinjection failed: ${injErr.message}`);
        }
        await delay(1000);
        continue;
      }
      throw e;
    }
  }
  return false;
}

async function sendBatch({ workbookPath, imagePath, mobileColumn, map, template }) {
  log(`[BATCH] start file=${workbookPath} image=${!!imagePath} mobileCol=${mobileColumn}`);
  const { client, loggedOut } = await newClient();

  await waitForClientReadyOrConnected(client);
  const state = await client.getState().catch(() => null);
  log(`[BATCH] post-ready state=${state}`);
  if (state !== "CONNECTED") throw new Error(`WhatsApp not connected (state=${state})`);

  try {
    await ensureWWebJSInjected(client);
    push({ status: "progress", message: "WhatsApp helpers ready." });
  } catch (e) {
    push({ status: "progress", message: `Warning: ${e.message}` });
    log(`[INJECT] warning: ${e.message}`);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(workbookPath);
  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error("No sheet found in the uploaded file");
  push({ status: "progress", message: `Parsed sheet: rows=${sheet.rowCount}` });

  for (let r = 2; r <= sheet.rowCount; r++) {
    if (loggedOut) throw new Error("Session logged out; aborting batch");
    const s = await client.getState().catch(() => null);
    //log(`[ROW ${r - 1}] state=${s}`);
    if (s !== "CONNECTED") throw new Error(`Client state is ${s}; aborting`);

    const header = sheet.getRow(1).values;
    const row = sheet.getRow(r).values;
    const contact = {};
    for (let i = 1; i < header.length; i++) {
      const key = (header[i] ?? "").toString().trim();
      if (key) contact[key] = row[i] ?? "";
    }

    const jid = formatPhone(contact[mobileColumn]);
    //log(`[ROW ${r - 1}] rawMobile=${contact[mobileColumn]} jid=${jid}`);
    if (!jid) {
      push({ status: "error", message: `Row ${r - 1}: invalid phone` });
      continue;
    }

    let msg = template || "";
    for (const [ph, col] of Object.entries(map)) {
      msg = msg.replace(new RegExp(`\\{${ph}\\}`, "g"), contact[col] ?? "");
    }
    //log(`[ROW ${r - 1}] message="${msg.replace(/\n/g, "\\n")}"`);

    let numberId = null;
    try {
      numberId = await client.getNumberId(jid.replace("@c.us", ""));
      log(`[ROW ${r - 1}] getNumberId => ${numberId ? "FOUND" : "NULL"}`);
      if (!numberId) {
        await delay(1500);
        numberId = await client.getNumberId(jid.replace("@c.us", "")).catch(() => null);
        log(`[ROW ${r - 1}] getNumberId (retry) => ${numberId ? "FOUND" : "NULL"}`);
      }
    } catch (e) {
      log(`[ROW ${r - 1}] getNumberId ERROR: ${e.message}`);
    }
    if (!numberId) {
      push({ status: "error", message: `Not a WhatsApp user: ${jid}` });
      await delay(250);
      continue;
    }

    try {
      let ok = false;
      if (imagePath) {
        const pathWithExt = imagePath.endsWith(".jpg") ? imagePath : ensureImageExtension(imagePath);
        const media = MessageMedia.fromFilePath(pathWithExt);
        ok = await sendMessageWithRetry(client, jid, { type: "media", media, caption: msg });
      } else {
        ok = await sendMessageWithRetry(client, jid, { type: "text", text: msg });
      }
      if (ok) {
        push({ status: "progress", message: `Message sent to ${jid.replace("@c.us", "")}` });
        log(`[ROW ${r - 1}] sendMessage OK`);
      } else {
        push({ status: "error", message: `Send failed (${jid}): unknown` });
        log(`[ROW ${r - 1}] sendMessage unknown failure`);
      }
    } catch (e) {
      push({ status: "error", message: `Send failed (${jid}): ${e.message}` });
      log(`[ROW ${r - 1}] sendMessage ERROR: ${e.stack || e.message}`);
    }

    await delay(SEND_DELAY_MS);
  }

  push({ status: "success", message: "Batch finished." });
  //log("[BATCH] done; destroying client");
  await client.destroy();
}

// ---------- Routes ----------
app.post(
  "/send-messages",
  upload.fields([{ name: "file" }, { name: "image" }]),
  async (req, res) => {
    try {
      const filePath = req.files?.file?.[0]?.path;
      let imageFile = req.files?.image?.[0]?.path;
      const mobileColumn = req.body?.mobile_column?.trim();
      const dynamicColumns = req.body?.dynamic_columns || "";
      const messageTemplate = req.body?.message || "";

      if (!filePath || !mobileColumn) {
        return res.status(400).json({ status: "error", message: "File and mobile column are required." });
      }
      if (imageFile) imageFile = ensureImageExtension(imageFile);

      const map = dynamicColumns.split(",").reduce((acc, pair) => {
        const [p, c] = pair.split(":").map((s) => s?.trim()).filter(Boolean);
        if (p && c) acc[p] = c;
        return acc;
      }, {});

      push({ status: "progress", message: "Processing your request..." });
      log(`[HTTP] /send-messages accepted; file=${filePath} image=${!!imageFile}`);
      sendBatch({ workbookPath: filePath, imagePath: imageFile, mobileColumn, map, template: messageTemplate })
        .catch((e) => {
          push({ status: "error", message: `Batch failed: ${e.message}` });
          log(`[BATCH] fatal ERROR: ${e.stack || e.message}`);
        });

      res.json({ status: "success", message: "Batch is being processed!" });
    } catch (e) {
      push({ status: "error", message: `Server error: ${e.message}` });
      log(`[HTTP] /send-messages ERROR: ${e.stack || e.message}`);
      res.status(500).json({ status: "error", message: e.message });
    }
  }
);

app.listen(3000, "0.0.0.0", () => {
  log("Server running on http://localhost:3000");
});
