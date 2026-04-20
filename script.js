const SCRIPT_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
const STUDENT_ID = "STU001";

async function loadStudentData() {
  const res = await fetch(`${SCRIPT_URL}?action=getStudentData&id=${encodeURIComponent(STUDENT_ID)}`);
  const data = await res.json();

  if (data.status !== "success") {
    throw new Error(data.message || "Failed to load student data");
  }

  document.getElementById("studentName").innerText = data.student_name;
  document.getElementById("className").innerText = data.class_name;
  document.getElementById("parentName").innerText = data.parent_name;
  document.getElementById("balance").innerText = data.balance;
}

async function loadAssignments() {
  const res = await fetch(`${SCRIPT_URL}?action=getAssignments&id=${encodeURIComponent(STUDENT_ID)}`);
  const data = await res.json();

  if (data.status !== "success") {
    throw new Error(data.message || "Failed to load assignments");
  }

  const container = document.getElementById("assignmentList");
  container.innerHTML = "";

  if (!data.assignments || data.assignments.length === 0) {
    container.innerHTML = "<p>No assignments found.</p>";
    return;
  }

  data.assignments.forEach(item => {
    const div = document.createElement("div");
    div.className = "assignment";

    div.innerHTML = `
      <h3>${escapeHtml(item.subject)}</h3>
      <p><b>Task:</b> ${escapeHtml(item.detail)}</p>
      <p><b>Due Date:</b> ${escapeHtml(String(item.due_date || ""))}</p>
      <p><b>Status:</b> ${escapeHtml(item.status)}</p>
      <button>ACKNOWLEDGE</button>
    `;

    const btn = div.querySelector("button");
    btn.addEventListener("click", async () => {
      btn.innerText = "Syncing...";
      btn.disabled = true;

      try {
        const ackRes = await fetch(
          `${SCRIPT_URL}?action=ack&id=${encodeURIComponent(STUDENT_ID)}&subject=${encodeURIComponent(item.subject)}`
        );
        const ackData = await ackRes.json();

        if (ackData.status === "success") {
          btn.innerText = "✅ SEEN";
          btn.classList.add("done");
        } else {
          btn.innerText = "Retry";
          btn.disabled = false;
        }
      } catch (err) {
        btn.innerText = "Retry";
        btn.disabled = false;
      }
    });

    container.appendChild(div);
  });
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function init() {
  try {
    await loadStudentData();
    await loadAssignments();
    document.getElementById("statusMsg").innerText =
      "Last synced: " + new Date().toLocaleString();
  } catch (err) {
    document.getElementById("statusMsg").innerText =
      "Connection failed: " + err.message;
  }
}

init();
