const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGRRktezMyxBJ_Q_N0dPHAIKI0nBeQukF4USmKG-konnTiXeo3Jz8XOf12FNxCFxb-/exec";

const params = new URLSearchParams(window.location.search);
const STUDENT_ID =
  localStorage.getItem("edusmart_student_id") ||
  params.get("id") ||
  "";

if (!STUDENT_ID) {
  window.location.href = "login.html";
  throw new Error("No student ID found");
}

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

function formatCurrency(value) {
  return `RM ${Number(value || 0).toFixed(2)}`;
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
    <strong>AI Summary:</strong> ${escapeHtml(summary || "No summary available.")}<br>
    <strong>Pending:</strong> ${pendingCount || 0} |
    <strong>Overdue:</strong> ${overdueCount || 0}
  `;
}

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

function speakText(text) {
  if (!("speechSynthesis" in window)) {
    alert("Voice feature is not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-MY";
  utter.rate = 1.0;
  window.speechSynthesis.speak(utter);
}

function renderAssignments(assignments) {
  const container = document.getElementById("assignmentList");
  if (!container) return;

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

    if (isOverdue) card.classList.add("overdue");

    const safeSubject = escapeHtml(item.subject);
    const safeDetail = escapeHtml(item.detail);
    const safeStatus = escapeHtml(item.status || "Pending");
    const dueDate = formatDate(item.due_date);

    const attachmentHtml = item.attachment_url
      ? item.attachment_type === "image"
        ? `<div class="attachment-box">
             <strong>Attachment:</strong><br>
             <img src="${escapeHtml(item.attachment_url)}" alt="${escapeHtml(item.attachment_name)}" class="assignment-image">
             <div><a href="${escapeHtml(item.attachment_url)}" target="_blank">Open image</a></div>
           </div>`
        : `<div class="attachment-box">
             <strong>Attachment:</strong>
             <div><a href="${escapeHtml(item.attachment_url)}" target="_blank">${escapeHtml(item.attachment_name || "Open file")}</a></div>
           </div>`
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
    const ackBtn = card.querySelector(".ack-btn");

    async function loadHelper() {
      const helperUrl =
        `${SCRIPT_URL}?action=getAssignmentHelper&id=${encodeURIComponent(STUDENT_ID)}&subject=${encodeURIComponent(item.subject)}`;
      return await fetchJsonp(helperUrl);
    }

    helperBtn.addEventListener("click", async () => {
      helperBtn.innerText = "Loading help...";
      helperBtn.disabled = true;

      try {
        const helperData = await loadHelper();

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
        console.error(error);
      }
    });

    voiceBtn.addEventListener("click", async () => {
      voiceBtn.innerText = "Loading voice...";
      voiceBtn.disabled = true;

      try {
        const helperData = await loadHelper();

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
      } finally {
        voiceBtn.innerText = "🔊 Voice Explain";
        voiceBtn.disabled = false;
      }
    });

    ackBtn.addEventListener("click", async () => {
      ackBtn.innerText = "Syncing...";
      ackBtn.disabled = true;

      try {
        const ackUrl =
          `${SCRIPT_URL}?action=ack&id=${encodeURIComponent(STUDENT_ID)}&subject=${encodeURIComponent(item.subject)}`;
        const ackData = await fetchJsonp(ackUrl);

        if (ackData.status === "success") {
          ackBtn.innerText = "✅ SEEN";
          ackBtn.classList.add("done");
        } else {
          ackBtn.innerText = "Retry";
          ackBtn.disabled = false;
        }
      } catch (error) {
        ackBtn.innerText = "Retry";
        ackBtn.disabled = false;
        console.error(error);
      }
    });

    container.appendChild(card);
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

    const quizzes = quizData.quizzes;
    let currentIndex = 0;
    let score = 0;
    const answers = [];

    function renderQuestion() {
      const quiz = quizzes[currentIndex];

      quizSection.innerHTML = `
        <div class="quiz-box">
          <div class="quiz-header">
            <div><strong>Subject:</strong> ${escapeHtml(subject)}</div>
            <div><strong>Question:</strong> ${currentIndex + 1} / ${quizzes.length}</div>
            <div><strong>Score:</strong> ${score}</div>
          </div>

          <div class="quiz-progress-wrap">
            <div class="quiz-progress-bar" style="width:${(currentIndex / quizzes.length) * 100}%"></div>
          </div>

          <div class="quiz-question">${escapeHtml(quiz.question)}</div>

          <div class="quiz-options">
            <button class="quiz-option" data-answer="A">A. ${escapeHtml(quiz.option_a)}</button>
            <button class="quiz-option" data-answer="B">B. ${escapeHtml(quiz.option_b)}</button>
            <button class="quiz-option" data-answer="C">C. ${escapeHtml(quiz.option_c)}</button>
            <button class="quiz-option" data-answer="D">D. ${escapeHtml(quiz.option_d)}</button>
          </div>

          <div id="quizFeedback" class="helper-box quiz-feedback" style="display:none;"></div>

          <div class="quiz-actions">
            <button id="nextQuizBtn" class="quiz-next-btn" style="display:none;">
              ${currentIndex < quizzes.length - 1 ? "Next Question ➜" : "Show Result 🎉"}
            </button>
          </div>
        </div>
      `;

      const buttons = quizSection.querySelectorAll(".quiz-option");
      const feedback = document.getElementById("quizFeedback");
      const nextBtn = document.getElementById("nextQuizBtn");

      let answered = false;

      buttons.forEach(btn => {
        btn.addEventListener("click", async () => {
          if (answered) return;
          answered = true;

          const studentAnswer = btn.getAttribute("data-answer");

          buttons.forEach(b => {
            b.disabled = true;
            b.classList.add("quiz-disabled");
          });

          try {
            const result = await fetch(SCRIPT_URL, {
              method: "POST",
              body: JSON.stringify({
                action: "submitQuizAnswer",
                student_id: STUDENT_ID,
                subject: subject,
                question: quiz.question,
                student_answer: studentAnswer
              })
            }).then(r => r.json());

            const correctAnswer = String(result.correct_answer || "").toUpperCase();

            buttons.forEach(b => {
              const answer = b.getAttribute("data-answer");
              if (answer === correctAnswer) b.classList.add("quiz-correct");
              if (answer === studentAnswer && answer !== correctAnswer) b.classList.add("quiz-wrong");
            });

            feedback.style.display = "block";

            if (result.result === "Correct") {
              score++;
              feedback.innerHTML = `
                <strong>✅ Correct!</strong><br>
                Excellent work. Keep going!
              `;
              feedback.classList.add("quiz-feedback-correct");
              feedback.classList.remove("quiz-feedback-wrong");
            } else {
              feedback.innerHTML = `
                <strong>❌ Wrong answer</strong><br>
                <strong>Correct answer:</strong> ${escapeHtml(correctAnswer)}<br>
                <strong>Explanation:</strong> ${escapeHtml(result.explanation || "Please review the lesson and try again.")}
              `;
              feedback.classList.add("quiz-feedback-wrong");
              feedback.classList.remove("quiz-feedback-correct");
            }

            answers.push({
              question: quiz.question,
              student_answer: studentAnswer,
              correct_answer: correctAnswer,
              result: result.result
            });

            nextBtn.style.display = "inline-block";
          } catch (error) {
            feedback.style.display = "block";
            feedback.innerHTML = `
              <strong>⚠️ Error</strong><br>
              Unable to submit answer. Please try again.
            `;
            nextBtn.style.display = "inline-block";
            console.error(error);
          }
        });
      });

      nextBtn.addEventListener("click", () => {
        currentIndex++;
        if (currentIndex < quizzes.length) renderQuestion();
        else renderFinalResult();
      });
    }

    function renderFinalResult() {
      const total = quizzes.length;
      const percent = Math.round((score / total) * 100);

      let message = "Good try. Keep practicing every day.";
      let emoji = "🌟";

      if (percent === 100) {
        message = "Amazing! You got everything correct!";
        emoji = "🏆";
      } else if (percent >= 80) {
        message = "Very good job! You understood the lesson well.";
        emoji = "🎉";
      } else if (percent >= 50) {
        message = "Nice effort. A little more practice will make you stronger.";
        emoji = "👍";
      }

      quizSection.innerHTML = `
        <div class="quiz-box">
          <div class="quiz-result-title">${emoji} Quiz Completed</div>
          <div class="quiz-result-score">Score: ${score} / ${total} (${percent}%)</div>
          <div class="quiz-result-message">${escapeHtml(message)}</div>
          <div class="quiz-result-list">
            ${answers.map((item, index) => `
              <div class="quiz-result-item">
                <strong>Q${index + 1}:</strong> ${escapeHtml(item.result)}<br>
                Your answer: ${escapeHtml(item.student_answer)} |
                Correct: ${escapeHtml(item.correct_answer)}
              </div>
            `).join("")}
          </div>
          <div class="quiz-actions">
            <button id="restartQuizBtn" class="quiz-next-btn">Try Again 🔄</button>
          </div>
        </div>
      `;

      const restartBtn = document.getElementById("restartQuizBtn");
      if (restartBtn) {
        restartBtn.addEventListener("click", () => {
          currentIndex = 0;
          score = 0;
          answers.length = 0;
          renderQuestion();
        });
      }
    }

    renderQuestion();
  } catch (error) {
    quizSection.innerHTML = `<div class="empty">Quiz loading failed.</div>`;
    console.error(error);
  }
}

async function loadTimetableAndQuiz() {
  try {
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
        await loadQuizForSubject(timetableData.today_timetable[0].subject);
      } else {
        const quizSection = document.getElementById("quizSection");
        if (quizSection) {
          quizSection.innerHTML = `<div class="empty">No subject available for today's quiz.</div>`;
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
}

