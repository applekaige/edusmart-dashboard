const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGRRktezMyxBJ_Q_N0dPHAIKI0nBeQukF4USmKG-konnTiXeo3Jz8XOf12FNxCFxb-/exec";
const refreshBtn = document.getElementById("refreshAnalyticsBtn");
if (refreshBtn) {
  refreshBtn.addEventListener("click", initAnalytics);
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
    const callbackName =
      "jsonp_cb_" + Date.now() + "_" + Math.floor(Math.random() * 100000);

    const script = document.createElement("script");

    window[callbackName] = function (data) {
      resolve(data);
      delete window[callbackName];
      script.remove();
    };

    script.onerror = function () {
      reject(new Error("JSONP request failed"));
      delete window[callbackName];
      script.remove();
    };

    const separator = url.includes("?") ? "&" : "?";
    script.src = `${url}${separator}callback=${callbackName}`;
    document.body.appendChild(script);
  });
}

function renderSummary(data) {
  document.getElementById("totalStudents").innerText = data.total_students || 0;
  document.getElementById("pendingAssignments").innerText = data.pending_assignments || 0;
  document.getElementById("overdueAssignments").innerText = data.overdue_assignments || 0;
  document.getElementById("notAckedCount").innerText = (data.not_acked || []).length;
}

function buildInsight(data) {
  const total = Number(data.total_students || 0);
  const pending = Number(data.pending_assignments || 0);
  const overdue = Number(data.overdue_assignments || 0);
  const notAcked = (data.not_acked || []).length;

  if (total === 0) {
    return "No student data found yet.";
  }

  let lines = [];

  lines.push(`There are ${total} students in the system.`);

  if (pending === 0) {
    lines.push("There are no pending assignments right now.");
  } else {
    lines.push(`${pending} assignment(s) are still pending.`);
  }

  if (overdue > 0) {
    lines.push(`${overdue} overdue assignment(s) need immediate follow-up.`);
  } else {
    lines.push("There are no overdue assignments at the moment.");
  }

  if (notAcked > 0) {
    lines.push(`${notAcked} assignment acknowledgement(s) are still missing from parents.`);
  } else {
    lines.push("All listed assignments have been acknowledged.");
  }

  return lines.join(" ");
}

function renderInsight(data) {
  const el = document.getElementById("teacherInsight");
  el.innerText = buildInsight(data);
}

function renderNotAckedTable(items) {
  const tbody = document.getElementById("notAckedTableBody");
  tbody.innerHTML = "";

  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2">No outstanding acknowledgements.</td></tr>`;
    return;
  }

  items.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(item.student_id)}</td>
      <td>${escapeHtml(item.subject)}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function initAnalytics() {
  document.getElementById("analyticsStatusMsg").innerText = "Loading...";

  try {
    const url = `${SCRIPT_URL}?action=getTeacherAnalytics`;
    console.log("Calling API:", url);

    const data = await fetchJsonp(url);
    console.log("API response:", data);

    if (data.status !== "success") {
      throw new Error(data.message);
    }

    renderSummary(data);
    renderInsight(data);
    renderNotAckedTable(data.not_acked);

    document.getElementById("analyticsStatusMsg").innerText = "Connected";

  } catch (error) {
    console.error("ERROR:", error);
    document.getElementById("analyticsStatusMsg").innerText =
      `Connection failed: ${error.message}`;
  }
}


initAnalytics();
