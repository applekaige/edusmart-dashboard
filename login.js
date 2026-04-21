const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGRRktezMyxBJ_Q_N0dPHAIKI0nBeQukF4USmKG-konnTiXeo3Jz8XOf12FNxCFxb-/exec";

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

document.getElementById("loginBtn").addEventListener("click", async () => {
  const studentId = document.getElementById("studentId").value.trim();
  const pin = document.getElementById("parentPin").value.trim();
  const status = document.getElementById("loginStatus");

  if (!studentId || !pin) {
    status.innerText = "Please enter Student ID and PIN.";
    return;
  }

  status.innerText = "Checking login...";

  try {
    const url =
      `${SCRIPT_URL}?action=loginParent&id=${encodeURIComponent(studentId)}&pin=${encodeURIComponent(pin)}`;
    const result = await fetchJsonp(url);

    if (result.status === "success") {
      localStorage.setItem("edusmart_student_id", result.student_id);
      localStorage.setItem("edusmart_logged_in", "yes");
      window.location.href = "index.html";
    } else {
      status.innerText = result.message || "Login failed.";
    }
  } catch (error) {
    status.innerText = "Connection failed: " + error.message;
  }
});
