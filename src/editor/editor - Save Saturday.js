import {
  uploadPhotoForMember,
  loadJsonFromSupabase,
  saveJsonToSupabase,
  createDefaultJson
} from '../storage/storage.js';
import { supabase } from '../shared/supabaseClient.js';
import { clearCropper, capturePreviewAsBlob } from './cropper.js';
import { showModal } from "./modal.js";

export let jsonData = { family: [] };
export let currentMember = null;
export let currentAnecdoteIndex = 0;
export const editorImageCache = {};
let newMemberMode = false;
let newMemberName = "new";
let previewHasImage = false;
let isEmpty = false;  //true if question, story, or any answer is empty

/* Utility */

/*********************************************************************
 * function $(id)
 * shortcut used all over the place
 *********************************************************************/
export function $(id) {
  return document.getElementById(id);
}

/* INIT */

/*********************************************************************
 * loadPhotoIntoCache
 * This is called from preloadEditorImages, nameSelected
 *********************************************************************/
export function loadPhotoIntoCache(member) {
  if (!member.photo) return Promise.resolve();

  return supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;

    const { data } = supabase.storage
      .from('images')
      .getPublicUrl(`${user.id}/${member.photo}?cacheBust=${Date.now()}`);

    return new Promise(resolve => {
      const img = new Image();
	  img.crossOrigin = "anonymous";  //might fix a problem
      img.onload = () => {
        editorImageCache[member.photo] = img;
        resolve();
      };
      img.onerror = () => {
        console.warn("Failed to load image for member:", member.name);
        resolve();
      };
      img.src = data.publicUrl;
    });
  });
}

/*********************************************************************
 * preloadEditorImages
 * Called from initEditor
 *********************************************************************/
export async function preloadEditorImages(family) {
  const tasks = family.map(member => loadPhotoIntoCache(member));
  await Promise.all(tasks);
}

/*********************************************************************
 * initEditor
 * Called on DOMContentLoaded from main.js
 *********************************************************************/
export async function initEditor() {
  showSpinner();
  console.log("Loading JSON from Supabase…");

  const { data: { user } } = await supabase.auth.getUser();
  console.log("Logged in as:", user?.email, "User ID:", user?.id);

  let loaded = await loadJsonFromSupabase();

  if (loaded) {
    jsonData = loaded;
    console.log("Loaded JSON from Supabase");
  } else {
    console.log("No JSON found; creating default JSON for this user");
    jsonData = createDefaultJson();
    await saveJsonToSupabase(jsonData);
  }

  // ⭐ Preload all photos into editorImageCache
  await preloadEditorImages(jsonData.family);
  console.log("Family loaded:", jsonData.family.map(m => m.name));
  populateNameList();
  clearAllFields();

  hideSpinner();
}

/*********************************************************************
 * showSpinner
 * Called from initEditor
 *********************************************************************/
function showSpinner() {
  document.getElementById("loadingSpinner").classList.remove("hidden");
}

/*********************************************************************
 * hideSpinner
 * Called from initEditor
 *********************************************************************/
function hideSpinner() {
  document.getElementById("loadingSpinner").classList.add("hidden");
}

/*********************************************************************
 * createNewJson
 * Called on button click
 *********************************************************************/
export async function createNewJson() {
  if (!confirm("Create a new JSON for this user? This will overwrite the existing one in Supabase.")) {
    return;
  }

  jsonData = createDefaultJson();
  currentMember = null;
  currentAnecdoteIndex = 0;
  await saveJsonToSupabase(jsonData);
  populateNameList();
  clearAllFields();
  alert("New JSON created and saved to Supabase.");
}

/***********************************************************************
 * saveJson
 * Called from button click 
 ***********************************************************************/
export async function saveJson() {
  await saveJsonToSupabase(jsonData);
  alert("JSON saved to Supabase.");
}

/* NAMES */

/***********************************************************************
 * populateNameList
 * This is called from initEditor, deleteCurrentPerson, 
 * saveCurrentAnecdote, addNewAnecdote, and commitRename
 ***********************************************************************/
export function populateNameList() {
  const list = $("comboList");
  list.innerHTML = "";

  // Alphabetize by member.name
  const sorted = [...jsonData.family].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  //alert("I just sorted the list in populateNameList");
  sorted.forEach(member => {
    const li = document.createElement("li");
    li.textContent = member.name;
    li.onclick = () => selectComboItem(member.name);
    list.appendChild(li);
  });
}

