// ================== LOAD SAVE DATA ==================
if (!saveData) {
    showAlertModal("No save data found!", "Missing Save").then(() => {
        window.location.href = "mainmenu.html";
    });
    throw new Error("Missing save data");
}

// ================== INIT UI ==================
document.getElementById("companyName").innerText = saveData.companyName;
document.getElementById("balance").innerText = formatRupiah(saveData.finance.cash);
document.getElementById("ceoGreeting").innerText = saveData.ceoName || "CEO";

// ================== QUICK STATS ==================
function renderQuickStats() {
    const cash = saveData.finance?.cash ?? 0;
    const properties = Array.isArray(saveData.assets) ? saveData.assets.length : 0;
    const landHa = Array.isArray(saveData.land?.locations)
        ? saveData.land.locations.reduce((s, l) => s + (l.total || 0), 0)
        : 0;
    const construction = Array.isArray(saveData.constructionQueue) ? saveData.constructionQueue.length : 0;

    const elCash = document.getElementById("quickCash");
    const elProps = document.getElementById("quickProperties");
    const elLand = document.getElementById("quickLand");
    const elConst = document.getElementById("quickConstruction");

    if (elCash) elCash.innerText = formatRupiah(cash);
    if (elProps) elProps.innerText = properties;
    if (elLand) elLand.innerText = landHa.toFixed(1);
    if (elConst) elConst.innerText = construction;
}

// ================== COMPANY INFO MODAL ==================
const companyInfoModal = document.getElementById("companyInfoModal");

function toggleCompanyInfo() {
    console.log("toggleCompanyInfo called");
    const isOpen = !companyInfoModal.classList.contains("hidden");
    const companyCard = companyInfoModal.querySelector(".system-card");

    if (isOpen) {
        companyInfoModal.classList.add("hide");
        companyCard.classList.add("hide");
        window.isRunning = true;
        // Remove click outside listener
        companyInfoModal.removeEventListener('click', closeOnOutsideClick);
        setTimeout(() => {
            companyInfoModal.classList.add("hidden");
            companyInfoModal.classList.remove("hide");
            companyCard.classList.remove("hide");
        }, 250);
    } else {
        document.getElementById("infoCompanyName").innerText = saveData.companyName;
        document.getElementById("infoCeoName").innerText = saveData.ceoName;
        document.getElementById("infoMode").innerText = saveData.mode ?? "Sandbox";
        companyInfoModal.classList.remove("hidden");
        window.isRunning = false;
        // Add click outside listener
        setTimeout(() => {
            companyInfoModal.addEventListener('click', closeOnOutsideClick);
        }, 10);
    }
}

function closeOnOutsideClick(event) {
    if (event.target === companyInfoModal) {
        toggleCompanyInfo();
    }
}

// ================== SELL SUMMARY ==================
function renderSellSummary() {
    if (!window.gameTime) return;

    let propertiesListed = 0;
    let landListed = 0;
    let totalEstValue = 0;

    if (saveData.assets) {
        propertiesListed = saveData.assets.filter(a => a.finance?.sell?.status === "listed").length;
    }

    if (saveData.land?.sellQueue) {
        saveData.land.sellQueue.forEach(order => {
            if (order.status === "listed") {
                const m2 = order.m2 || (order.ha || 0) * 10000;
                landListed += m2 / 10000;
                const priceDetail = getLandPriceDetail(order.cityName?.toLowerCase?.());
                if (priceDetail) {
                    totalEstValue += m2 * priceDetail.finalPrice;
                }
            }
        });
    }

    if (saveData.assets) {
        saveData.assets.forEach(asset => {
            if (asset.finance?.sell?.status === "listed") {
                const price = calculateFinalSellPrice(asset, asset.finance.sell.mode);
                totalEstValue += price;
            }
        });
    }

    const elProp = document.getElementById("propertiesListed");
    const elLand = document.getElementById("landListed");
    const elTotal = document.getElementById("totalEstValue");

    if (elProp) elProp.innerText = propertiesListed;
    if (elLand) elLand.innerText = landListed.toFixed(2);
    if (elTotal) elTotal.innerText = formatRupiah(totalEstValue);
}

// ================== SAVE GAME ==================
const SAVE_SLOTS_KEY = "procoon_saves";
const ACTIVE_SLOT_KEY = "procoon_active_slot";

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

function openSaveSlotsModal() {
    const modal = document.getElementById("saveSlotsModal");
    if (!modal) return;
    renderSaveSlots();
    modal.classList.remove("hidden");
    window.isRunning = false;
}

function closeSaveSlotsModal() {
    const modal = document.getElementById("saveSlotsModal");
    if (!modal) return;
    modal.classList.add("hidden");
    window.isRunning = true;
}

function renderSaveSlots() {
    const container = document.getElementById("saveSlotsList");
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

        const saveBtn = document.createElement("button");
        saveBtn.className = "save-btn";
        saveBtn.type = "button";
        saveBtn.innerText = slot ? "Overwrite" : "Save";
        saveBtn.onclick = () => saveToSlot(index);

        actions.appendChild(saveBtn);
        row.appendChild(info);
        row.appendChild(actions);
        container.appendChild(row);
    });
}

async function saveToSlot(index) {
    const slots = getSaveSlots();

    if (slots[index]) {
        const confirmOverwrite = await showConfirmModal(
            `Overwrite Slot ${index + 1}?\nThis will replace the existing save.`,
            "Overwrite Save",
            "Overwrite",
            "Cancel"
        );
        if (!confirmOverwrite) return;
    }

    saveData.gameTime = window.gameTime?.toISOString?.() ?? new Date().toISOString();
    const meta = {
        companyName: saveData.companyName || "Company",
        ceoName: saveData.ceoName || "-",
        mode: saveData.mode || "Sandbox",
        cash: saveData.finance?.cash ?? 0,
        gameTime: saveData.gameTime,
        savedAt: new Date().toISOString()
    };

    slots[index] = { meta, data: saveData };
    setSaveSlots(slots);
    localStorage.setItem("procoon_save", JSON.stringify(saveData));
    localStorage.setItem(ACTIVE_SLOT_KEY, String(index));

    renderSaveSlots();
    if (typeof showToast === "function") {
        showToast(`💾 Saved to Slot ${index + 1}`);
    } else {
        showAlertModal(`Saved to Slot ${index + 1}`, "Save");
    }
}

function saveGame() {
    openSaveSlotsModal();
}

// ================== MAIN MENU ==================
async function goToMainMenu() {
    const confirmExit = await showConfirmModal("Return to Main Menu?\nUnsaved progress will be lost.", "Confirm Exit", "Yes", "Stay");
    if (!confirmExit) return;
    window.isRunning = false;
    window.location.href = "mainmenu.html";
}

// ================== INIT ==================
renderQuickStats();
renderSellSummary();

// Add event listeners for buttons
(function() {
    const infoBtn = document.querySelector('.info-btn');
    const timeToggle = document.getElementById('timeToggle');
    
    if (infoBtn) {
        infoBtn.addEventListener('click', toggleCompanyInfo);
        console.log('Info button event listener added');
    } else {
        console.log('Info button not found');
    }
    if (timeToggle) {
        timeToggle.addEventListener('click', window.toggleTime);
        console.log('Time toggle event listener added');
    } else {
        console.log('Time toggle not found');
    }
})();

registerGameTick(() => {
    renderQuickStats();
    renderSellSummary();
});
