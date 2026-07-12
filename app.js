const STORAGE_KEY = "wahane-state-v1";
const TODAY = new Date().toISOString().slice(0, 10);

const defaultState = {
  user: {
    id: "guest-user",
    mode: "guest",
    name: "Guest Driver",
    unitDistance: "mi",
    currency: "LKR",
    reminderPreference: "push-ready",
    lastSyncedAt: null
  },
  activeView: "dashboard",
  activeVehicleId: null,
  vehicles: [],
  maintenanceRecords: [],
  reminders: [],
  serviceCenters: [],
  syncQueue: []
};

function id(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          ...defaultState,
          ...parsed,
          user: { ...defaultState.user, ...(parsed.user || {}) }
        };
      }
    } catch {
      console.warn("Stored data was corrupted; starting fresh. Restore from an exported backup if you have one.");
    }
  }

  const seed = {
    ...defaultState,
    vehicles: [
      {
        id: "vehicle-1",
        ownerId: "guest-user",
        nickname: "Daily Driver",
        make: "Honda",
        model: "Civic",
        year: 2020,
        plate: "GH-2020",
        fuelType: "Gasoline",
        purchaseDate: "2022-03-12",
        currentOdometer: 38420,
        defaultServiceIntervals: {
          days: 180,
          mileage: 5000
        },
        status: "healthy"
      },
      {
        id: "vehicle-2",
        ownerId: "guest-user",
        nickname: "Weekend SUV",
        make: "Subaru",
        model: "Forester",
        year: 2018,
        plate: "WKND-88",
        fuelType: "Gasoline",
        purchaseDate: "2021-08-09",
        currentOdometer: 61200,
        defaultServiceIntervals: {
          days: 180,
          mileage: 6000
        },
        status: "due-soon"
      }
    ],
    maintenanceRecords: [
      {
        id: "maint-1",
        vehicleId: "vehicle-1",
        serviceType: "Oil Change",
        performedAt: "2026-03-21",
        odometer: 36200,
        totalCost: 79.99,
        notes: "Synthetic oil and filter replacement.",
        serviceCenterId: "center-1",
        nextDueDate: "2026-09-21",
        nextDueMileage: 41200
      },
      {
        id: "maint-2",
        vehicleId: "vehicle-2",
        serviceType: "Brake Inspection",
        performedAt: "2026-01-12",
        odometer: 58950,
        totalCost: 145.0,
        notes: "Front pads at 40 percent.",
        serviceCenterId: "center-2",
        nextDueDate: "2026-07-12",
        nextDueMileage: 64950
      }
    ],
    reminders: [
      {
        id: "rem-1",
        vehicleId: "vehicle-1",
        title: "Tire Rotation",
        relatedServiceType: "Tires",
        dueDate: "2026-05-15",
        dueMileage: 39200,
        status: "due-soon",
        leadTime: 14,
        snoozedUntil: ""
      },
      {
        id: "rem-2",
        vehicleId: "vehicle-2",
        title: "Registration Renewal",
        relatedServiceType: "Registration",
        dueDate: "2026-04-25",
        dueMileage: "",
        status: "overdue",
        leadTime: 21,
        snoozedUntil: ""
      }
    ],
    serviceCenters: [
      {
        id: "center-1",
        ownerId: "guest-user",
        name: "Metro Lube",
        phone: "+1 555 0101",
        addressText: "15 East Broad St",
        notes: "Quick weekday appointments."
      },
      {
        id: "center-2",
        ownerId: "guest-user",
        name: "Summit Auto Care",
        phone: "+1 555 0199",
        addressText: "88 Lakeview Ave",
        notes: "Best for inspection and brakes."
      }
    ],
    activeVehicleId: "vehicle-1"
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

let state = loadState();
let modalContext = null;

const els = {
  heroHeadline: document.getElementById("heroHeadline"),
  heroSummary: document.getElementById("heroSummary"),
  heroDataStrip: document.getElementById("heroDataStrip"),
  activeVehicleName: document.getElementById("activeVehicleName"),
  activeVehicleMeta: document.getElementById("activeVehicleMeta"),
  vehicleSelect: document.getElementById("vehicleSelect"),
  attentionList: document.getElementById("attentionList"),
  recentMaintenanceList: document.getElementById("recentMaintenanceList"),
  vehicleStatusCards: document.getElementById("vehicleStatusCards"),
  serviceCenterShortcuts: document.getElementById("serviceCenterShortcuts"),
  vehiclesViewList: document.getElementById("vehiclesViewList"),
  maintenanceViewList: document.getElementById("maintenanceViewList"),
  maintenanceInsights: document.getElementById("maintenanceInsights"),
  maintenanceFilters: document.getElementById("maintenanceFilters"),
  currencySelect: document.getElementById("currencySelect"),
  remindersViewList: document.getElementById("remindersViewList"),
  serviceCentersViewList: document.getElementById("serviceCentersViewList"),
  modalRoot: document.getElementById("modalRoot"),
  modalTitle: document.getElementById("modalTitle"),
  modalContent: document.getElementById("modalContent"),
  modalModeLabel: document.getElementById("modalModeLabel"),
  exportDataButton: document.getElementById("exportDataButton"),
  importDataButton: document.getElementById("importDataButton"),
  importDataInput: document.getElementById("importDataInput"),
  toast: document.getElementById("toast")
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function enqueueSync(type, payload) {
  state.syncQueue.push({ id: id("sync"), type, payload, createdAt: new Date().toISOString() });
}

function getVehicle(vehicleId) {
  return state.vehicles.find((vehicle) => vehicle.id === vehicleId);
}

function getServiceCenter(centerId) {
  return state.serviceCenters.find((center) => center.id === centerId);
}

function getReminder(reminderId) {
  return state.reminders.find((reminder) => reminder.id === reminderId);
}

function getMaintenanceRecord(recordId) {
  return state.maintenanceRecords.find((record) => record.id === recordId);
}

function activeVehicle() {
  return getVehicle(state.activeVehicleId) || state.vehicles[0] || null;
}

function daysUntil(dateText) {
  if (!dateText) return null;
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.ceil((new Date(dateText) - new Date(TODAY)) / oneDay);
}

function computeReminderStatus(reminder) {
  const vehicle = getVehicle(reminder.vehicleId);
  const untilDate = daysUntil(reminder.dueDate);
  const mileageGap = reminder.dueMileage && vehicle ? Number(reminder.dueMileage) - Number(vehicle.currentOdometer) : null;
  const snoozed = reminder.snoozedUntil && reminder.snoozedUntil >= TODAY;

  if (snoozed) return "healthy";
  if ((untilDate !== null && untilDate < 0) || (mileageGap !== null && mileageGap < 0)) return "overdue";
  if ((untilDate !== null && untilDate <= Number(reminder.leadTime || 7)) || (mileageGap !== null && mileageGap <= 500)) return "due-soon";
  return "healthy";
}

function vehicleSummary(vehicle) {
  const reminders = state.reminders.filter((item) => item.vehicleId === vehicle.id);
  const records = state.maintenanceRecords.filter((item) => item.vehicleId === vehicle.id);
  const reminderCounts = reminders.reduce((acc, reminder) => {
    const status = computeReminderStatus(reminder);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const latestRecord = records.sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt))[0];
  return {
    reminderCounts,
    latestRecord
  };
}

function formatDate(dateText) {
  if (!dateText) return "";
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return esc(dateText);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function currency(value) {
  if (value === "" || value === null || value === undefined) return "-";
  const code = state.user.currency || "LKR";
  const noCents = ["LKR", "JPY", "IDR", "KRW", "VND"].includes(code);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: code,
    maximumFractionDigits: noCents ? 0 : 2
  }).format(Number(value));
}

function emptyState(text) {
  return `<div class="empty-state">${text}</div>`;
}

let toastTimer = null;

function hideToastAfter(delay) {
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    els.toast.classList.remove("visible");
    els.toast.classList.add("hidden");
  }, delay);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  els.toast.classList.add("visible");
  hideToastAfter(2600);
}