/***********************************************************
 * toggleComboList
 * Called from selectComboItem and onComboInput 
 ***********************************************************/
export async function toggleComboList() {
  //if (newMemberMode) return; // disable in new member mode
  /*if (!(await guardAgainstUnsavedChanges())) {
    $("comboList").classList.add("hidden");
    return;
  }*/
  const items = $("comboList").querySelectorAll("li");
  items.forEach(li => li.style.display = "block"); // full list always
  $("comboList").classList.toggle("hidden");  

}

/***********************************************************
 * 
 * Guard against illegal saves or switches. Each field must
 * be filled, and we don't want to lose unsaved changes 
 * without giving a choice. 
 ***********************************************************/

/***********************************************************
 * guardAgainstUnsavedChanges
 * Called from selectComboItem and onComboInput 
 ***********************************************************/
async function guardAgainstUnsavedChanges() {
  const hold = $("nameInput").value;
  //alert(`hold is ${hold}`);
  if (isDirty()) {
    //$("nameInput").value = newMemberMode ? newMemberName : currentMember.name;
    if (currentMember) $("nameInput").value = currentMember.name;
    else $("nameInput").value = newMemberName;
    //newMemberMode = false;
    //alert(`currentMember is ${currentMember.name}, hold is ${hold}`);

    const result = await showModal({
      title: "This person is not yet finished.",
      message: "If you exit now, your changes will be lost.",
      buttons: [
        { label: "Go Back", value: "back", class: "primary" },
        { label: "Exit", value: "exit" }
      ]
    });

    if (result.button === "back") {
      return "block";
    }

    // User chose EXIT
    $("nameInput").value = hold;
    clearDirty();
    return "exit";
  }

  // No unsaved changes
  return "clean";
}


/***********************************************************
 * selectComboItem
 * This runs from populateNameList if I click on a name    *
 ***********************************************************/
async function selectComboItem(name) {
  // 1. Guard against unsaved changes
  const guard = await guardAgainstUnsavedChanges();
  if (guard == "block") {
    $("comboList").classList.add("hidden");
    return;
  }
  // 2. Safe to switch
  $("nameInput").value = name;
  $("comboList").classList.add("hidden");
  nameSelected();
}

/********************************************************************
 * onComboInput
 * Called only from the event listener from main.js
 * This runs any time I type in the combo box
 ********************************************************************/
export async function onComboInput() {
  if (!newMemberMode) {  //Skip all this if I'm in newMemberMode
    const guard = await guardAgainstUnsavedChanges();

    if (guard === "block") {  // Keep editing the person we were editing
      $("comboList").classList.add("hidden");
      return;
    }

    if (guard === "exit") {  // User wants to forget about changes
      $("nameInput").value = "";
      $("nameInput").focus();

      // Re-open and re-filter the list
      const input = $("nameInput").value.toLowerCase();
      const items = $("comboList").querySelectorAll("li");

      items.forEach(li => {
        li.style.display = li.textContent.toLowerCase().startsWith(input)
          ? "block"
          : "none";
      });
    }
  }

  // --- Normal clean path continues here ---
  const input = $("nameInput").value;
  newMemberName = input;
/**************************************************************************************
 * in fact, maybe in newMemberMode we get rid of Add New Anecdote, 
 * Delete Anecdote, and Delete Person.
 **************************************************************************************/
  if (!newMemberMode) {  //Skip all this if I'm already in newMemberMode
    if (!currentMember || (currentMember && input !== currentMember.name)) { 
      currentMember = null;
      clearAnecdoteFields();
      updateAnecdoteLabels();
      clearCropper();
      clearPreviewDisplay();
      setDefaultPreview();
      newMemberMode = true;
      $("renameBtn").disabled = true;
      $("newNameBtn").disabled = true;
      $("deletePersonBtn").disabled = true;
    }
  }

  const items = $("comboList").querySelectorAll("li");
  const filter = input.toLowerCase();

  items.forEach(li => {
    li.style.display = li.textContent.toLowerCase().startsWith(filter)
      ? "block"
      : "none";
  });

  $("comboList").classList.remove("hidden");
}

/***********************************************************
 * startNewMemberMode
 * called from somewhere
 ***********************************************************/
