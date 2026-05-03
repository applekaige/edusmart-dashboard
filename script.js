// ================= CONFIG =================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGRRktezMyxBJ_Q_N0dPHAIKI0nBeQukF4USmKG-konnTiXeo3Jz8XOf12FNxCFxb-/exec";

// ================= SESSION =================
const params = new URLSearchParams(window.location.search);
const STUDENT_ID =
  localStorage.getItem("edusmart_student_id") ||
  params.get("id") ||
  "";

if (!STUDENT_ID) {
  window.location.href = "login.html";
  throw new Error("No student ID found");
}

// Save ID if opened using ?id=
localStorage.setItem("edusmart_student_id", STUDENT_ID);

// ================= GLOBAL FLAGS =================
let lastRFIDKey = "";
let isRFIDPopupVisible = false;
let dashboardLoading = false;
let attendanceLoading = false;
let rfidChecking = false;

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
  init();

  setInterval(loadLiveAttendance, 8000);
  setInterval(checkRFIDEvent, 8000);

  loadLiveAttendance();
  checkRFIDEvent();
});

// ================= UI EVENTS =================
const refreshBtn = document.getElementById("refreshBtn");
if (refreshBtn) {
  refreshBtn.addEventListener("click", init);
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("edusmart_student_id");
    localStorage.removeItem("edusmart_logged_in");
    window.location.href = "login.html";
  });
}

