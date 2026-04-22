// modal.js — dialog-powered version

export function showModal(options) {
  return new Promise(resolve => {
    const dialog = document.getElementById("appDialog");
    const titleEl = dialog.querySelector(".dialog-title");
    const messageEl = dialog.querySelector(".dialog-message");
    const inputEl = dialog.querySelector(".dialog-input");
    const buttonsEl = dialog.querySelector(".dialog-buttons");

    // Reset previous state
    inputEl.style.display = "none";
    inputEl.value = "";
    buttonsEl.innerHTML = "";

    // Apply title + message
    titleEl.textContent = options.title || "";
    messageEl.textContent = options.message || "";

    // Input field (optional)
    if (options.input) {
      inputEl.style.display = "block";
      inputEl.value = options.input.defaultValue || "";
    }

    // Determine buttons
    let buttonList = [];
    if (options.okOnly) {
      buttonList = [{ id: "ok", label: "OK", primary: true }];
    } else if (options.buttons) {
      buttonList = options.buttons;
    } else {
      buttonList = [
        { id: "cancel", label: "Cancel" },
        { id: "ok", label: "OK", primary: true }
      ];
    }

    // Build buttons
    buttonList.forEach(btn => {
      const b = document.createElement("button");
      b.textContent = btn.label;
      b.dataset.button = btn.id;
      if (btn.primary) b.classList.add("primary");
      buttonsEl.appendChild(b);
    });

    // Handle button clicks
    const clickHandler = e => {
      if (e.target.tagName === "BUTTON") {
        const button = e.target.dataset.button;
        closeDialog(button);
      }
    };

    buttonsEl.addEventListener("click", clickHandler);

    // Close helper (handles animation)
    function closeDialog(button) {
      dialog.classList.add("closing");

      dialog.addEventListener(
        "animationend",
        () => {
          dialog.classList.remove("closing");
          dialog.close();
          buttonsEl.removeEventListener("click", clickHandler);

          resolve({
            button,
            input: inputEl.value
          });
        },
        { once: true }
      );
    }

    // ESC key closes as "cancel"
    dialog.addEventListener(
      "cancel",
      e => {
        e.preventDefault();
        closeDialog("cancel");
      },
      { once: true }
    );

    // Show dialog + animate
    dialog.showModal();
    requestAnimationFrame(() => dialog.classList.add("open"));
  });
}
