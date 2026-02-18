const modal = document.getElementById("newGameModal");
const SAVE_SLOTS_KEY = "procoon_saves";
const ACTIVE_SLOT_KEY = "procoon_active_slot";

function newGame() {
    modal.classList.remove("hidden");
}

function closeNewGame() {
    const modalCard = document.querySelector(".modal-card");

    modal.classList.add("hide");
    modalCard.classList.add("hide");

    setTimeout(() => {
        modal.classList.add("hidden");
        modal.classList.remove("hide");
        modalCard.classList.remove("hide");
    }, 250);
}

function startNewGame() {
    const company = document.getElementById("companyName").value.trim();
    const ceo = document.getElementById("ceoName").value.trim();

    if (!company || !ceo) {
        openWarningModal();
        return;
    }

    openConfirmationModal(company, ceo);
}

function loadGame() {
    console.log("Load Game");
    openLoadGameModal();
}

function openSettings() {
    console.log("Settings");
    showAlertModal("Settings clicked!", "Coming Soon");
    // nanti ke settings menu
}

// ===== MODAL FUNCTIONS =====
function openConfirmationModal(company, ceo) {
    const modal = document.getElementById("confirmationModal");
    const messageEl = document.getElementById("confirmationMessage");

    messageEl.innerHTML = `
        <strong>Company:</strong> ${company}<br>
        <strong>CEO:</strong> ${ceo}<br><br>
        Your game has been started successfully!
    `;

    modal.classList.remove("hidden");
}

function confirmStartGame() {
    const company = document.getElementById("companyName").value.trim();
    const ceo = document.getElementById("ceoName").value.trim();

    const gameData = {
        companyName: company,
        ceoName: ceo,
        mode: "sandbox",

        finance: {
            cash: 150000000000,
            dailyIncome: 0,
            dailyExpense: 0,
            assetIncome: [],
            history: []
        },

        land: {
            total: 2,
            used: 0,
            locations: [
                {
                    id: "semarang",
                    name: "Semarang",
                    total: 2,
                    used: 0,
                    cost: 2 * 10000 * 7500000  // 2 ha * 10000 m²/ha * base price
                }
            ]
        },

        market: {
            cycle: "expansion",
            cycleStart: new Date(2026, 0, 1).toISOString(),
            durationMonths: 24,
            volatility: 0.02 // 2% monthly shock chance
        },

        assets: [],
        constructionQueue: [],
        gameTime: new Date(2026, 0, 1, 8, 0, 0).toISOString(),
    };

    localStorage.setItem("procoon_save", JSON.stringify(gameData));

    closeNewGame();
    const modal = document.getElementById("confirmationModal");
    modal.classList.add("hidden");

    window.location.href = "dashboard.html";
}

function openWarningModal() {
    const modal = document.getElementById("warningModal");
    modal.classList.remove("hidden");
}

function closeWarningModal() {
    const modal = document.getElementById("warningModal");
    modal.classList.add("hidden");
}

// ===== LOAD GAME MODAL =====
function openLoadGameModal() {
    const modal = document.getElementById("loadGameModal");
    if (!modal) return;
    renderLoadSlots();
    modal.classList.remove("hidden");
}

function closeLoadGameModal() {
    const modal = document.getElementById("loadGameModal");
    if (!modal) return;
    modal.classList.add("hidden");
}

function getSaveSlots() {
    const raw = localStorage.getItem(SAVE_SLOTS_KEY);
    const slots = raw ? JSON.parse(raw) : [];
    while (slots.length < 3) slots.push(null);
    return slots.slice(0, 3);
}

function setSaveSlots(slots) {
    localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(slots));
}

function buildSlotMeta(slot, index) {
    if (!slot) {
        return {
            title: `Slot ${index + 1}`,
            details: "Empty slot"
        };
    }

    const meta = slot.meta || {};
    const savedAt = meta.savedAt ? new Date(meta.savedAt) : null;
    const savedLabel = savedAt
        ? savedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
        : "Unknown time";

    return {
        title: `${meta.companyName || "Company"} — Slot ${index + 1}`,
        details: `CEO: ${meta.ceoName || "-"} • Mode: ${meta.mode || "Sandbox"}\nSaved: ${savedLabel}`
    };
}

function renderLoadSlots() {
    const container = document.getElementById("loadSlotsList");
    if (!container) return;

    const slots = getSaveSlots();
    container.innerHTML = "";

    slots.forEach((slot, index) => {
        const meta = buildSlotMeta(slot, index);
        const row = document.createElement("div");
        row.className = "save-slot";

        const info = document.createElement("div");
        info.innerHTML = `
            <div class="save-slot-title">${meta.title}</div>
            <div class="save-slot-meta">${meta.details.replace(/\n/g, "<br>")}</div>
        `;

        const actions = document.createElement("div");
        actions.className = "save-slot-actions";

        const loadBtn = document.createElement("button");
        loadBtn.className = "load-btn";
        loadBtn.type = "button";
        loadBtn.innerText = "Load";
        loadBtn.disabled = !slot;
        loadBtn.onclick = () => loadSlot(index);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.type = "button";
        deleteBtn.innerText = "Delete";
        deleteBtn.disabled = !slot;
        deleteBtn.onclick = () => deleteSlot(index);

        actions.appendChild(loadBtn);
        actions.appendChild(deleteBtn);
        row.appendChild(info);
        row.appendChild(actions);
        container.appendChild(row);
    });
}

async function loadSlot(index) {
    const slots = getSaveSlots();
    const slot = slots[index];
    if (!slot) return;

    localStorage.setItem("procoon_save", JSON.stringify(slot.data));
    localStorage.setItem(ACTIVE_SLOT_KEY, String(index));
    closeLoadGameModal();
    window.location.href = "dashboard.html";
}

async function deleteSlot(index) {
    const slots = getSaveSlots();
    if (!slots[index]) return;

    const confirmDelete = await showConfirmModal(
        `Delete Slot ${index + 1}?\nThis cannot be undone.`,
        "Delete Save",
        "Delete",
        "Cancel"
    );
    if (!confirmDelete) return;

    slots[index] = null;
    setSaveSlots(slots);
    renderLoadSlots();
}