function showUndoToast(message) {
  els.toast.innerHTML = `${esc(message)} <button class="toast-undo" type="button" id="undoDeleteButton">Undo</button>`;
  els.toast.classList.remove("hidden");
  els.toast.classList.add("visible");
  document.getElementById("undoDeleteButton").addEventListener("click", () => {
    undoDelete();
  });
  hideToastAfter(6000);
}

function actionButtons(type, itemId, includeComplete = false) {
  return `
    <div class="card-actions">
      ${includeComplete ? `<button class="text-button" type="button" data-complete-reminder="${itemId}">Mark complete</button>` : ""}
      <button class="text-button" type="button" data-edit-type="${type}" data-edit-id="${itemId}">Edit</button>
      <button class="text-button danger-button" type="button" data-delete-type="${type}" data-delete-id="${itemId}">Delete</button>
    </div>
  `;
}

function syncEventName(type, mode) {
  return `${type}.${mode}`;
}

function replaceById(collection, nextItem) {
  return collection.map((item) => item.id === nextItem.id ? nextItem : item);
}

function normalizeImportedState(candidate) {
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Imported file is not valid JSON data.");
  }

  return {
    ...defaultState,
    ...candidate,
    user: { ...defaultState.user, ...(candidate.user || {}) },
    vehicles: Array.isArray(candidate.vehicles) ? candidate.vehicles : [],
    maintenanceRecords: Array.isArray(candidate.maintenanceRecords) ? candidate.maintenanceRecords : [],
    reminders: Array.isArray(candidate.reminders) ? candidate.reminders : [],
    serviceCenters: Array.isArray(candidate.serviceCenters) ? candidate.serviceCenters : [],
    syncQueue: Array.isArray(candidate.syncQueue) ? candidate.syncQueue : [],
    activeView: candidate.activeView || defaultState.activeView,
    activeVehicleId: candidate.activeVehicleId || (candidate.vehicles && candidate.vehicles[0] ? candidate.vehicles[0].id : null)
  };
}

function parseCsvRecords(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') inQuotes = false;
      else field += char;
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field); field = "";
    } else if (char === "\n" || char === "\r") {
      if (field !== "" || row.length) { row.push(field); rows.push(row); row = []; field = ""; }
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  return rows.slice(1).map((cells) => {
    const entry = {};
    headers.forEach((header, index) => { entry[header] = (cells[index] || "").trim(); });
    return entry;
  });
}

function isSimpleRecordList(candidate) {
  return Array.isArray(candidate) && candidate.length > 0 && candidate.every((item) => (
    item && typeof item === "object" && (item.date || item.Date) && (item.description || item.Description)
  ));
}

function shortTitleFromDescription(description) {
  const firstPart = String(description).split(/[,:]/)[0].trim();
  return firstPart.length > 40 ? `${firstPart.slice(0, 40)}…` : firstPart || "Maintenance";
}

