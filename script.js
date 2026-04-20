const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGRRktezMyxBJ_Q_N0dPHAIKI0nBeQukF4USmKG-konnTiXeo3Jz8XOf12FNxCFxb-/exec";
const STUDENT_ID = "STU001";

const refreshBtn = document.getElementById("refreshBtn");
if (refreshBtn) {
  refreshBtn.addEventListener("click", init);
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return `RM ${number.toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
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

function fetchJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = "jsonp_cb_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
    const script = document.createElement("script");

    window[callbackName] = function(data) {
      resolve(data);
      delete window[callbackName];
      script.remove();
    };

    script.onerror = function() {
      reject(new Error("JSONP request failed"));
      delete window[callbackName];
      script.remove();
    };

    const separator = url.includes("?") ? "&" : "?";
    script.src = `${url}${separator}callback=${callbackName}`;
    document.body.appendChild(script);
  });
}

function renderStudent(student) {
  document.getElementById("studentId").innerText = student.student_id || "-";
  document.getElementById("studentName").innerText = student.student_name || "-";
  document.getElementById("className").innerText = student.class_name || "-";
  document.getElementById("parentName").innerText = student.parent_name || "-";
  document.getElementById("balance").innerText = formatCurrency(student.balance);
}

function renderAISummary(summary, pendingCount, overdueCount) {
  const box = document.getElementById("aiSummary");
  if (!box) return;

  box.innerHTML = `
    <strong>AI Summary:</strong> ${escapeHtml(summary)}<br>
    <strong>Pending:</strong> ${pendingCount} |
    <strong>Overdue:</strong> ${overdueCount}
  `;
}

function renderAssignments(assignments) {
  const container = document.getElementById("assignmentList");
  container.innerHTML = "";

  if (!assignments || assignments.length === 0) {
    container.innerHTML = `<div class="empty">No assignments found.</div>`;
    return;
  }

  assignments.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  assignments.forEach((item) => {
    const card = document.createElement("div");
    card.className = "assignment-card";

    const dueDateObj = new Date(item.due_date);
    const now = new Date();
    const isOverdue =
      !isNaN(dueDateObj.getTime()) &&
      dueDateObj < now &&
      String(item.status).toLowerCase() === "pending";

    if (isOverdue) {
      card.classList.add("overdue");
    }

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
        const ackUrl = `${SCRIPT_URL}?action=ack&id=${encodeURIComponent(STUDENT_ID)}&subject=${encodeURIComponent(item.subject)}`;
        const ackData = await fetchJsonp(ackUrl);

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

async function init() {
  document.getElementById("statusMsg").innerText = "Loading data...";

  try {
    const bundleUrl = `${SCRIPT_URL}?action=getDashboardBundle&id=${encodeURIComponent(STUDENT_ID)}`;
    const data = await fetchJsonp(bundleUrl);

    if (data.status !== "success") {
      throw new Error(data.message || "Failed to load dashboard");
    }

    renderStudent(data.student);
    renderAISummary(data.ai_summary, data.pending_count, data.overdue_count);
    renderAssignments(data.assignments);

    document.getElementById("statusMsg").innerText =
      `Backend online | Last sync: ${new Date().toLocaleString("en-MY")}`;
  } catch (error) {
    document.getElementById("statusMsg").innerText =
      `Connection failed: ${error.message}`;
    console.error(error);
  }
}

init();
