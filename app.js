const loginSec = document.getElementById("login-section");
const appSec = document.getElementById("app-section");
const emailIn = document.getElementById("email");
const passIn = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const loginErr = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");

const goalList = document.getElementById("goal-list");
const loadingEl = document.getElementById("loading");

const filterSel = document.getElementById("filter-select");
const sortSel = document.getElementById("sort-select");

const formTitle = document.getElementById("form-title");
const titleIn = document.getElementById("new-goal-title");
const descIn = document.getElementById("new-goal-desc");
const catIn = document.getElementById("new-goal-category");
const progIn = document.getElementById("new-goal-progress");
const dueIn = document.createElement("input");

dueIn.type = "date";
dueIn.className = "form-control mb-2";
dueIn.id = "new-goal-due";
document.querySelector(".card").insertBefore(dueIn, document.querySelector(".card .d-flex"));

const addBtn = document.getElementById("add-goal-btn");
const cancelBtn = document.getElementById("cancel-edit-btn");
const formErr = document.getElementById("form-error");

// Progress goals editor elements
const pgDate = document.createElement("input");
pgDate.type = "date"; // date only, no time
pgDate.className = "form-control";
pgDate.id = "pg-date";

const pgTarget = document.createElement("input");
pgTarget.type = "number";
pgTarget.min = 0;
pgTarget.max = 100;
pgTarget.className = "form-control";
pgTarget.id = "pg-target";
pgTarget.placeholder = "Target %";

const pgAddBtn = document.createElement("button");
pgAddBtn.className = "btn btn-outline-light";
pgAddBtn.textContent = "➕";

const pgInputGroup = document.createElement("div");
pgInputGroup.className = "input-group mb-3";
pgInputGroup.appendChild(pgDate);
pgInputGroup.appendChild(pgTarget);
pgInputGroup.appendChild(pgAddBtn);

const pgList = document.createElement("div");
pgList.id = "progress-goals-list";
pgList.className = "mb-3";

const progressGoalsContainer = document.createElement("div");
progressGoalsContainer.innerHTML = "<h6>Progress Goals</h6>";
progressGoalsContainer.appendChild(pgList);
progressGoalsContainer.appendChild(pgInputGroup);

document.querySelector(".card").insertBefore(progressGoalsContainer, addBtn.parentNode);

let editingId = null;
let easyMDE;
let progressGoalsData = [];

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

auth.onAuthStateChanged(user => {
  if (user) {
    loginSec.classList.add("d-none");
    appSec.classList.remove("d-none");
    easyMDE = new EasyMDE({
      element: descIn,
      theme: "dark",
      renderingConfig: {
        codeSyntaxHighlighting: true,
      },
    });
    document.querySelector(".editor-preview").classList.add("bg-dark", "text-light");
    listenGoals();
  } else {
    loginSec.classList.remove("d-none");
    appSec.classList.add("d-none");
  }
});

loginBtn.onclick = () => {
  loginErr.textContent = "";
  auth.signInWithEmailAndPassword(emailIn.value, passIn.value)
    .catch(e => loginErr.textContent = e.message);
};

logoutBtn.onclick = () => auth.signOut();

pgAddBtn.onclick = (e) => {
  e.preventDefault();
  const date = pgDate.value;
  const target = parseInt(pgTarget.value);
  if (!date || isNaN(target)) return;

  progressGoalsData.push({ date, target, actual: 0 });
  renderProgressGoalsList();
  pgDate.value = "";
  pgTarget.value = "";
};

function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day); // Month is 0-based
}

