import {
  $,
  initEditor,
  createNewJson,
  saveJson,
  onComboInput,
  onComboInputBlur,
  onNameInputKey,
  toggleComboList,
  nameSelected,
  deleteCurrentPerson,
  saveCurrentAnecdote,
  addNewAnecdote,
  deleteCurrentAnecdote,
  prevAnecdote,
  nextAnecdote,
  markDirty,
  openRenameModal,
  startNewMemberMode
} from './editor/editor.js';

import { initCropper, saveCroppedPhoto } from './editor/cropper.js';
import { initAuthUI, login, logout, supabase } from './shared/supabaseClient.js';

// ⭐ NEW — MAIN ENTRY POINT
window.addEventListener("DOMContentLoaded", () => {
  initApp();
});

// ⭐ NEW — LOGIN‑AWARE STARTUP
async function initApp() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    showLoggedOutScreen();
    return;
  }

  // Logged in → show editor UI
  document.getElementById("editorApp").style.display = "block";

  // Your original startup sequence
  initAuthUI();
  initEditor();
  initCropper();
}

// ⭐ NEW — LOGGED‑OUT SCREEN
function showLoggedOutScreen() {
  document.body.innerHTML = `
    <div id="loggedOutScreen" class="logged-out-container">
      <h1>Family Editor</h1>
      <p>You must be logged in to view or edit your family data.</p>
      <button id="loginButton">Log In</button>
    </div>
  `;

  document.getElementById("loginButton").addEventListener("click", async () => {
    const email = prompt("Enter your email address:");
    if (!email) return;

    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      alert("Error sending magic link: " + error.message);
    } else {
      alert("Magic link sent! Check your email.");
    }
  });
}

// PHOTO
$("savePhotoBtn")
  .addEventListener("click", async () => {
    await saveCroppedPhoto();
  });

// JSON BUTTONS
$("openJsonButton")
  .addEventListener("click", async () => {
    await initEditor();
  });

$("createJsonButton")
  .addEventListener("click", async () => {
    await createNewJson();
  });

$("saveJsonButton")
  .addEventListener("click", async () => {
    await saveJson();
  });

// AUTH BUTTONS
$("loginButton").addEventListener("click", login);
$("logoutButton").addEventListener("click", logout);

// NAME / COMBO
$("nameInput")
  .addEventListener("input", onComboInput);

$("nameInput")
  .addEventListener("blur", onComboInputBlur);

$("nameInput").addEventListener("keydown", onNameInputKey);


$("comboArrowButton")
  .addEventListener("click", toggleComboList);

document.addEventListener("click", (e) => {  //close the list if we clicked outside it
  const list = $("comboList");
  const box = document.querySelector(".combo-box");
  const arrow = $("comboArrowButton");

  // If list is closed, do nothing
  if (list.classList.contains("hidden")) return;

  // If click is inside the combo box or arrow, do nothing
  if (box.contains(e.target) || arrow.contains(e.target)) return;

  // Otherwise close the list
  list.classList.add("hidden");
});

$("renameBtn")  
  .addEventListener("click", openRenameModal);

$("newNameBtn")  
  .addEventListener("click", startNewMemberMode);

/*$("newNameBtn")  
  .addEventListener("click", () => startNewMemberMode("New"));  */

// ANECDOTE NAV
$("prevAnecdoteBtn")
  .addEventListener("click", prevAnecdote);

$("nextAnecdoteBtn")
  .addEventListener("click", nextAnecdote);

// ANECDOTE SAVE / ADD / DELETE
$("saveAnecdoteBtn")
  .addEventListener("click", async () => {
    await saveCurrentAnecdote();
  });

$("addAnecdoteBtn")
  .addEventListener("click", addNewAnecdote);

$("deleteAnecdoteBtn")
  .addEventListener("click", deleteCurrentAnecdote);

$("deletePersonBtn")
  .addEventListener("click", deleteCurrentPerson);

// DIRTY MARKING
//$("nameInput").addEventListener("input", markDirty);
$("storyBox").addEventListener("input", markDirty);
$("questionBox").addEventListener("input", markDirty);
$("ans0").addEventListener("input", markDirty);
$("ans1").addEventListener("input", markDirty);
$("ans2").addEventListener("input", markDirty);
$("ans3").addEventListener("input", markDirty);

document.querySelectorAll('input[name="correct"]').forEach(radio => {
  radio.addEventListener("click", markDirty);
});


