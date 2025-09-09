// Function to apply WhatsApp-like formatting
function formatMessage(message) {
  console.log("[UI] Formatting message:", message);
  return message
    .replace(/\*(.*?)\*/g, "<b>$1</b>")
    .replace(/_(.*?)_/g, "<i>$1</i>")
    .replace(/~(.*?)~/g, "<s>$1</s>")
    .replace(/```(.*?)```/gs, "<pre>$1</pre>")
    .replace(/(?:\r\n|\r|\n)/g, "<br>");
}

document.getElementById("message").addEventListener("input", function () {
  const raw = this.value;
  console.log("[UI] Message input updated:", raw);
  document.getElementById("messagePreview").innerHTML = formatMessage(raw);
});

document.getElementById("image").addEventListener("change", function () {
  const f = this.files[0];
  const img = document.getElementById("imagePreview");
  if (f) {
    console.log("[UI] Image selected:", f.name, f.type, f.size, "bytes");
    const r = new FileReader();
    r.onload = (e) => { img.src = e.target.result; img.style.display = "block"; console.log("[UI] Image preview updated"); };
    r.onerror = (e) => console.error("[UI] Image preview error:", e);
    r.readAsDataURL(f);
  } else {
    img.style.display = "none";
    console.log("[UI] Image cleared");
  }
});

let eventSource;

function listenToProgress() {
  if (eventSource) return;
  eventSource = new EventSource("http://localhost:3000/progress");

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.status === "qr") {
      document.getElementById("status1").innerHTML = `<img src="${data.qrImage}" alt="Scan QR Code" />`;
    } else {
      const statusDiv = document.getElementById("status");
      const p = document.createElement("p");
      p.innerText = data.message;
      statusDiv.appendChild(p);
      const msgs = statusDiv.getElementsByTagName("p");
      if (msgs.length > 10) statusDiv.removeChild(msgs[0]);
    }
    if (data.status === "progress" && /Message sent/.test(data.message)) {
      const counter = document.getElementById("counter");
      counter.innerText = String(parseInt(counter.innerText || "0", 10) + 1);
    }
    if (data.status === "success" || data.status === "error") {
      const sendBtn = document.getElementById("sendButton");
      sendBtn.disabled = false;
      sendBtn.innerText = "Send Messages";
      eventSource.close();
      eventSource = null;
    }
  };

  eventSource.onerror = () => {
    const sendBtn = document.getElementById("sendButton");
    sendBtn.disabled = false;
    sendBtn.innerText = "Send Messages";
    try { eventSource && eventSource.close(); } catch {}
    eventSource = null;
  };
}

document.getElementById("messageForm").addEventListener("submit", (e) => {
  e.preventDefault();
  document.getElementById("counter").innerText = "0";
  document.getElementById("status").innerHTML = "";
  document.getElementById("status1").innerHTML = "";
  const sendBtn = document.getElementById("sendButton");
  sendBtn.disabled = true;
  sendBtn.innerText = "Processing...";
  const formData = new FormData(e.target);
  listenToProgress();
  fetch("http://localhost:3000/send-messages", { method: "POST", body: formData })
    .then((r) => r.json())
    .then((data) => {
      if (data.status !== "success") {
        sendBtn.disabled = false;
        sendBtn.innerText = "Send Messages";
      }
    })
    .catch(() => {
      sendBtn.disabled = false;
      sendBtn.innerText = "Send Messages";
    });
});

