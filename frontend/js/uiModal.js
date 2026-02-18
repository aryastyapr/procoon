// Global lightweight modal helpers for alerts, confirms, and prompts
(function(){
    if (window.showAlertModal) return; // prevent re-definition

    function ensureModalStyles() {
        if (document.getElementById("systemModalStyles")) return;
        const style = document.createElement("style");
        style.id = "systemModalStyles";
        style.textContent = `
        .sys-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4px); animation: sysModalFade 0.15s ease-out; }
        .sys-modal { width: min(440px, calc(100vw - 40px)); background: linear-gradient(155deg, #0b1224, #0f172a); border: 1px solid rgba(148,163,184,0.25); border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,0.55); padding: 18px 18px 16px; color: #e5e7eb; font-family: 'Inter', 'Space Grotesk', sans-serif; }
        .sys-modal h3 { margin: 0 0 8px; font-size: 16px; font-weight: 700; color: #f8fafc; letter-spacing: 0.2px; }
        .sys-modal p { margin: 0; color: #cbd5f5; line-height: 1.5; font-size: 14px; }
        .sys-modal .sys-modal-body { margin: 10px 0 14px; }
        .sys-modal .sys-modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
        .sys-modal button { border: none; border-radius: 10px; padding: 10px 14px; font-weight: 700; font-size: 13px; cursor: pointer; transition: transform 0.1s ease, filter 0.15s ease; }
        .sys-btn-secondary { background: rgba(148,163,184,0.14); color: #e2e8f0; border: 1px solid rgba(148,163,184,0.2); }
        .sys-btn-primary { background: linear-gradient(135deg, #3b82f6, #2563eb); color: #e2e8f0; box-shadow: 0 8px 18px rgba(37,99,235,0.25); }
        .sys-modal button:hover { filter: brightness(1.05); transform: translateY(-1px); }
        .sys-modal input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(148,163,184,0.3); background: rgba(15,23,42,0.6); color: #e5e7eb; font-size: 14px; margin-top: 8px; }
        @keyframes sysModalFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        `;
        document.head.appendChild(style);
    }

    function buildModal({ title = "Notice", message = "", html = "", primaryText = "OK", secondaryText = null, input = false, defaultValue = "" }) {
        ensureModalStyles();
        // Cleanup previous if exists
        const existing = document.getElementById("sysModalOverlay");
        if (existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.id = "sysModalOverlay";
        overlay.className = "sys-modal-overlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");

        const modal = document.createElement("div");
        modal.className = "sys-modal";

        const titleEl = document.createElement("h3");
        titleEl.innerText = title;
        modal.appendChild(titleEl);

        const body = document.createElement("div");
        body.className = "sys-modal-body";
        if (html) {
            body.innerHTML = html;
        } else {
            const p = document.createElement("p");
            p.innerText = message;
            body.appendChild(p);
        }
        modal.appendChild(body);

        let inputEl = null;
        if (input) {
            inputEl = document.createElement("input");
            inputEl.type = "text";
            inputEl.value = defaultValue ?? "";
            inputEl.autofocus = true;
            body.appendChild(inputEl);
        }

        const actions = document.createElement("div");
        actions.className = "sys-modal-actions";

        const buttons = [];
        if (secondaryText) {
            const secondaryBtn = document.createElement("button");
            secondaryBtn.className = "sys-btn-secondary";
            secondaryBtn.innerText = secondaryText;
            buttons.push({ el: secondaryBtn, role: "secondary" });
        }

        const primaryBtn = document.createElement("button");
        primaryBtn.className = "sys-btn-primary";
        primaryBtn.innerText = primaryText;
        buttons.push({ el: primaryBtn, role: "primary" });

        buttons.forEach(btn => actions.appendChild(btn.el));
        modal.appendChild(actions);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        return { overlay, primaryBtn, secondaryBtn: secondaryText ? buttons[0].el : null, inputEl };
    }

    function openDialog(opts) {
        return new Promise(resolve => {
            const { overlay, primaryBtn, secondaryBtn, inputEl } = buildModal(opts);

            const cleanup = () => overlay.remove();
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve({ confirmed: false, value: null });
                }
            });

            const confirm = () => {
                const value = inputEl ? inputEl.value : true;
                cleanup();
                resolve({ confirmed: true, value });
            };
            const cancel = () => {
                cleanup();
                resolve({ confirmed: false, value: null });
            };

            primaryBtn.addEventListener("click", confirm);
            if (secondaryBtn) secondaryBtn.addEventListener("click", cancel);

            overlay.addEventListener("keydown", (e) => {
                if (e.key === "Escape") cancel();
                if (e.key === "Enter" && opts.input) confirm();
            });

            // Focus trap start
            setTimeout(() => {
                if (inputEl) inputEl.focus();
                else primaryBtn.focus();
            }, 20);
        });
    }

    window.showAlertModal = function(message, title = "Notice", okText = "OK") {
        return openDialog({ title, message, primaryText: okText });
    };

    window.showConfirmModal = function(message, title = "Confirm", okText = "Yes", cancelText = "Cancel") {
        return openDialog({ title, message, primaryText: okText, secondaryText: cancelText }).then(r => r.confirmed);
    };

    window.showPromptModal = function(message, defaultValue = "", title = "Input", okText = "OK", cancelText = "Cancel") {
        return openDialog({ title, message, primaryText: okText, secondaryText: cancelText, input: true, defaultValue }).then(r => r.confirmed ? r.value : null);
    };
})();