function mergeSimpleRecords(entries, vehicleId) {
  let added = 0;
  let skipped = 0;

  for (const entry of entries) {
    const date = String(entry.date || entry.Date || "").slice(0, 10);
    const description = String(entry.description || entry.Description || "").trim();
    if (!date || !description) { skipped += 1; continue; }

    const category = String(entry.category || entry.Category || "").trim();
    const odometerRaw = entry.odometer ?? entry.Odometer;
    const odometer = odometerRaw === null || odometerRaw === undefined || odometerRaw === "" ? "" : Number(odometerRaw);
    const costRaw = entry.cost ?? entry.Cost ?? entry.totalCost;
    const cost = costRaw === null || costRaw === undefined || costRaw === "" ? "" : Number(costRaw);

    const duplicate = state.maintenanceRecords.some((record) => (
      record.vehicleId === vehicleId && record.performedAt === date && record.notes === description
    ));
    if (duplicate) { skipped += 1; continue; }

    const record = {
      id: id("maint"),
      vehicleId,
      serviceType: shortTitleFromDescription(description),
      category,
      performedAt: date,
      odometer,
      totalCost: cost,
      notes: description,
      serviceCenterId: "",
      nextDueDate: "",
      nextDueMileage: ""
    };
    state.maintenanceRecords.push(record);
    enqueueSync(syncEventName("maintenance", "created"), record);
    added += 1;
  }

  const vehicle = getVehicle(vehicleId);
  if (vehicle) {
    const maxOdometer = state.maintenanceRecords
      .filter((record) => record.vehicleId === vehicleId && record.odometer !== "" && record.odometer !== null)
      .reduce((max, record) => Math.max(max, Number(record.odometer)), Number(vehicle.currentOdometer) || 0);
    vehicle.currentOdometer = maxOdometer;
  }

  return { added, skipped };
}

function renderSelectOptions(select, includeBlank = false) {
  if (!select) return;
  const activeId = state.activeVehicleId || "";
  const options = [];
  if (includeBlank) options.push(`<option value="">None</option>`);
  for (const vehicle of state.vehicles) {
    options.push(`<option value="${esc(vehicle.id)}" ${vehicle.id === activeId ? "selected" : ""}>${esc(vehicle.nickname)} | ${esc(vehicle.year)} ${esc(vehicle.make)}</option>`);
  }
  select.innerHTML = options.join("");
}

function renderVehicleSwitcher() {
  renderSelectOptions(els.vehicleSelect);
  els.vehicleSelect.disabled = state.vehicles.length === 0;
  const current = activeVehicle();
  els.activeVehicleName.textContent = current ? `${current.nickname} | ${current.year} ${current.make} ${current.model}` : "No vehicle yet";
  els.activeVehicleMeta.textContent = current
    ? `${current.currentOdometer} ${state.user.unitDistance} on record, ${current.fuelType || "fuel type not set"}, ${current.plate || "no plate saved"}`
    : "Add a vehicle to start tailored reminders and history.";
}

function renderDashboard() {
  const attention = [...state.reminders]
    .map((reminder) => ({ ...reminder, computedStatus: computeReminderStatus(reminder) }))
    .filter((item) => item.computedStatus !== "healthy")
    .sort((a, b) => {
      const order = { overdue: 0, "due-soon": 1, healthy: 2 };
      return order[a.computedStatus] - order[b.computedStatus];
    });

  els.attentionList.innerHTML = attention.length ? attention.map((item) => {
    const vehicle = getVehicle(item.vehicleId);
    return `
      <article class="list-card">
        <div class="detail-row">
          <strong>${esc(item.title)}</strong>
          <span class="status-pill ${item.computedStatus === "overdue" ? "status-overdue" : "status-soon"}">${item.computedStatus === "overdue" ? "Overdue" : "Due soon"}</span>
        </div>
        <div class="meta-row">
          <span>${vehicle ? esc(vehicle.nickname) : "Vehicle"}</span>
          <span>${formatDate(item.dueDate) || "No date"}${item.dueMileage ? ` | ${esc(item.dueMileage)} ${state.user.unitDistance}` : ""}</span>
        </div>
      </article>`;
  }).join("") : emptyState("No urgent reminders. You're in good shape.");

  const recent = [...state.maintenanceRecords].sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt)).slice(0, 4);
  els.recentMaintenanceList.innerHTML = recent.length ? recent.map((record) => {
    const center = getServiceCenter(record.serviceCenterId);
    const vehicle = getVehicle(record.vehicleId);
    return `
      <article class="list-card">
        <div class="detail-row">
          <strong>${esc(record.serviceType)}</strong>
          <span>${currency(record.totalCost)}</span>
        </div>
        <div class="meta-row">
          <span>${vehicle ? esc(vehicle.nickname) : "Vehicle"}${record.odometer === "" || record.odometer === null ? "" : ` | ${esc(record.odometer)} ${state.user.unitDistance}`}</span>
          <span>${formatDate(record.performedAt)}</span>
        </div>
        <div class="meta-row">
          <span>${center ? esc(center.name) : "No service center"}</span>
          <span>${record.nextDueDate ? `Next: ${formatDate(record.nextDueDate)}` : "No next date"}</span>
        </div>
      </article>`;
  }).join("") : emptyState("Log your first service record to build maintenance history.");

  els.vehicleStatusCards.innerHTML = state.vehicles.length ? state.vehicles.map((vehicle) => {
    const summary = vehicleSummary(vehicle);
    const overdue = summary.reminderCounts.overdue || 0;
    const soon = summary.reminderCounts["due-soon"] || 0;
    const statusClass = overdue ? "status-overdue" : soon ? "status-soon" : "status-healthy";
    const statusLabel = overdue ? `${overdue} overdue` : soon ? `${soon} due soon` : "All clear";
    return `
      <article class="status-card">
        <div class="detail-row">
          <strong>${esc(vehicle.nickname)}</strong>
          <span class="status-pill ${statusClass}">${statusLabel}</span>
        </div>
        <p>${esc(vehicle.year)} ${esc(vehicle.make)} ${esc(vehicle.model)}</p>
        <div class="meta-row">
          <span>${esc(vehicle.currentOdometer)} ${state.user.unitDistance}</span>
          <span>${summary.latestRecord ? `Last: ${esc(summary.latestRecord.serviceType)}` : "No service yet"}</span>
        </div>
      </article>`;
  }).join("") : emptyState("Add a vehicle to start tracking service, mileage, and reminders.");

  els.serviceCenterShortcuts.innerHTML = state.serviceCenters.length ? state.serviceCenters.slice(0, 4).map((center) => `
    <article class="list-card">
      <strong>${esc(center.name)}</strong>
      <div class="meta-row">
        <span>${esc(center.phone) || "No phone saved"}</span>
        <span>${esc(center.addressText) || "No address saved"}</span>
      </div>
    </article>
  `).join("") : emptyState("Save a trusted shop for quicker logging later.");
}