export function startNewMemberMode() {
  //alert("Starting a new person.");
  //newMemberMode = true;  //don't set this to true here. It gets set in onComboInput.
  isEmpty = true;
  $("nameInput").value = "New";
  onComboInput();
}

/*************************************************************
 * nameSelected
 *  Called from selectComboItem() and from an onclick
 ************************************************************/
export function nameSelected() {
  const name = $("nameInput").value.trim();
  if (!name) return;
  currentMember = jsonData.family.find(m => m.name === name) || null;

  clearDirty();
  clearCropper();
  clearPreviewDisplay();
  //alert("just called clearPreviewDisplay");
  if (currentMember) {
    newMemberMode = false;
      $("renameBtn").disabled = false;
      $("newNameBtn").disabled = false;
      $("deletePersonBtn").disabled = false;

    currentAnecdoteIndex = 0;
    loadAnecdote();

    // ⭐ Hide answers when selecting a wildcard or follies person
    const answersSection = document.getElementById("answersSection");

    const isWildcard = currentMember.name.toLowerCase().startsWith("wildcard");
    //const isFollies = currentMember.id === "follies";
    const isFollies = currentMember.name.toLowerCase() === "follies";

    if (isWildcard || isFollies) {
      answersSection.style.display = "none";
    } else {
      answersSection.style.display = "block";
    }   
    // end of hide answers

    if (editorImageCache[currentMember.photo]) {
      showCachedPhoto(currentMember);
    } else {
      loadPhotoIntoCache(currentMember).then(() => {
        showCachedPhoto(currentMember);
      });
    }

  } else {
    clearAnecdoteFields();
    updateAnecdoteLabels();
  }
}
/******************************************************************
 * clearPreviewDisplay
 * Called from onComboInput, nameSelected, deleteCurrentPerson
 ******************************************************************/
function clearPreviewDisplay() {
  const previewCanvas = $("previewCanvas");
  if (previewCanvas) {
    const ctxPrev = previewCanvas.getContext("2d");
    ctxPrev.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    //alert("cleared preview with clearPreviewDisplay");
    previewHasImage = false;
    //setDefaultPreview();
  }
}

/*****************************************************************
 * setDefaultPreview
 * Called from onComboInput only to show a default image
 * 
 *****************************************************************/
function setDefaultPreview() {
  const url = "src/images/defaultimage.jpg";
  const previewCanvas = $("previewCanvas");
  if (!previewCanvas) return;
  const ctx = previewCanvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
      // Clear previous content
      ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      // Draw scaled to fit 200×200
      ctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
      previewHasImage = true;
      //alert("drew preview in setDefaultPreview");
  };
  img.src = url;
}

/* ANECDOTES */

/******************************************************************
 * showCachedPhoto
 * Called from nameSelected and uploadPhotoForMember (storage.js)
 ******************************************************************/
