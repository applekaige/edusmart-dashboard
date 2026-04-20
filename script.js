const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGRRktezMyxBJ_Q_N0dPHAIKI0nBeQukF4USmKG-konnTiXeo3Jz8XOf12FNxCFxb-/exec";
const STUDENT_ID = "STU001";

document.getElementById("refreshBtn").addEventListener("click", init);

function formatCurrency(value) {
  const number = Number(value || 0);
  return `RM ${number.toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

async function loadStudentData() {
  const url = `${SCRIPT_URL}?action=getStudentData&id=${encodeURIComponent(STUDENT_ID)}`;
  const data = await fetchJson(url);

  if (data.status !== "success") {
    throw new Error(data.message || "Failed to load student data");
  }

  document.getElementById("studentId").innerText = data.student_id || "-";
  document.getElementById("studentName").innerText = data.student_name || "-";
  document.getElementById("className").innerText = data.class_name || "-";
  document.getElementById("parentName").innerText = data.parent_name || "-";
  document.getElementById("balance").innerText = formatCurrency(data.balance);
}

async function loadAssignments() {
  const url = `${SCRIPT_URL}?action=getAssignments&id=${encodeURIComponent(STUDENT_ID)}`;
  const data = await fetchJson(url);

  if (data.status !== "success") {
    throw new Error(data.message || "Failed to load assignments");
  }

  const container = document.getElementById("assignmentList");
  container.innerHTML = "";

  if (!data.assignments || data.assignments.length === 0) {
    container.innerHTML = `<div class="empty">No assignments found.</div>`;
    return;
  }

  data.assignments.forEach((item) => {
    const card = document.createElement("div");
    card.className = "assignment-card";

    const safeSubject = escapeHtml(item.subject);
    const safeDetail = escapeHtml(item.detail);
    const safeStatus = escapeHtml(item.status || "Pending");
    const dueDate = formatDate(item.due_date);

    card.innerHTML = `
      <h3>${safeSubject}</h3>
      <p class="assignment-meta"><strong>Task:</strong> ${safeDetail}</p>
      <p class="assignment-meta"><strong>Due Date:</strong> ${escapeHtml(dueDate)}</p>
      <span class="status-badge ${safeStatus.toLowerCase() === "pending" ? "status-pending" : "status-done"}">
        ${safeStatus}
      </span>
      <button class="ack-btn">ACKNOWLEDGE</button>
    `;

    const btn = card.querySelector(".ack-btn");
    btn.addEventListener("click", async () => {
      btn.innerText = "Syncing...";
      btn.disabled = true;

      try {
        const ackUrl =
          `${SCRIPT_URL}?action=ack&id=${encodeURIComponent(STUDENT_ID)}&subject=${encodeURIComponent(item.subject)}`;
        const ackData = await fetchJson(ackUrl);

        if (ackData.status === "success") {
          btn.innerText = "✅ SEEN";
          btn.classList.add("done");
        } else {
          btn.innerText = "Retry";
          btn.disabled = false;
        }
      } catch (error) {
        btn.innerText = "Retry";
        btn.disabled = false;
      }
    });

    container.appendChild(card);
  });
}

async function checkHealth() {
  const url = `${SCRIPT_URL}?action=health`;
  const data = await fetchJson(url);

  if (data.status !== "online") {
    throw new Error("Backend not healthy");
  }

  document.getElementById("statusMsg").innerText =
    `Backend online | Last sync: ${new Date().toLocaleString("en-MY")}`;
}

async function init() {
  document.getElementById("statusMsg").innerText = "Loading data...";

  try {
    await checkHealth();
    await loadStudentData();
    await loadAssignments();
  } catch (error) {
    document.getElementById("statusMsg").innerText =
      `Connection failed: ${error.message}`;
  }
}

init();
