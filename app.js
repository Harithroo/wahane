const STORAGE_KEY = "wahane-state-v1";
const TODAY = new Date().toISOString().slice(0, 10);

const defaultState = {
  user: {
    id: "guest-user",
    mode: "guest",
    name: "Guest Driver",
    unitDistance: "mi",
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
    return JSON.parse(raw);
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

const els = {
  menuButton: document.getElementById("menuButton"),
  closeDrawer: document.getElementById("closeDrawer"),
  drawerBackdrop: document.getElementById("drawerBackdrop"),
  mobileDrawer: document.getElementById("mobileDrawer"),
  profileButton: document.getElementById("profileButton"),
  heroSummary: document.getElementById("heroSummary"),
  activeVehicleName: document.getElementById("activeVehicleName"),
  activeVehicleMeta: document.getElementById("activeVehicleMeta"),
  vehicleSelect: document.getElementById("vehicleSelect"),
  attentionList: document.getElementById("attentionList"),
  recentMaintenanceList: document.getElementById("recentMaintenanceList"),
  vehicleStatusCards: document.getElementById("vehicleStatusCards"),
  serviceCenterShortcuts: document.getElementById("serviceCenterShortcuts"),
  vehiclesViewList: document.getElementById("vehiclesViewList"),
  maintenanceViewList: document.getElementById("maintenanceViewList"),
  remindersViewList: document.getElementById("remindersViewList"),
  serviceCentersViewList: document.getElementById("serviceCentersViewList"),
  modalRoot: document.getElementById("modalRoot"),
  modalTitle: document.getElementById("modalTitle"),
  modalContent: document.getElementById("modalContent")
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

function currency(value) {
  if (value === "" || value === null || value === undefined) return "-";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number(value));
}

function emptyState(text) {
  return `<div class="empty-state">${text}</div>`;
}

function renderSelectOptions(select, includeBlank = false) {
  if (!select) return;
  const activeId = state.activeVehicleId || "";
  const options = [];
  if (includeBlank) options.push(`<option value="">None</option>`);
  for (const vehicle of state.vehicles) {
    options.push(`<option value="${vehicle.id}" ${vehicle.id === activeId ? "selected" : ""}>${vehicle.nickname} | ${vehicle.year} ${vehicle.make}</option>`);
  }
  select.innerHTML = options.join("");
}

function renderVehicleSwitcher() {
  renderSelectOptions(els.vehicleSelect);
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
          <strong>${item.title}</strong>
          <span class="status-pill ${item.computedStatus === "overdue" ? "status-overdue" : "status-soon"}">${item.computedStatus === "overdue" ? "Overdue" : "Due soon"}</span>
        </div>
        <div class="meta-row">
          <span>${vehicle ? vehicle.nickname : "Vehicle"}</span>
          <span>${item.dueDate || "No date"}${item.dueMileage ? ` | ${item.dueMileage} ${state.user.unitDistance}` : ""}</span>
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
          <strong>${record.serviceType}</strong>
          <span>${currency(record.totalCost)}</span>
        </div>
        <div class="meta-row">
          <span>${vehicle ? vehicle.nickname : "Vehicle"} | ${record.odometer} ${state.user.unitDistance}</span>
          <span>${record.performedAt}</span>
        </div>
        <div class="meta-row">
          <span>${center ? center.name : "No service center"}</span>
          <span>${record.nextDueDate || "No next date"}</span>
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
          <strong>${vehicle.nickname}</strong>
          <span class="status-pill ${statusClass}">${statusLabel}</span>
        </div>
        <p>${vehicle.year} ${vehicle.make} ${vehicle.model}</p>
        <div class="meta-row">
          <span>${vehicle.currentOdometer} ${state.user.unitDistance}</span>
          <span>${summary.latestRecord ? `Last: ${summary.latestRecord.serviceType}` : "No service yet"}</span>
        </div>
      </article>`;
  }).join("") : emptyState("Add a vehicle to start tracking service, mileage, and reminders.");

  els.serviceCenterShortcuts.innerHTML = state.serviceCenters.length ? state.serviceCenters.slice(0, 4).map((center) => `
    <article class="list-card">
      <strong>${center.name}</strong>
      <div class="meta-row">
        <span>${center.phone || "No phone saved"}</span>
        <span>${center.addressText || "No address saved"}</span>
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
          <strong>${vehicle.nickname}</strong>
          <button class="text-button" type="button" data-activate-vehicle="${vehicle.id}">Set Active</button>
        </div>
        <p>${vehicle.year} ${vehicle.make} ${vehicle.model}</p>
        <div class="meta-row">
          <span>${vehicle.plate || "No plate saved"}</span>
          <span>${vehicle.currentOdometer} ${state.user.unitDistance}</span>
        </div>
        <div class="meta-row">
          <span>${summary.latestRecord ? `Last service: ${summary.latestRecord.performedAt}` : "No maintenance logged"}</span>
          <span>${vehicle.defaultServiceIntervals.mileage || "-"} ${state.user.unitDistance} interval</span>
        </div>
      </article>`;
  }).join("") : emptyState("Your garage is empty. Add the first vehicle and the app will tailor the dashboard around it.");
}

function renderMaintenance() {
  const current = activeVehicle();
  const records = [...state.maintenanceRecords]
    .filter((record) => !current || record.vehicleId === current.id)
    .sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt));

  els.maintenanceViewList.innerHTML = records.length ? records.map((record) => {
    const center = getServiceCenter(record.serviceCenterId);
    return `
      <article class="list-card">
        <div class="detail-row">
          <strong>${record.serviceType}</strong>
          <span>${currency(record.totalCost)}</span>
        </div>
        <div class="meta-row">
          <span>${record.performedAt}</span>
          <span>${record.odometer} ${state.user.unitDistance}</span>
        </div>
        <div class="meta-row">
          <span>${center ? center.name : "No service center selected"}</span>
          <span>${record.nextDueDate || "No next due date"}${record.nextDueMileage ? ` | ${record.nextDueMileage} ${state.user.unitDistance}` : ""}</span>
        </div>
        ${record.notes ? `<p>${record.notes}</p>` : ""}
      </article>`;
  }).join("") : emptyState("No maintenance records for this vehicle yet.");
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
        <strong>${reminder.title}</strong>
        <span class="status-pill ${reminder.computedStatus === "overdue" ? "status-overdue" : reminder.computedStatus === "due-soon" ? "status-soon" : "status-healthy"}">
          ${reminder.computedStatus === "due-soon" ? "Due soon" : reminder.computedStatus === "overdue" ? "Overdue" : "On track"}
        </span>
      </div>
      <div class="meta-row">
        <span>${reminder.relatedServiceType || "General"}</span>
        <span>${reminder.dueDate || "No date"}${reminder.dueMileage ? ` | ${reminder.dueMileage} ${state.user.unitDistance}` : ""}</span>
      </div>
      <div class="detail-row">
        <span class="meta-row">Lead time: ${reminder.leadTime || 7} days</span>
        <button class="text-button" type="button" data-complete-reminder="${reminder.id}">Mark complete</button>
      </div>
    </article>
  `).join("") : emptyState("No reminders yet. Add one for dates, mileage, or both.");
}

function renderServiceCenters() {
  els.serviceCentersViewList.innerHTML = state.serviceCenters.length ? state.serviceCenters.map((center) => `
    <article class="list-card">
      <strong>${center.name}</strong>
      <div class="meta-row">
        <span>${center.phone || "No phone saved"}</span>
        <span>${center.addressText || "No address saved"}</span>
      </div>
      ${center.notes ? `<p>${center.notes}</p>` : ""}
    </article>
  `).join("") : emptyState("Save service centers you trust so future records are faster to log.");
}

function renderHero() {
  const overdue = state.reminders.filter((item) => computeReminderStatus(item) === "overdue").length;
  const soon = state.reminders.filter((item) => computeReminderStatus(item) === "due-soon").length;
  els.profileButton.textContent = state.user.mode === "guest" ? `Guest | ${state.syncQueue.length} queued` : "Account | synced";
  els.heroSummary.textContent = overdue
    ? `${overdue} overdue and ${soon} due-soon items need attention. Data stays local-first and offline-ready.`
    : `${soon} upcoming reminders across ${state.vehicles.length} vehicles. Guest data is stored locally and ready to sync later.`;
}

function render() {
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
  document.querySelectorAll(".drawer-link").forEach((item) => {
    item.classList.toggle("active", item.dataset.nav === state.activeView);
  });
}

function navigate(view) {
  state.activeView = view;
  saveState();
  render();
  closeDrawer();
}

function openModal(templateId, title) {
  const template = document.getElementById(templateId);
  if (!template) return;
  els.modalTitle.textContent = title;
  els.modalContent.innerHTML = "";
  els.modalContent.appendChild(template.content.cloneNode(true));
  els.modalRoot.classList.remove("hidden");

  const vehicleSelects = els.modalContent.querySelectorAll('select[name="vehicleId"]');
  vehicleSelects.forEach((select) => renderSelectOptions(select));

  const centerSelect = els.modalContent.querySelector('select[name="serviceCenterId"]');
  if (centerSelect) {
    centerSelect.innerHTML = `<option value="">None</option>${state.serviceCenters.map((center) => `<option value="${center.id}">${center.name}</option>`).join("")}`;
  }

  const dateInput = els.modalContent.querySelector('input[name="performedAt"]');
  if (dateInput) dateInput.value = TODAY;

  bindModalForms();
}

function closeModal() {
  els.modalRoot.classList.add("hidden");
  els.modalContent.innerHTML = "";
}

function openDrawer() {
  els.mobileDrawer.classList.remove("hidden");
  els.drawerBackdrop.classList.remove("hidden");
  els.menuButton.setAttribute("aria-expanded", "true");
}

function closeDrawer() {
  els.mobileDrawer.classList.add("hidden");
  els.drawerBackdrop.classList.add("hidden");
  els.menuButton.setAttribute("aria-expanded", "false");
}

function bindModalForms() {
  const vehicleForm = document.getElementById("vehicleForm");
  if (vehicleForm) {
    vehicleForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(vehicleForm);
      const vehicle = {
        id: id("vehicle"),
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
      state.vehicles.unshift(vehicle);
      state.activeVehicleId = vehicle.id;
      enqueueSync("vehicle.created", vehicle);
      saveState();
      render();
      closeModal();
    });
  }

  const maintenanceForm = document.getElementById("maintenanceForm");
  if (maintenanceForm) {
    maintenanceForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(maintenanceForm);
      const record = {
        id: id("maint"),
        vehicleId: data.get("vehicleId"),
        serviceType: data.get("serviceType"),
        performedAt: data.get("performedAt"),
        odometer: Number(data.get("odometer")),
        totalCost: data.get("totalCost"),
        notes: data.get("notes"),
        serviceCenterId: data.get("serviceCenterId"),
        nextDueDate: data.get("nextDueDate"),
        nextDueMileage: data.get("nextDueMileage")
      };
      state.maintenanceRecords.unshift(record);
      const vehicle = getVehicle(record.vehicleId);
      if (vehicle) vehicle.currentOdometer = Math.max(Number(vehicle.currentOdometer), Number(record.odometer));
      if (record.nextDueDate || record.nextDueMileage) {
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
      enqueueSync("maintenance.created", record);
      saveState();
      render();
      closeModal();
    });
  }

  const reminderForm = document.getElementById("reminderForm");
  if (reminderForm) {
    reminderForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(reminderForm);
      const reminder = {
        id: id("rem"),
        vehicleId: data.get("vehicleId"),
        title: data.get("title"),
        relatedServiceType: data.get("relatedServiceType"),
        dueDate: data.get("dueDate"),
        dueMileage: data.get("dueMileage"),
        status: "healthy",
        leadTime: Number(data.get("leadTime") || 7),
        snoozedUntil: data.get("snoozedUntil")
      };
      state.reminders.unshift(reminder);
      enqueueSync("reminder.created", reminder);
      saveState();
      render();
      closeModal();
    });
  }

  const serviceCenterForm = document.getElementById("serviceCenterForm");
  if (serviceCenterForm) {
    serviceCenterForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(serviceCenterForm);
      const center = {
        id: id("center"),
        ownerId: state.user.id,
        name: data.get("name"),
        phone: data.get("phone"),
        addressText: data.get("addressText"),
        notes: data.get("notes")
      };
      state.serviceCenters.unshift(center);
      enqueueSync("serviceCenter.created", center);
      saveState();
      render();
      closeModal();
    });
  }
}