export function showCachedPhoto(member) {
  if (!member || !member.photo) return;

  const img = editorImageCache[member.photo];
  if (!img) return;

  const canvas = document.getElementById("previewCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  previewHasImage = true;
  //alert("drew preview with showCachedPhoto");
}

/******************************************************************
 * emptyAnecdote 
 * Called from loadAnecdote, saveCurrentAnecdote, 
 * addNewAnecdote, delCurrentAnecdote
 ******************************************************************/
function emptyAnecdote() {
  return {
    id: "anecdote-" + Date.now(),
    story: "",
    question: "",
    answers: ["", "", "", ""],
    correct: 0
  };
}

/******************************************************************
 * loadAnecdote
 * Called from nameSelected, addNewAnecdote, deleteCurrentAnecdote, 
 * prevAnecdote, nextAnecdote
 ******************************************************************/
function loadAnecdote() {
  clearDirty();

  if (!currentMember) {
    clearAnecdoteFields();
    updateAnecdoteLabels();
    return;
  }

  const anecdotes = currentMember.anecdotes || [];
  if (anecdotes.length === 0) {
    currentMember.anecdotes = [emptyAnecdote()];
    currentAnecdoteIndex = 0;
  }

  if (currentAnecdoteIndex < 0) currentAnecdoteIndex = 0;
  if (currentAnecdoteIndex >= currentMember.anecdotes.length) {
    currentAnecdoteIndex = currentMember.anecdotes.length - 1;
  }

  const a = currentMember.anecdotes[currentAnecdoteIndex];

  $("storyBox").value = a.story || "";
  $("questionBox").value = a.question || "";
  $("ans0").value = a.answers[0] || "";
  $("ans1").value = a.answers[1] || "";
  $("ans2").value = a.answers[2] || "";
  $("ans3").value = a.answers[3] || "";

  const correctValue = a.correct || 0;
  const radio = document.querySelector(`input[name="correct"][value="${correctValue}"]`);
  if (radio) radio.checked = true;

  updateAnecdoteLabels();

  // ⭐ HIDE ANSWERS FOR WILDCARDS & FOLLIES
  const answersSection = document.getElementById("answersSection");

  const isWildcard = currentMember.name.toLowerCase().startsWith("wildcard");
  const isFollies = currentMember.name.toLowerCase() === "follies";

  if (isWildcard || isFollies) {
    answersSection.style.display = "none";
  } else {
    answersSection.style.display = "block";
  }
  validateRequiredFields();
}

/*************************************************************
 * updateAnecdoteLabels
 * Called from onComboInput, nameSelected, loadAnecdote,
 * and clearAllFields
 *************************************************************/
function updateAnecdoteLabels() {
  const title = $("anecdoteTitle");
  const countLabel = $("anecdoteCountLabel");

  if (!currentMember || !currentMember.anecdotes || currentMember.anecdotes.length === 0) {
    title.textContent = "Anecdote 1:";
    countLabel.textContent = "(0 of 0)";
    return;
  }

  const index = currentAnecdoteIndex + 1;
  const total = currentMember.anecdotes.length;
  title.textContent = `Anecdote ${index}:`;
  countLabel.textContent = `(${index} of ${total})`;
}

/*************************************************************
 * clearAnecdoteFields
 * Called from onComboInput, nameSelected, loadAnecdote,
 * and clearAllFields
 *************************************************************/
function clearAnecdoteFields() {
  $("storyBox").value = "";
  $("questionBox").value = "";
  $("ans0").value = "";
  $("ans1").value = "";
  $("ans2").value = "";
  $("ans3").value = "";
  document.querySelector(`input[name="correct"][value="0"]`).checked = true;
  validateRequiredFields();
}

/*************************************************************
 * clearAllFields
 * Called from initEditor, createNewJson, deleteCurrentPerson
 *************************************************************/
function clearAllFields() {
  $("nameInput").value = "";
  clearAnecdoteFields();
  updateAnecdoteLabels();
  clearDirty();
}

/* DIRTY STATE */

/*************************************************************
 * markDirty, clearDirty, isDirty
 * These three functions keep track of changes in the fields
 * by updating the Save button
 *************************************************************/
export function markDirty() {
  $("saveAnecdoteBtn").classList.add("save-dirty");
  validateRequiredFields();
}

export function clearDirty() {
  $("saveAnecdoteBtn").classList.remove("save-dirty");
}

export function isDirty() {
  return $("saveAnecdoteBtn").classList.contains("save-dirty");
}

/* SAVE / ADD / DELETE */

/************************************************************
 * deleteCurrentPerson
 * Called from the event listener connected to the
 * delete person button in main.js.
 ************************************************************/
export async function deleteCurrentPerson() {
  if (!currentMember) {
    //alert("No person selected to delete.");
    showModal({
      title: "Note",
      message: "No person selected to delete.",
      okOnly: true
    });

    return;
  }

  /*if (!confirm(`Delete ${currentMember.name} and all their anecdotes, including their photo?`)) {
    return;
  }*/
  const { button } = await showModal({
    title: "Delete Person",
    message: `Delete ${currentMember.name} and all their anecdotes, including their photo?`,
    buttons: [
      { label: "Delete", value: "delete", class: "danger" },
      { label: "Cancel", value: "cancel" }
    ]
  });
  if (button !== "delete") return;

  // 1. Remove from jsonData.family
  const memberToDelete = currentMember;
  jsonData.family = jsonData.family.filter(m => m !== memberToDelete);

  // 2. Delete their photo from Supabase (if they have one)
  if (memberToDelete.photo) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const filePath = `${user.id}/${memberToDelete.photo}`;

      const { error } = await supabase.storage
        .from('images')
        .remove([filePath]);

      if (error) {
        console.warn("Photo delete error:", error.message);
      } else {
        console.log("Deleted photo:", filePath);
      }
    } catch (err) {
      console.warn("Unexpected error deleting photo:", err);
    }
  }
  
  // 3. Clear UI state
  currentMember = null;
  currentAnecdoteIndex = 0;
  clearAllFields();
  clearCropper();
  clearPreviewDisplay();

  // 4. Refresh the name list
  populateNameList();

  // 5. Save updated JSON
  await saveJsonToSupabase(jsonData);

  alert("Person deleted.");
}

