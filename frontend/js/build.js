// ================== LOAD & MIGRATE SAVE ==================
if (!saveData) window.location.href = "mainmenu.html";


if (typeof saveData.finance.cash !== "number") {
    saveData.finance.cash = 0;
}

// SAFETY INIT
if (!saveData.assets) saveData.assets = [];
if (!saveData.constructionQueue) saveData.constructionQueue = [];

localStorage.setItem("procoon_save", JSON.stringify(saveData));

// INIT CONSTRUCTION QUEUE
if (!saveData.constructionQueue) {
    saveData.constructionQueue = [];
}
if (!saveData.assets) {
    saveData.assets = [];
}

// ================== INIT TOP BAR ==================
document.getElementById("companyName").innerText = saveData.companyName;
document.getElementById("balance").innerText = formatRupiah(saveData.finance.cash);

// ================== QUEUE TIME UTILS ==================
function normalizeGameDate(date) {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );
}

function diffCalendarDays(from, to) {
    const start = normalizeGameDate(from);
    const end = normalizeGameDate(to);
    return Math.floor((end - start) / (1000 * 60 * 60 * 24));
}

function getRemainingDays(project) {
    const startDate = new Date(project.startTime);
    const elapsedDays = diffCalendarDays(startDate, gameTime);
    return Math.max(project.duration - elapsedDays, 0);
}

function checkCompletedProjects() {
    let moved = false;

    saveData.constructionQueue = saveData.constructionQueue.filter(project => {
        const remaining = getRemainingDays(project);

        if (remaining <= 0) {
            saveData.assets.push({
    name: project.name,
    variant: project.variant,
    units: project.units,
    landUsed: project.landUsed,
    locationId: project.locationId ?? null,
    plotId: project.plotId ?? null,
    finance: {
        mode: "idle"
    },

    cost: project.cost,
    completedAt: gameTime.toISOString()
});

            moved = true;
            return false; // remove from queue
        }

        return true;
    });

    if (moved) {
        localStorage.setItem("procoon_save", JSON.stringify(saveData));
        renderQueue();
    }
}


function getProgressPercent(project) {
    const startDate = new Date(project.startTime);
    const elapsedDays = diffCalendarDays(startDate, gameTime);
    return Math.min(
        Math.max((elapsedDays / project.duration) * 100, 0),
        100
    );
}

function calculateRefund(project) {
    const cost = project.cost ?? 0; // safety for old save
    const progress = getProgressPercent(project);

    let refundRate = 0;

    if (progress <= 50) {
        refundRate = 0.8;      // 80%
    } else if (progress <= 99) {
        refundRate = 0.6;      // 60%
    } else {
        refundRate = 0;        // selesai = no refund
    }

    return Math.floor(cost * refundRate);
}

function getPenaltyPercent(project) {
    const progress = getProgressPercent(project);

    if (progress <= 50) return 20;
    if (progress <= 99) return 40;
    return 100;
}

function getPenaltyRate(progress) {
    if (progress <= 50) return 0.20;
    if (progress < 100) return 0.40;
    return 0;
}

// ================== PROPERTY CONFIG ==================
const PROPERTY_CONFIG = {
    House: {
        category: "Residential",
        minLand: 0.1,
        minUnit: 5,
        types: {
            Low:    { cost: 250_000_000, income: 1_200_000, land: 0.008, base: 20, scale: 0.4 },
            Middle: { cost: 600_000_000, income: 2_800_000, land: 0.012, base: 30, scale: 0.5 },
            High:   { cost: 1_500_000_000, income: 7_000_000, land: 0.025, base: 45, scale: 0.7 }
        }
    },

    ShopHouse: {
        category: "Commercial",
        minLand: 0.15,
        minUnit: 4,
        types: {
            Standard: { cost: 900_000_000, income: 4_500_000, land: 0.015, base: 25 },
            Prime:    { cost: 1_600_000_000, income: 8_500_000, land: 0.015, base: 35 },
            Premium:  { cost: 3_200_000_000, income: 17_000_000, land: 0.018, base: 50 }
        }
    },

    Apartment: {
        category: "HighDensity",
        minLand: 0.3,
        towerLand: 0.3,
        floor: {
            min: 5,
            max: 100
        },
        types: {
            Studio:    { cost: 450_000_000, income: 2_000_000, unitPerFloor: 8, base: 100, scale: 0.25 },
            "2BR":     { cost: 850_000_000, income: 4_000_000, unitPerFloor: 6, base: 120, scale: 0.3 },
            Penthouse: { cost: 2_500_000_000, income: 11_000_000, unitPerFloor: 2, base: 150, scale: 0.5 }
        }
    }
};