function renderPerformance(data) {
  const container = document.getElementById("performanceSection");
  if (!container) return;

  const q = data.quarterly || {
    Q1: { index: 0 },
    Q2: { index: 0 },
    Q3: { index: 0 },
    Q4: { index: 0 }
  };

  container.innerHTML = `
    <div class="card">
      <h3>📊 Student Performance Index</h3>
      <p><strong>Yearly:</strong> ${escapeHtml(data.yearly_index ?? 0)}%</p>
      <p><strong>Total Assignments:</strong> ${escapeHtml(data.total_assignments ?? 0)}</p>
      <p><strong>Completed:</strong> ${escapeHtml(data.completed_assignments ?? 0)}</p>
      <hr/>
      <p><strong>Q1:</strong> ${escapeHtml(q.Q1?.index ?? 0)}%</p>
      <p><strong>Q2:</strong> ${escapeHtml(q.Q2?.index ?? 0)}%</p>
      <p><strong>Q3:</strong> ${escapeHtml(q.Q3?.index ?? 0)}%</p>
      <p><strong>Q4:</strong> ${escapeHtml(q.Q4?.index ?? 0)}%</p>
    </div>
  `;
}

async function loadPerformanceIndex() {
  const container = document.getElementById("performanceSection");
  if (!container) return;

  try {
    const perfUrl =
      `${SCRIPT_URL}?action=getPerformanceIndex&id=${encodeURIComponent(STUDENT_ID)}`;
    const perfData = await fetchJsonp(perfUrl);

    if (perfData.status === "success") {
      renderPerformance(perfData);
    } else {
      container.innerHTML = `<div class="empty">Performance data not available.</div>`;
    }
  } catch (error) {
    container.innerHTML = `<div class="empty">Performance loading failed.</div>`;
    console.error(error);
  }
}

async function init() {
  const statusBox = document.getElementById("statusMsg");
  if (statusBox) statusBox.innerText = "Loading data...";

  try {
    const bundleUrl =
      `${SCRIPT_URL}?action=getDashboardBundle&id=${encodeURIComponent(STUDENT_ID)}`;
    const data = await fetchJsonp(bundleUrl);

    if (data.status !== "success") {
      throw new Error(data.message || "Failed to load dashboard");
    }

    renderStudent(data.student);
    renderAISummary(data.ai_summary, data.pending_count, data.overdue_count);
    renderAssignments(data.assignments);

    await loadTimetableAndQuiz();
    await loadPerformanceIndex();

    if (statusBox) {
      statusBox.innerText =
        `Backend online | Last sync: ${new Date().toLocaleString("en-MY")}`;
    }
  } catch (error) {
    if (statusBox) {
      statusBox.innerText = `Connection failed: ${error.message}`;
    }
    console.error(error);
  }
}

init();
