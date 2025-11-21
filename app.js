const API_BASE = "http://localhost/api";

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const tbody = document.querySelector("#jobTable tbody");
  const totalJobsEl = document.getElementById("totalJobs");
  const activeJobsEl = document.getElementById("activeJobs");
  const pendingJobsEl = document.getElementById("pendingJobs");

  const searchBox = document.getElementById("searchBox");
  const filterType = document.getElementById("filterType");
  const filterStatus = document.getElementById("filterStatus");
  const clearFiltersBtn = document.getElementById("clearFilters");

  const editModalBg = document.getElementById("editModalBg");
  const modalTitle = document.getElementById("modalTitle");
  const editId = document.getElementById("editId");
  const jobTitle = document.getElementById("jobTitle");
  const jobType = document.getElementById("jobType");
  const statusEl = document.getElementById("status");
  const applicationsEl = document.getElementById("applications");
  const durationEl = document.getElementById("duration");
  const descriptionEl = document.getElementById("description");

  const saveBtn = document.getElementById("saveBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const openAddBtn = document.getElementById("openAddBtn");

  // State
  let allJobs = []; // full list from API
  let filteredJobs = []; // after filters

  // Initialize
  loadJobs();

  // Event bindings
  searchBox.addEventListener("input", applyFilters);
  filterType.addEventListener("change", applyFilters);
  filterStatus.addEventListener("change", applyFilters);
  clearFiltersBtn.addEventListener("click", () => {
    searchBox.value = "";
    filterType.value = "";
    filterStatus.value = "";
    applyFilters();
  });

  openAddBtn.addEventListener("click", () => openAddModal());
  cancelBtn.addEventListener("click", closeModal);
  saveBtn.addEventListener("click", onSaveClicked);

  // --- Fetch jobs ---
  async function loadJobs() {
    tbody.innerHTML = `<tr><td colspan="8">Loading...</td></tr>`;
    try {
      const res = await fetch(`${API_BASE}/jobs`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      allJobs = Array.isArray(data) ? data : (data.data || []);
      applyFilters();
    } catch (err) {
      console.error("Failed to load jobs:", err);
      tbody.innerHTML = `<tr><td colspan="8">Error loading data</td></tr>`;
      alert("Error fetching jobs. Check console for details.");
    }
  }

  // --- Apply search + filters ---
  function applyFilters() {
    const q = searchBox.value.trim().toLowerCase();
    const type = filterType.value;
    const status = filterStatus.value;

    filteredJobs = allJobs.filter(job => {
      const matchesQ = q ? (job.title || "").toLowerCase().includes(q) : true;
      const matchesType = type ? (job.type === type) : true;
      const matchesStatus = status ? (job.status === status) : true;
      return matchesQ && matchesType && matchesStatus;
    });

    updateStats(filteredJobs);
    renderJobs(filteredJobs);
  }

  // --- Update stat cards ---
  function updateStats(list) {
    totalJobsEl.innerText = list.length;
    activeJobsEl.innerText = list.filter(j => (j.status || "").toLowerCase() === "active").length;
    pendingJobsEl.innerText = list.filter(j => (j.status || "").toLowerCase() === "pending").length;
  }

  // --- Render table rows ---
  function renderJobs(list) {
    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8">No jobs found</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    list.forEach((job, idx) => {
      const tr = document.createElement("tr");

      // description small preview
      const descPreview = job.description ? String(job.description).slice(0, 120) : "";

      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${escapeHtml(job.title || "")}</td>
        <td>${escapeHtml(job.type || "")}</td>
        <td>${escapeHtml(job.status || "")}</td>
        <td>${Number(job.applications) || 0}</td>
        <td>${escapeHtml(job.duration || "")}</td>
        <td><small>${escapeHtml(descPreview)}</small></td>
        <td>
          <button class="inline-btn" data-action="edit" data-id="${job.id}">Edit</button>
          <button class="inline-btn danger" data-action="delete" data-id="${job.id}">Delete</button>
        </td>
      `;

      // event delegation for row-level click to open edit too
      tbody.appendChild(tr);
    });

    // attach actions
    tbody.querySelectorAll("button[data-action]").forEach(btn => {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === "edit") btn.addEventListener("click", () => openEditModal(id));
      if (action === "delete") btn.addEventListener("click", () => deleteJob(id));
    });
  }

  // --- Escape helper to avoid accidental raw HTML insertion ---
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // --- Open Add Modal (clear fields) ---
  function openAddModal() {
    modalTitle.innerText = "Add Job";
    editId.value = "";
    jobTitle.value = "";
    jobType.value = "";
    statusEl.value = "";
    applicationsEl.value = 0;
    durationEl.value = "";
    descriptionEl.value = "";
    showModal();
  }

  // --- Open Edit Modal (fill fields) ---
  function openEditModal(id) {
    const job = allJobs.find(j => String(j.id) === String(id));
    if (!job) {
      alert("Job not found");
      return;
    }
    modalTitle.innerText = "Edit Job";
    editId.value = job.id;
    jobTitle.value = job.title || "";
    jobType.value = job.type || "";
    statusEl.value = job.status || "";
    applicationsEl.value = job.applications || 0;
    durationEl.value = job.duration || "";
    descriptionEl.value = job.description || "";
    showModal();
  }

  function showModal() { editModalBg.style.display = "flex"; editModalBg.setAttribute("aria-hidden","false"); }
  function closeModal() { editModalBg.style.display = "none"; editModalBg.setAttribute("aria-hidden","true"); }

  // --- Save button (create or update) ---
  async function onSaveClicked() {
    const id = editId.value;
    const payload = {
      title: jobTitle.value.trim(),
      type: jobType.value,
      status: statusEl.value,
      applications: Number(applicationsEl.value) || 0,
      duration: durationEl.value.trim(),
      description: descriptionEl.value.trim()
    };

    // basic validation
    if (!payload.title || !payload.status) {
      return alert("Title and Status are required.");
    }

    try {
      if (id) {
        // update
        const res = await fetch(`${API_BASE}/jobs/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Update failed ${res.status}`);
        const updated = await res.json();
        // update local copy
        allJobs = allJobs.map(j => (String(j.id) === String(updated.id) ? updated : j));
        applyFilters();
        closeModal();
      } else {
        // create
        const res = await fetch(`${API_BASE}/jobs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Create failed ${res.status}: ${txt}`);
        }
        const created = await res.json();
        allJobs.unshift(created);
        applyFilters();
        closeModal();
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Error saving job — check console.");
    }
  }

  // --- Delete job ---
  async function deleteJob(id) {
    if (!confirm("Delete this job?")) return;
    try {
      const res = await fetch(`${API_BASE}/jobs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Delete failed ${res.status}: ${txt}`);
      }
      // remove from local array & refresh
      allJobs = allJobs.filter(j => String(j.id) !== String(id));
      applyFilters();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting job — check console.");
    }
  }

  // close modal when clicking outside
  editModalBg.addEventListener("click", (e) => {
    if (e.target === editModalBg) closeModal();
  });

});