// ================== LAND LOCATION UTILS ==================

function getLandLocations() {
    return Array.isArray(saveData.land?.locations)
        ? saveData.land.locations
        : [];
}

function getLocationById(id) {
    return getLandLocations().find(l => l.id === id) || null;
}

function getLocationAvailableLand(id) {
    const loc = getLocationById(id);
    if (!loc) return 0;
    return loc.total - loc.used;
}

let modalState = {
    property: null,
    variant: null,
    units: 0,
    towers: 0,
    floors: 0
};

let selectedProperty = null;

function resetDetailPanel() {
    document.getElementById("detailName").innerText = "-";
    document.getElementById("detailCategory").innerText = "-";
    document.getElementById("detailCost").innerText = "-";
    document.getElementById("detailTime").innerText = "-";
    document.getElementById("detailMaintenance").innerText = "-";
    document.getElementById("detailIncome").innerText = "-";

    document.querySelector(".confirm-btn").disabled = true;
}

function selectProperty(evt, property) {
    if (!PROPERTY_CONFIG[property]) return;
    
    selectedProperty = property;

    document.querySelectorAll(".build-item")
        .forEach(el => el.classList.remove("active"));

    evt.currentTarget.classList.add("active");

    document.getElementById("detailName").innerText = property;
    document.getElementById("detailCategory").innerText =
        PROPERTY_CONFIG[property].category;

    updateDetailPanel(property);

    // This enables the button
    document.querySelector(".confirm-btn").disabled = false;
}

function updateDetailPanel(property) {
    const cfg = PROPERTY_CONFIG[property];
    if (!cfg) return;

    // take default type (first)
    const defaultTypeKey = Object.keys(cfg.types)[0];
    const type = cfg.types[defaultTypeKey];

    document.getElementById("detailName").innerText = property;
    document.getElementById("detailCategory").innerText = cfg.category;

    // base estimate (1 unit / 1 tower)
    document.getElementById("detailCost").innerText =
        formatRupiah(type.cost);

    document.getElementById("detailIncome").innerText =
        formatRupiah(type.income) + " / day";

    // estimasi waktu
    document.getElementById("detailTime").innerText =
        type.base + " Days";

    // maintenance (simple rule: 10% income)
    document.getElementById("detailMaintenance").innerText =
        formatRupiah(Math.floor(type.income * 0.1)) + " / day";
}

function openSelectedBuildMenu() {
    if (!selectedProperty) {
        showAlertModal("Select a project first", "Selection Needed");
        return;
    }
    openBuildModal(selectedProperty);
}

let lastQueueSnapshot = "";

function renderQueue() {

    const snapshot = saveData.constructionQueue.map(p => {
        return `${p.startTime}|${getRemainingDays(p)}|${Math.floor(getProgressPercent(p))}`;
    }).join("||");

    if (snapshot === lastQueueSnapshot) {
        return; // ⛔ JANGAN RE-RENDER DOM
    }

    lastQueueSnapshot = snapshot;

    const container = document.querySelector(".construction-queue");
    container.replaceChildren();
    container.insertAdjacentHTML("afterbegin", `
        <h3>Construction Queue</h3>
        <p class="queue-hint">Click a project to view details</p>
    `);

    if (saveData.constructionQueue.length === 0) {
        container.innerHTML += `<p class="queue-hint">No active construction</p>`;
        return;
    }

    saveData.constructionQueue.forEach((q, i) => {
        const remaining = getRemainingDays(q);
        const progress = getProgressPercent(q);

        const div = document.createElement("div");
        div.className = "queue-item";
        div.onclick = () => openProjectDetail(i); // ⬅️ PENTING

        div.innerHTML = `
            <div class="queue-header">
                <strong>${q.name} – ${q.variant}</strong>
                <span class="queue-days">${remaining} days</span>
            </div>
            <div class="queue-progress">
                <div class="queue-bar" style="width:${progress}%"></div>
            </div>
        `;

        container.appendChild(div);

        if (activeQueueDetailIndex !== null) {
    renderQueueModal(activeQueueDetailIndex);}

    });
}