function completeReminder(reminderId) {
  state.reminders = state.reminders.filter((reminder) => reminder.id !== reminderId);
  enqueueSync("reminder.completed", { reminderId });
  saveState();
  render();
}

function toggleAccountMode() {
  if (state.user.mode === "guest") {
    state.user.mode = "authenticated";
    state.user.name = "Signed-in Driver";
    state.user.lastSyncedAt = new Date().toISOString();
    state.syncQueue = [];
  } else {
    state.user.mode = "guest";
    state.user.name = "Guest Driver";
    state.user.lastSyncedAt = null;
  }
  saveState();
  render();
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
    const titleMap = {
      vehicleModal: "Add vehicle",
      maintenanceModal: "Log maintenance",
      reminderModal: "Add reminder",
      serviceCenterModal: "Save service center"
    };
    openModal(templateId, titleMap[templateId] || "Add item");
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
  }
});

document.getElementById("addVehicleInline").addEventListener("click", () => openModal("vehicleModal", "Add vehicle"));
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("profileButton").addEventListener("click", toggleAccountMode);
document.getElementById("menuButton").addEventListener("click", () => {
  const expanded = els.menuButton.getAttribute("aria-expanded") === "true";
  if (expanded) {
    closeDrawer();
  } else {
    openDrawer();
  }
});
document.getElementById("closeDrawer").addEventListener("click", closeDrawer);
document.getElementById("drawerBackdrop").addEventListener("click", closeDrawer);
document.getElementById("completeNextReminder").addEventListener("click", () => {
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

els.modalRoot.addEventListener("click", (event) => {
  if (event.target === els.modalRoot) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
    closeDrawer();
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
