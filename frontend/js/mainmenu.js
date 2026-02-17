const modal = document.getElementById("newGameModal");

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
    alert("Load Game clicked!");
    // nanti load dari save data
}

function openSettings() {
    console.log("Settings");
    alert("Settings clicked!");
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
            volatility: 0.02 // 2% chance shock per bulan
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