function renderVehicles() {
  els.vehiclesViewList.innerHTML = state.vehicles.length ? state.vehicles.map((vehicle) => {
    const summary = vehicleSummary(vehicle);
    return `
      <article class="status-card">
        <div class="detail-row">
          <strong>${esc(vehicle.nickname)}</strong>
          <button class="text-button" type="button" data-activate-vehicle="${esc(vehicle.id)}">Set Active</button>
        </div>
        <p>${esc(vehicle.year)} ${esc(vehicle.make)} ${esc(vehicle.model)}</p>
        <div class="meta-row">
          <span>${esc(vehicle.plate) || "No plate saved"}</span>
          <span>${esc(vehicle.currentOdometer)} ${state.user.unitDistance}</span>
        </div>
        <div class="meta-row">
          <span>${summary.latestRecord ? `Last service: ${formatDate(summary.latestRecord.performedAt)}` : "No maintenance logged"}</span>
          <span>${vehicle.defaultServiceIntervals.mileage || "-"} ${state.user.unitDistance} interval</span>
        </div>
        ${actionButtons("vehicle", vehicle.id)}
      </article>`;
  }).join("") : emptyState("Your garage is empty. Add the first vehicle and the app will tailor the dashboard around it.");
}

let maintenanceFilter = "all";

function sumCosts(records) {
  return records.reduce((total, record) => {
    const cost = Number(record.totalCost);
    return Number.isFinite(cost) ? total + cost : total;
  }, 0);
}

function renderMaintenanceInsights(records) {
  if (!els.maintenanceInsights) return;
  if (!records.length) {
    els.maintenanceInsights.innerHTML = "";
    return;
  }
  const serviceRecords = records.filter((record) => record.category === "Service");
  const repairRecords = records.filter((record) => record.category === "Repair");
  els.maintenanceInsights.innerHTML = `
    <div class="insight-card">
      <span>Total spent</span>
      <strong>${currency(sumCosts(records))}</strong>
      <small>${records.length} records</small>
    </div>
    <div class="insight-card">
      <span>Service</span>
      <strong>${currency(sumCosts(serviceRecords))}</strong>
      <small>${serviceRecords.length} records</small>
    </div>
    <div class="insight-card">
      <span>Repairs</span>
      <strong>${currency(sumCosts(repairRecords))}</strong>
      <small>${repairRecords.length} records</small>
    </div>
  `;
}

function maintenanceCard(record) {
  const center = getServiceCenter(record.serviceCenterId);
  return `
    <article class="list-card">
      <div class="detail-row">
        <strong>${esc(record.serviceType)}${record.category ? ` <span class="status-pill ${record.category === "Repair" ? "status-soon" : "status-healthy"}">${esc(record.category)}</span>` : ""}</strong>
        <span>${currency(record.totalCost)}</span>
      </div>
      <div class="meta-row">
        <span>${formatDate(record.performedAt)}</span>
        <span>${record.odometer === "" || record.odometer === null ? "-" : `${esc(record.odometer)} ${state.user.unitDistance}`}</span>
      </div>
      <div class="meta-row">
        <span>${center ? esc(center.name) : "No service center selected"}</span>
        <span>${record.nextDueDate ? `Next: ${formatDate(record.nextDueDate)}` : "No next due date"}${record.nextDueMileage ? ` | ${esc(record.nextDueMileage)} ${state.user.unitDistance}` : ""}</span>
      </div>
      ${record.notes ? `<p>${esc(record.notes)}</p>` : ""}
      ${actionButtons("maintenance", record.id)}
    </article>`;
}