let activeQueueDetailIndex = null;

function renderQueueModal(index) {
    const project = saveData.constructionQueue[index];
    if (!project) return;

    const remaining = getRemainingDays(project);
    const progress = Math.floor(getProgressPercent(project));
    const penaltyRate = getPenaltyRate(progress);
    const penalty = Math.floor(project.cost * penaltyRate);
    const refund = project.cost - penalty;

    document.getElementById("queueModalTitle").innerText =
        `${project.name} – ${project.variant}`;

    document.getElementById("queueModalBody").innerHTML = `
        <div class="queue-detail">

            <div class="row">
                <span>Started</span>
                <strong>${new Date(project.startTime).toLocaleDateString("id-ID")}</strong>
            </div>

            <div class="row">
                <span>Duration</span>
                <strong>${project.duration} days</strong>
            </div>

            <div class="row">
                <span>Remaining</span>
                <strong>${remaining} days</strong>
            </div>

            <div class="queue-progress-box">
                <div class="queue-progress-label">
                    <span>Progress</span>
                    <span>${progress}%</span>
                </div>
                <div class="queue-progress-track">
                    <div class="queue-progress-fill" style="width:${progress}%"></div>
                </div>
            </div>

            <div class="queue-finance">
                <div class="item">
                    <span>Total Cost</span>
                    <strong>${formatRupiah(project.cost)}</strong>
                </div>
                <div class="item penalty">
                    <span>Penalty (${Math.floor(penaltyRate * 100)}%)</span>
                    <strong>- ${formatRupiah(penalty)}</strong>
                </div>
                <div class="item refund">
                    <span>Refund</span>
                    <strong>${formatRupiah(refund)}</strong>
                </div>
            </div>

            <p class="queue-warning">
                Cancelling this project will apply penalty and cannot be undone.
            </p>

            <div class="queue-actions">
                <button class="btn-back" onclick="closeQueueModal()">Back</button>
                <button class="btn-cancel" onclick="openCancelConfirm(${index})">
                    Cancel Project
                </button>
            </div>

        </div>
    `;
}

function openProjectDetail(index) {
    activeQueueDetailIndex = index;
    renderQueueModal(index);
    document.getElementById("queueModal").classList.remove("hidden");
}

function closeQueueModal() {
    activeQueueDetailIndex = null;
    document.getElementById("queueModal").classList.add("hidden");
}

function openBuildModal(property) {
    console.log("openBuildModal called for", property);
    document.getElementById("queueModal").classList.add("hidden");
    confirmBuildProject.locked = false;

    modalState.property = property;
    modalState.variant = null;
    modalState.units = 0;
    modalState.towers = 0;
    modalState.floors = 0;

    document.getElementById("modalTitle").innerText = `Build ${property}`;
    document.getElementById("buildModal").classList.remove("hidden");

    const landSelect = document.getElementById("landSelect");
    landSelect.innerHTML = "";

    getLandLocations().forEach(loc => {
        const available = loc.total - loc.used;
        if (available <= 0) return;

        const opt = document.createElement("option");
        opt.value = loc.id;
        opt.textContent =
            `${loc.name} — ${available.toFixed(2)} ha available`;

        landSelect.appendChild(opt);
    });

    if (landSelect.options.length > 0) {
        landSelect.selectedIndex = 0;
    } else {
        // No available land - show warning
        const opt = document.createElement("option");
        opt.disabled = true;
        opt.selected = true;
        opt.textContent = "⚠️ No available land";
        landSelect.appendChild(opt);
    }

    renderModalConfig();
    renderModalSummary();

    landSelect.onchange = () => {
        renderModalConfig();
        renderModalSummary();
    };
}