/*************************************************************
* validateRequiredFields
* Called from loadAnecdote, clearAnecdoteFields, markDirty
* need to check the name, and preview isn't verifying on new member
*************************************************************/
function validateRequiredFields() {
  const fields = [
      document.getElementById("nameInput"),
      document.getElementById("storyBox"),
      document.getElementById("questionBox"),
      document.getElementById("ans0"),
      document.getElementById("ans1"),
      document.getElementById("ans2"),
      document.getElementById("ans3")
  ];
  isEmpty = false;
  fields.forEach(field => {
      if (!field.value.trim()) {
          field.classList.add("input-empty");
          isEmpty = true;
      } else {
          field.classList.remove("input-empty");
      }
  });
  $("saveAnecdoteBtn").disabled = isEmpty ? true : false;
  $("addAnecdoteBtn").disabled = isEmpty ? true : false;
}

/*************************************************************
* saveCurrentAnecdote
* Called from addNewAnecdote and commitRename
* and by clicking saveAnecdoteBtn
*************************************************************/
export async function saveCurrentAnecdote() {
  const name = $("nameInput").value.trim();
  if (!name) {
    alert("Name cannot be empty.");
    return;
  }

  // 1. Find existing member by name
  let member = jsonData.family.find(m => m.name.toLowerCase() === name.toLowerCase());

  // 2. If name exists but is not the current member → duplicate name error
  if (member && member !== currentMember) {
    alert("A person with this name already exists. Please choose a different name.");
    return;
  }

  // 3. If no member exists, create one — but DO NOT replace currentMember
  newMemberMode = false;
      $("renameBtn").disabled = false;
      $("newNameBtn").disabled = false;
      $("deletePersonBtn").disabled = false;

  if (!member) {
    member = {
      id: Date.now().toString(),
      name,
      photo: "",
      photoBlob: null,     // ← CRITICAL: ensures cropper writes to correct object
      anecdotes: []
    };
    jsonData.family.push(member);
    populateNameList();
  }

  // 4. Mutate currentMember instead of replacing it
  if (!currentMember) {
    currentMember = member;
  } else {
    Object.assign(currentMember, member);
  }

  // 5. Update anecdote fields
  const story = $("storyBox").value.trim();
  const question = $("questionBox").value.trim();
  const answers = [
    $("ans0").value.trim(),
    $("ans1").value.trim(),
    $("ans2").value.trim(),
    $("ans3").value.trim()
  ];
  const correct = parseInt(document.querySelector("input[name='correct']:checked").value, 10);

  /* 
  if (!story || !question || answers.some(a => a === "")) {
    alert("All text fields (story, question, and all answers) must be filled out.");
    return;
  }*/
  const isWildcard = currentMember.name.toLowerCase().startsWith("wildcard");
  const isFollies = currentMember.name.toLowerCase() === "follies";

  // Always require story + question
  if (!story || !question) {
    alert("Story and question must be filled out.");
    return;
  }

  // Only require answers for normal people
  if (!isWildcard && !isFollies) {
    if (answers.some(a => a === "")) {
      alert("All four answers must be filled in.");
      return;
    }
  }

  if (!currentMember.anecdotes) currentMember.anecdotes = [];

  if (currentAnecdoteIndex < 0 || currentAnecdoteIndex >= currentMember.anecdotes.length) {
    currentAnecdoteIndex = currentMember.anecdotes.length;
    currentMember.anecdotes.push(emptyAnecdote());
  }

  currentMember.anecdotes[currentAnecdoteIndex] = {
    id: currentMember.anecdotes[currentAnecdoteIndex]?.id || ("anecdote-" + Date.now()),
    story,
    question,
    answers,
    correct
  };
  clearCropper();
  clearDirty();
  updateAnecdoteLabels();
  alert("Anecdote saved!");

  // 6. Always capture the preview image on Save
  const blob = await capturePreviewAsBlob();

  // If preview is blank, skip upload
  if (blob && blob.size > 0) {
    currentMember.photoBlob = blob;
    currentMember.photoChanged = true;
  }

  // Upload only if changed
  if (currentMember.photoChanged) {
    await supabase.auth.refreshSession();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("No authenticated user — cannot upload");
	  return;
    }

    await uploadPhotoForMember(currentMember);
    currentMember.photoChanged = false;
  }
  
  // 7. Save JSON
  delete currentMember.photoBlob;
  await saveJsonToSupabase(jsonData);
}