function renderMaintenance() {
  const current = activeVehicle();
  const records = [...state.maintenanceRecords]
    .filter((record) => !current || record.vehicleId === current.id)
    .sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt));

  renderMaintenanceInsights(records);

  if (els.maintenanceFilters) {
    const counts = {
      all: records.length,
      Service: records.filter((record) => record.category === "Service").length,
      Repair: records.filter((record) => record.category === "Repair").length
    };
    els.maintenanceFilters.innerHTML = [
      { key: "all", label: "All" },
      { key: "Service", label: "Service" },
      { key: "Repair", label: "Repair" }
    ].map(({ key, label }) => `
      <button class="chip ${maintenanceFilter === key ? "active" : ""}" type="button" data-maintenance-filter="${key}">
        ${label} <span class="chip-count">${counts[key]}</span>
      </button>
    `).join("");
  }

  const filtered = maintenanceFilter === "all"
    ? records
    : records.filter((record) => record.category === maintenanceFilter);

  if (!filtered.length) {
    els.maintenanceViewList.innerHTML = emptyState(
      records.length ? "No records match this filter." : "No maintenance records for this vehicle yet."
    );
    return;
  }

  const groups = [];
  for (const record of filtered) {
    const year = (record.performedAt || "").slice(0, 4) || "Undated";
    const group = groups[groups.length - 1];
    if (group && group.year === year) {
      group.records.push(record);
    } else {
      groups.push({ year, records: [record] });
    }
  }

  els.maintenanceViewList.innerHTML = groups.map((group) => `
    <div class="year-group">
      <div class="year-header">
        <h4>${esc(group.year)}</h4>
        <span>${group.records.length} ${group.records.length === 1 ? "record" : "records"} | ${currency(sumCosts(group.records))}</span>
      </div>
      ${group.records.map(maintenanceCard).join("")}
    </div>
  `).join("");
}

function renderReminders() {
  const current = activeVehicle();
  const reminders = [...state.reminders]
    .filter((reminder) => !current || reminder.vehicleId === current.id)
    .map((reminder) => ({ ...reminder, computedStatus: computeReminderStatus(reminder) }))
    .sort((a, b) => {
      const order = { overdue: 0, "due-soon": 1, healthy: 2 };
      return order[a.computedStatus] - order[b.computedStatus];
    });

  els.remindersViewList.innerHTML = reminders.length ? reminders.map((reminder) => `
    <article class="list-card">
      <div class="detail-row">
        <strong>${esc(reminder.title)}</strong>
        <span class="status-pill ${reminder.computedStatus === "overdue" ? "status-overdue" : reminder.computedStatus === "due-soon" ? "status-soon" : "status-healthy"}">
          ${reminder.computedStatus === "due-soon" ? "Due soon" : reminder.computedStatus === "overdue" ? "Overdue" : "On track"}
        </span>
      </div>
      <div class="meta-row">
        <span>${esc(reminder.relatedServiceType) || "General"}</span>
        <span>${formatDate(reminder.dueDate) || "No date"}${reminder.dueMileage ? ` | ${esc(reminder.dueMileage)} ${state.user.unitDistance}` : ""}</span>
      </div>
      <div class="meta-row">
        <span>Lead time: ${reminder.leadTime || 7} days</span>
      </div>
      ${actionButtons("reminder", reminder.id, true)}
    </article>
  `).join("") : emptyState("No reminders yet. Add one for dates, mileage, or both.");
}

function renderServiceCenters() {
  els.serviceCentersViewList.innerHTML = state.serviceCenters.length ? state.serviceCenters.map((center) => `
    <article class="list-card">
      <strong>${esc(center.name)}</strong>
      <div class="meta-row">
        <span>${esc(center.phone) || "No phone saved"}</span>
        <span>${esc(center.addressText) || "No address saved"}</span>
      </div>
      ${center.notes ? `<p>${esc(center.notes)}</p>` : ""}
      ${actionButtons("serviceCenter", center.id)}
    </article>
  `).join("") : emptyState("Save service centers you trust so future records are faster to log.");
}

function renderHero() {
  const ranked = state.reminders
    .map((reminder) => ({ ...reminder, computedStatus: computeReminderStatus(reminder) }))
    .filter((reminder) => reminder.computedStatus !== "healthy" || reminder.dueDate || reminder.dueMileage)
    .sort((a, b) => {
      const order = { overdue: 0, "due-soon": 1, healthy: 2 };
      if (order[a.computedStatus] !== order[b.computedStatus]) return order[a.computedStatus] - order[b.computedStatus];
      return (a.dueDate || "9999") < (b.dueDate || "9999") ? -1 : 1;
    });

  const next = ranked[0];
  if (!state.vehicles.length) {
    els.heroHeadline.textContent = "Add your first vehicle to get started.";
  } else if (!next) {
    els.heroHeadline.textContent = "You're all caught up. Nothing is due.";
  } else {
    const vehicle = getVehicle(next.vehicleId);
    const when = next.computedStatus === "overdue"
      ? `overdue since ${formatDate(next.dueDate) || "a while"}`
      : next.dueDate
        ? `due ${formatDate(next.dueDate)}`
        : `due at ${next.dueMileage} ${state.user.unitDistance}`;
    els.heroHeadline.textContent = `Next up: ${next.title}${vehicle ? ` (${vehicle.nickname})` : ""}, ${when}.`;
  }

  const thisYear = String(new Date().getFullYear());
  const yearRecords = state.maintenanceRecords.filter((record) => (record.performedAt || "").startsWith(thisYear));
  const yearSpend = yearRecords.reduce((total, record) => {
    const cost = Number(record.totalCost);
    return Number.isFinite(cost) ? total + cost : total;
  }, 0);
  els.heroSummary.textContent = yearRecords.length
    ? `Spent ${currency(yearSpend)} on ${yearRecords.length} services so far in ${thisYear}. All data stays on this device.`
    : `No services logged yet in ${thisYear}. All data stays on this device.`;
  els.heroDataStrip.innerHTML = `
    <div class="mini-stat">
      <strong>${state.vehicles.length}</strong>
      <span>Vehicles</span>
    </div>
    <div class="mini-stat">
      <strong>${state.maintenanceRecords.length}</strong>
      <span>Records</span>
    </div>
    <div class="mini-stat">
      <strong>${state.reminders.length}</strong>
      <span>Reminders</span>
    </div>
    <div class="mini-stat">
      <strong>${state.syncQueue.length}</strong>
      <span>Queued</span>
    </div>
  `;
}