function renderModalConfig() {
    const prop = modalState.property;
    const cfg = PROPERTY_CONFIG[prop];
    const locationId = document.getElementById("landSelect")?.value;
    if (!locationId) return;
    const remainingLand = getLocationAvailableLand(locationId);

    let html = "";

    // Check minimum land
    if (remainingLand < cfg.minLand) {
    document.getElementById("modalConfig").innerHTML = `
        <p style="color:#f87171">
            ⚠ Not enough land in this location.<br>
            Available: ${remainingLand.toFixed(2)} ha<br>
            Minimum required: ${cfg.minLand} ha
        </p>
    `;
    return;
}


    // TYPE SELECT
    html += `
        <label>Type</label>
        <select onchange="modalState.variant=this.value; renderModalConfig(); renderModalSummary()">
            <option value="">-- Select --</option>
    `;

    Object.keys(cfg.types).forEach(t => {
        html += `<option value="${t}" ${modalState.variant===t?'selected':''}>${t}</option>`;
    });

    html += `</select>`;

    if (!modalState.variant) {
        document.getElementById("modalConfig").innerHTML = html;
        return;
    }

    const type = cfg.types[modalState.variant];

    // HOUSE & SHOPHOUSE
if (prop !== "Apartment") {
    const maxUnit = Math.max(
        cfg.minUnit,
        Math.floor(remainingLand / type.land)
    );

    html += `
        <label>Units (min ${cfg.minUnit}, max ${maxUnit})</label>
        <input type="number"
            min="${cfg.minUnit}"
            max="${maxUnit}"
            value="${modalState.units || cfg.minUnit}"
            oninput="modalState.units=parseInt(this.value)||0; renderModalSummary()">
    `;

    if (maxUnit === cfg.minUnit) {
        html += `
            <p style="color:#fbbf24">
                ⚠ Limited land: you can only build minimum units here.
            </p>
        `;
    }
}


    // APARTMENT
    if (prop === "Apartment") {
        const maxTower = Math.floor(remainingLand / cfg.towerLand);

        html += `
            <label>Towers (max ${maxTower})</label>
            <input type="number"
                min="1"
                max="${maxTower}"
                value="${modalState.towers || 1}"
                oninput="modalState.towers=parseInt(this.value)||0; renderModalSummary()">

            <label>Floors (${cfg.floor.min} - ${cfg.floor.max})</label>
            <input type="number"
                min="${cfg.floor.min}"
                max="${cfg.floor.max}"
                value="${modalState.floors || cfg.floor.min}"
                oninput="modalState.floors=parseInt(this.value)||0; renderModalSummary()">
        `;
    }

    document.getElementById("modalConfig").innerHTML = html;
}


function calculateModalResult() {
    const { property, variant, units, towers, floors } = modalState;
    if (!property || !variant) return null;

    const cfg = PROPERTY_CONFIG[property];
    const type = cfg.types[variant];

    let totalUnits = 0;
    let land = 0;
    let cost = 0;
    let days = type.base;

    // HOUSE & SHOPHOUSE
    if (property !== "Apartment") {
        if (!units || units < cfg.minUnit) return null;

        land = units * type.land;
        cost = units * type.cost;
        totalUnits = units;
        days += units * (type.scale || 1);
    }

    // APARTMENT
    if (property === "Apartment") {
        if (!towers || !floors) return null;

        land = towers * cfg.towerLand;
        totalUnits = towers * floors * type.unitPerFloor;
        cost = totalUnits * type.cost;

        days += (floors * 2) + (totalUnits * type.scale);
    }

    return {
        totalUnits,
        land,
        cost,
        days: Math.ceil(days),
        income: totalUnits * type.income
    };
}