// ================= HELPERS =================
function formatCurrency(value) {
  return `RM ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);

  return d.toLocaleDateString("en-MY", {
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
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerText = val !== undefined && val !== null && val !== "" ? val : "-";
}

// ================= JSONP =================
function fetchJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName =
      "jsonp_cb_" + Date.now() + "_" + Math.floor(Math.random() * 100000);

    const script = document.createElement("script");

    const timeout = setTimeout(() => {
      reject(new Error("JSONP timeout"));
      delete window[callbackName];
      script.remove();
    }, 15000);

    window[callbackName] = function (data) {
      clearTimeout(timeout);
      resolve(data);
      delete window[callbackName];
      script.remove();
    };

    script.onerror = function () {
      clearTimeout(timeout);
      reject(new Error("JSONP request failed"));
      delete window[callbackName];
      script.remove();
    };

    const separator = url.includes("?") ? "&" : "?";
    script.src = `${url}${separator}callback=${callbackName}`;
    document.body.appendChild(script);
  });
}

// ================= RENDER STUDENT =================
function renderStudent(student) {
  if (!student) return;

  setText("studentId", student.student_id || student.StudentID);
  setText("studentName", student.student_name || student.StudentName);
  setText("className", student.class_name || student.Class);
  setText("parentName", student.parent_name || student.ParentName);

  const balance = student.balance ?? student.Balance ?? 0;
  setText("balance", formatCurrency(balance));
}

// ================= AI SUMMARY =================
function renderAISummary(summary, pending, overdue) {
  const box = document.getElementById("aiSummary");
  if (!box) return;

  box.innerHTML = `
    <strong>AI Summary:</strong> ${escapeHtml(summary || "No summary available.")}<br>
    <strong>Pending:</strong> ${pending || 0} |
    <strong>Overdue:</strong> ${overdue || 0}
  `;
}

// ================= PERFORMANCE =================
function renderPerformance(data) {
  const el = document.getElementById("performanceSection");
  if (!el || !data) return;

  el.innerHTML = `
    <div class="card">
      <h3>📊 Performance</h3>
      <p><strong>Yearly:</strong> ${escapeHtml(data.yearly_index || 0)}%</p>
      <p><strong>Completed:</strong> ${escapeHtml(data.completed_assignments || 0)}/${escapeHtml(data.total_assignments || 0)}</p>
    </div>
  `;
}

// ================= ASSIGNMENTS =================
function renderAssignments(list) {
  const box = document.getElementById("assignmentList");
  if (!box) return;

  if (!list || !list.length) {
    box.innerHTML = `<div class="empty">No assignments found.</div>`;
    return;
  }

  box.innerHTML = "";

  list.sort((a, b) => new Date(a.due_date || a.DueDate) - new Date(b.due_date || b.DueDate));

  list.forEach(item => {
    const subject = item.subject || item.Subject || "";
    const detail = item.detail || item.Detail || "";
    const dueDate = item.due_date || item.DueDate || "";
    const status = item.status || item.Status || "Pending";

    const card = document.createElement("div");
    card.className = "assignment-card";

    const dueDateObj = new Date(dueDate);
    const today = new Date();

    const isOverdue =
      !isNaN(dueDateObj.getTime()) &&
      dueDateObj < today &&
      String(status).toLowerCase() === "pending";

    if (isOverdue) card.classList.add("overdue");

    card.innerHTML = `
      <h3>${escapeHtml(subject)}</h3>
      <p class="assignment-meta"><strong>Task:</strong> ${escapeHtml(detail)}</p>
      <p class="assignment-meta"><strong>Due Date:</strong> ${escapeHtml(formatDate(dueDate))}</p>

      <span class="status-badge ${
        String(status).toLowerCase() === "pending" ? "status-pending" : "status-done"
      }">
        ${escapeHtml(status)}
      </span>

      <br><br>

      <button class="helper-btn">Help Me Understand</button>
      <button class="ack-btn">ACKNOWLEDGE</button>

      <div class="helper-box" style="display:none; margin-top:12px;"></div>
    `;

    const ackBtn = card.querySelector(".ack-btn");
    const helperBtn = card.querySelector(".helper-btn");
    const helperBox = card.querySelector(".helper-box");

    ackBtn.addEventListener("click", () => ack(subject, ackBtn));
    helperBtn.addEventListener("click", () => helper(subject, helperBtn, helperBox));

    box.appendChild(card);
  });
}

// ================= ACK =================
async function ack(subject, button) {
  if (!subject) {
    alert("Subject missing.");
    return;
  }

  if (button) {
    button.innerText = "Syncing...";
    button.disabled = true;
  }

  try {
    const data = await fetchJsonp(
      `${SCRIPT_URL}?action=ack&id=${encodeURIComponent(STUDENT_ID)}&subject=${encodeURIComponent(subject)}`
    );

    if (data.status === "success") {
      if (button) {
        button.innerText = "✅ SEEN";
        button.classList.add("done");
      } else {
        alert("Acknowledged");
      }
    } else {
      throw new Error(data.message || "ACK failed");
    }
  } catch (error) {
    if (button) {
      button.innerText = "Retry";
      button.disabled = false;
    }
    alert("ACK failed");
  }
}

// ================= HELPER =================
async function helper(subject, button, box) {
  if (!subject) {
    alert("Subject missing.");
    return;
  }

  if (button) {
    button.innerText = "Loading help...";
    button.disabled = true;
  }

  try {
    const data = await fetchJsonp(
      `${SCRIPT_URL}?action=getAssignmentHelper&id=${encodeURIComponent(STUDENT_ID)}&subject=${encodeURIComponent(subject)}`
    );

    if (data.status === "success") {
      if (box) {
        box.style.display = "block";
        box.innerHTML = `
          <div><strong>Simple Explanation:</strong> ${escapeHtml(data.simple_explanation || "-")}</div>
          <div style="margin-top:8px;"><strong>Parent Action:</strong> ${escapeHtml(data.parent_action || "-")}</div>
          <div style="margin-top:8px;"><strong>Materials Needed:</strong> ${escapeHtml(data.materials_needed || "-")}</div>
          <div style="margin-top:8px;"><strong>Estimated Time:</strong> ${escapeHtml(data.estimated_time || "-")}</div>
          <div style="margin-top:8px;"><strong>Note:</strong> ${escapeHtml(data.encouragement || "-")}</div>
        `;
      } else {
        alert(data.simple_explanation || "No help available");
      }

      if (button) button.innerText = "AI Help Ready";
    } else {
      throw new Error(data.message || "No help available");
    }
  } catch (error) {
    if (button) {
      button.innerText = "Try Again";
      button.disabled = false;
    }
    alert("Unable to load help.");
  }
}

// ================= QUIZ =================
async function loadQuiz(subject) {
  const el = document.getElementById("quizSection");
  if (!el) return;

  try {
    const data = await fetchJsonp(
      `${SCRIPT_URL}?action=getDailyQuiz&id=${encodeURIComponent(STUDENT_ID)}&subject=${encodeURIComponent(subject)}`
    );

    if (!data.quizzes || !data.quizzes.length) {
      el.innerHTML = "No quiz found.";
      return;
    }

    const q = data.quizzes[0];

    el.innerHTML = `
      <h3>${escapeHtml(q.question)}</h3>
      <button onclick="submitQuiz('${escapeHtml(subject)}','${escapeHtml(q.question)}','A')">A. ${escapeHtml(q.option_a)}</button>
      <button onclick="submitQuiz('${escapeHtml(subject)}','${escapeHtml(q.question)}','B')">B. ${escapeHtml(q.option_b)}</button>
      <button onclick="submitQuiz('${escapeHtml(subject)}','${escapeHtml(q.question)}','C')">C. ${escapeHtml(q.option_c)}</button>
      <button onclick="submitQuiz('${escapeHtml(subject)}','${escapeHtml(q.question)}','D')">D. ${escapeHtml(q.option_d)}</button>
    `;
  } catch (error) {
    el.innerHTML = "Quiz loading failed.";
  }
}

async function submitQuiz(subject, question, answer) {
  try {
    const data = await fetchJsonp(
      `${SCRIPT_URL}?action=submitQuizAnswer&id=${encodeURIComponent(STUDENT_ID)}&subject=${encodeURIComponent(subject)}&question=${encodeURIComponent(question)}&answer=${encodeURIComponent(answer)}`
    );

    alert(data.result || "Quiz submitted");
  } catch (error) {
    alert("Quiz submission failed.");
  }
}

// ================= MAIN INIT =================
async function init() {
  if (dashboardLoading) return;
  dashboardLoading = true;

  const status = document.getElementById("statusMsg");
  if (status) status.innerText = "Loading data...";

  try {
    const data = await fetchJsonp(
      `${SCRIPT_URL}?action=getDashboardBundle&id=${encodeURIComponent(STUDENT_ID)}`
    );

    if (!data || data.status !== "success") {
      throw new Error(data.message || "Failed to load dashboard");
    }

    renderStudent(data.student);
    renderAISummary(data.ai_summary, data.pending_count, data.overdue_count);
    renderAssignments(data.assignments || []);

    try {
      const perf = await fetchJsonp(
        `${SCRIPT_URL}?action=getPerformanceIndex&id=${encodeURIComponent(STUDENT_ID)}`
      );
      renderPerformance(perf);
    } catch (e) {
      console.warn("Performance section failed", e);
    }

    if (status) {
      status.innerText = `Backend online | Last sync: ${new Date().toLocaleString("en-MY")}`;
    }
  } catch (error) {
    if (status) {
      status.innerText = `Connection failed: ${error.message}`;
    }
    console.error(error);
  } finally {
    dashboardLoading = false;
  }
}

// ================= RFID =================
async function checkRFIDEvent() {
  if (rfidChecking) return;
  rfidChecking = true;

  try {
    const data = await fetchJsonp(`${SCRIPT_URL}?action=getLastRFIDEvent`);

    if (!data || data.status !== "success") return;

    const studentId = data.student_id || data.StudentID || "";
    const studentName = data.student_name || data.StudentName || "";
    const className = data.class_name || data.Class || "";
    const eventType = data.event_type || data.EventType || "";
    const amount = data.amount || data.Amount || "";
    const timestamp = data.timestamp || data.Timestamp || "";

    if (!studentId && !studentName && !eventType) return;

    const eventKey = `${studentId}_${studentName}_${eventType}_${amount}_${timestamp}`;

    if (eventKey === lastRFIDKey) return;
    lastRFIDKey = eventKey;

    showRFIDPopup({
      student_name: studentName,
      class_name: className,
      event_type: eventType,
      amount: amount,
      timestamp: timestamp
    });

  } catch (error) {
    console.warn("RFID check failed", error);
  } finally {
    rfidChecking = false;
  }
}

function showRFIDPopup(data) {
  if (isRFIDPopupVisible) return;

  const popup = document.getElementById("rfidPopup");
  const msg = document.getElementById("rfidMessage");

  if (!popup || !msg) return;

  const name = data.student_name || "Student";
  const cls = data.class_name || "";
  const type = (data.event_type || "").toUpperCase();
  const amount = Number(data.amount || 0);

  let bgColor = "#2ecc71"; // default green
  let title = "";
  let subtitle = "";
  let voiceText = "";

  // 🎯 Smart UI logic
  if (type === "ATTENDANCE") {
    bgColor = "#2ecc71";
    title = "✅ Attendance Recorded";
    subtitle = `${name} (${cls}) is present`;
    voiceText = `${name} attendance recorded`;
  }

  else if (type === "CANTEEN") {
    bgColor = "#3498db";
    title = "💰 Canteen Payment";
    subtitle = `RM ${amount.toFixed(2)} deducted`;
    voiceText = `Payment ${amount} ringgit`;
  }

  // 🚨 Low balance check
  if (data.balance !== undefined && data.balance < 5) {
    bgColor = "#e74c3c";
    subtitle += `<br><strong>⚠️ Low Balance: RM ${data.balance.toFixed(2)}</strong>`;
    voiceText += `. Low balance`;
  }

  isRFIDPopupVisible = true;

  msg.innerHTML = `
    <div style="background:${bgColor};padding:20px;border-radius:12px;color:white;text-align:center;">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(subtitle)}</p>
    </div>
  `;

  popup.style.display = "flex";

  // 🔊 SOUND
  playBeep();

  // 🗣 VOICE
  speakText(voiceText);

  setTimeout(() => {
    popup.style.display = "none";
    isRFIDPopupVisible = false;
  }, 3500);
}

// ================= LIVE ATTENDANCE =================
async function loadLiveAttendance() {
  if (attendanceLoading) return;
  attendanceLoading = true;

  try {
    const data = await fetchJsonp(`${SCRIPT_URL}?action=getLiveAttendance`);

    const box = document.getElementById("attendanceList");
    const count = document.getElementById("attendanceCount");

    if (count) count.innerText = `Total: ${data.total || 0}`;

    if (box) {
      const students = data.students || [];

      if (!students.length) {
        box.innerHTML = `<div class="empty">No attendance yet.</div>`;
        return;
      }

      box.innerHTML = students.map(s => `
        <div>${escapeHtml(s.student_name || s.StudentName || "")}</div>
      `).join("");
    }
  } catch (error) {
    console.warn("Live attendance failed", error);
  } finally {
    attendanceLoading = false;
  }
}
