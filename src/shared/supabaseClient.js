import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://kwwbpxbcykpqunpukuwu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3d2JweGJjeWtwcXVucHVrdXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzMxNDUsImV4cCI6MjA4OTM0OTE0NX0.CfFh0o5CrQp-zpmXYzhrYQjsqCbiaEYmK7WSqLv9mkE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function login() {
  const email = prompt("Enter email for magic link login:");
  if (!email) return;

  //detect environment
  const isGithub = location.hostname === "brdalton.github.io";
  const redirectUrl = isGithub
    ? "https://brdalton.github.io/FamilyQuestEditor/index.html"
    : "http://127.0.0.1:5500/index.html";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectUrl
      //emailRedirectTo: 'http://127.0.0.1:5500/index.html'
	    //emailRedirectTo: 'https://brdalton.github.io/FamilyQuestEditor/index.html'
    }
  });

  if (error) {
    alert(error.message);
  } else {
    alert("Check your email for a magic link.");
  }
}

export async function logout() {
  await supabase.auth.signOut();
  const userEmailSpan = document.getElementById("userEmail");
  if (userEmailSpan) userEmailSpan.textContent = "";
  alert("Logged out.");
}

export async function initAuthUI() {
  const userEmailSpan = document.getElementById("userEmail");
  const { data } = await supabase.auth.getUser();
  if (data.user && userEmailSpan) {
    userEmailSpan.textContent = data.user.email;
  }
}