function renderModalSummary() {
    const res = calculateModalResult();
    const el = document.getElementById("modalSummary");

    if (!res) {
        el.innerHTML = `<p style="color:#64748b">Complete configuration</p>`;
        return;
    }

    el.innerHTML = `
        <p>Units: <strong>${res.totalUnits}</strong></p>
        <p>Cost: <strong>${formatRupiah(res.cost)}</strong></p>
        <p>Land: <strong>${res.land.toFixed(2)} ha</strong></p>
        <p>Build Time: <strong>${res.days} days</strong></p>
        <p>Income/day: <strong>${formatRupiah(res.income)}</strong></p>
    `;
}

async function confirmBuildProject() {
    console.log("confirmBuildProject called");
    const res = calculateModalResult();
    if (!res) return;

    if (confirmBuildProject.locked) return;
    confirmBuildProject.locked = true;

    try {
        if (saveData.finance.cash < res.cost) {
            await showAlertModal("Insufficient cash", "Not Enough Cash");
            return;
        }

        const locationId = document.getElementById("landSelect").value;
        const location = getLocationById(locationId);

        if (!location) {
            await showAlertModal("Invalid location", "Location Error");
            return;
        }

        if (getLocationAvailableLand(locationId) < res.land) {
            await showAlertModal("Insufficient land in selected location", "Not Enough Land");
            return;
        }

        // Deduct resources
        saveData.finance.cash -= res.cost;
        location.used += res.land;

        // Sync global land
        saveData.land.used = saveData.land.locations
            .reduce((sum, l) => sum + l.used, 0);

        const newProject = {
            name: modalState.property,
            variant: modalState.variant,
            units: res.totalUnits,
            landUsed: res.land,
            locationId: locationId,
            locationName: location.name,
            cost: res.cost,
            duration: res.days,
            startTime: gameTime.toISOString()
        };

        saveData.constructionQueue.push(newProject);

        localStorage.setItem("procoon_save", JSON.stringify(saveData));
        document.getElementById("balance").innerText = formatRupiah(saveData.finance.cash);

        closeBuildModal();
        renderQueue();

        showToast(`🏗️ ${newProject.name} (${newProject.variant}) added to construction queue`);
    } finally {
        setTimeout(() => {
            confirmBuildProject.locked = false;
        }, 300);
    }


}

function closeBuildModal() {
    confirmBuildProject.locked = false;
    modalState = {
        property: null,
        variant: null,
        units: 0,
        towers: 0,
        floors: 0
    };
    document.getElementById("buildModal").classList.add("hidden");
}

async function cancelProject(index) {
    const project = saveData.constructionQueue[index];
    if (!project) return;

    const progress = getProgressPercent(project);

    // calculate penalty
    let penaltyRate = 0;
    if (progress <= 50) {
        penaltyRate = 0.2; // 20%
    } else if (progress < 100) {
        penaltyRate = 0.4; // 40%
    }

    const penalty = Math.floor(project.cost * penaltyRate);
    const refund = project.cost - penalty;

    const confirmCancel = await showConfirmModal(
        `Cancel this project?\n\n` +
        `Progress: ${Math.floor(progress)}%\n` +
        `Penalty: ${formatRupiah(penalty)}\n` +
        `Refund: ${formatRupiah(refund)}`,
        "Cancel Construction",
        "Cancel Project",
        "Keep Building"
    );

    if (!confirmCancel) return;

    // refund cash
    saveData.finance.cash += refund;

    // return land
    const location = getLocationById(project.locationId);
if (location) {
    location.used -= project.landUsed;
    if (location.used < 0) location.used = 0;
}

    // remove from queue
    saveData.constructionQueue.splice(index, 1);

    localStorage.setItem("procoon_save", JSON.stringify(saveData));

    // update UI
    document.getElementById("balance").innerText = formatRupiah(saveData.finance.cash);
    closeQueueModal();
    renderQueue();
}

