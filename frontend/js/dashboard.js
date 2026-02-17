// ================== LOAD SAVE DATA ==================
if (!saveData) {
    alert("No save data found!");
    window.location.href = "mainmenu.html";
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
function saveGame() {
    saveData.gameTime = window.gameTime?.toISOString?.() ?? new Date().toISOString();
    localStorage.setItem("procoon_save", JSON.stringify(saveData));
    if (typeof showToast === "function") {
        showToast("💾 Game saved successfully!");
    } else {
        alert("Game saved!");
    }
}

// ================== MAIN MENU ==================
function goToMainMenu() {
    const confirmExit = confirm("Kembali ke Main Menu?\nProgress yang belum disimpan akan hilang.");
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
