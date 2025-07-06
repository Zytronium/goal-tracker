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

let editingId = null;
let easyMDE;

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
      </div>
      <div class="btn-group mt-2">
        <button class="btn btn-sm btn-outline-dark text-light" onclick="startEdit('${g.id}')">✏️</button>
        <button class="btn btn-sm btn-outline-dark text-light" onclick="toggleComplete('${g.id}', '${g.status}')">
          ${g.status === "completed" ? "↺" : "✅"}
        </button>
        <button class="btn btn-sm btn-outline-dark text-light" onclick="deleteGoal('${g.id}')">🗑️</button>
      </div>`;
    goalList.appendChild(div);
  });
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
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
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