function render() {
  if (els.currencySelect) els.currencySelect.value = state.user.currency || "LKR";
  renderHero();
  renderVehicleSwitcher();
  renderDashboard();
  renderVehicles();
  renderMaintenance();
  renderReminders();
  renderServiceCenters();

  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.dataset.view === state.activeView);
  });
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.nav === state.activeView);
  });
  document.querySelectorAll(".tab-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.nav === state.activeView);
  });
}

function navigate(view) {
  state.activeView = view;
  saveState();
  render();
}

function openModal(templateId, title, context = null) {
  const template = document.getElementById(templateId);
  if (!template) return;
  modalContext = context;
  els.modalTitle.textContent = title;
  els.modalModeLabel.textContent = context?.mode === "edit" ? "Editing existing" : "Create new";
  els.modalContent.innerHTML = "";
  els.modalContent.appendChild(template.content.cloneNode(true));
  els.modalRoot.classList.remove("hidden");

  const vehicleSelects = els.modalContent.querySelectorAll('select[name="vehicleId"]');
  vehicleSelects.forEach((select) => renderSelectOptions(select));

  const centerSelect = els.modalContent.querySelector('select[name="serviceCenterId"]');
  if (centerSelect) {
    centerSelect.innerHTML = `<option value="">None</option>${state.serviceCenters.map((center) => `<option value="${esc(center.id)}">${esc(center.name)}</option>`).join("")}`;
  }

  const dateInput = els.modalContent.querySelector('input[name="performedAt"]');
  if (dateInput) dateInput.value = TODAY;

  populateModalForm(context);

  bindModalForms();
}

function closeModal() {
  els.modalRoot.classList.add("hidden");
  els.modalContent.innerHTML = "";
  modalContext = null;
}

function populateModalForm(context) {
  if (!context) return;
  const form = els.modalContent.querySelector("form");
  if (!form || !context.values) return;

  Object.entries(context.values).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) field.value = value ?? "";
  });

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton && context.submitLabel) submitButton.textContent = context.submitLabel;
}

function requireVehicles(actionLabel) {
  if (state.vehicles.length) return true;
  showToast(`Add a vehicle before you ${actionLabel}.`);
  openModal("vehicleModal", "Add vehicle");
  return false;
}

function upsertVehicle(vehicle) {
  const existing = getVehicle(vehicle.id);
  if (existing) {
    state.vehicles = replaceById(state.vehicles, vehicle);
    enqueueSync(syncEventName("vehicle", "updated"), vehicle);
  } else {
    state.vehicles.unshift(vehicle);
    state.activeVehicleId = vehicle.id;
    enqueueSync(syncEventName("vehicle", "created"), vehicle);
  }
}

function upsertMaintenanceRecord(record) {
  const existing = getMaintenanceRecord(record.id);
  if (existing) {
    state.maintenanceRecords = replaceById(state.maintenanceRecords, record);
    enqueueSync(syncEventName("maintenance", "updated"), record);
  } else {
    state.maintenanceRecords.unshift(record);
    enqueueSync(syncEventName("maintenance", "created"), record);
  }

  const vehicle = getVehicle(record.vehicleId);
  if (vehicle && record.odometer !== "" && record.odometer !== null) {
    vehicle.currentOdometer = Math.max(Number(vehicle.currentOdometer), Number(record.odometer));
  }
}

function upsertReminder(reminder) {
  const existing = getReminder(reminder.id);
  if (existing) {
    state.reminders = replaceById(state.reminders, reminder);
    enqueueSync(syncEventName("reminder", "updated"), reminder);
  } else {
    state.reminders.unshift(reminder);
    enqueueSync(syncEventName("reminder", "created"), reminder);
  }
}

function upsertServiceCenter(center) {
  const existing = getServiceCenter(center.id);
  if (existing) {
    state.serviceCenters = replaceById(state.serviceCenters, center);
    enqueueSync(syncEventName("serviceCenter", "updated"), center);
  } else {
    state.serviceCenters.unshift(center);
    enqueueSync(syncEventName("serviceCenter", "created"), center);
  }
}

function editItem(type, itemId) {
  const config = {
    vehicle: {
      templateId: "vehicleModal",
      title: "Edit vehicle",
      item: getVehicle(itemId),
      submitLabel: "Save Changes",
      values: (vehicle) => ({
        nickname: vehicle.nickname,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        plate: vehicle.plate,
        fuelType: vehicle.fuelType,
        purchaseDate: vehicle.purchaseDate,
        currentOdometer: vehicle.currentOdometer,
        defaultIntervalDays: vehicle.defaultServiceIntervals?.days,
        defaultIntervalMileage: vehicle.defaultServiceIntervals?.mileage
      })
    },
    maintenance: {
      templateId: "maintenanceModal",
      title: "Edit maintenance",
      item: getMaintenanceRecord(itemId),
      submitLabel: "Save Changes",
      values: (record) => ({ ...record })
    },
    reminder: {
      templateId: "reminderModal",
      title: "Edit reminder",
      item: getReminder(itemId),
      submitLabel: "Save Changes",
      values: (reminder) => ({ ...reminder })
    },
    serviceCenter: {
      templateId: "serviceCenterModal",
      title: "Edit service center",
      item: getServiceCenter(itemId),
      submitLabel: "Save Changes",
      values: (center) => ({ ...center })
    }
  }[type];

  if (!config || !config.item) return;
  openModal(config.templateId, config.title, {
    mode: "edit",
    type,
    itemId,
    submitLabel: config.submitLabel,
    values: config.values(config.item)
  });
}