/*************************************************************
* addNewAnecdote
* Called only from clicking the button
*************************************************************/
export function addNewAnecdote() {
  if (isDirty()) {
    saveCurrentAnecdote();
  }
  if (!currentMember) {
    const name = $("nameInput").value.trim();
    if (!name) {
      alert("Enter a name first before adding an anecdote.");
      return;
    }
    let member = jsonData.family.find(m => m.name === name);
    if (!member) {
      member = {
        id: Date.now().toString(),
        name,
        photo: "",
        anecdotes: []
      };
      jsonData.family.push(member);
      populateNameList();
    }
    currentMember = member;
  }

  currentMember.anecdotes = currentMember.anecdotes || [];
  currentMember.anecdotes.push(emptyAnecdote());
  currentAnecdoteIndex = currentMember.anecdotes.length - 1;
  loadAnecdote();
}

/*************************************************************
* deleteCurretnAnecdote
* Called only from clicking the button
*************************************************************/
export function deleteCurrentAnecdote() {
  if (!currentMember || !currentMember.anecdotes || currentMember.anecdotes.length === 0) {
    alert("No anecdote to delete.");
    return;
  }

  if (!confirm("Delete this anecdote?")) return;

  currentMember.anecdotes.splice(currentAnecdoteIndex, 1);

  if (currentMember.anecdotes.length === 0) {
    currentMember.anecdotes.push(emptyAnecdote());
    currentAnecdoteIndex = 0;
  } else if (currentAnecdoteIndex >= currentMember.anecdotes.length) {
    currentAnecdoteIndex = currentMember.anecdotes.length - 1;
  }

  loadAnecdote();
}

/*************************************************************
* prevAnecdote
* Called only from clicking the button
*************************************************************/
export function prevAnecdote() {
  if (!currentMember || !currentMember.anecdotes) return;
  if (currentMember.anecdotes.length === 0) return;
  if (currentAnecdoteIndex > 0) {
    currentAnecdoteIndex--;
    loadAnecdote();
  }
}

/*************************************************************
* nextAnecdote
* Called only from clicking the button
*************************************************************/
export function nextAnecdote() {
  if (!currentMember || !currentMember.anecdotes) return;
  if (currentMember.anecdotes.length === 0) return;
  if (currentAnecdoteIndex < currentMember.anecdotes.length - 1) {
    currentAnecdoteIndex++;
    loadAnecdote();
  }
}

/*************************************************************
* openRenameModal
* Called only from clicking the button
*************************************************************/
export async function openRenameModal() {
  if (!currentMember) return;

  try {
    const result = await showModal({
      title: "Rename Person",
      message: "Enter a new name:",
      input: { defaultValue: currentMember.name }
    });
    if (result.button !== "cancel") {
      commitRename(result.input);
    }
  } catch {
    // user pressed Cancel or Escape
  }
}

/*************************************************************
* commitRename
* Called only from openRenameModal
*************************************************************/
export function commitRename(newName) {
  const oldName = currentMember.name;
  newName = newName.trim();
  // Validate
  if (!newName || newName === oldName) {
    return; // modal already closed by caller
  }

  // 1. Update JSON
  currentMember.name = newName;

  // 2. Update photo filename if needed
  if (currentMember.photo && currentMember.photo.startsWith(oldName)) {
    const ext = currentMember.photo.split(".").pop();
    currentMember.photo = `${newName}.${ext}`;
  }

  // 3. Update the visible combo box input
  $("nameInput").value = newName;

  // 4. Refresh the dropdown list
  populateNameList();

  // 5. Mark JSON as dirty so Save JSON File will persist it
  markDirty();
  saveCurrentAnecdote();
}
