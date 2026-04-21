const SCRIPT_URL = "YOUR_WEB_APP_URL";
const STUDENT_ID = "STU001";

/* JSONP */
function fetchJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = "cb_" + Math.random().toString(36).substr(2);

    window[callbackName] = function(data) {
      resolve(data);
      delete window[callbackName];
    };

    const script = document.createElement("script");
    script.src = `${url}&callback=${callbackName}`;
    script.onerror = reject;

    document.body.appendChild(script);
  });
}

/* LOAD DASHBOARD */
async function loadDashboard() {
  const data = await fetchJsonp(`${SCRIPT_URL}?action=getDashboardBundle&id=${STUDENT_ID}`);

  document.getElementById("studentName").innerText = data.student.student_name;
  document.getElementById("balance").innerText = "RM " + data.student.balance;
  document.getElementById("aiSummary").innerText = data.ai_summary;

  renderAssignments(data.assignments);
}

/* RENDER ASSIGNMENTS */
function renderAssignments(list) {
  const container = document.getElementById("assignments");
  container.innerHTML = "";

  list.forEach(item => {
    const div = document.createElement("div");

    div.innerHTML = `
      <h3>${item.subject}</h3>
      <p>${item.detail}</p>
      <button onclick="ack('${item.subject}')">ACK</button>
      <button onclick="getHelp('${item.subject}')">AI Help</button>
      <div id="help-${item.subject}"></div>
    `;

    container.appendChild(div);
  });
}

/* ACK */
async function ack(subject) {
  await fetchJsonp(`${SCRIPT_URL}?action=ack&id=${STUDENT_ID}&subject=${subject}`);
  alert("ACK sent!");
}

/* AI HELP */
async function getHelp(subject) {
  const data = await fetchJsonp(`${SCRIPT_URL}?action=getAssignmentHelper&id=${STUDENT_ID}&subject=${subject}`);

  document.getElementById(`help-${subject}`).innerHTML = `
    <p><b>Explain:</b> ${data.simple_explanation}</p>
    <p><b>Action:</b> ${data.parent_action}</p>
  `;
}

/* INIT */
loadDashboard();
