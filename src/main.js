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
  markDirty
} from './editor/editor.js';

import { initCropper, saveCroppedPhoto } from './editor/cropper.js';
import { initAuthUI, login, logout } from './shared/supabaseClient.js';

// INIT
initCropper();
initEditor();
initAuthUI();

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
document.getElementById("storyBox").addEventListener("input", markDirty);
document.getElementById("questionBox").addEventListener("input", markDirty);
document.getElementById("ans0").addEventListener("input", markDirty);
document.getElementById("ans1").addEventListener("input", markDirty);
document.getElementById("ans2").addEventListener("input", markDirty);
document.getElementById("ans3").addEventListener("input", markDirty);

document.querySelectorAll('input[name="correct"]').forEach(radio => {
  radio.addEventListener("click", markDirty);
});