function renderProgressGoalsList() {
  pgList.innerHTML = "";
  progressGoalsData.forEach((pg, i) => {
    const div = document.createElement("div");
    div.className = "d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2";

    // Editable date input
    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.className = "form-control";
    dateInput.value = pg.date;
    dateInput.onchange = (e) => {
      progressGoalsData[i].date = e.target.value;
    };

    // Editable target %
    const targetInput = document.createElement("input");
    targetInput.type = "number";
    targetInput.min = 0;
    targetInput.max = 100;
    targetInput.className = "form-control";
    targetInput.value = pg.target;
    targetInput.onchange = (e) => {
      progressGoalsData[i].target = parseInt(e.target.value);
    };

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-sm btn-outline-danger";
    deleteBtn.innerHTML = "🗑️";
    deleteBtn.onclick = () => removeProgressGoal(i);

    div.appendChild(dateInput);
    div.appendChild(targetInput);
    div.appendChild(deleteBtn);
    pgList.appendChild(div);
  });
}


window.removeProgressGoal = (index) => {
  progressGoalsData.splice(index, 1);
  renderProgressGoalsList();
};

function listenGoals() {
  loadingEl.style.display = "block";
  db.collection("goals").onSnapshot(snap => {
    let goals = [];
    snap.forEach(doc => {
      let d = doc.data(); d.id = doc.id;
      goals.push(d);
    });
    renderGoals(goals);
    loadingEl.style.display = "none";
  });
}

