import {
  initEditor,
  createNewJson,
  saveJson,
  onComboInput,
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
import { initAuthUI, login, logout } from './shared/supabaseClient.js';

window.addEventListener("DOMContentLoaded", () => {
  initCropper();
  initEditor();
  initAuthUI();
});

// PHOTO
document.getElementById("savePhotoBtn")
  .addEventListener("click", async () => {
    await saveCroppedPhoto();
  });

// JSON BUTTONS
document.getElementById("openJsonButton")
  .addEventListener("click", async () => {
    await initEditor();
  });

document.getElementById("createJsonButton")
  .addEventListener("click", async () => {
    await createNewJson();
  });

document.getElementById("saveJsonButton")
  .addEventListener("click", async () => {
    await saveJson();
  });

// AUTH BUTTONS
document.getElementById("loginButton").addEventListener("click", login);
document.getElementById("logoutButton").addEventListener("click", logout);

// NAME / COMBO
document.getElementById("nameInput")
  .addEventListener("input", onComboInput);

document.getElementById("comboArrowButton")
  .addEventListener("click", toggleComboList);

document.addEventListener("click", (e) => {  //close the list if we clicked outside it
  const list = document.getElementById("comboList");
  const box = document.querySelector(".combo-box");
  const arrow = document.getElementById("comboArrowButton");

  // If list is closed, do nothing
  if (list.classList.contains("hidden")) return;

  // If click is inside the combo box or arrow, do nothing
  if (box.contains(e.target) || arrow.contains(e.target)) return;

  // Otherwise close the list
  list.classList.add("hidden");
});

document.getElementById("renameBtn")  
  .addEventListener("click", openRenameModal);

document.getElementById("newNameBtn")  
  .addEventListener("click", startNewMemberMode);

/*document.getElementById("newNameBtn")  
  .addEventListener("click", () => startNewMemberMode("New"));  */

// ANECDOTE NAV
document.getElementById("prevAnecdoteBtn")
  .addEventListener("click", prevAnecdote);

document.getElementById("nextAnecdoteBtn")
  .addEventListener("click", nextAnecdote);

// ANECDOTE SAVE / ADD / DELETE
document.getElementById("saveAnecdoteBtn")
  .addEventListener("click", async () => {
    await saveCurrentAnecdote();
  });

document.getElementById("addAnecdoteBtn")
  .addEventListener("click", addNewAnecdote);

document.getElementById("deleteAnecdoteBtn")
  .addEventListener("click", deleteCurrentAnecdote);

document.getElementById("deletePersonBtn")
  .addEventListener("click", deleteCurrentPerson);

// DIRTY MARKING
document.getElementById("nameInput").addEventListener("input", markDirty);
document.getElementById("storyBox").addEventListener("input", markDirty);
document.getElementById("questionBox").addEventListener("input", markDirty);
document.getElementById("ans0").addEventListener("input", markDirty);
document.getElementById("ans1").addEventListener("input", markDirty);
document.getElementById("ans2").addEventListener("input", markDirty);
document.getElementById("ans3").addEventListener("input", markDirty);

document.querySelectorAll('input[name="correct"]').forEach(radio => {
  radio.addEventListener("click", markDirty);
});