let pendingUndo = null;

function deleteItem(type, itemId) {
  const labelMap = {
    vehicle: "vehicle",
    maintenance: "maintenance record",
    reminder: "reminder",
    serviceCenter: "service center"
  };

  const snapshot = {
    vehicles: state.vehicles,
    maintenanceRecords: state.maintenanceRecords,
    reminders: state.reminders,
    serviceCenters: state.serviceCenters,
    activeVehicleId: state.activeVehicleId
  };

  if (type === "vehicle") {
    if (!window.confirm("Delete this vehicle and all of its records and reminders?")) return;
    state.vehicles = state.vehicles.filter((vehicle) => vehicle.id !== itemId);
    state.maintenanceRecords = state.maintenanceRecords.filter((record) => record.vehicleId !== itemId);
    state.reminders = state.reminders.filter((reminder) => reminder.vehicleId !== itemId);
    if (state.activeVehicleId === itemId) {
      state.activeVehicleId = state.vehicles[0]?.id || null;
    }
  }

  if (type === "maintenance") {
    state.maintenanceRecords = state.maintenanceRecords.filter((record) => record.id !== itemId);
  }

  if (type === "reminder") {
    state.reminders = state.reminders.filter((reminder) => reminder.id !== itemId);
  }

  if (type === "serviceCenter") {
    state.serviceCenters = state.serviceCenters.filter((center) => center.id !== itemId);
    state.maintenanceRecords = state.maintenanceRecords.map((record) => (
      record.serviceCenterId === itemId ? { ...record, serviceCenterId: "" } : record
    ));
  }

  pendingUndo = snapshot;
  enqueueSync(syncEventName(type, "deleted"), { id: itemId });
  saveState();
  render();
  showUndoToast(`${labelMap[type][0].toUpperCase()}${labelMap[type].slice(1)} deleted.`);
}

