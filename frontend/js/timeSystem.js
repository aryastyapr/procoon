// ===============================
// GLOBAL GAME TIME SYSTEM (SMOOTH)
// 1 hari game = 10 menit real
// ===============================

const REAL_FPS = 60;
const REAL_DAY_MS = 10 * 60 * 1000; // 10 menit real
const GAME_DAY_MS = 24 * 60 * 60 * 1000; // 1 hari game

const SPEED_MULTIPLIER = 600; // DEBUG SPEED
const SPEED_RATIO = (GAME_DAY_MS / REAL_DAY_MS) * SPEED_MULTIPLIER;

window.saveData = JSON.parse(localStorage.getItem("procoon_save"));

if (!saveData) {
    console.warn("No save data, time system idle");
}

window.gameTime = saveData?.gameTime
    ? new Date(saveData.gameTime)
    : new Date(2026, 0, 1, 8, 0, 0);

window.isRunning = true;

let lastRealTime = performance.now();

let lastRender = 0;

// ===============================
// GAME LOOP (SMOOTH)
// ===============================
function gameLoop(now) {
    requestAnimationFrame(gameLoop);

    if (!window.isRunning) {
        lastRealTime = now;
        return;
    }

    const deltaReal = now - lastRealTime;
    lastRealTime = now;

    const deltaGame = deltaReal * SPEED_RATIO;
    window.gameTime = new Date(window.gameTime.getTime() + deltaGame);

    const currentDayKey = window.gameTime.toDateString();

    // 🔒 ANTI REFRESH / PAGE SWITCH EXPLOIT
    if (saveData.lastProcessedDay !== currentDayKey) {
        saveData.lastProcessedDay = currentDayKey;

        if (!saveData.market) return;

        const prevMonth = saveData._lastMarketMonth;
        const currentMonth = window.gameTime.getMonth();

        if (prevMonth !== currentMonth) {
            saveData._lastMarketMonth = currentMonth;
            updateMarketCycle();
        }

        if (typeof window.onNewGameDay === "function") {
            window.onNewGameDay();
        }

        if (typeof window.processDailyFinance === "function") {
            window.processDailyFinance();
        }

        localStorage.setItem("procoon_save", JSON.stringify(saveData));
    }

    // render UI (aman)
    if (now - lastRender > 250) {
        if (typeof window.renderGameTime === "function") {
            window.renderGameTime();
        }
        lastRender = now;
    }

    if (typeof window.onGameTimeTick === "function") {
        window.onGameTimeTick();
    }

    // save tiap 5 detik real
    if (!gameLoop.lastSave || now - gameLoop.lastSave > 5000) {
        saveData.gameTime = window.gameTime.toISOString();
        localStorage.setItem("procoon_save", JSON.stringify(saveData));
        gameLoop.lastSave = now;
    }

    if (typeof window.checkCompletedProjects === "function") {
        window.checkCompletedProjects();
    }
}

requestAnimationFrame(gameLoop);

// ===============================
// DEFAULT RENDER
// ===============================
window.renderGameTime = function () {
    const el = document.getElementById("gameTime");
    if (!el) return;

    el.innerText =
        window.gameTime.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }) +
        " • " +
        window.gameTime.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
        });
};

window.GAME_DAY_REAL_MS = 10 * 60 * 1000;

function updateMarketCycle() {
    const market = saveData.market;

    // shock
    if (Math.random() < market.volatility) {
        rotateMarketCycle(true);
        return;
    }

    const monthsPassed =
        diffMonths(market.cycleStart, window.gameTime);

    if (monthsPassed >= market.durationMonths) {
        rotateMarketCycle(false);
    }
}

function rotateMarketCycle(isShock) {
    const pool = ["boom", "expansion", "stagnant", "recession"];
    const next = pool[Math.floor(Math.random() * pool.length)];

    saveData.market = {
        cycle: next,
        cycleStart: window.gameTime.toISOString(),
        durationMonths: 12 + Math.floor(Math.random() * 36),
        volatility: 0.01 + Math.random() * 0.03
    };

    showToast(
        isShock
            ? "⚠ Market shocked by unexpected event"
            : `📊 Market enters ${next.toUpperCase()} phase`
    );
}
