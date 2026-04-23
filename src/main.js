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

window.addEventListener("DOMContentLoaded", () => {
  initCropper();
  initEditor();
  initAuthUI();
});

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


