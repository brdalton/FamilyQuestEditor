import {
  uploadPhotoForMember,
  //downloadPhotoForMember,
  loadJsonFromSupabase,
  saveJsonToSupabase,
  createDefaultJson
} from '../storage/storage.js';
import { supabase } from '../shared/supabaseClient.js';
import { clearCropper, capturePreviewAsBlob } from './cropper.js';

export let jsonData = { family: [] };
export let currentMember = null;
export let currentAnecdoteIndex = 0;
export const editorImageCache = {};

/* Utility */
function $(id) {
  return document.getElementById(id);
}

/* INIT */

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

export async function preloadEditorImages(family) {
  const tasks = family.map(member => loadPhotoIntoCache(member));
  await Promise.all(tasks);
}

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

function showSpinner() {
  document.getElementById("loadingSpinner").classList.remove("hidden");
}

function hideSpinner() {
  document.getElementById("loadingSpinner").classList.add("hidden");
}

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

export async function saveJson() {
  await saveJsonToSupabase(jsonData);
  alert("JSON saved to Supabase.");
}

/* NAMES */
/*
export function populateNameList() {
  const list = $("comboList");
  list.innerHTML = "";

  jsonData.family.forEach(member => {
    const li = document.createElement("li");
    li.textContent = member.name;
    li.onclick = () => selectComboItem(member.name);
    list.appendChild(li);
  });
} */

export function populateNameList() {
  const list = $("comboList");
  list.innerHTML = "";

  // Alphabetize by member.name
  const sorted = [...jsonData.family].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  sorted.forEach(member => {
    const li = document.createElement("li");
    li.textContent = member.name;
    li.onclick = () => selectComboItem(member.name);
    list.appendChild(li);
  });
}

export function toggleComboList() {
  $("comboList").classList.toggle("hidden");
}

function selectComboItem(name) {
  $("nameInput").value = name;
  $("comboList").classList.add("hidden");
  nameSelected();
}

export function onComboInput() {
  const filter = $("nameInput").value.toLowerCase();
  const items = $("comboList").querySelectorAll("li");

  items.forEach(li => {
    li.style.display = li.textContent.toLowerCase().includes(filter)
      ? "block"
      : "none";
  });

  $("comboList").classList.remove("hidden");

  nameSelected();
}

export function nameSelected() {
  const name = $("nameInput").value.trim();
  if (!name) return;
  currentMember = jsonData.family.find(m => m.name === name) || null;

  clearDirty();
  clearCropper();

  if (currentMember) {
    currentAnecdoteIndex = 0;
    loadAnecdote();
    /*
    downloadPhotoForMember(currentMember).then(() => {
      // If the image is already cached, show it immediately
      if (editorImageCache[currentMember.photo]) {
        showCachedPhoto(currentMember);
      } else {
        // Otherwise load it, then show it when ready
        loadPhotoIntoCache(currentMember);
        // Optional: show it automatically when loaded
        // (the loadPhotoIntoCache() onload handler can call showCachedPhoto)
      }
    }); */
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

/* ANECDOTES */

export function showCachedPhoto(member) {
  if (!member || !member.photo) return;

  const img = editorImageCache[member.photo];
  if (!img) return;

  const canvas = document.getElementById("previewCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

function emptyAnecdote() {
  return {
    id: "anecdote-" + Date.now(),
    story: "",
    question: "",
    answers: ["", "", "", ""],
    correct: 0
  };
}

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
}

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

function clearAnecdoteFields() {
  $("storyBox").value = "";
  $("questionBox").value = "";
  $("ans0").value = "";
  $("ans1").value = "";
  $("ans2").value = "";
  $("ans3").value = "";
  document.querySelector(`input[name="correct"][value="0"]`).checked = true;
}

function clearAllFields() {
  $("nameInput").value = "";
  clearAnecdoteFields();
  updateAnecdoteLabels();
  clearDirty();
}

/* DIRTY STATE */

export function markDirty() {
  $("saveAnecdoteBtn").classList.add("save-dirty");
}

export function clearDirty() {
  $("saveAnecdoteBtn").classList.remove("save-dirty");
}

/* SAVE / ADD / DELETE */

export async function deleteCurrentPerson() {
  if (!currentMember) {
    alert("No person selected to delete.");
    return;
  }

  if (!confirm(`Delete ${currentMember.name} and all their anecdotes, including their photo?`)) {
    return;
  }

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

  // 4. Refresh the name list
  populateNameList();

  // 5. Save updated JSON
  await saveJsonToSupabase(jsonData);

  alert("Person deleted.");
}

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

  if (!story || !question || answers.some(a => a === "")) {
    alert("All text fields (story, question, and all answers) must be filled out.");
    return;
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

export function addNewAnecdote() {
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

export function prevAnecdote() {
  if (!currentMember || !currentMember.anecdotes) return;
  if (currentMember.anecdotes.length === 0) return;
  if (currentAnecdoteIndex > 0) {
    currentAnecdoteIndex--;
    loadAnecdote();
  }
}

export function nextAnecdote() {
  if (!currentMember || !currentMember.anecdotes) return;
  if (currentMember.anecdotes.length === 0) return;
  if (currentAnecdoteIndex < currentMember.anecdotes.length - 1) {
    currentAnecdoteIndex++;
    loadAnecdote();
  }
}