function openCancelConfirm(index) {
    const project = saveData.constructionQueue[index];
    if (!project) return;

    const progress = Math.floor(getProgressPercent(project));
    const penaltyRate = getPenaltyRate(progress);
    const penalty = Math.floor(project.cost * penaltyRate);
    const refund = project.cost - penalty;

    document.getElementById("queueModalTitle").innerText =
        "Confirm Cancel Project";

    document.getElementById("queueModalBody").innerHTML = `
        <div class="queue-confirm">

            <div class="queue-confirm-header">
                <span>⚠️</span>
                <div>Cancel Construction Project</div>
            </div>

            <p>
                You are about to cancel:
                <strong>${project.name} – ${project.variant}</strong>
            </p>

            <div class="queue-confirm-box">
                <div class="item">
                    <span>Progress</span>
                    <strong>${progress}%</strong>
                </div>
                <div class="item penalty">
                    <span>Penalty (${Math.floor(penaltyRate * 100)}%)</span>
                    <strong>- ${formatRupiah(penalty)}</strong>
                </div>
                <div class="item refund">
                    <span>Refund</span>
                    <strong>${formatRupiah(refund)}</strong>
                </div>
            </div>

            <p class="queue-confirm-warning">
                This action is irreversible.<br>
                Penalty will be applied immediately.
            </p>

            <div class="queue-confirm-actions">
                <button class="btn-back" onclick="openProjectDetail(${index})">
                    Back
                </button>
                <button class="btn-danger" onclick="confirmCancelProject(${index})">
                    Yes, Cancel Project
                </button>
            </div>

        </div>
    `;
}


function confirmCancelProject(index) {
    const project = saveData.constructionQueue[index];
    if (!project) return;

    const progress = getProgressPercent(project);
    const penaltyRate = getPenaltyRate(progress);
    const penalty = Math.floor(project.cost * penaltyRate);
    const refund = project.cost - penalty;

    // refund cash
    saveData.finance.cash += refund;

    const location = getLocationById(project.locationId);
if (location) {
    location.used -= project.landUsed;
    if (location.used < 0) location.used = 0;
}

// GLOBAL SYNC
saveData.land.used = saveData.land.locations
    .reduce((sum, l) => sum + l.used, 0);

    // remove project
    saveData.constructionQueue.splice(index, 1);

    localStorage.setItem("procoon_save", JSON.stringify(saveData));

    // update UI
    document.getElementById("balance").innerText = formatRupiah(saveData.finance.cash);
    closeQueueModal();
    renderQueue();
}

window.addEventListener("load", () => {
    if (typeof gameTime === "undefined") {
        console.warn("gameTime not ready yet, delay renderQueue");
        setTimeout(renderQueue, 100);
    } else {
        renderQueue();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    resetDetailPanel();

    const buildModal = document.getElementById("buildModal");
    const queueModal = document.getElementById("queueModal");

    if (buildModal) buildModal.classList.add("hidden");
    if (queueModal) queueModal.classList.add("hidden");

    renderQueue();
});

document.querySelectorAll(".build-item").forEach(btn => {
    if (btn.classList.contains("locked")) return;

    btn.addEventListener("click", (e) => {
        const property = btn.dataset.property;
        selectProperty(e, property);
    });
});

// ================== SAFE EVENT BINDING ==================
(function() {
    // BUILD ITEM CLICK
    document.querySelectorAll(".build-item[data-property]")
        .forEach(item => {
            item.addEventListener("click", (e) => {
                const prop = item.dataset.property;
                selectProperty(e, prop);
            });
        });

    // OPEN BUILD MODAL
    const openBtn = document.getElementById("openBuildBtn");
    if (openBtn) {
        openBtn.addEventListener("click", openSelectedBuildMenu);
    }

    // MODAL BUTTONS
    const cancelBtn = document.getElementById("cancelBuildBtn");
    if (cancelBtn) {
        cancelBtn.addEventListener("click", closeBuildModal);
    }

    const confirmBtn = document.getElementById("confirmBuildBtn");
    if (confirmBtn) {
        confirmBtn.addEventListener("click", confirmBuildProject);
        console.log('Confirm build button event listener added');
    } else {
        console.log('Confirm build button not found');
    }

    // INIT UI SAFE
    resetDetailPanel();
    renderQueue();
})();

registerGameTick(() => {
    renderQueue();
});