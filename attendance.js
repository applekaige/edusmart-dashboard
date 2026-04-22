const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGRRktezMyxBJ_Q_N0dPHAIKI0nBeQukF4USmKG-konnTiXeo3Jz8XOf12FNxCFxb-/exec";

const refreshBtn = document.getElementById("refreshAttendanceBtn");
if (refreshBtn) {
  refreshBtn.addEventListener("click", initAttendanceDashboard);
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return `RM ${number.toFixed(2)}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-MY");
}

function fetchJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName =
      "jsonp_cb_" + Date.now() + "_" + Math.floor(Math.random() * 100000);

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

function renderSummary(data) {
  document.getElementById("totalRecords").innerText = data.total_records || 0;
  document.getElementById("todayAttendance").innerText = data.today_attendance_count || 0;
  document.getElementById("todayCanteenCount").innerText = data.today_canteen_count || 0;
  document.getElementById("todayCanteenAmount").innerText = formatCurrency(data.today_canteen_amount || 0);
}

function renderInsight(data) {
  const lines = [];

  lines.push(`There are ${data.total_records || 0} total RFID records in the system.`);
  lines.push(`Today attendance count is ${data.today_attendance_count || 0}.`);
  lines.push(`Today canteen transaction count is ${data.today_canteen_count || 0}.`);
  lines.push(`Today canteen collection is ${formatCurrency(data.today_canteen_amount || 0)}.`);

  document.getElementById("attendanceInsight").innerText = lines.join(" ");
}

function renderTable(records) {
  const tbody = document.getElementById("attendanceTableBody");
  tbody.innerHTML = "";

  if (!records || records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8">No records found.</td></tr>`;
    return;
  }

  records.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(formatDateTime(item.timestamp))}</td>
      <td>${escapeHtml(item.student_id)}</td>
      <td>${escapeHtml(item.student_name)}</td>
      <td>${escapeHtml(item.class_name)}</td>
      <td>${escapeHtml(item.event_type)}</td>
      <td>${item.event_type === "CANTEEN" ? escapeHtml(formatCurrency(item.amount)) : "-"}</td>
      <td>${item.balance_after !== "" && item.balance_after !== null ? escapeHtml(formatCurrency(item.balance_after)) : "-"}</td>
      <td>${escapeHtml(item.remarks)}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function initAttendanceDashboard() {
  document.getElementById("attendanceStatusMsg").innerText = "Loading dashboard...";

  try {
    const url = `${SCRIPT_URL}?action=getAttendanceDashboard`;
    const data = await fetchJsonp(url);

    if (data.status !== "success") {
      throw new Error(data.message || "Failed to load attendance dashboard");
    }

    renderSummary(data);
    renderInsight(data);
    renderTable(data.latest_records || []);

    document.getElementById("attendanceStatusMsg").innerText =
      `Dashboard online | Last sync: ${new Date().toLocaleString("en-MY")}`;
  } catch (error) {
    document.getElementById("attendanceStatusMsg").innerText =
      `Connection failed: ${error.message}`;
    console.error(error);
  }
}

initAttendanceDashboard();
