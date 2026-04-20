const SCRIPT_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL";

async function postJson(body) {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

function setStatus(message) {
  document.getElementById("adminStatus").innerText = message;
}

async function addStudent() {
  try {
    setStatus("Adding student...");

    const payload = {
      action: "addStudent",
      student_id: document.getElementById("student_id").value.trim(),
      student_name: document.getElementById("student_name").value.trim(),
      class_name: document.getElementById("class_name").value.trim(),
      parent_name: document.getElementById("parent_name").value.trim(),
      balance: document.getElementById("balance").value.trim()
    };

    const data = await postJson(payload);
    setStatus(data.message || "Student added.");
  } catch (error) {
    setStatus("Error: " + error.message);
  }
}

async function addAssignment() {
  try {
    setStatus("Adding assignment...");

    const payload = {
      action: "addAssignment",
      student_id: document.getElementById("a_student_id").value.trim(),
      subject: document.getElementById("subject").value.trim(),
      assignment_detail: document.getElementById("assignment_detail").value.trim(),
      due_date: document.getElementById("due_date").value,
      status: document.getElementById("status").value
    };

    const data = await postJson(payload);
    setStatus(data.message || "Assignment added.");
  } catch (error) {
    setStatus("Error: " + error.message);
  }
}

async function updateBalance() {
  try {
    setStatus("Updating balance...");

    const payload = {
      action: "updateBalance",
      student_id: document.getElementById("b_student_id").value.trim(),
      balance: document.getElementById("new_balance").value.trim()
    };

    const data = await postJson(payload);
    setStatus(data.message || "Balance updated.");
  } catch (error) {
    setStatus("Error: " + error.message);
  }
}

async function sendTelegramTest() {
  try {
    setStatus("Sending Telegram test...");
    const data = await postJson({ action: "sendTestTelegram" });
    setStatus(data.message || "Telegram test sent.");
  } catch (error) {
    setStatus("Error: " + error.message);
  }
}