function undoDelete() {
  if (!pendingUndo) return;
  Object.assign(state, pendingUndo);
  pendingUndo = null;
  saveState();
  render();
  showToast("Restored.");
}

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "Wahane",
    version: 1,
    data: state
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `wahane-export-${TODAY}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Backup exported.");
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      let parsed = null;
      try {
        parsed = JSON.parse(reader.result);
      } catch {
        parsed = parseCsvRecords(String(reader.result));
      }

      if (isSimpleRecordList(parsed)) {
        const vehicle = activeVehicle();
        if (!vehicle) {
          showToast("Add a vehicle first, then import its records.");
          return;
        }
        if (!window.confirm(`Add ${parsed.length} maintenance records to "${vehicle.nickname}"? Existing data is kept.`)) return;
        const { added, skipped } = mergeSimpleRecords(parsed, vehicle.id);
        saveState();
        render();
        showToast(`${added} records imported${skipped ? `, ${skipped} skipped (duplicates or incomplete)` : ""}.`);
        return;
      }

      if (!window.confirm("This looks like a full backup. Importing will replace the current local data on this device. Continue?")) return;
      state = normalizeImportedState(parsed.data || parsed);
      saveState();
      render();
      showToast("Data imported successfully.");
    } catch (error) {
      showToast(error.message || "Could not import that file.");
    } finally {
      els.importDataInput.value = "";
    }
  });
  reader.readAsText(file);
}

function bindModalForms() {
  const vehicleForm = document.getElementById("vehicleForm");
  if (vehicleForm) {
    vehicleForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(vehicleForm);
      const vehicle = {
        id: modalContext?.itemId || id("vehicle"),
        ownerId: state.user.id,
        nickname: data.get("nickname"),
        make: data.get("make"),
        model: data.get("model"),
        year: Number(data.get("year")),
        plate: data.get("plate"),
        fuelType: data.get("fuelType"),
        purchaseDate: data.get("purchaseDate"),
        currentOdometer: Number(data.get("currentOdometer")),
        defaultServiceIntervals: {
          days: Number(data.get("defaultIntervalDays") || 0),
          mileage: Number(data.get("defaultIntervalMileage") || 0)
        },
        status: "healthy"
      };
      upsertVehicle(vehicle);
      saveState();
      render();
      closeModal();
      showToast(modalContext ? "Vehicle updated." : "Vehicle added.");
    });
  }

  const maintenanceForm = document.getElementById("maintenanceForm");
  if (maintenanceForm) {
    maintenanceForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(maintenanceForm);
      const record = {
        id: modalContext?.itemId || id("maint"),
        vehicleId: data.get("vehicleId"),
        serviceType: data.get("serviceType"),
        category: data.get("category") || "",
        performedAt: data.get("performedAt"),
        odometer: data.get("odometer") === "" ? "" : Number(data.get("odometer")),
        totalCost: data.get("totalCost"),
        notes: data.get("notes"),
        serviceCenterId: data.get("serviceCenterId"),
        nextDueDate: data.get("nextDueDate"),
        nextDueMileage: data.get("nextDueMileage")
      };
      upsertMaintenanceRecord(record);
      if (!modalContext && (record.nextDueDate || record.nextDueMileage)) {
        state.reminders.unshift({
          id: id("rem"),
          vehicleId: record.vehicleId,
          title: `${record.serviceType} follow-up`,
          relatedServiceType: record.serviceType,
          dueDate: record.nextDueDate,
          dueMileage: record.nextDueMileage,
          status: "healthy",
          leadTime: 14,
          snoozedUntil: ""
        });
      }
      saveState();
      render();
      closeModal();
      showToast(modalContext ? "Maintenance record updated." : "Maintenance record added.");
    });
  }

  const reminderForm = document.getElementById("reminderForm");
  if (reminderForm) {
    reminderForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(reminderForm);
      const reminder = {
        id: modalContext?.itemId || id("rem"),
        vehicleId: data.get("vehicleId"),
        title: data.get("title"),
        relatedServiceType: data.get("relatedServiceType"),
        dueDate: data.get("dueDate"),
        dueMileage: data.get("dueMileage"),
        status: "healthy",
        leadTime: Number(data.get("leadTime") || 7),
        snoozedUntil: data.get("snoozedUntil")
      };
      upsertReminder(reminder);
      saveState();
      render();
      closeModal();
      showToast(modalContext ? "Reminder updated." : "Reminder added.");
    });
  }

  const serviceCenterForm = document.getElementById("serviceCenterForm");
  if (serviceCenterForm) {
    serviceCenterForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(serviceCenterForm);
      const center = {
        id: modalContext?.itemId || id("center"),
        ownerId: state.user.id,
        name: data.get("name"),
        phone: data.get("phone"),
        addressText: data.get("addressText"),
        notes: data.get("notes")
      };
      upsertServiceCenter(center);
      saveState();
      render();
      closeModal();
      showToast(modalContext ? "Service center updated." : "Service center added.");
    });
  }
}

function completeReminder(reminderId) {
  state.reminders = state.reminders.filter((reminder) => reminder.id !== reminderId);
  enqueueSync("reminder.completed", { reminderId });
  saveState();
  render();
  showToast("Reminder marked complete.");
}

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-nav]");
  if (nav) {
    navigate(nav.dataset.nav);
    return;
  }

  const modalTrigger = event.target.closest("[data-open-modal]");
  if (modalTrigger) {
    const templateId = modalTrigger.dataset.openModal;
    if ((templateId === "maintenanceModal" || templateId === "reminderModal") && !requireVehicles(templateId === "maintenanceModal" ? "log maintenance" : "add a reminder")) {
      return;
    }
    const titleMap = {
      vehicleModal: "Add vehicle",
      maintenanceModal: "Log maintenance",
      reminderModal: "Add reminder",
      serviceCenterModal: "Save service center"
    };
    openModal(templateId, titleMap[templateId] || "Add item");
    return;
  }

  const filterChip = event.target.closest("[data-maintenance-filter]");
  if (filterChip) {
    maintenanceFilter = filterChip.dataset.maintenanceFilter;
    renderMaintenance();
    return;
  }

  const activateVehicle = event.target.closest("[data-activate-vehicle]");
  if (activateVehicle) {
    state.activeVehicleId = activateVehicle.dataset.activateVehicle;
    saveState();
    render();
    return;
  }

  const complete = event.target.closest("[data-complete-reminder]");
  if (complete) {
    completeReminder(complete.dataset.completeReminder);
    return;
  }

  const editAction = event.target.closest("[data-edit-type]");
  if (editAction) {
    editItem(editAction.dataset.editType, editAction.dataset.editId);
    return;
  }

  const deleteAction = event.target.closest("[data-delete-type]");
  if (deleteAction) {
    deleteItem(deleteAction.dataset.deleteType, deleteAction.dataset.deleteId);
  }
});

document.getElementById("addVehicleInline").addEventListener("click", () => openModal("vehicleModal", "Add vehicle"));
document.getElementById("closeModal").addEventListener("click", closeModal);
els.exportDataButton.addEventListener("click", exportData);
els.importDataButton.addEventListener("click", () => els.importDataInput.click());
els.importDataInput.addEventListener("change", (event) => importData(event.target.files[0]));
document.getElementById("completeNextReminder").addEventListener("click", () => {
  if (!state.reminders.length) {
    showToast("No reminders to complete yet.");
    return;
  }
  const next = state.reminders
    .map((reminder) => ({ ...reminder, computedStatus: computeReminderStatus(reminder) }))
    .sort((a, b) => {
      const order = { overdue: 0, "due-soon": 1, healthy: 2 };
      return order[a.computedStatus] - order[b.computedStatus];
    })[0];
  if (next) completeReminder(next.id);
});

els.vehicleSelect.addEventListener("change", (event) => {
  state.activeVehicleId = event.target.value;
  saveState();
  render();
});

if (els.currencySelect) {
  els.currencySelect.addEventListener("change", (event) => {
    state.user.currency = event.target.value;
    saveState();
    render();
    showToast(`Costs now shown in ${state.user.currency}.`);
  });
}

els.modalRoot.addEventListener("click", (event) => {
  if (event.target === els.modalRoot) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
});

window.addEventListener("online", () => {
  if (state.user.mode === "authenticated") {
    state.syncQueue = [];
    state.user.lastSyncedAt = new Date().toISOString();
    saveState();
    render();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

render();
