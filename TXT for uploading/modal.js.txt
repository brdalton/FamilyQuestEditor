import { $ } from './editor.js';

let modalResolve = null;
let modalReject = null;

export function showModal(options) {
  const modal = $("universalModal");
  const title = $("modalTitle");
  const message = $("modalMessage");
  const input = $("modalInput");
  const btnContainer = $("modalButtons");

  // -----------------------------
  // 1. Title + message
  // -----------------------------
  title.textContent = options.title || "";
  message.textContent = options.message || "";

  // -----------------------------
  // 2. Input handling
  // -----------------------------
  if (options.input) {
    input.style.display = "block";
    input.value = options.input.defaultValue || "";
    setTimeout(() => { input.focus(); input.select(); }, 0);
  } else {
    input.style.display = "none";
  }

  // -----------------------------
  // 3. Backward compatibility
  // -----------------------------
  if (options.okOnly && !options.buttons) {
    options.buttons = [
      { label: "OK", value: "ok", class: "primary" }
    ];
  }

  // -----------------------------
  // 4. Default buttons if none provided
  // -----------------------------
  if (!options.buttons) {
    options.buttons = [
      { label: "OK", value: "ok", class: "primary" },
      { label: "Cancel", value: "cancel" }
    ];
  }

  // -----------------------------
  // 5. Build dynamic buttons
  // -----------------------------
  btnContainer.innerHTML = ""; // clear previous buttons

  options.buttons.forEach((btn, index) => {
    const b = document.createElement("button");
    b.textContent = btn.label;
    if (btn.class) b.classList.add(btn.class);

    b.addEventListener("click", () => {
      const inputValue =
        input.style.display === "none" ? null : input.value.trim();

      closeModal();
      modalResolve({ button: btn.value, input: inputValue });
    });

    btnContainer.appendChild(b);
  });

  // -----------------------------
  // 6. Keyboard shortcuts
  // -----------------------------
  function handleKeys(e) {
    const first = options.buttons[0];
    const last = options.buttons[options.buttons.length - 1];

    if (e.key === "Enter") {
      const inputValue =
        input.style.display === "none" ? null : input.value.trim();
      closeModal();
      modalResolve({ button: first.value, input: inputValue });
    }

    if (e.key === "Escape") {
      closeModal();
      modalResolve({ button: last.value, input: null });
    }
  }

  document.addEventListener("keydown", handleKeys);

  // -----------------------------
  // 7. Show modal + return promise
  // -----------------------------
  modal.style.display = "flex";

  return new Promise((resolve) => {
    modalResolve = resolve;

    // Reject is no longer used (all buttons resolve)
    modalReject = () => {
      closeModal();
      resolve({ button: "cancel", input: null });
    };
  });

  // -----------------------------
  // 8. Close modal helper
  // -----------------------------
  function closeModal() {
    modal.style.display = "none";
    document.removeEventListener("keydown", handleKeys);
  }
}
