const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGRRktezMyxBJ_Q_N0dPHAIKI0nBeQukF4USmKG-konnTiXeo3Jz8XOf12FNxCFxb-/exec";

const params = new URLSearchParams(window.location.search);
const STUDENT_ID =
  localStorage.getItem("edusmart_student_id") ||
  params.get("id") ||
  "";

if (!STUDENT_ID) {
  window.location.href = "login.html";
}

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

function formatCurrency(value) {
  const number = Number(value || 0);
  return `RM ${number.toFixed(2)}`;
}
function renderTimetable(todayItems, tomorrowItems, todayDay, tomorrowDay) {
  const todayBox = document.getElementById("todayTimetable");
  const tomorrowBox = document.getElementById("tomorrowPreparation");

  // ===== TODAY =====
  if (todayBox) {
    if (!todayItems || todayItems.length === 0) {
      todayBox.innerHTML = `<div class="empty">No timetable found for ${todayDay}.</div>`;
    } else {
      todayBox.innerHTML = todayItems.map(item => `
        <div class="simple-list-item">
          <strong>Period ${item.period} - ${item.subject}</strong><br>
          <span>Book: ${item.book || "-"}</span><br>
          <span>Notes: ${item.notes || "-"}</span>
        </div>
      `).join("");
    }
  }

  // ===== TOMORROW =====
  if (tomorrowBox) {
    if (!tomorrowItems || tomorrowItems.length === 0) {
      tomorrowBox.innerHTML = `<div class="empty">No timetable found for ${tomorrowDay}.</div>`;
    } else {
      tomorrowBox.innerHTML = tomorrowItems.map(item => `
        <div class="simple-list-item">
          <strong>Period ${item.period} - ${item.subject}</strong><br>
          <span>Bring: ${item.book || "-"}</span><br>
          <span>Notes: ${item.notes || "-"}</span>
        </div>
      `).join("");
    }
  }
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
    function renderTimetable(todayItems, tomorrowItems, todayDay, tomorrowDay) {
  const todayBox = document.getElementById("todayTimetable");
  const tomorrowBox = document.getElementById("tomorrowPreparation");

  if (todayBox) {
    if (!todayItems || todayItems.length === 0) {
      todayBox.innerHTML = `<div class="empty">No timetable found for ${escapeHtml(todayDay)}.</div>`;
    } else {
      todayBox.innerHTML = `
        <div class="simple-list">
          ${todayItems.map(item => `
            <div class="simple-list-item">
              <strong>Period ${escapeHtml(item.period)} - ${escapeHtml(item.subject)}</strong><br>
              <span>Book: ${escapeHtml(item.book || "-")}</span><br>
              <span>Notes: ${escapeHtml(item.notes || "-")}</span>
            </div>
          `).join("")}
        </div>
      `;
    }
  }

  if (tomorrowBox) {
    if (!tomorrowItems || tomorrowItems.length === 0) {
      tomorrowBox.innerHTML = `<div class="empty">No timetable found for ${escapeHtml(tomorrowDay)}.</div>`;
    } else {
      tomorrowBox.innerHTML = `
        <div class="simple-list">
          ${tomorrowItems.map(item => `
            <div class="simple-list-item">
              <strong>Period ${escapeHtml(item.period)} - ${escapeHtml(item.subject)}</strong><br>
              <span>Bring: ${escapeHtml(item.book || "-")}</span><br>
              <span>Notes: ${escapeHtml(item.notes || "-")}</span>
            </div>
          `).join("")}
        </div>
      `;
    }
  }
}

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
async function loadQuizForSubject(subject) {
  const quizSection = document.getElementById("quizSection");
  if (!quizSection) return;

  try {
    const quizUrl =
      `${SCRIPT_URL}?action=getDailyQuiz&id=${encodeURIComponent(STUDENT_ID)}&subject=${encodeURIComponent(subject)}`;
    const quizData = await fetchJsonp(quizUrl);

    if (quizData.status !== "success" || !quizData.quizzes || !quizData.quizzes.length) {
      quizSection.innerHTML = `<div class="empty">No quiz available for ${escapeHtml(subject)}.</div>`;
      return;
    }

    const quiz = quizData.quizzes[0];

    quizSection.innerHTML = `
      <div class="quiz-box">
        <div class="quiz-question"><strong>${escapeHtml(subject)}</strong>: ${escapeHtml(quiz.question)}</div>
        <div class="quiz-options">
          <button class="quiz-option" data-answer="A">A. ${escapeHtml(quiz.option_a)}</button>
          <button class="quiz-option" data-answer="B">B. ${escapeHtml(quiz.option_b)}</button>
          <button class="quiz-option" data-answer="C">C. ${escapeHtml(quiz.option_c)}</button>
          <button class="quiz-option" data-answer="D">D. ${escapeHtml(quiz.option_d)}</button>
        </div>
        <div id="quizFeedback" class="helper-box" style="display:none; margin-top:12px;"></div>
      </div>
    `;

    const buttons = quizSection.querySelectorAll(".quiz-option");
    buttons.forEach(btn => {
      btn.addEventListener("click", async () => {
        const studentAnswer = btn.getAttribute("data-answer");

        const result = await fetch(`${SCRIPT_URL}`, {
          method: "POST",
          body: JSON.stringify({
            action: "submitQuizAnswer",
            student_id: STUDENT_ID,
            subject: subject,
            question: quiz.question,
            student_answer: studentAnswer
          })
        }).then(r => r.json());

        const feedback = document.getElementById("quizFeedback");
        feedback.style.display = "block";

        if (result.result === "Correct") {
          feedback.innerHTML = `
            <strong>✅ Correct!</strong><br>
            Great job. Keep learning.
          `;
        } else {
          feedback.innerHTML = `
            <strong>❌ Wrong answer</strong><br>
            Correct answer: ${escapeHtml(result.correct_answer)}<br>
            Explanation: ${escapeHtml(result.explanation || "Please review the lesson and try again.")}
          `;
        }
      });
    });

  } catch (error) {
    quizSection.innerHTML = `<div class="empty">Quiz loading failed.</div>`;
  }
}
function speakText(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-MY";
  utter.rate = 1.0;
  speechSynthesis.speak(utter);
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

    const attachmentHtml = item.attachment_url
      ? (
          item.attachment_type === "image"
            ? `<div class="attachment-box">
                 <strong>Attachment:</strong><br>
                 <img src="${escapeHtml(item.attachment_url)}" alt="${escapeHtml(item.attachment_name)}" class="assignment-image">
                 <div><a href="${escapeHtml(item.attachment_url)}" target="_blank">Open image</a></div>
               </div>`
            : `<div class="attachment-box">
                 <strong>Attachment:</strong>
                 <div><a href="${escapeHtml(item.attachment_url)}" target="_blank">${escapeHtml(item.attachment_name || "Open file")}</a></div>
               </div>`
        )
      : "";

    card.innerHTML = `
      <h3>${safeSubject}</h3>
      <p class="assignment-meta"><strong>Task:</strong> ${safeDetail}</p>
      <p class="assignment-meta"><strong>Due Date:</strong> ${escapeHtml(dueDate)}</p>
      ${attachmentHtml}
      <span class="status-badge ${safeStatus.toLowerCase() === "pending" ? "status-pending" : "status-done"}">
        ${safeStatus}
      </span>
      <button class="helper-btn">Help Me Understand</button>
      <button class="voice-btn">🔊 Voice Explain</button>
      <div class="helper-box" style="display:none; margin-top:12px;"></div>
      <button class="ack-btn">ACKNOWLEDGE</button>
    `;

    const helperBtn = card.querySelector(".helper-btn");
    const voiceBtn = card.querySelector(".voice-btn");
    const helperBox = card.querySelector(".helper-box");

    helperBtn.addEventListener("click", async () => {
      helperBtn.innerText = "Loading help...";
      helperBtn.disabled = true;

      try {
        const helperUrl =
          `${SCRIPT_URL}?action=getAssignmentHelper&id=${encodeURIComponent(STUDENT_ID)}&subject=${encodeURIComponent(item.subject)}`;
        const helperData = await fetchJsonp(helperUrl);

        if (helperData.status === "success") {
          helperBox.style.display = "block";
          helperBox.innerHTML = `
            <div><strong>Simple Explanation:</strong> ${escapeHtml(helperData.simple_explanation)}</div>
            <div style="margin-top:8px;"><strong>Parent Action:</strong> ${escapeHtml(helperData.parent_action)}</div>
            <div style="margin-top:8px;"><strong>Materials Needed:</strong> ${escapeHtml(helperData.materials_needed)}</div>
            <div style="margin-top:8px;"><strong>Estimated Time:</strong> ${escapeHtml(helperData.estimated_time)}</div>
            <div style="margin-top:8px;"><strong>Note:</strong> ${escapeHtml(helperData.encouragement)}</div>
          `;
          helperBtn.innerText = "AI Help Ready";
        } else {
          helperBtn.innerText = "Try Again";
          helperBtn.disabled = false;
        }
      } catch (error) {
        helperBtn.innerText = "Try Again";
        helperBtn.disabled = false;
      }
    });

    voiceBtn.addEventListener("click", async () => {
      try {
        const helperUrl =
          `${SCRIPT_URL}?action=getAssignmentHelper&id=${encodeURIComponent(STUDENT_ID)}&subject=${encodeURIComponent(item.subject)}`;
        const helperData = await fetchJsonp(helperUrl);

        if (helperData.status === "success") {
          const text =
            "Subject " + item.subject + ". " +
            helperData.simple_explanation + ". " +
            "Parent action. " + helperData.parent_action + ". " +
            "Estimated time. " + helperData.estimated_time;
          speakText(text);
        }
      } catch (error) {
        console.error(error);
      }
    });

    const btn = card.querySelector(".ack-btn");
    btn.addEventListener("click", async () => {
      btn.innerText = "Syncing...";
      btn.disabled = true;

      try {
        const ackUrl =
          `${SCRIPT_URL}?action=ack&id=${encodeURIComponent(STUDENT_ID)}&subject=${encodeURIComponent(item.subject)}`;
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
    const bundleUrl =
      `${SCRIPT_URL}?action=getDashboardBundle&id=${encodeURIComponent(STUDENT_ID)}`;
    const data = await fetchJsonp(bundleUrl);

    if (data.status !== "success") {
      throw new Error(data.message || "Failed to load dashboard");
    }
        const timetableUrl =
      `${SCRIPT_URL}?action=getStudentTimetable&id=${encodeURIComponent(STUDENT_ID)}`;
    const timetableData = await fetchJsonp(timetableUrl);

    if (timetableData.status === "success") {
      renderTimetable(
        timetableData.today_timetable || [],
        timetableData.tomorrow_timetable || [],
        timetableData.today_day || "Today",
        timetableData.tomorrow_day || "Tomorrow"
      );

      if (timetableData.today_timetable && timetableData.today_timetable.length > 0) {
        loadQuizForSubject(timetableData.today_timetable[0].subject);
      } else {
        const quizSection = document.getElementById("quizSection");
        if (quizSection) {
          quizSection.innerHTML = `<div class="empty">No subject available for today's quiz.</div>`;
        }
      }
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