function renderGoals(allGoals) {
  let filtered = allGoals.filter(g => {
    return filterSel.value === "all" || g.status === filterSel.value;
  });

  const s = sortSel.value.split("_");
  filtered.sort((a,b) => {
    let aVal = s[0] === "updatedAt" ? a.updatedAt?.toDate() : a.title?.toLowerCase();
    let bVal = s[0] === "updatedAt" ? b.updatedAt?.toDate() : b.title?.toLowerCase();
    return s[1] === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  goalList.innerHTML = "";
  if (!filtered.length) goalList.innerHTML = `<div class="text-muted">No goals yet.</div>`;

  filtered.forEach(g => {
    const div = document.createElement("div");
    div.className = "list-group-item bg-secondary rounded-3 shadow-sm p-3 mb-3";
    const descHTML = marked.parse(g.description || "");
    const progress = g.progress ?? 0;
    const dueDate = g.dueBy?.toDate().toLocaleDateString() || "N/A";
    const updatedAt = g.updatedAt?.toDate().toLocaleString() || "N/A";
    const completedAt = g.completedAt?.toDate().toLocaleString() || null;
    const progressGoalsHTML = renderProgressGoalsView(g.progressGoals, progress);

    div.innerHTML = `
      <div>
        <h5>${escapeHTML(g.title)}</h5>
        <div class="mb-2">${descHTML}</div>
        <div class="progress mb-2"><div class="progress-bar" style="width:${progress}%">${progress}%</div></div>
        <small class="badge bg-${g.status === "completed" ? "success" : "warning"} me-1">${g.status}</small>
        <small class="text-muted">${escapeHTML(g.category || "")}</small><br>
        <small>Due: ${dueDate}</small><br>
        <small>Updated: ${updatedAt}</small><br>
        ${completedAt ? `<small>Completed: ${completedAt}</small><br>` : ""}
        ${progressGoalsHTML}
      </div>
      <div class="btn-group mt-2">
        <button class="btn btn-sm btn-outline-light" onclick="startEdit('${g.id}')">✏️</button>
        <button class="btn btn-sm btn-outline-light" onclick="toggleComplete('${g.id}', '${g.status}')">
          ${g.status === "completed" ? "↺" : "✅"}
        </button>
        <button class="btn btn-sm btn-outline-light" onclick="deleteGoal('${g.id}')">🗑️</button>
      </div>`;
    goalList.appendChild(div);
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function renderProgressGoalsView(progressGoals = [], currentProgress = 0) {
  if (!Array.isArray(progressGoals) || progressGoals.length === 0) return "";

  // Sort ascending by date
  const sorted = progressGoals.slice().sort((a, b) => new Date(a.date) - new Date(b.date));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let html = '<blockquote class="progress-goals"><h5>Progress Goals:</h5><p>';

  sorted.forEach((pg, i) => {
    const pgDate = parseLocalDate(pg.date);
    pgDate.setHours(0, 0, 0, 0);

    const dateStr = pgDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    const roundedCurrent = Math.floor(currentProgress);
    const roundedTarget = Math.floor(pg.target);
    let checkmark = "", style = "", tagOpen = "", tagClose = "";

    const isToday = pgDate.getTime() === today.getTime();
    const isPast = pgDate < today;
    const isFuture = pgDate > today;
    const isMet = roundedCurrent >= roundedTarget;

    if (isToday) {
      if (isMet) {
        checkmark = "✓ ";
        style = "color: lightgreen; font-weight: bold;";
      } else {
        style = "color: palegoldenrod; font-weight: bold;";
      }
      tagOpen = "<strong>";
      tagClose = "</strong>";
    } else if (isPast) {
      if (isMet) {
        checkmark = "✓ ";
        style = "color: lightgreen;";
      } else {
        style = "color: #ff8383;";
      }
      tagOpen = "<span>";
      tagClose = "</span>";
    } else if (isFuture) {
      if (isMet) {
        checkmark = "✓ ";
        style = "color: lightgreen; font-style: italic;";
      } else {
        style = "color: lightgray; font-style: italic;";
      }
      tagOpen = "<em>";
      tagClose = "</em>";
    }

    html += `${tagOpen}<span style="${style}">${checkmark}${escapeHTML(dateStr)}: ${pg.target}%</span>${tagClose}`;
    if (i < sorted.length - 1) html += "<br>";
  });

  html += "</p></blockquote>";
  return html;
}

function escapeHTML(s) {
  return s?.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) || "";
}

addBtn.onclick = () => {
  formErr.textContent = "";
  let title = titleIn.value.trim();
  if (!title) return formErr.textContent = "Title is required";

  const payload = {
    title,
    description: easyMDE.value(),
    category: catIn.value.trim(),
    progress: parseInt(progIn.value) || 0,
    dueBy: dueIn.value ? firebase.firestore.Timestamp.fromDate(new Date(dueIn.value)) : null,
    status: "in_progress",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    progressGoals: [...progressGoalsData]
  };

  let action = editingId
    ? db.collection("goals").doc(editingId).update(payload)
    : db.collection("goals").add(payload);

  action.then(resetForm).catch(e => formErr.textContent = e.message);
};

cancelBtn.onclick = resetForm;

function startEdit(id) {
  db.collection("goals").doc(id).get().then(doc => {
    const o = doc.data();
    editingId = id;
    formTitle.textContent = "Edit Goal";
    addBtn.textContent = "Save Changes";
    cancelBtn.classList.remove("d-none");
    titleIn.value = o.title;
    easyMDE.value(o.description);
    catIn.value = o.category;
    progIn.value = o.progress || 0;
    dueIn.value = o.dueBy ? o.dueBy.toDate().toISOString().split("T")[0] : "";
    progressGoalsData = (o.progressGoals || []).map(pg => {
      // Normalize date string to yyyy-mm-dd for the date input
      return {
        date: pg.date.length > 10 ? pg.date.slice(0,10) : pg.date,
        target: pg.target,
        actual: pg.actual || 0
      };
    });
    renderProgressGoalsList();
    document.querySelector(".card").scrollIntoView({ behavior: "smooth" });
  });
}

function resetForm() {
  editingId = null;
  formTitle.textContent = "Add New Goal";
  addBtn.textContent = "Add Goal";
  cancelBtn.classList.add("d-none");
  titleIn.value = catIn.value = progIn.value = dueIn.value = "";
  easyMDE.value("");
  formErr.textContent = "";
  progressGoalsData = [];
  renderProgressGoalsList();
  formErr.textContent = "";
}

function toggleComplete(id, status) {
  const updates = {
    status: status === "completed" ? "in_progress" : "completed",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (updates.status === "completed") {
    updates.completedAt = firebase.firestore.FieldValue.serverTimestamp();
  }
  db.collection("goals").doc(id).update(updates);
}

function deleteGoal(id) {
  if (confirm("Delete this goal?")) {
    db.collection("goals").doc(id).delete();
  }
}

filterSel.onchange = () => listenGoals();
sortSel.onchange = () => listenGoals();
