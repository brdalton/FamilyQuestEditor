import { supabase } from '../shared/supabaseClient.js';
import { editorImageCache, showCachedPhoto } from '../editor/editor.js';

/* JSON STORAGE */

export function createDefaultJson() {
  return {
    family: []
  };
}

export async function loadJsonFromSupabase() {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error getting user:", error);
    return null;
  }

  const user = userData?.user;
  if (!user) {
    console.warn("No logged-in user; cannot load JSON");
    return null;
  }

  // ⭐ Cache-buster added here
  const filePath = `${user.id}/family.json?cacheBust=${Date.now()}`;

  const { data, error: downloadError } = await supabase
    .storage
    .from('json')
    .download(filePath);

  if (downloadError) {
    if (downloadError.status === 404) return null;
    console.error("Error loading JSON:", downloadError);
    return null;
  }
  console.log("JSON download URL:", data);  // **************** 
  const text = await data.text();
  return JSON.parse(text);
}

export async function saveJsonToSupabase(jsonData) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error getting user:", error);
    return;
  }

  const user = userData?.user;
  if (!user) {
    console.warn("No logged-in user; cannot save JSON");
    return;
  }

  const filePath = `${user.id}/family.json`;

  const blob = new Blob(
    [JSON.stringify(jsonData, null, 2)],
    { type: 'application/json' }
  );

  const { error: uploadError } = await supabase
    .storage
    .from('json')
    .upload(filePath, blob, { upsert: true });

  if (uploadError) {
    console.error("Error saving JSON:", uploadError);
  }
}

/* PHOTO STORAGE */

export async function uploadPhotoForMember(member) {
  if (!member.photoBlob) return;

  // 1. Get the logged-in user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    console.error("No authenticated user — cannot upload photo");
    return;
  }

  const user = userData.user;

  // 2. Create a filename (you can keep using member.id if you prefer)
  const filename = `${member.id}.jpg`;

  // 3. Build the per-user path
  const filePath = `${user.id}/${filename}`;

  console.log("Uploading blob:", member.photoBlob);
  console.log("Uploading to:", filePath);

  // 4. Convert blob to File
  const file = new File([member.photoBlob], filename, {
    type: 'image/jpeg'
  });

  // 5. Upload to the NEW bucket: "images"
  const { error } = await supabase.storage
    .from('images')
    .upload(filePath, file, {
      upsert: true
    });

  if (error) {
    console.error(error);
    alert("Error uploading photo: " + error.message);
    return;
  }

  // 6. Store ONLY the filename in JSON
  member.photo = filename;

  console.log("Supabase returned filename:", filename);
  console.log("Assigned to member:", member.photo);

  // 7. Refresh editor cache and preview
  const { data } = supabase.storage
    .from('images')
    .getPublicUrl(`${user.id}/${filename}?cacheBust=${Date.now()}`);

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    editorImageCache[filename] = img;
    showCachedPhoto(member);   // redraw preview with the new image
  };
  img.onerror = () => {
    console.warn("Failed to refresh cached image for member:", member.name);
  };
  img.src = data.publicUrl;
}
