function setStatus(message) {
  document.getElementById("adminStatus").innerText = message;
}

function addStudent() {
  setStatus("Adding student...");

  const payload = {
    student_id: document.getElementById("student_id").value.trim(),
    student_name: document.getElementById("student_name").value.trim(),
    class_name: document.getElementById("class_name").value.trim(),
    parent_name: document.getElementById("parent_name").value.trim(),
    balance: document.getElementById("balance").value.trim()
  };

  google.script.run
    .withSuccessHandler(function(result) {
      setStatus(result.message || "Student added.");
    })
    .withFailureHandler(function(err) {
      setStatus("Error: " + err.message);
    })
    .addStudentObject(payload);
}

function addAssignment() {
  setStatus("Adding assignment...");

  const payload = {
    student_id: document.getElementById("a_student_id").value.trim(),
    subject: document.getElementById("subject").value.trim(),
    assignment_detail: document.getElementById("assignment_detail").value.trim(),
    due_date: document.getElementById("due_date").value,
    status: document.getElementById("status").value
  };

  google.script.run
    .withSuccessHandler(function(result) {
      setStatus(result.message || "Assignment added.");
    })
    .withFailureHandler(function(err) {
      setStatus("Error: " + err.message);
    })
    .addAssignmentObject(payload);
}

function updateBalance() {
  setStatus("Updating balance...");

  const payload = {
    student_id: document.getElementById("b_student_id").value.trim(),
    balance: document.getElementById("new_balance").value.trim()
  };

  google.script.run
    .withSuccessHandler(function(result) {
      setStatus(result.message || "Balance updated.");
    })
    .withFailureHandler(function(err) {
      setStatus("Error: " + err.message);
    })
    .updateBalanceObject(payload);
}

function markDone() {
  setStatus("Marking assignment as done...");

  const payload = {
    student_id: document.getElementById("done_student_id").value.trim(),
    subject: document.getElementById("done_subject").value.trim()
  };

  google.script.run
    .withSuccessHandler(function(result) {
      setStatus(result.message || "Assignment marked done.");
    })
    .withFailureHandler(function(err) {
      setStatus("Error: " + err.message);
    })
    .markAssignmentDoneObject(payload);
}

function sendTelegramTest() {
  setStatus("Sending Telegram test...");

  google.script.run
    .withSuccessHandler(function() {
      setStatus("Telegram test sent.");
    })
    .withFailureHandler(function(err) {
      setStatus("Error: " + err.message);
    })
    .sendTelegram("✅ EduSmart admin panel Telegram test");
}
