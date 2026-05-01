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

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
  init();

  setInterval(loadLiveAttendance, 3000);
  setInterval(checkRFIDEvent, 3000);

  loadLiveAttendance();
  checkRFIDEvent();
});

// ================= UI EVENTS =================
const refreshBtn = document.getElementById("refreshBtn");
if (refreshBtn) refreshBtn.addEventListener("click", init);

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
  return isNaN(d) ? value : d.toLocaleDateString("en-MY");
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ================= JSONP =================
function fetchJsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Date.now();
    const script = document.createElement("script");

    window[cb] = data => {
      resolve(data);
      delete window[cb];
      script.remove();
    };

    script.onerror = () => reject("JSONP failed");

    script.src = `${url}${url.includes("?") ? "&" : "?"}callback=${cb}`;
    document.body.appendChild(script);
  });
}

// ================= RENDER =================
function renderStudent(s) {
  setText("studentId", s.student_id);
  setText("studentName", s.student_name);
  setText("className", s.class_name);
  setText("parentName", s.parent_name);
  setText("balance", formatCurrency(s.balance));
}

function renderAISummary(summary, pending, overdue) {
  const box = document.getElementById("aiSummary");
  if (!box) return;

  box.innerHTML = `
    <strong>AI Summary:</strong> ${escapeHtml(summary)}<br>
    Pending: ${pending} | Overdue: ${overdue}
  `;
}

function renderPerformance(data) {
  const el = document.getElementById("performanceSection");
  if (!el) return;

  el.innerHTML = `
    <div class="card">
      <h3>📊 Performance</h3>
      <p>Yearly: ${data.yearly_index}%</p>
      <p>Completed: ${data.completed_assignments}/${data.total_assignments}</p>
    </div>
  `;
}

// ================= ASSIGNMENTS =================
function renderAssignments(list) {
  const box = document.getElementById("assignmentList");
  if (!box) return;

  if (!list.length) {
    box.innerHTML = "No assignments";
    return;
  }

  box.innerHTML = list.map(a => `
    <div class="assignment-card">
      <h3>${escapeHtml(a.subject)}</h3>
      <p>${escapeHtml(a.detail)}</p>
      <p>Due: ${formatDate(a.due_date)}</p>

      <button onclick="ack('${a.subject}')">ACK</button>
      <button onclick="helper('${a.subject}')">Help</button>
    </div>
  `).join("");
}

// ================= ACTIONS =================
async function ack(subject) {
  await fetchJsonp(`${SCRIPT_URL}?action=ack&id=${STUDENT_ID}&subject=${encodeURIComponent(subject)}`);
  alert("Acknowledged");
}

async function helper(subject) {
  const data = await fetchJsonp(`${SCRIPT_URL}?action=getAssignmentHelper&id=${STUDENT_ID}&subject=${subject}`);
  alert(data.simple_explanation || "No help available");
}

// ================= QUIZ =================
async function loadQuiz(subject) {
  const el = document.getElementById("quizSection");
  if (!el) return;

  const data = await fetchJsonp(`${SCRIPT_URL}?action=getDailyQuiz&id=${STUDENT_ID}&subject=${subject}`);

  if (!data.quizzes || !data.quizzes.length) {
    el.innerHTML = "No quiz";
    return;
  }

  const q = data.quizzes[0];

  el.innerHTML = `
    <h3>${q.question}</h3>
    <button onclick="submitQuiz('${q.question}','A')">A. ${q.option_a}</button>
    <button onclick="submitQuiz('${q.question}','B')">B. ${q.option_b}</button>
  `;
}

async function submitQuiz(question, answer) {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      action:"submitQuizAnswer",
      student_id: STUDENT_ID,
      question,
      student_answer: answer
    })
  }).then(r=>r.json());

  alert(res.result);
}

// ================= INIT =================
async function init() {
  const status = document.getElementById("statusMsg");
  if (status) status.innerText = "Loading...";

  try {
    const data = await fetchJsonp(`${SCRIPT_URL}?action=getDashboardBundle&id=${STUDENT_ID}`);

    renderStudent(data.student);
    renderAISummary(data.ai_summary, data.pending_count, data.overdue_count);
    renderAssignments(data.assignments);

    const perf = await fetchJsonp(`${SCRIPT_URL}?action=getPerformanceIndex&id=${STUDENT_ID}`);
    renderPerformance(perf);

    if (status) status.innerText = "Ready";
  } catch (e) {
    if (status) status.innerText = "Error";
  }
}

// ================= RFID =================
let lastRFID = "";

async function checkRFIDEvent() {
  const data = await fetchJsonp(`${SCRIPT_URL}?action=getLastRFIDEvent`);

  if (data.timestamp !== lastRFID) {
    lastRFID = data.timestamp;
    showRFIDPopup(data);
  }
}

function showRFIDPopup(data) {
  const popup = document.getElementById("rfidPopup");
  const msg = document.getElementById("rfidMessage");

  if (!popup || !msg) return;

  msg.innerHTML = `
    <h2>${data.student_name}</h2>
    <p>${data.class_name}</p>
  `;

  popup.style.display = "flex";
  setTimeout(()=>popup.style.display="none",3000);
}

// ================= LIVE ATTENDANCE =================
async function loadLiveAttendance() {
  const data = await fetchJsonp(`${SCRIPT_URL}?action=getLiveAttendance`);

  const box = document.getElementById("attendanceList");
  const count = document.getElementById("attendanceCount");

  if (count) count.innerText = `Total: ${data.total}`;

  if (box) {
    box.innerHTML = data.students.map(s => `
      <div>${s.student_name}</div>
    `).join("");
  }
}

// ================= UTIL =================
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerText = val || "-";
}
