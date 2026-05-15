import { useState, useMemo, useEffect, useCallback } from "react";

const C = {
  primary:"#0F2A44", secondary:"#2F6F9F", accent:"#2EC4B6",
  bg:"#F8FAFC", card:"#EEF2F6", border:"#CBD5E1",
  textPrimary:"#1F2933", textSecondary:"#64748B",
  success:"#16A34A", warning:"#F59E0B", error:"#DC2626"
};

// ⚠️ Replace with your Anthropic API key
const ANTHROPIC_API_KEY = "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";

const BACKEND_URL = ""; // API routes served by Vercel at /api/*

// ── Supabase Auth ─────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://iuuzivnczywzqyuheaha.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dXppdm5jenl3enF5dWhlYWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzY0MDIsImV4cCI6MjA4ODQxMjQwMn0.R7fXxNvAAIHv9yIpKp3Ut9cxM5OFHgoLPQ5refx_EH4";

async function sbFetch(path, opts={}) {
  const session = JSON.parse(localStorage.getItem("sb_session") || "null");
  const headers = { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, ...opts.headers };
  if (session?.access_token) headers["Authorization"] = "Bearer " + session.access_token;
  const res = await fetch(SUPABASE_URL + path, { ...opts, headers });
  return res.json();
}

async function signUp(email, password) {
  return sbFetch("/auth/v1/signup", { method:"POST", body: JSON.stringify({ email, password }) });
}

async function signIn(email, password) {
  const data = await sbFetch("/auth/v1/token?grant_type=password", { method:"POST", body: JSON.stringify({ email, password }) });
  if (data.access_token) localStorage.setItem("sb_session", JSON.stringify(data));
  return data;
}

async function signInWithGoogle() {
  window.location.href = SUPABASE_URL + "/auth/v1/authorize?provider=google&redirect_to=" + encodeURIComponent(window.location.origin);
}

function signOut() {
  localStorage.removeItem("sb_session");
  localStorage.removeItem("sb_profile");
}

function getSession() {
  return JSON.parse(localStorage.getItem("sb_session") || "null");
}

async function saveProfile(data) {
  const session = getSession();
  if (!session) return;
  // user id can be at session.user.id or session.user.sub depending on auth flow
  const userId = session.user?.id || session.user?.sub;
  if (!userId) { console.error("No user ID in session:", session); return; }
  const result = await sbFetch("/rest/v1/profiles?on_conflict=user_id", {
    method: "POST",
    headers: { "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify({ user_id: userId, ...data, updated_at: new Date().toISOString() })
  });
  console.log("Save result:", result);
  return result;
}

async function loadProfile() {
  const session = getSession();
  if (!session) return null;
  const userId = session.user?.id || session.user?.sub;
  if (!userId) return null;
  const data = await sbFetch("/rest/v1/profiles?user_id=eq." + userId + "&select=*");
  console.log("Load profile result:", data);
  return Array.isArray(data) ? data[0] : null;
}

// semester_pair indicates which courses are recommended to be taken together as semester pairs
const TJ_COURSES = [
  // ── ENGLISH ──────────────────────────────────────────────────────────────────
  { course_code:"113036", course_name:"English 9 HN", subject_area:"English", level_tags:["HN"], min_grade:9, max_grade:9, prerequisites:[], requirement_bucket:"English Core", duration:"year" },
  { course_code:"114036", course_name:"English 10 HN", subject_area:"English", level_tags:["HN"], min_grade:10, max_grade:10, prerequisites:["113036"], requirement_bucket:"English Core", duration:"year" },
  { course_code:"982005", course_name:"AP Seminar: English 10 (Stand Alone)", subject_area:"English", level_tags:["AP"], min_grade:10, max_grade:10, prerequisites:["113036"], requirement_bucket:"English Core", duration:"year" },
  { course_code:"982003", course_name:"AP Seminar: English 10 (Paired with AP World)", subject_area:"English", level_tags:["AP"], min_grade:10, max_grade:10, prerequisites:["113036"], requirement_bucket:"English Core", duration:"year", semester_pair:"234003" },
  { course_code:"1150T1", course_name:"English 11 HN", subject_area:"English", level_tags:["HN","TJ"], min_grade:11, max_grade:11, prerequisites:[], requirement_bucket:"English Core", duration:"year" },
  { course_code:"119604", course_name:"AP English Language (Stand Alone)", subject_area:"English", level_tags:["AP"], min_grade:11, max_grade:12, prerequisites:[], requirement_bucket:"English Core", duration:"year" },
  { course_code:"119662", course_name:"AP English Language (Paired with APUSH)", subject_area:"English", level_tags:["AP"], min_grade:11, max_grade:11, prerequisites:[], requirement_bucket:"English Core", duration:"year", semester_pair:"231905" },
  { course_code:"116036", course_name:"English 12 HN", subject_area:"English", level_tags:["HN"], min_grade:12, max_grade:12, prerequisites:[], requirement_bucket:"English Core", duration:"year" },
  { course_code:"119504", course_name:"AP English Literature (Stand Alone)", subject_area:"English", level_tags:["AP"], min_grade:12, max_grade:12, prerequisites:[], requirement_bucket:"English Core", duration:"year" },
  { course_code:"119505", course_name:"AP English Literature (Paired with AP Govt)", subject_area:"English", level_tags:["AP"], min_grade:12, max_grade:12, prerequisites:[], requirement_bucket:"English Core", duration:"year", semester_pair:"244506" },
  // English Electives
  { course_code:"120000", course_name:"Journalism 1", subject_area:"English", level_tags:[], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"English Elective", duration:"year" },
  { course_code:"121000", course_name:"Journalism 2", subject_area:"English", level_tags:[], min_grade:10, max_grade:12, prerequisites:["120000"], requirement_bucket:"English Elective", duration:"year" },
  { course_code:"121100", course_name:"Journalism 3 HN", subject_area:"English", level_tags:["HN"], min_grade:11, max_grade:12, prerequisites:["121000"], requirement_bucket:"English Elective", duration:"year" },
  { course_code:"121200", course_name:"Journalism 4 HN", subject_area:"English", level_tags:["HN"], min_grade:12, max_grade:12, prerequisites:["121100"], requirement_bucket:"English Elective", duration:"year" },
  { course_code:"121500", course_name:"Photojournalism 1", subject_area:"English", level_tags:[], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"English Elective", duration:"semester" },
  { course_code:"121600", course_name:"Photojournalism 2", subject_area:"English", level_tags:[], min_grade:10, max_grade:12, prerequisites:["121500"], requirement_bucket:"English Elective", duration:"semester" },
  { course_code:"121700", course_name:"Photojournalism 3 HN", subject_area:"English", level_tags:["HN"], min_grade:11, max_grade:12, prerequisites:["121600"], requirement_bucket:"English Elective", duration:"semester" },
  { course_code:"122000", course_name:"Broadcast Journalism 1", subject_area:"English", level_tags:[], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"English Elective", duration:"semester" },
  { course_code:"122012", course_name:"Broadcast Journalism 2", subject_area:"English", level_tags:[], min_grade:10, max_grade:12, prerequisites:["122000"], requirement_bucket:"English Elective", duration:"semester" },
  { course_code:"122013", course_name:"Broadcast Journalism 3 HN", subject_area:"English", level_tags:["HN"], min_grade:11, max_grade:12, prerequisites:["122012"], requirement_bucket:"English Elective", duration:"semester" },

  // ── SOCIAL STUDIES ────────────────────────────────────────────────────────────
  { course_code:"221204", course_name:"AP Human Geography", subject_area:"Social Studies", level_tags:["AP"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World History I", duration:"year" },
  { course_code:"222136", course_name:"World History & Geography 2 HN", subject_area:"Social Studies", level_tags:["HN"], min_grade:10, max_grade:10, prerequisites:[], requirement_bucket:"World History II", duration:"year" },
  { course_code:"234004", course_name:"AP World History (Stand Alone)", subject_area:"Social Studies", level_tags:["AP"], min_grade:10, max_grade:10, prerequisites:[], requirement_bucket:"World History I/II", duration:"year" },
  { course_code:"234003", course_name:"AP World History (Paired with AP Seminar)", subject_area:"Social Studies", level_tags:["AP"], min_grade:10, max_grade:10, prerequisites:[], requirement_bucket:"World History I/II", duration:"year", semester_pair:"982003" },
  { course_code:"236036", course_name:"US/VA History HN", subject_area:"Social Studies", level_tags:["HN"], min_grade:11, max_grade:11, prerequisites:[], requirement_bucket:"US History", duration:"year" },
  { course_code:"231904", course_name:"AP US History (Stand Alone)", subject_area:"Social Studies", level_tags:["AP"], min_grade:11, max_grade:11, prerequisites:[], requirement_bucket:"US History", duration:"year" },
  { course_code:"231905", course_name:"AP US History (Paired with AP Eng Lang)", subject_area:"Social Studies", level_tags:["AP"], min_grade:11, max_grade:11, prerequisites:[], requirement_bucket:"US History", duration:"year", semester_pair:"119662" },
  { course_code:"244036", course_name:"US/VA Government HN", subject_area:"Social Studies", level_tags:["HN"], min_grade:12, max_grade:12, prerequisites:[], requirement_bucket:"US Government", duration:"year" },
  { course_code:"244504", course_name:"AP US Government (Stand Alone)", subject_area:"Social Studies", level_tags:["AP"], min_grade:12, max_grade:12, prerequisites:[], requirement_bucket:"US Government", duration:"year" },
  { course_code:"244506", course_name:"AP US Government (Paired with AP Eng Lit)", subject_area:"Social Studies", level_tags:["AP"], min_grade:12, max_grade:12, prerequisites:[], requirement_bucket:"US Government", duration:"year", semester_pair:"119505" },
  // World History I satisfiers
  { course_code:"2371TJ", course_name:"African American History TJ HN", subject_area:"Social Studies", level_tags:["HN","TJ"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World History I", duration:"year" },
  { course_code:"2219T1", course_name:"Ancient & Classical Civilizations TJ HN", aliases:["Ancnt & Clas Civ TJ HN", "Ancient & Classical Civ TJ HN"], subject_area:"Social Studies", level_tags:["HN","TJ"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World History I", duration:"year" },
  { course_code:"2996T1", course_name:"History of Science TJ HN", subject_area:"Social Studies", level_tags:["HN","TJ"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World History I", duration:"year" },
  { course_code:"2340T1", course_name:"20th Century World History TJ HN", subject_area:"Social Studies", level_tags:["HN","TJ"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World History I", duration:"year" },
  { course_code:"2996T2", course_name:"America & World Since 1989 TJ HN", subject_area:"Social Studies", level_tags:["HN","TJ"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World History I", duration:"year" },
  { course_code:"2373TJ", course_name:"Ethnic Studies TJ HN", subject_area:"Social Studies", level_tags:["HN","TJ"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World History I", duration:"year" },
  { course_code:"2374T1", course_name:"Anthropology Studies TJ HN", subject_area:"Social Studies", level_tags:["HN","TJ"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World History I", duration:"year" },
  { course_code:"2420T1", course_name:"Law and Society TJ HN", subject_area:"Social Studies", level_tags:["HN","TJ"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World History I", duration:"year" },
  { course_code:"2900T1", course_name:"Psychology: Brain & Behavior TJ HN", subject_area:"Social Studies", level_tags:["HN","TJ"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World History I", duration:"year" },
  { course_code:"2950T1", course_name:"Inquiry into Ideas TJ HN", subject_area:"Social Studies", level_tags:["HN","TJ"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World History I", duration:"year" },
  { course_code:"2950T2", course_name:"Religious Studies TJ HN", subject_area:"Social Studies", level_tags:["HN","TJ"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World History I", duration:"year" },
  { course_code:"2998T2", course_name:"Ethical Leadership TJ HN", subject_area:"Social Studies", level_tags:["HN","TJ"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World History I", duration:"year" },
  // SS Electives
  { course_code:"239904", course_name:"AP European History", subject_area:"Social Studies", level_tags:["AP"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"Social Studies Elective", duration:"year" },
  { course_code:"280404", course_name:"AP Macroeconomics/Microeconomics", subject_area:"Social Studies", level_tags:["AP"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"Social Studies Elective", duration:"year" },
  { course_code:"290204", course_name:"AP Psychology", subject_area:"Social Studies", level_tags:["AP"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"Social Studies Elective", duration:"year" },

  // ── HEALTH & PE ───────────────────────────────────────────────────────────────
  { course_code:"730000", course_name:"Health & PE 9", subject_area:"Health & PE", level_tags:[], min_grade:9, max_grade:9, prerequisites:[], requirement_bucket:"PE Core", duration:"year" },
  { course_code:"740500", course_name:"Health & PE 10", subject_area:"Health & PE", level_tags:[], min_grade:10, max_grade:10, prerequisites:["730000"], requirement_bucket:"PE Core", duration:"year" },
  { course_code:"751050", course_name:"Yoga for Wellness", subject_area:"Health & PE", level_tags:[], min_grade:11, max_grade:12, prerequisites:[], requirement_bucket:"PE Elective", duration:"semester" },
  { course_code:"764011", course_name:"Personal Fitness 1", subject_area:"Health & PE", level_tags:[], min_grade:11, max_grade:12, prerequisites:[], requirement_bucket:"PE Elective", duration:"semester" },
  { course_code:"763032", course_name:"Sports Medicine A", subject_area:"Health & PE", level_tags:[], min_grade:10, max_grade:12, prerequisites:[], requirement_bucket:"PE Elective", duration:"semester" },
  { course_code:"763033", course_name:"Sports Medicine B", subject_area:"Health & PE", level_tags:[], min_grade:10, max_grade:12, prerequisites:["763032"], requirement_bucket:"PE Elective", duration:"semester" },

  // ── SCIENCE ───────────────────────────────────────────────────────────────────
  // Core sequence: Bio → Chem → Physics (all TJ students must complete all three + 4th year)
  { course_code:"431036", course_name:"Biology 1 HN", subject_area:"Science", level_tags:["HN"], min_grade:9, max_grade:9, prerequisites:[], requirement_bucket:"Science Core - Bio", duration:"year" },
  { course_code:"4370TJ", course_name:"AP Biology", subject_area:"Science", level_tags:["AP","TJ"], min_grade:10, max_grade:12, prerequisites:["431036"], requirement_bucket:"Science Core - Bio", duration:"year", notes:"4th year science satisfier*" },
  { course_code:"441036", course_name:"Chemistry 1 HN", subject_area:"Science", level_tags:["HN"], min_grade:10, max_grade:10, prerequisites:["431036"], requirement_bucket:"Science Core - Chem", duration:"year" },
  { course_code:"4470TJ", course_name:"AP Chemistry", subject_area:"Science", level_tags:["AP","TJ"], min_grade:11, max_grade:12, prerequisites:["441036"], requirement_bucket:"Science Core - Chem", duration:"year", notes:"4th year science satisfier*" },
  { course_code:"451036", course_name:"Physics 1 HN", subject_area:"Science", level_tags:["HN"], min_grade:11, max_grade:11, prerequisites:["441036"], requirement_bucket:"Science Core - Physics", duration:"year" },
  { course_code:"4573TJ", course_name:"AP Physics 1", subject_area:"Science", level_tags:["AP","TJ"], min_grade:11, max_grade:12, prerequisites:["441036"], requirement_bucket:"Science Core - Physics", duration:"year" },
  { course_code:"4574TJ", course_name:"AP Physics 2", subject_area:"Science", level_tags:["AP","TJ"], min_grade:12, max_grade:12, prerequisites:["4573TJ"], requirement_bucket:"Science Elective", duration:"year", notes:"4th year science satisfier*" },
  { course_code:"4575TJ", course_name:"AP Physics C Mechanics", subject_area:"Science", level_tags:["AP","TJ"], min_grade:11, max_grade:12, prerequisites:["441036"], requirement_bucket:"Science Core - Physics", duration:"year" },
  { course_code:"4570TJ", course_name:"AP Physics C Mechanics & E&M", subject_area:"Science", level_tags:["AP","TJ"], min_grade:12, max_grade:12, prerequisites:["4575TJ"], requirement_bucket:"Science Elective", duration:"year", notes:"4th year science satisfier*" },
  { course_code:"427004", course_name:"AP Environmental Science", subject_area:"Science", level_tags:["AP"], min_grade:10, max_grade:12, prerequisites:[], requirement_bucket:"Science Elective", duration:"year", notes:"4th year science satisfier*" },
  // Science Electives
  { course_code:"422068", course_name:"Geospatial Analysis AV", subject_area:"Science", level_tags:["AV"], min_grade:10, max_grade:12, prerequisites:[], requirement_bucket:"Science Elective", duration:"year" },
  { course_code:"4621T2", course_name:"Bioinformatics TJ HN", subject_area:"Science", level_tags:["HN","TJ"], min_grade:10, max_grade:12, prerequisites:["431036"], requirement_bucket:"Science Elective", duration:"year" },
  { course_code:"4520T9", course_name:"Electrodynamics TJ AV", subject_area:"Science", level_tags:["AV","TJ"], min_grade:11, max_grade:12, prerequisites:["4575TJ"], requirement_bucket:"Science Elective", duration:"year" },
  { course_code:"4260T4", course_name:"Advanced Astronomy: Solar System TJ HN", subject_area:"Science", level_tags:["HN","TJ"], min_grade:10, max_grade:12, prerequisites:[], requirement_bucket:"Science Elective", duration:"year" },
  { course_code:"4260T5", course_name:"Advanced Astronomy: Universe TJ HN", subject_area:"Science", level_tags:["HN","TJ"], min_grade:10, max_grade:12, prerequisites:[], requirement_bucket:"Science Elective", duration:"year" },
  { course_code:"4320TT", course_name:"Marine Science Technology TJ HN", subject_area:"Science", level_tags:["HN","TJ"], min_grade:10, max_grade:12, prerequisites:[], requirement_bucket:"Science Elective", duration:"year" },
  { course_code:"4320T1", course_name:"Advanced Marine Biology TJ HN", subject_area:"Science", level_tags:["HN","TJ"], min_grade:11, max_grade:12, prerequisites:["4320TT"], requirement_bucket:"Science Elective", duration:"year" },
  { course_code:"4320T6", course_name:"DNA Science 1 TJ HN", subject_area:"Science", level_tags:["HN","TJ"], min_grade:10, max_grade:12, prerequisites:["431036"], requirement_bucket:"Science Elective", duration:"year" },
  { course_code:"4320T7", course_name:"DNA Science 2 TJ HN", subject_area:"Science", level_tags:["HN","TJ"], min_grade:11, max_grade:12, prerequisites:["4320T6"], requirement_bucket:"Science Elective", duration:"year" },
  { course_code:"4320T8", course_name:"Neurobiology TJ AV", subject_area:"Science", level_tags:["AV","TJ"], min_grade:11, max_grade:12, prerequisites:["431036","441036"], requirement_bucket:"Science Elective", duration:"year" },
  { course_code:"4420T6", course_name:"Organic Chemistry TJ AV", subject_area:"Science", level_tags:["AV","TJ"], min_grade:11, max_grade:12, prerequisites:["4470TJ"], requirement_bucket:"Science Elective", duration:"year" },
  { course_code:"4610T6", course_name:"Bio-Nanotech TJ HN", subject_area:"Science", level_tags:["HN","TJ"], min_grade:11, max_grade:12, prerequisites:["441036"], requirement_bucket:"Science Elective", duration:"year" },

  // ── MATHEMATICS ───────────────────────────────────────────────────────────────
  // Core sequence (all TJ students take math all 4 years)
  { course_code:"314336", course_name:"Geometry HN", aliases:["314300", "Geometry HN", "Geometry"], subject_area:"Math", level_tags:["HN"], min_grade:9, max_grade:9, prerequisites:[], requirement_bucket:"Math Core", duration:"year" },
  { course_code:"3135TM", course_name:"Algebra 2 HN", aliases:["313736", "Algebra 2 Trig HN", "Algebra 2 Trig"], subject_area:"Math", level_tags:["HN"], min_grade:9, max_grade:10, prerequisites:["314336"], requirement_bucket:"Math Core", duration:"year" },
  { course_code:"316005", course_name:"AP Precalculus AB", subject_area:"Math", level_tags:["AP"], min_grade:10, max_grade:11, prerequisites:["3135TM"], requirement_bucket:"Math Core", duration:"year" },
  { course_code:"3160TL", course_name:"AP Precalculus BC", aliases:["AP Precalculus BC 2 TJ", "AP Precalculus BC 1 TJ"], subject_area:"Math", level_tags:["AP","TJ"], min_grade:10, max_grade:11, prerequisites:["3135TM"], requirement_bucket:"Math Core", duration:"year", notes:"Accelerated track — covers more material than AB" },
  { course_code:"3160TK", course_name:"AP Precalculus AB 2", subject_area:"Math", level_tags:["AP","TJ"], min_grade:11, max_grade:11, prerequisites:["316005"], requirement_bucket:"Math Core", duration:"year" },
  { course_code:"316056", course_name:"Intro to Calculus TJ HN", subject_area:"Math", level_tags:["HN","TJ"], min_grade:11, max_grade:12, prerequisites:["316005"], requirement_bucket:"Math Core", duration:"year" },
  { course_code:"317004", course_name:"AP Calculus AB", subject_area:"Math", level_tags:["AP"], min_grade:10, max_grade:12, prerequisites:["316005"], requirement_bucket:"Math Core", duration:"year" },
  { course_code:"317704", course_name:"AP Calculus BC", subject_area:"Math", level_tags:["AP"], min_grade:10, max_grade:12, prerequisites:["3160TL"], requirement_bucket:"Math Core", duration:"year", notes:"Preferred for CS/Engineering tracks" },
  // Math Electives (4th year satisfiers after Calc AB or BC)
  { course_code:"317707", course_name:"AP Calculus BC Post-AB", subject_area:"Math", level_tags:["AP"], min_grade:11, max_grade:12, prerequisites:["317004"], requirement_bucket:"Math Elective", duration:"year", notes:"4th year math satisfier*" },
  { course_code:"3178DE", course_name:"Multivariable Calculus DE (Paired with Linear)", subject_area:"Math", level_tags:["DE"], min_grade:11, max_grade:12, prerequisites:["317704"], requirement_bucket:"Math Elective", duration:"year", semester_pair:"3198DE", notes:"4th year math satisfier*" },
  { course_code:"3198DE", course_name:"Linear Algebra DE (Paired with Multivariable)", subject_area:"Math", level_tags:["DE"], min_grade:11, max_grade:12, prerequisites:["317704"], requirement_bucket:"Math Elective", duration:"year", semester_pair:"3178DE", notes:"4th year math satisfier*" },
  { course_code:"3178DT", course_name:"Multivariable Calculus DE (Stand Alone)", subject_area:"Math", level_tags:["DE"], min_grade:11, max_grade:12, prerequisites:["317704"], requirement_bucket:"Math Elective", duration:"year", notes:"4th year math satisfier*" },
  { course_code:"3198DT", course_name:"Linear Algebra DE (Stand Alone)", subject_area:"Math", level_tags:["DE"], min_grade:11, max_grade:12, prerequisites:["317704"], requirement_bucket:"Math Elective", duration:"year", notes:"4th year math satisfier*" },
  { course_code:"3178D2", course_name:"Differential Equations DE", subject_area:"Math", level_tags:["DE"], min_grade:12, max_grade:12, prerequisites:["3178DT"], requirement_bucket:"Math Elective", duration:"year" },
  { course_code:"317862", course_name:"Complex Analysis AV", subject_area:"Math", level_tags:["AV","TJ"], min_grade:12, max_grade:12, prerequisites:["3178DT"], requirement_bucket:"Math Elective", duration:"year" },
  { course_code:"3192TJ", course_name:"AP Statistics TJ", subject_area:"Math", level_tags:["AP","TJ"], min_grade:10, max_grade:12, prerequisites:["3135TM"], requirement_bucket:"Math Elective", duration:"year", notes:"4th year math satisfier*" },
  { course_code:"319204", course_name:"AP Statistics", subject_area:"Math", level_tags:["AP"], min_grade:10, max_grade:12, prerequisites:["3135TM"], requirement_bucket:"Math Elective", duration:"year", notes:"4th year math satisfier*" },
  { course_code:"3190T4", course_name:"Statistical Modeling & Data Science TJ AV", subject_area:"Math", level_tags:["AV","TJ"], min_grade:11, max_grade:12, prerequisites:["317004"], requirement_bucket:"Math Elective", duration:"year", notes:"4th year math satisfier*" },
  { course_code:"319862", course_name:"Math Techniques TJ AV", subject_area:"Math", level_tags:["AV","TJ"], min_grade:11, max_grade:12, prerequisites:["317704"], requirement_bucket:"Math Elective", duration:"year", notes:"4th year math satisfier*" },
  { course_code:"3199TC", course_name:"Concrete Mathematics AV", subject_area:"Math", level_tags:["AV","TJ"], min_grade:11, max_grade:12, prerequisites:["317004"], requirement_bucket:"Math Elective", duration:"year" },

  // ── COMPUTER SCIENCE ──────────────────────────────────────────────────────────
  // Required for all TJ students
  { course_code:"3184T1", course_name:"Foundations of Computer Science TJ HN", aliases:["Foundations of CS TJ HN", "Found of Comp Sci TJ HN", "Foundations of Computer Science", "Found of CS TJ HN", "Comp Sci Found TJ HN", "Fnd Computer Science TJ HN", "Fnd CS TJ HN", "Fnd of Computer Science", "Fnd of Comp Science", "Fnd of Computer Sci", "Fnd of CS"], subject_area:"Computer Science", level_tags:["HN","TJ"], min_grade:9, max_grade:9, prerequisites:[], requirement_bucket:"CS Core", duration:"year" },
  { course_code:"318561", course_name:"AP Computer Science A TJ", subject_area:"Computer Science", level_tags:["AP","TJ"], min_grade:10, max_grade:10, prerequisites:["3184T1"], requirement_bucket:"CS Core", duration:"year", notes:"4th year math satisfier*" },
  // CS Electives (require AP CS A as prerequisite)
  { course_code:"9828TH", course_name:"Computer Simulation and Game Design TJ AV", subject_area:"Computer Science", level_tags:["AV","TJ"], min_grade:10, max_grade:12, prerequisites:["318561"], requirement_bucket:"CS Elective", duration:"year", notes:"4th year math satisfier*" },
  { course_code:"319916", course_name:"Computer Vision 1 TJ AV", subject_area:"Computer Science", level_tags:["AV","TJ"], min_grade:11, max_grade:12, prerequisites:["318561"], requirement_bucket:"CS Elective", duration:"year", notes:"4th year math satisfier*" },
  { course_code:"319917", course_name:"Computer Vision 2 TJ AV", subject_area:"Computer Science", level_tags:["AV","TJ"], min_grade:12, max_grade:12, prerequisites:["319916"], requirement_bucket:"CS Elective", duration:"year", notes:"4th year math satisfier*" },
  { course_code:"319966", course_name:"Artificial Intelligence 1 TJ AV", subject_area:"Computer Science", level_tags:["AV","TJ"], min_grade:11, max_grade:12, prerequisites:["318561"], requirement_bucket:"CS Elective", duration:"year", notes:"4th year math satisfier*" },
  { course_code:"319967", course_name:"Artificial Intelligence 2 TJ AV", subject_area:"Computer Science", level_tags:["AV","TJ"], min_grade:12, max_grade:12, prerequisites:["319966"], requirement_bucket:"CS Elective", duration:"year", notes:"4th year math satisfier*" },
  { course_code:"3199J1", course_name:"Web App Development TJ AV", subject_area:"Computer Science", level_tags:["AV","TJ"], min_grade:11, max_grade:12, prerequisites:["318561"], requirement_bucket:"CS Elective", duration:"year", notes:"4th year math satisfier*" },
  { course_code:"3199J2", course_name:"Mobile App Development TJ AV", subject_area:"Computer Science", level_tags:["AV","TJ"], min_grade:12, max_grade:12, prerequisites:["3199J1"], requirement_bucket:"CS Elective", duration:"year", notes:"4th year math satisfier*" },
  { course_code:"3199T6", course_name:"Machine Learning 1 TJ AV", subject_area:"Computer Science", level_tags:["AV","TJ"], min_grade:11, max_grade:12, prerequisites:["318561"], requirement_bucket:"CS Elective", duration:"year", notes:"4th year math satisfier*" },
  { course_code:"3199T7", course_name:"Machine Learning 2 TJ AV", subject_area:"Computer Science", level_tags:["AV","TJ"], min_grade:12, max_grade:12, prerequisites:["3199T6"], requirement_bucket:"CS Elective", duration:"year", notes:"4th year math satisfier*" },

  // ── TECHNOLOGY & ENGINEERING ──────────────────────────────────────────────────
  { course_code:"8403TJ", course_name:"Design & Technology", aliases:["Design & Tech", "Design and Technology", "Design and Tech"], subject_area:"Technology & Engineering", level_tags:["TJ"], min_grade:9, max_grade:9, prerequisites:[], requirement_bucket:"Tech Core", duration:"year" },
  { course_code:"8404TO", course_name:"Engineering Fundamentals HN", subject_area:"Technology & Engineering", level_tags:["HN"], min_grade:10, max_grade:12, prerequisites:[], requirement_bucket:"Tech Elective", duration:"year" },
  { course_code:"9826T8", course_name:"Autonomous Robotics Systems 1 TJ HN", subject_area:"Technology & Engineering", level_tags:["HN","TJ"], min_grade:10, max_grade:12, prerequisites:[], requirement_bucket:"Tech Elective", duration:"year" },
  { course_code:"9826T7", course_name:"Autonomous Robotics & Microsystems 2 TJ HN", subject_area:"Technology & Engineering", level_tags:["HN","TJ"], min_grade:11, max_grade:12, prerequisites:["9826T8"], requirement_bucket:"Tech Elective", duration:"year" },
  { course_code:"9828J1", course_name:"Engineering Design TJ HN", subject_area:"Technology & Engineering", level_tags:["HN","TJ"], min_grade:10, max_grade:12, prerequisites:[], requirement_bucket:"Tech Elective", duration:"year" },
  { course_code:"9828T2", course_name:"Architectural Drawing TJ HN", subject_area:"Technology & Engineering", level_tags:["HN","TJ"], min_grade:10, max_grade:12, prerequisites:[], requirement_bucket:"Tech Elective", duration:"year" },
  { course_code:"8478TJ", course_name:"Prototyping 1 TJ HN", subject_area:"Technology & Engineering", level_tags:["HN","TJ"], min_grade:10, max_grade:12, prerequisites:[], requirement_bucket:"Tech Elective", duration:"year" },
  { course_code:"8446TJ", course_name:"Prototyping 2 TJ HN", subject_area:"Technology & Engineering", level_tags:["HN","TJ"], min_grade:11, max_grade:12, prerequisites:["8478TJ"], requirement_bucket:"Tech Elective", duration:"year" },
  { course_code:"9828T8", course_name:"Energy Systems 1 TJ HN", subject_area:"Technology & Engineering", level_tags:["HN","TJ"], min_grade:10, max_grade:12, prerequisites:[], requirement_bucket:"Tech Elective", duration:"year" },
  { course_code:"9828T9", course_name:"Energy Systems 2 TJ HN", subject_area:"Technology & Engineering", level_tags:["HN","TJ"], min_grade:11, max_grade:12, prerequisites:["9828T8"], requirement_bucket:"Tech Elective", duration:"year" },

  // ── SENIOR RESEARCH ───────────────────────────────────────────────────────────
  { course_code:"9828R4", course_name:"Research Practicum TJ AV", subject_area:"Research", level_tags:["AV","TJ"], min_grade:12, max_grade:12, prerequisites:[], requirement_bucket:"Senior Research", duration:"year" },
  { course_code:"3199R1", course_name:"Mobile Web App Research TJ AV", subject_area:"Research", level_tags:["AV","TJ"], min_grade:12, max_grade:12, prerequisites:["3199J1"], requirement_bucket:"Senior Research", duration:"year" },
  { course_code:"3199T3", course_name:"Computer Systems Research TJ AV", subject_area:"Research", level_tags:["AV","TJ"], min_grade:12, max_grade:12, prerequisites:["318561"], requirement_bucket:"Senior Research", duration:"year" },
  { course_code:"4260T2", course_name:"Astronomy Research TJ AV", subject_area:"Research", level_tags:["AV","TJ"], min_grade:12, max_grade:12, prerequisites:[], requirement_bucket:"Senior Research", duration:"year" },
  { course_code:"4320T3", course_name:"Biotech Research TJ AV", subject_area:"Research", level_tags:["AV","TJ"], min_grade:12, max_grade:12, prerequisites:["431036"], requirement_bucket:"Senior Research", duration:"year" },
  { course_code:"4320T5", course_name:"Neuroscience Research TJ AV", subject_area:"Research", level_tags:["AV","TJ"], min_grade:12, max_grade:12, prerequisites:["431036"], requirement_bucket:"Senior Research", duration:"year" },
  { course_code:"4420T2", course_name:"Chemistry Analysis Research TJ AV", subject_area:"Research", level_tags:["AV","TJ"], min_grade:12, max_grade:12, prerequisites:["441036"], requirement_bucket:"Senior Research", duration:"year" },
  { course_code:"4520T4", course_name:"Optics Research TJ AV", subject_area:"Research", level_tags:["AV","TJ"], min_grade:12, max_grade:12, prerequisites:[], requirement_bucket:"Senior Research", duration:"year" },
  { course_code:"4610T1", course_name:"Oceanography Research TJ AV", subject_area:"Research", level_tags:["AV","TJ"], min_grade:12, max_grade:12, prerequisites:[], requirement_bucket:"Senior Research", duration:"year" },
  { course_code:"9826R4", course_name:"Engineering Research TJ AV", subject_area:"Research", level_tags:["AV","TJ"], min_grade:12, max_grade:12, prerequisites:[], requirement_bucket:"Senior Research", duration:"year" },

  // ── WORLD LANGUAGES ───────────────────────────────────────────────────────────
  { course_code:"511000", course_name:"French 1", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World Language", duration:"year" },
  { course_code:"512000", course_name:"French 2", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:["511000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"513000", course_name:"French 3", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:["512000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"514060", course_name:"French for Careers HN", subject_area:"World Language", level_tags:["HN"], min_grade:10, max_grade:12, prerequisites:["513000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"514000", course_name:"French 4 HN", subject_area:"World Language", level_tags:["HN"], min_grade:10, max_grade:12, prerequisites:["513000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"515000", course_name:"French 5 HN", subject_area:"World Language", level_tags:["HN"], min_grade:11, max_grade:12, prerequisites:["514000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"517004", course_name:"AP French Language", subject_area:"World Language", level_tags:["AP"], min_grade:11, max_grade:12, prerequisites:["514000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"521000", course_name:"German 1", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World Language", duration:"year" },
  { course_code:"522000", course_name:"German 2", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:["521000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"523000", course_name:"German 3", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:["522000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"524060", course_name:"German for Careers HN", subject_area:"World Language", level_tags:["HN"], min_grade:10, max_grade:12, prerequisites:["523000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"524000", course_name:"German 4 HN", subject_area:"World Language", level_tags:["HN"], min_grade:10, max_grade:12, prerequisites:["523000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"525000", course_name:"German 5 HN", subject_area:"World Language", level_tags:["HN"], min_grade:11, max_grade:12, prerequisites:["524000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"527004", course_name:"AP German Language", subject_area:"World Language", level_tags:["AP"], min_grade:11, max_grade:12, prerequisites:["524000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"531000", course_name:"Latin 1", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World Language", duration:"year" },
  { course_code:"532000", course_name:"Latin 2", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:["531000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"533000", course_name:"Latin 3", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:["532000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"534060", course_name:"Latin for Careers HN", subject_area:"World Language", level_tags:["HN"], min_grade:10, max_grade:12, prerequisites:["533000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"535000", course_name:"Latin 5 HN", subject_area:"World Language", level_tags:["HN"], min_grade:11, max_grade:12, prerequisites:["533000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"5340DE", course_name:"Latin 4 DE", subject_area:"World Language", level_tags:["DE"], min_grade:11, max_grade:12, prerequisites:["533000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"537004", course_name:"AP Latin", subject_area:"World Language", level_tags:["AP"], min_grade:11, max_grade:12, prerequisites:["533000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"551000", course_name:"Spanish 1", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World Language", duration:"year" },
  { course_code:"552000", course_name:"Spanish 2", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:["551000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"553000", course_name:"Spanish 3", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:["552000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"554060", course_name:"Spanish for Careers HN", subject_area:"World Language", level_tags:["HN"], min_grade:10, max_grade:12, prerequisites:["553000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"554000", course_name:"Spanish 4 HN", subject_area:"World Language", level_tags:["HN"], min_grade:10, max_grade:12, prerequisites:["553000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"555000", course_name:"Spanish 5 HN", subject_area:"World Language", level_tags:["HN"], min_grade:11, max_grade:12, prerequisites:["554000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"557004", course_name:"AP Spanish Language", subject_area:"World Language", level_tags:["AP"], min_grade:11, max_grade:12, prerequisites:["554000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"558004", course_name:"AP Spanish Literature", subject_area:"World Language", level_tags:["AP"], min_grade:12, max_grade:12, prerequisites:["557004"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"581000", course_name:"Chinese 1", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World Language", duration:"year" },
  { course_code:"582000", course_name:"Chinese 2", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:["581000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"583000", course_name:"Chinese 3", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:["582000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"584060", course_name:"Chinese for Careers HN", subject_area:"World Language", level_tags:["HN"], min_grade:10, max_grade:12, prerequisites:["583000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"584000", course_name:"Chinese 4 HN", subject_area:"World Language", level_tags:["HN"], min_grade:10, max_grade:12, prerequisites:["583000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"585000", course_name:"Chinese 5 HN", subject_area:"World Language", level_tags:["HN"], min_grade:11, max_grade:12, prerequisites:["584000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"584004", course_name:"AP Chinese Language", subject_area:"World Language", level_tags:["AP"], min_grade:11, max_grade:12, prerequisites:["584000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"587500", course_name:"Korean 2", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World Language", duration:"year" },
  { course_code:"588000", course_name:"Korean 3", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:["587500"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"588560", course_name:"Korean for Careers HN", subject_area:"World Language", level_tags:["HN"], min_grade:10, max_grade:12, prerequisites:["588000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"502000", course_name:"Arabic 2", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World Language", duration:"year" },
  { course_code:"503000", course_name:"Arabic 3", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:["502000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"504060", course_name:"Arabic for Careers HN", subject_area:"World Language", level_tags:["HN"], min_grade:10, max_grade:12, prerequisites:["503000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"592000", course_name:"Japanese 2", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World Language", duration:"year" },
  { course_code:"593000", course_name:"Japanese 3", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:["592000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"594060", course_name:"Japanese for Careers HN", subject_area:"World Language", level_tags:["HN"], min_grade:10, max_grade:12, prerequisites:["593000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"542000", course_name:"Russian 2", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"World Language", duration:"year" },
  { course_code:"543000", course_name:"Russian 3", subject_area:"World Language", level_tags:[], min_grade:9, max_grade:12, prerequisites:["542000"], requirement_bucket:"World Language", duration:"year" },
  { course_code:"544060", course_name:"Russian for Careers HN", subject_area:"World Language", level_tags:["HN"], min_grade:10, max_grade:12, prerequisites:["543000"], requirement_bucket:"World Language", duration:"year" },

  // ── FINE ARTS ─────────────────────────────────────────────────────────────────
  { course_code:"922604", course_name:"AP Music Theory", subject_area:"Fine Arts", level_tags:["AP"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"Fine Arts - Music", duration:"year" },
  { course_code:"9234TK", course_name:"Advanced Band HN (Percussion Ensemble)", subject_area:"Fine Arts", level_tags:["HN"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"Fine Arts - Music", duration:"year", notes:"Audition required" },
  { course_code:"9234TL", course_name:"Advanced Band HN (Wind Ensemble)", subject_area:"Fine Arts", level_tags:["HN"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"Fine Arts - Music", duration:"year", notes:"Audition required" },
  { course_code:"9239TK", course_name:"Advanced Orchestra HN - Violin", subject_area:"Fine Arts", level_tags:["HN"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"Fine Arts - Music", duration:"year", notes:"Audition required" },
  { course_code:"923915", course_name:"Advanced Orchestra HN - Viola", subject_area:"Fine Arts", level_tags:["HN"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"Fine Arts - Music", duration:"year", notes:"Audition required" },
  { course_code:"923916", course_name:"Advanced Orchestra HN - Cello", subject_area:"Fine Arts", level_tags:["HN"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"Fine Arts - Music", duration:"year", notes:"Audition required" },
  { course_code:"923917", course_name:"Advanced Orchestra HN - Bass", subject_area:"Fine Arts", level_tags:["HN"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"Fine Arts - Music", duration:"year", notes:"Audition required" },
  { course_code:"9289TL", course_name:"Advanced Chorus HN", subject_area:"Fine Arts", level_tags:["HN"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"Fine Arts - Music", duration:"year" },
  { course_code:"912032", course_name:"Studio Art & Design 1", subject_area:"Fine Arts", level_tags:[], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"Fine Arts - Visual", duration:"year" },
  { course_code:"913032", course_name:"Studio Art & Design 2", subject_area:"Fine Arts", level_tags:[], min_grade:10, max_grade:12, prerequisites:["912032"], requirement_bucket:"Fine Arts - Visual", duration:"year" },
  { course_code:"9140DE", course_name:"Studio Art & Design 3 DE", subject_area:"Fine Arts", level_tags:["DE"], min_grade:11, max_grade:12, prerequisites:["913032"], requirement_bucket:"Fine Arts - Visual", duration:"year" },
  { course_code:"9147DE", course_name:"Studio Art & Design 4 DE", subject_area:"Fine Arts", level_tags:["DE"], min_grade:12, max_grade:12, prerequisites:["9140DE"], requirement_bucket:"Fine Arts - Visual", duration:"year" },
  { course_code:"915004", course_name:"AP Drawing", subject_area:"Fine Arts", level_tags:["AP"], min_grade:11, max_grade:12, prerequisites:["912032"], requirement_bucket:"Fine Arts - Visual", duration:"year" },
  { course_code:"918012", course_name:"Digital Art 1", subject_area:"Fine Arts", level_tags:[], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"Fine Arts - Visual", duration:"year" },
  { course_code:"918110", course_name:"Digital Art 2", subject_area:"Fine Arts", level_tags:[], min_grade:10, max_grade:12, prerequisites:["918012"], requirement_bucket:"Fine Arts - Visual", duration:"year" },
  { course_code:"919332", course_name:"Photography 1", subject_area:"Fine Arts", level_tags:[], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"Fine Arts - Visual", duration:"year" },
  { course_code:"919432", course_name:"Photography 2", subject_area:"Fine Arts", level_tags:[], min_grade:10, max_grade:12, prerequisites:["919332"], requirement_bucket:"Fine Arts - Visual", duration:"year" },
  { course_code:"143000", course_name:"Theatre Arts TJ HN", subject_area:"Fine Arts", level_tags:["HN","TJ"], min_grade:9, max_grade:12, prerequisites:[], requirement_bucket:"Fine Arts - Theatre", duration:"year" },
  { course_code:"144000", course_name:"Advanced Theatre Arts TJ HN", subject_area:"Fine Arts", level_tags:["HN","TJ"], min_grade:10, max_grade:12, prerequisites:["143000"], requirement_bucket:"Fine Arts - Theatre", duration:"year" },
  { course_code:"1430DE", course_name:"Theatre Arts 3 DE", subject_area:"Fine Arts", level_tags:["DE"], min_grade:11, max_grade:12, prerequisites:["144000"], requirement_bucket:"Fine Arts - Theatre", duration:"year" },

  // ── GENERAL / ELECTIVES ───────────────────────────────────────────────────────
  { course_code:"906200", course_name:"Teachers for Tomorrow 1 HN", subject_area:"General", level_tags:["HN"], min_grade:10, max_grade:12, prerequisites:[], requirement_bucket:"General Elective", duration:"year" },
  { course_code:"613504", course_name:"AP Business", subject_area:"General", level_tags:["AP"], min_grade:10, max_grade:12, prerequisites:[], requirement_bucket:"General Elective", duration:"year" },
  { course_code:"630604", course_name:"AP Cybersecurity", subject_area:"General", level_tags:["AP"], min_grade:10, max_grade:12, prerequisites:[], requirement_bucket:"General Elective", duration:"year" },
  { course_code:"982014", course_name:"AP Research", subject_area:"General", level_tags:["AP"], min_grade:11, max_grade:12, prerequisites:[], requirement_bucket:"General Elective", duration:"year" },
  { course_code:"612097", course_name:"Economics & Personal Finance HN", subject_area:"General", level_tags:["HN"], min_grade:10, max_grade:12, prerequisites:[], requirement_bucket:"General Elective", duration:"year" },
];

const getCourseByCode = (code) => TJ_COURSES.find(c => c.course_code === code);
const getCoursesForGrade = (grade) => TJ_COURSES.filter(c => c.min_grade <= grade && c.max_grade >= grade);

const INTEREST_OPTIONS = ["CS / Programming","Engineering / Robotics","Research / Lab Science","Humanities / History","Biology / Chemistry / Physics","Business / Economics","Arts / Music / Theatre","Undecided"];
const WORLD_LANGUAGES = ["French","German","Latin","Spanish","Chinese","Korean","Arabic","Japanese","Russian"];
const VVA_SUMMER_LANGUAGES = [
  { value:"Spanish I",   lang:"Spanish", level:1 },
  { value:"Spanish II",  lang:"Spanish", level:2 },
  { value:"Spanish III", lang:"Spanish", level:3 },
  { value:"Spanish IV",  lang:"Spanish", level:4 },
  { value:"French I",    lang:"French",  level:1 },
  { value:"French II",   lang:"French",  level:2 },
  { value:"French III",  lang:"French",  level:3 },
  { value:"German I",    lang:"German",  level:1 },
  { value:"German II",   lang:"German",  level:2 },
  { value:"German III",  lang:"German",  level:3 },
  { value:"Latin III",   lang:"Latin",   level:3 },
];
const RESEARCH_PATHWAYS = [
  "Computer Science / AI / Systems","Biology / Biotechnology / Neuroscience",
  "Chemistry / Materials Science","Physics / Engineering","Math / Data Science",
  "Social Science / Policy / Ethics","Independent / External / University-affiliated",
];

const MATH_PREREQ_MAP = {
  "314336":{ name:"Geometry HN", prereqs:[], level:1 },
  "3135TM":{ name:"Algebra 2 HN", prereqs:["314336"], level:2 },
  "316005":{ name:"AP Precalculus AB", prereqs:["3135TM"], level:3 },
  "3160TL":{ name:"AP Precalculus BC", prereqs:["3135TM"], level:3.5 },
  "317004":{ name:"AP Calculus AB", prereqs:["316005"], level:4 },
  "317704":{ name:"AP Calculus BC", prereqs:["3160TL"], level:5 },
  "317707":{ name:"AP Calculus BC Post-AB", prereqs:["317004"], level:5 },
  "3178DT":{ name:"Multivariable Calculus DE", prereqs:["317704"], level:6 },
  "3198DT":{ name:"Linear Algebra DE", prereqs:["317704"], level:6 },
  "3192TJ":{ name:"AP Statistics TJ", prereqs:["3135TM"], level:3 },
  "319204":{ name:"AP Statistics", prereqs:["3135TM"], level:3 },
};

function getMathLevel(input="") {
  const s = input.toLowerCase();
  if (s.includes("precalc bc") || s.includes("precalculus bc")) return 3.5;
  if (s.includes("precalc") || s.includes("precalculus")) return 3;
  if (s.includes("calc bc") || s.includes("calculus bc")) return 5;
  if (s.includes("calc ab") || s.includes("calculus ab")) return 4;
  if (s.includes("algebra 2") || s.includes("algebra ii") || s.includes("alg 2")) return 2;
  if (s.includes("geometry") || s.includes("geom")) return 1;
  return 1;
}

function getNextMathCourse(currentMathCode, completedMathCourses=[], rigor) {
  let currentLevel = 0, currentCode = null;
  if (completedMathCourses.length > 0) {
    completedMathCourses.forEach(code => {
      if (MATH_PREREQ_MAP[code] && MATH_PREREQ_MAP[code].level > currentLevel) {
        currentLevel = MATH_PREREQ_MAP[code].level; currentCode = code;
      }
    });
  } else if (currentMathCode && MATH_PREREQ_MAP[currentMathCode]) {
    currentLevel = MATH_PREREQ_MAP[currentMathCode].level; currentCode = currentMathCode;
  } else {
    currentLevel = getMathLevel(currentMathCode || "");
  }
  const eligible = Object.entries(MATH_PREREQ_MAP).filter(([code, info]) => {
    if (info.level <= currentLevel) return false;
    if (info.prereqs.length === 0) return true;
    if (info.prereqs.some(p => completedMathCourses.includes(p) || currentCode === p)) return true;
    // When level is text-derived (no course code), allow if all prereqs are at or below current level
    if (!currentCode && currentLevel > 0) {
      return info.prereqs.every(p => MATH_PREREQ_MAP[p]?.level <= currentLevel);
    }
    return false;
  }).map(([code, info]) => ({ code, ...info }));
  if (!eligible.length) return null;
  eligible.sort((a,b) => a.level - b.level);
  if (rigor === "aggressive") {
    const bc = eligible.find(c => c.name.includes("BC") && !c.name.includes("Post"));
    if (bc) { const c = getCourseByCode(bc.code); if (c) return { ...c, reason:`Aggressive track: ${bc.name}`}; }
  }
  const c = getCourseByCode(eligible[0].code);
  return c ? { ...c, reason:`Next in math sequence: ${eligible[0].name}` } : null;
}

function getScienceLevel(input="") {
  const s = input.toLowerCase();
  if (s.includes("ap physics c")) return 4;
  if (s.includes("ap physics")||s.includes("ap chem")||s.includes("ap bio")) return 3;
  if (s.includes("physics 1")) return 2.5;
  if (s.includes("chemistry")) return 2;
  if (s.includes("biology")) return 1;
  return 0;
}

function getNextScienceCourse(sciLevel, grade, interests, rigor) {
  const eff = Math.max(sciLevel, grade - 9);
  if (eff < 1) return getCourseByCode("431036");
  if (eff < 2) return getCourseByCode("441036");
  if (eff < 2.5) return getCourseByCode("451036");
  const hasBio = interests.some(i=>i.includes("Bio"));
  const hasPhysics = interests.some(i=>i.includes("Physics")||i.includes("Engineering"));
  if (rigor==="aggressive") {
    if (hasPhysics) return getCourseByCode("4575TJ");
    if (hasBio) return getCourseByCode("4370TJ");
    return getCourseByCode("4470TJ");
  }
  if (hasBio) return getCourseByCode("4370TJ");
  return getCourseByCode("4573TJ");
}

function getNextLanguageCourse(language, level) {
  if (!language) return null;
  const langPrefix = { "French":"51","German":"52","Latin":"53","Spanish":"55","Chinese":"58","Korean":"587","Arabic":"50","Japanese":"59","Russian":"54" };
  const prefix = langPrefix[language];
  if (!prefix) return null;
  const nextLevel = (level||0)+1;
  const candidates = TJ_COURSES.filter(c => c.subject_area==="World Language" && c.course_code.startsWith(prefix));
  const found = candidates.find(c => c.course_name.toLowerCase().includes(` ${nextLevel}`));
  if (found) return found;
  if (nextLevel >= 5) return candidates.find(c => c.level_tags.includes("AP")) || null;
  return null;
}

function getEnglishCourse(grade, rigor) {
  const courses = TJ_COURSES.filter(c => c.subject_area==="English" && c.min_grade<=grade && c.max_grade>=grade && c.requirement_bucket==="English Core");
  if (rigor==="aggressive") { const ap = courses.find(c => c.level_tags.includes("AP")); if (ap) return ap; }
  return courses.find(c => c.level_tags.includes("HN")) || courses[0];
}

function getSocialStudiesCourse(grade, rigor, interests=[]) {
  if (grade===9) {
    // World History I satisfier — only recommended when no world language fills the 7th slot
    if (rigor==="aggressive") return getCourseByCode("221204"); // AP Human Geography
    const stemInterested = interests.some(i=>i.includes("Research")||i.includes("CS")||i.includes("Engineering")||i.includes("Biology"));
    return stemInterested ? getCourseByCode("2996T1") // History of Science TJ HN
                          : getCourseByCode("2219T1"); // Ancient & Classical Civilizations TJ HN
  }
  if (grade===10) return rigor==="aggressive" ? getCourseByCode("234004") : getCourseByCode("222136");
  if (grade===11) return rigor==="aggressive" ? getCourseByCode("231904") : getCourseByCode("236036");
  if (grade===12) return rigor==="aggressive" ? getCourseByCode("244504") : getCourseByCode("244036");
  return null;
}

function selectElectives(grade, interests, rigor, current, count, researchPathway) {
  const used = new Set(current.map(c=>c.course_code));
  const scored = getCoursesForGrade(grade)
    .filter(c=>!used.has(c.course_code)&&!c.requirement_bucket?.includes("Core")&&!c.requirement_bucket?.includes("Senior Research")||grade===12)
    .map(c => {
      let score = 0;
      if (interests.includes("CS / Programming") && c.subject_area==="Computer Science") score+=10;
      if (interests.includes("Engineering / Robotics") && c.subject_area==="Technology & Engineering") score+=10;
      if (interests.includes("Research / Lab Science") && (c.subject_area==="Science"||c.subject_area==="Research")) score+=10;
      if (interests.includes("Humanities / History") && c.subject_area==="Social Studies") score+=8;
      if (interests.includes("Business / Economics") && c.course_name.includes("Econ")) score+=10;
      if (interests.includes("Arts / Music / Theatre") && c.subject_area==="Fine Arts") score+=10;
      if (researchPathway) {
        if (researchPathway.includes("Computer Science") && c.subject_area==="Computer Science") score+=12;
        if (researchPathway.includes("Biology") && c.subject_area==="Science") score+=12;
        if (researchPathway.includes("Engineering") && c.subject_area==="Technology & Engineering") score+=12;
      }
      if (rigor==="aggressive" && c.level_tags.includes("AP")) score+=5;
      if (grade===12 && c.subject_area==="Research") score+=8;
      return { c, score };
    });
  scored.sort((a,b)=>b.score-a.score);
  return scored.slice(0,count).map(x=>x.c);
}

function generateSchedule(inputs) {
  const { current_grade, interests, rigor_preference, current_math_level, current_science_level,
    world_language, world_language_level, research_pathway, completed_math_courses=[],
    completed_courses=[], summer_pe=false, summer_language="" } = inputs;
  const nextGrade = current_grade + 1;
  const warnings = [], schedule = [];
  if (nextGrade > 12) return { schedule:[], warnings:["Cannot generate post-graduation schedule"] };

  // If a VVA summer language is planned, treat it as already completed when building TJ schedule
  const vvaLang = VVA_SUMMER_LANGUAGES.find(c => c.value === summer_language);
  const effectiveLang = vvaLang ? vvaLang.lang : (world_language || null);
  const effectiveLangLevel = vvaLang ? vvaLang.level : (world_language_level || 0);

  const eng = getEnglishCourse(nextGrade, rigor_preference);
  if (eng) schedule.push({ ...eng, reason:`Required English for grade ${nextGrade}` });

  const math = getNextMathCourse(current_math_level, completed_math_courses, rigor_preference);
  if (math) schedule.push(math);
  else warnings.push("Could not determine next math course — check your math level");

  const sci = getNextScienceCourse(getScienceLevel(current_science_level), nextGrade, interests, rigor_preference);
  if (sci) schedule.push({ ...sci, reason:`Science progression for grade ${nextGrade}` });

  if (nextGrade >= 10) {
    const ss = getSocialStudiesCourse(nextGrade, rigor_preference, interests);
    if (ss) schedule.push({ ...ss, reason:`Required social studies for grade ${nextGrade}` });
  }

  if (nextGrade===9) {
    const cs = getCourseByCode("3184T1"); if(cs) schedule.push({...cs,reason:"TJ required for freshmen"});
    const te = getCourseByCode("8403TJ"); if(te) schedule.push({...te,reason:"TJ required for freshmen"});
    if (!summer_pe) {
      const pe = getCourseByCode("730000"); if(pe) schedule.push({...pe,reason:"Required: Health & PE 9"});
    } else {
      warnings.push("Health & PE 9 will be completed over summer via Virtual Virginia — extra TJ slot available for an elective.");
    }
  } else if (nextGrade===10) {
    const cs = getCourseByCode("318561"); if(cs) schedule.push({...cs,reason:"TJ required for sophomores"});
    if (!summer_pe) {
      const pe = getCourseByCode("740500"); if(pe) schedule.push({...pe,reason:"Required: Health & PE 10"});
    } else {
      warnings.push("Health & PE 10 will be completed over summer via Virtual Virginia — extra TJ slot available for an elective.");
    }
  }

  if (effectiveLang) {
    const lang = getNextLanguageCourse(effectiveLang, effectiveLangLevel);
    if (lang) {
      const reason = vvaLang
        ? `Starting ${effectiveLang} ${effectiveLangLevel+1} at TJ (completed ${vvaLang.value} via VVA over summer)`
        : `Continuing ${effectiveLang} level ${effectiveLangLevel+1}`;
      schedule.push({ ...lang, reason });
    } else warnings.push(`Could not find next ${effectiveLang} level`);
  }

  // For freshmen without a world language (and not taking one via VVA), fill the open slot
  if (nextGrade===9 && !effectiveLang && schedule.length < 7) {
    const ss = getSocialStudiesCourse(9, rigor_preference, interests);
    if (ss) schedule.push({ ...ss, reason:"Recommended: World History I elective (satisfies future graduation requirement)" });
  }

  if (schedule.length < 7) {
    const usedCodes = new Set([...completed_courses.map(c=>c.course_code), ...schedule.map(c=>c.course_code)]);
    const electives = selectElectives(nextGrade, interests, rigor_preference, schedule, 7-schedule.length, research_pathway)
      .filter(c=>!usedCodes.has(c.course_code));
    electives.forEach(c=>schedule.push({ ...c, reason:"Elective matching your interests" }));
  }

  const final = schedule.slice(0,7);
  if (final.length < 7) warnings.push(`Only ${final.length} courses found. Consult your counselor.`);
  return { schedule: final.map(c=>({ course_code:c.course_code, course_name:c.course_name, subject_area:c.subject_area, level_tags:c.level_tags||[], reason:c.reason })), warnings };
}

function generateFourYearRoadmap(inputs, lockedNext=null) {
  const roadmap = {}, allWarnings = [];
  const nextGrade = inputs.current_grade + 1;
  let ri = { ...inputs };
  let completed = [...(inputs.completed_courses||[])];

  for (let grade = nextGrade; grade <= 12; grade++) {
    if (grade===nextGrade && lockedNext) {
      roadmap[`grade_${grade}`] = { courses: lockedNext.map(c=>({...c,locked:true})), warnings:[], locked:true };
      const mc = lockedNext.find(c=>c.subject_area==="Math");
      if (mc) { ri.current_math_level=mc.course_code; ri.completed_math_courses=[...(ri.completed_math_courses||[]),mc.course_code]; }
      const sc = lockedNext.find(c=>c.subject_area==="Science");
      if (sc) ri.current_science_level=sc.course_name;
      const lc = lockedNext.find(c=>c.subject_area==="World Language");
      if (lc) ri.world_language_level=(ri.world_language_level||0)+1;
      continue;
    }
    const res = generateSchedule({ ...ri, current_grade:grade-1, completed_courses:completed });
    roadmap[`grade_${grade}`] = { courses:res.schedule, warnings:res.warnings, locked:false };
    if (res.warnings.length) allWarnings.push(`Grade ${grade}: ${res.warnings.join(", ")}`);
    const mc = res.schedule.find(c=>c.subject_area==="Math");
    if (mc) { ri.current_math_level=mc.course_code; ri.completed_math_courses=[...(ri.completed_math_courses||[]),mc.course_code]; completed.push({course_code:mc.course_code}); }
    const sc = res.schedule.find(c=>c.subject_area==="Science");
    if (sc) ri.current_science_level=sc.course_name;
    const lc = res.schedule.find(c=>c.subject_area==="World Language");
    if (lc) ri.world_language_level=(ri.world_language_level||0)+1;
  }
  return { roadmap, warnings:allWarnings };
}

function validateSchedule(schedule) {
  const issues = [];
  if (schedule.length !== 7) issues.push({ id:"count", severity:"FACT", message:`Schedule has ${schedule.length} courses — TJ requires exactly 7.` });
  const subjects = new Set(schedule.map(c=>c.subject_area));
  if (!subjects.has("English")) issues.push({ id:"eng", severity:"FACT", message:"Missing required English course." });
  if (!subjects.has("Math")) issues.push({ id:"math", severity:"FACT", message:"Missing required Math course." });
  if (!subjects.has("Science")) issues.push({ id:"sci", severity:"FACT", message:"Missing required Science course." });
  const codes = new Set();
  schedule.forEach((c,i) => { if(codes.has(c.course_code)) issues.push({ id:`dup-${i}`, severity:"FACT", message:`Duplicate course: ${c.course_name}` }); codes.add(c.course_code); });
  return { valid: issues.filter(i=>i.severity==="FACT").length===0, issues };
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inp = { width:"100%", padding:"8px 12px", fontSize:13, border:`1px solid ${C.border}`, borderRadius:8, outline:"none", backgroundColor:"white", boxSizing:"border-box", color:C.textPrimary, fontFamily:"inherit" };
const lbl = { display:"block", fontSize:13, fontWeight:600, marginBottom:6, color:C.textPrimary };

function getLevelBadge(tags=[]) {
  if (tags.includes("AP")) return { bg:"#F3E8FF", color:"#7C3AED", border:"1px solid #DDD6FE" };
  if (tags.includes("DE")) return { bg:"#DBEAFE", color:"#1D4ED8", border:"1px solid #BFDBFE" };
  if (tags.includes("AV")) return { bg:"#FEF3C7", color:"#D97706", border:"1px solid #FDE68A" };
  if (tags.includes("HN")) return { bg:"#DCFCE7", color:"#166534", border:"1px solid #BBF7D0" };
  return { bg:"#F1F5F9", color:"#475569", border:"1px solid #E2E8F0" };
}

// ── CompletedCoursesInput ─────────────────────────────────────────────────────
function CompletedCoursesInput({ currentGrade, completedByGrade, onChange }) {
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState({});
  if (!currentGrade) return null;
  const cur = parseInt(currentGrade);
  const grades = [];
  grades.push({ grade:8, label:"Middle School – Math & Language Credits (Optional)" });
  for (let x=9; x<cur; x++) grades.push({ grade:x, label:`${x}th Grade Completed` });
  if (cur>=9&&cur<=11) grades.push({ grade:cur, label:`${cur}th Grade (In Progress)` });

  const toggle = (grade, code) => {
    const upd = { ...completedByGrade, [grade]: completedByGrade[grade]||[] };
    upd[grade] = upd[grade].includes(code) ? upd[grade].filter(c=>c!==code) : [...upd[grade], code];
    onChange(upd);
  };

  return (
    <div>
      <label style={lbl}>Completed Courses by Grade
        <span style={{ fontWeight:400, color:C.textSecondary, marginLeft:6, fontSize:12 }}>(improves accuracy)</span>
      </label>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {grades.map(({ grade, label }) => {
          const isExp = expanded===grade;
          const sel = completedByGrade[grade]||[];
          const q = (search[grade]||"").toLowerCase();
          const list = TJ_COURSES
            .filter(c => grade===8
              ? (c.subject_area==="Math" || c.subject_area==="World Language")
              : grade===9 ? true : (c.min_grade<=grade&&c.max_grade>=grade))
            .filter(c => !c.requirement_bucket?.includes("Research"))
            .filter(c => !q || c.course_name.toLowerCase().includes(q) || c.subject_area.toLowerCase().includes(q));
          return (
            <div key={grade} style={{ border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", backgroundColor:"white" }}>
              <div onClick={()=>setExpanded(isExp?null:grade)}
                style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 14px", cursor:"pointer" }}>
                <span style={{ fontSize:13, fontWeight:500, color:C.textPrimary }}>{label}</span>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {sel.length>0 && <span style={{ fontSize:11, padding:"1px 7px", borderRadius:10, backgroundColor:C.secondary, color:"white" }}>{sel.length}</span>}
                  <span style={{ color:C.textSecondary }}>{isExp?"▲":"▼"}</span>
                </div>
              </div>
              {isExp && (
                <div style={{ padding:"0 12px 12px", borderTop:`1px solid ${C.border}` }}>
                  <input value={search[grade]||""} onChange={e=>setSearch({...search,[grade]:e.target.value})}
                    placeholder="Search courses..." style={{ ...inp, marginTop:10, marginBottom:8 }} />
                  <div style={{ maxHeight:200, overflowY:"auto", display:"flex", flexDirection:"column", gap:3 }}>
                    {list.map(c => (
                      <label key={c.course_code} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", borderRadius:6, cursor:"pointer", fontSize:12, backgroundColor:sel.includes(c.course_code)?"#EEF2F6":"transparent", border:`1px solid ${sel.includes(c.course_code)?C.secondary:"transparent"}` }}>
                        <input type="checkbox" checked={sel.includes(c.course_code)} onChange={()=>toggle(grade,c.course_code)} style={{ flexShrink:0 }} />
                        <span style={{ fontWeight:500, color:C.textPrimary }}>{c.course_name}</span>
                        <span style={{ color:C.textSecondary, marginLeft:"auto", whiteSpace:"nowrap" }}>{c.subject_area}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── EditableSchedule ──────────────────────────────────────────────────────────
function EditableSchedule({ schedule, onScheduleChange, nextGrade }) {
  const [searchOpen, setSearchOpen] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const validation = useMemo(()=>validateSchedule(schedule),[schedule]);

  const remove = idx => onScheduleChange(schedule.filter((_,i)=>i!==idx));
  const replace = (idx, c) => { const n=[...schedule]; n[idx]=c; onScheduleChange(n); setSearchOpen(null); setSearchTerm(""); };

  const results = useMemo(()=>{
    if (searchTerm.length<2) return [];
    const q=searchTerm.toLowerCase(), used=new Set(schedule.map(c=>c.course_code));
    return TJ_COURSES.filter(c=>!used.has(c.course_code)&&c.min_grade<=nextGrade&&c.max_grade>=nextGrade&&
      (c.course_name.toLowerCase().includes(q)||c.subject_area.toLowerCase().includes(q))).slice(0,8);
  },[searchTerm,schedule,nextGrade]);

  return (
    <div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
        {schedule.map((course,idx) => {
          const badge = getLevelBadge(course.level_tags||[]);
          return (
            <div key={idx} style={{ border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px", backgroundColor:"white" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:600, fontSize:14, color:C.textPrimary }}>{course.course_name}</span>
                    <span style={{ fontSize:11, padding:"2px 7px", borderRadius:4, backgroundColor:badge.bg, color:badge.color, border:badge.border }}>{course.course_code}</span>
                  </div>
                  <p style={{ fontSize:12, color:C.textSecondary, margin:"3px 0 0" }}>{course.subject_area}</p>
                  {course.reason && <p style={{ fontSize:11, color:C.secondary, margin:"4px 0 0", fontStyle:"italic" }}>{course.reason}</p>}
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <button onClick={()=>{setSearchOpen(searchOpen===idx?null:idx);setSearchTerm("");}}
                    style={{ padding:"5px 10px", fontSize:12, borderRadius:6, border:`1px solid ${C.border}`, backgroundColor:"white", cursor:"pointer", color:C.secondary }}>
                    Replace
                  </button>
                  <button onClick={()=>remove(idx)}
                    style={{ padding:"5px 10px", fontSize:12, borderRadius:6, border:`1px solid #FECACA`, backgroundColor:"#FEF2F2", cursor:"pointer", color:C.error }}>
                    Remove
                  </button>
                </div>
              </div>
              {searchOpen===idx && (
                <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}` }}>
                  <input autoFocus value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
                    placeholder="Search courses to replace with..."
                    style={{ ...inp, marginBottom:6 }} />
                  {results.length>0 && (
                    <div style={{ border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden" }}>
                      {results.map(r=>(
                        <button key={r.course_code} onClick={()=>replace(idx,r)}
                          style={{ display:"block", width:"100%", textAlign:"left", padding:"8px 12px", fontSize:12, border:"none", borderBottom:`1px solid ${C.border}`, backgroundColor:"white", cursor:"pointer", color:C.textPrimary }}>
                          <strong>{r.course_name}</strong> <span style={{ color:C.textSecondary }}>({r.subject_area})</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchTerm.length>1&&results.length===0 && <p style={{ fontSize:12, color:C.textSecondary }}>No matching courses found</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {validation.issues.length>0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:12 }}>
          {validation.issues.map(v=>(
            <div key={v.id} style={{ padding:"10px 14px", borderRadius:8, backgroundColor:"#FEF2F2", border:"1px solid #FECACA", fontSize:13, color:"#7F1D1D" }}>
              ⚠️ {v.message}
            </div>
          ))}
        </div>
      )}
      <div style={{ padding:"10px 14px", borderRadius:8, backgroundColor:C.card, fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
        <span>{validation.valid?"✅":"⚠️"}</span>
        <span style={{ color:validation.valid?C.success:C.error, fontWeight:600 }}>
          {validation.valid?"Schedule is valid — meets all TJ requirements":`${validation.issues.length} issue(s) to resolve`}
        </span>
      </div>
    </div>
  );
}

// ── EditableRoadmap ───────────────────────────────────────────────────────────
function EditableRoadmap({ roadmap, currentGrade, onRoadmapChange }) {
  const [expanded, setExpanded] = useState(null);
  const [editing, setEditing] = useState(null);
  const changeYear = (grade, s) => onRoadmapChange({ ...roadmap, [`grade_${grade}`]: { ...roadmap[`grade_${grade}`], courses:s } });
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {Object.entries(roadmap).map(([key,yearData]) => {
        const grade = parseInt(key.split("_")[1]);
        const isNext = grade===currentGrade+1;
        const isExp = expanded===grade;
        return (
          <div key={key} style={{ border:`1px solid ${C.border}`, borderRadius:10, backgroundColor:"white", overflow:"hidden" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px" }}>
              <div style={{ width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"white", flexShrink:0, backgroundColor:isNext?C.secondary:C.textSecondary }}>
                {grade}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontWeight:600, fontSize:14, color:C.textPrimary }}>Grade {grade}</span>
                  {isNext && <span style={{ fontSize:11, padding:"2px 8px", borderRadius:4, backgroundColor:"#EEF2FF", color:"#4338CA", border:"1px solid #C7D2FE" }}>Next Year</span>}
                  {yearData.locked && <span style={{ fontSize:11, padding:"2px 8px", borderRadius:4, backgroundColor:"#DCFCE7", color:"#166534", border:"1px solid #BBF7D0" }}>Locked</span>}
                </div>
                <p style={{ fontSize:12, color:C.textSecondary, margin:"2px 0 0" }}>{yearData.courses.length} courses planned</p>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {!yearData.locked && (
                  <button onClick={()=>{setEditing(editing===grade?null:grade);setExpanded(grade);}}
                    style={{ padding:"5px 12px", fontSize:12, borderRadius:6, border:`1px solid ${C.secondary}`, backgroundColor:"white", cursor:"pointer", color:C.secondary }}>
                    ✏️ Edit
                  </button>
                )}
                <button onClick={()=>setExpanded(isExp?null:grade)}
                  style={{ padding:"5px 12px", fontSize:12, borderRadius:6, border:`1px solid ${C.border}`, backgroundColor:"white", cursor:"pointer", color:C.textSecondary }}>
                  {isExp?"▲ Hide":"▼ Show"}
                </button>
              </div>
            </div>
            {isExp && (
              <div style={{ padding:"0 16px 16px", borderTop:`1px solid ${C.border}` }}>
                {yearData.locked ? (
                  <p style={{ fontSize:13, padding:"10px 14px", borderRadius:8, backgroundColor:"#ECFDF5", color:"#065F46", margin:"12px 0 0" }}>
                    Locked to your confirmed next-year schedule. Edit it in the Next Year tab.
                  </p>
                ) : editing===grade ? (
                  <div style={{ marginTop:12 }}>
                    <EditableSchedule schedule={yearData.courses} onScheduleChange={s=>changeYear(grade,s)} nextGrade={grade} />
                    <button onClick={()=>setEditing(null)}
                      style={{ marginTop:10, padding:"7px 18px", borderRadius:8, fontSize:13, fontWeight:600, color:"white", backgroundColor:C.success, border:"none", cursor:"pointer" }}>
                      ✅ Done Editing
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:5 }}>
                    {yearData.courses.map((c,i) => {
                      const badge = getLevelBadge(c.level_tags||[]);
                      return (
                        <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 12px", borderRadius:8, backgroundColor:C.bg, fontSize:13 }}>
                          <span style={{ color:C.textPrimary }}>{c.course_name}</span>
                          <span style={{ fontSize:11, padding:"2px 7px", borderRadius:4, backgroundColor:badge.bg, color:badge.color, border:badge.border }}>
                            {(c.level_tags||[]).join(", ")||"Regular"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────
function AdminDashboard({ submissions }) {
  const [gradeFilter, setGradeFilter] = useState("all");
  const confirmed = submissions.filter(s=>s.is_confirmed);
  const filtered = gradeFilter==="all" ? confirmed : confirmed.filter(s=>s.current_grade===parseInt(gradeFilter));
  const courseDemand = useMemo(()=>{
    const d={};
    filtered.forEach(s=>{
      (s.final_schedule||[]).forEach(c=>{ const k=c.course_code; if(!d[k]) d[k]={...c,count:0}; d[k].count++; });
    });
    return Object.values(d).sort((a,b)=>b.count-a.count);
  },[filtered]);
  const subjectDemand = useMemo(()=>{
    const d={};
    filtered.forEach(s=>{ (s.final_schedule||[]).forEach(c=>{ d[c.subject_area]=(d[c.subject_area]||0)+1; }); });
    return Object.entries(d).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  },[filtered]);
  const COLORS = [C.primary,C.secondary,C.accent,C.success,C.warning,C.error,"#8B5CF6","#EC4899"];
  const maxBar = subjectDemand.length ? Math.max(...subjectDemand.map(d=>d.value)) : 1;

  return (
    <div style={{ padding:"40px 48px", minHeight:"100vh", backgroundColor:C.bg }}>
      <h1 style={{ fontSize:28, fontWeight:800, color:C.textPrimary, margin:"0 0 6px" }}>Admin Dashboard</h1>
      <p style={{ color:C.textSecondary, margin:"0 0 28px", fontSize:14 }}>Course demand analytics from confirmed student schedules</p>

      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28, padding:"14px 18px", borderRadius:12, backgroundColor:C.card, border:`1px solid ${C.border}` }}>
        <label style={{ fontSize:13, fontWeight:600, color:C.textPrimary }}>Filter by Grade:</label>
        <select value={gradeFilter} onChange={e=>setGradeFilter(e.target.value)}
          style={{ ...inp, width:"auto", padding:"6px 12px" }}>
          <option value="all">All Grades</option>
          <option value="8">8th (Rising 9th)</option>
          <option value="9">9th (Rising 10th)</option>
          <option value="10">10th (Rising 11th)</option>
          <option value="11">11th (Rising 12th)</option>
        </select>
        {filtered.length===0 && <span style={{ fontSize:13, color:C.textSecondary }}>No confirmed submissions yet — they'll appear here once students confirm their schedules.</span>}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:28 }}>
        {[
          { label:"Confirmed Submissions", value:filtered.length, color:C.primary },
          { label:"Unique Courses Requested", value:courseDemand.length, color:C.secondary },
          { label:"Most Requested Course", value:courseDemand[0]?.course_name?.split(" ").slice(0,3).join(" ")||"N/A", color:C.accent },
        ].map((s,i)=>(
          <div key={i} style={{ padding:"20px 24px", borderRadius:14, backgroundColor:"white", border:`1px solid ${C.border}` }}>
            <p style={{ fontSize:12, color:C.textSecondary, margin:"0 0 8px" }}>{s.label}</p>
            <p style={{ fontSize:26, fontWeight:800, color:s.color, margin:0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:24 }}>
        <div style={{ padding:"24px", borderRadius:14, backgroundColor:"white", border:`1px solid ${C.border}` }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:C.textPrimary, margin:"0 0 18px" }}>Demand by Subject Area</h3>
          {subjectDemand.length>0 ? (
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {subjectDemand.map((d,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ width:140, fontSize:12, color:C.textSecondary, textAlign:"right", flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.name}</span>
                  <div style={{ flex:1, height:20, borderRadius:4, backgroundColor:C.card, overflow:"hidden" }}>
                    <div style={{ height:"100%", borderRadius:4, width:`${(d.value/maxBar)*100}%`, backgroundColor:COLORS[i%COLORS.length] }} />
                  </div>
                  <span style={{ width:28, fontSize:12, fontWeight:700, color:C.textPrimary, flexShrink:0 }}>{d.value}</span>
                </div>
              ))}
            </div>
          ) : <p style={{ fontSize:13, color:C.textSecondary }}>No data yet</p>}
        </div>

        <div style={{ padding:"24px", borderRadius:14, backgroundColor:"white", border:`1px solid ${C.border}` }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:C.textPrimary, margin:"0 0 18px" }}>Submissions by Grade</h3>
          {submissions.length>0 ? (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[8,9,10,11].map((g,i)=>{
                const count = submissions.filter(s=>s.current_grade===g).length;
                return (
                  <div key={g} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ width:72, fontSize:12, color:C.textSecondary }}>Grade {g}</span>
                    <div style={{ flex:1, height:20, borderRadius:4, backgroundColor:C.card, overflow:"hidden" }}>
                      <div style={{ height:"100%", borderRadius:4, backgroundColor:COLORS[i], width:submissions.length?`${(count/submissions.length)*100}%`:"0%" }} />
                    </div>
                    <span style={{ width:24, fontSize:12, fontWeight:700, color:C.textPrimary }}>{count}</span>
                  </div>
                );
              })}
            </div>
          ) : <p style={{ fontSize:13, color:C.textSecondary }}>No data yet</p>}
        </div>
      </div>

      <div style={{ padding:"24px", borderRadius:14, backgroundColor:"white", border:`1px solid ${C.border}` }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:C.textPrimary, margin:"0 0 16px" }}>Course Demand Rankings</h3>
        {courseDemand.length>0 ? (
          <>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:`2px solid ${C.border}` }}>
                  {["Rank","Code","Course Name","Subject","Requests","Est. Sections"].map(h=>(
                    <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontSize:12, fontWeight:700, color:C.textSecondary }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courseDemand.map((c,i)=>(
                  <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:"10px 12px" }}>
                      <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, backgroundColor:i<3?C.primary:C.card, color:i<3?"white":C.textSecondary }}>{i+1}</div>
                    </td>
                    <td style={{ padding:"10px 12px", fontFamily:"monospace", fontSize:12, color:C.textSecondary }}>{c.course_code}</td>
                    <td style={{ padding:"10px 12px", fontWeight:500, color:C.textPrimary }}>{c.course_name}</td>
                    <td style={{ padding:"10px 12px" }}><span style={{ fontSize:11, padding:"2px 8px", borderRadius:4, backgroundColor:C.card, color:C.textSecondary }}>{c.subject_area}</span></td>
                    <td style={{ padding:"10px 12px", fontSize:18, fontWeight:800, color:C.textPrimary }}>{c.count}</td>
                    <td style={{ padding:"10px 12px", color:C.textSecondary }}>{Math.ceil(c.count/25)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize:11, color:C.textSecondary, marginTop:12 }}>* Estimated sections based on 25 students per section.</p>
          </>
        ) : (
          <p style={{ fontSize:13, color:C.textSecondary, textAlign:"center", padding:"32px 0" }}>
            No confirmed submissions yet. Data will appear here once students confirm their schedules.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Student Planner ───────────────────────────────────────────────────────────
function StudentPlanner({ onSave, user, savedProfile, onSaveProfile, onSignInPrompt }) {
  const [form, setForm] = useState({
    student_name:"", current_grade:"", gpa:"", interests:[], rigor_preference:"",
    research_pathway:"", summer_pe:false, summer_language:"", willing_8th_course:false,
    current_math_level:"", completed_courses_by_grade:{},
    current_science_level:"", world_language:"", world_language_level:"", counselor_notes:""
  });
  const [result, setResult] = useState(null);
  const [editedSchedule, setEditedSchedule] = useState(null);
  const [editedRoadmap, setEditedRoadmap] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("nextyear");
  const [saveStatus, setSaveStatus] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [svUser, setSvUser] = useState("");
  const [svPass, setSvPass] = useState("");
  const [svLoading, setSvLoading] = useState(false);
  const [svStatus, setSvStatus] = useState(null); // null | "success" | "error"

  // Load saved profile when it arrives
  useEffect(() => {
    if (savedProfile) {
      setForm(p => ({
        ...p,
        student_name: savedProfile.student_name || p.student_name,
        current_grade: savedProfile.current_grade ? String(savedProfile.current_grade) : p.current_grade,
        gpa: savedProfile.gpa || p.gpa,
        interests: savedProfile.interests || p.interests,
        rigor_preference: savedProfile.rigor_preference || p.rigor_preference,
        research_pathway: savedProfile.research_pathway || p.research_pathway,
        summer_pe: savedProfile.summer_pe ?? (savedProfile.willing_summer_courses ?? p.summer_pe),
        summer_language: savedProfile.summer_language ?? p.summer_language,
        willing_8th_course: savedProfile.willing_8th_course ?? p.willing_8th_course,
        current_math_level: savedProfile.current_math_level || p.current_math_level,
        completed_courses_by_grade: savedProfile.completed_courses_by_grade || p.completed_courses_by_grade,
        current_science_level: savedProfile.current_science_level || p.current_science_level,
        world_language: savedProfile.world_language || p.world_language,
        world_language_level: savedProfile.world_language_level || p.world_language_level,
        counselor_notes: savedProfile.counselor_notes || p.counselor_notes,
      }));
      if (savedProfile.result) setResult(savedProfile.result);
      if (savedProfile.editedSchedule) setEditedSchedule(savedProfile.editedSchedule);
      if (savedProfile.editedRoadmap) setEditedRoadmap(savedProfile.editedRoadmap);
    }
  }, [savedProfile]);

  // Auto-save whenever schedule or roadmap changes (debounced 2s)
  useEffect(() => {
    if (!user || (!editedSchedule && !editedRoadmap)) return;
    const timer = setTimeout(() => {
      onSaveProfile({
        student_name: form.student_name,
        current_grade: form.current_grade,
        gpa: form.gpa,
        interests: form.interests,
        rigor_preference: form.rigor_preference,
        research_pathway: form.research_pathway,
        summer_pe: form.summer_pe,
        summer_language: form.summer_language,
        willing_8th_course: form.willing_8th_course,
        current_math_level: form.current_math_level,
        completed_courses_by_grade: form.completed_courses_by_grade,
        current_science_level: form.current_science_level,
        world_language: form.world_language,
        world_language_level: form.world_language_level,
        counselor_notes: form.counselor_notes,
        result,
        editedSchedule,
        editedRoadmap,
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [editedSchedule, editedRoadmap]);

  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const toggleInterest = i => set("interests", form.interests.includes(i) ? form.interests.filter(x=>x!==i) : [...form.interests,i]);

  const handleSaveToAccount = () => {
    if (!user) { onSignInPrompt(); return; }
    onSaveProfile({
      student_name: form.student_name,
      current_grade: form.current_grade,
      gpa: form.gpa,
      interests: form.interests,
      rigor_preference: form.rigor_preference,
      research_pathway: form.research_pathway,
      summer_pe: form.summer_pe,
      summer_language: form.summer_language,
      willing_8th_course: form.willing_8th_course,
      current_math_level: form.current_math_level,
      completed_courses_by_grade: form.completed_courses_by_grade,
      current_science_level: form.current_science_level,
      world_language: form.world_language,
      world_language_level: form.world_language_level,
      counselor_notes: form.counselor_notes,
      result,
      editedSchedule,
      editedRoadmap,
    });
  };

  const fillDemo = () => {
    setForm({
      student_name:"Alex Johnson", current_grade:"9", gpa:"4.2",
      interests:["CS / Programming","Research / Lab Science","Engineering / Robotics"],
      rigor_preference:"aggressive", research_pathway:"Computer Science / AI / Systems",
      summer_pe:true, summer_language:"Spanish I", willing_8th_course:true,
      current_math_level:"3135TM",
      completed_courses_by_grade:{
        9:["113036","431036","441036","730000","3184T1","8403TJ","551000"]
      },
      current_science_level:"Chemistry 1 HN",
      world_language:"Spanish", world_language_level:"1", counselor_notes:""
    });
  };

  const completedFlat = useMemo(()=>{
    const all=[];
    Object.values(form.completed_courses_by_grade).forEach(arr=>arr.forEach(c=>all.push({course_code:c})));
    return all;
  },[form.completed_courses_by_grade]);

  const completedMath = useMemo(()=>{
    const m=[];
    Object.values(form.completed_courses_by_grade).forEach(arr=>arr.forEach(code=>{
      if (TJ_COURSES.find(x=>x.course_code===code)?.subject_area==="Math") m.push(code);
    }));
    return [...new Set(m)];
  },[form.completed_courses_by_grade]);

  const handleGenerate = () => {
    setError(null);
    if (!form.current_grade) return setError("Please select your current grade");
    if (!form.gpa) return setError("Please enter your GPA");
    if (!form.interests.length) return setError("Please select at least one interest");
    if (!form.rigor_preference) return setError("Please select a rigor preference");
    setGenerating(true);
    setTimeout(()=>{
      try {
        let derivedSci = form.current_science_level||"";
        Object.values(form.completed_courses_by_grade).forEach(arr=>arr.forEach(code=>{
          const c=TJ_COURSES.find(x=>x.course_code===code);
          if (c?.subject_area==="Science"&&!derivedSci) derivedSci=c.course_name;
        }));
        const inputs = {
          current_grade:parseInt(form.current_grade), gpa:parseFloat(form.gpa),
          interests:form.interests, rigor_preference:form.rigor_preference,
          research_pathway:form.research_pathway||null,
          summer_pe:form.summer_pe, summer_language:form.summer_language||"",
          willing_8th_course:form.willing_8th_course,
          current_math_level:form.current_math_level,
          completed_math_courses:completedMath,
          completed_courses:completedFlat,
          completed_courses_by_grade:form.completed_courses_by_grade,
          current_science_level:derivedSci,
          world_language:form.world_language||null,
          world_language_level:form.world_language_level?parseInt(form.world_language_level):null
        };
        const sched = generateSchedule(inputs);
        const roadmapResult = generateFourYearRoadmap(inputs, null);
        setResult({ schedule:sched.schedule, warnings:[...sched.warnings,...roadmapResult.warnings], roadmap:roadmapResult.roadmap });
        setEditedSchedule(sched.schedule);
        setEditedRoadmap(roadmapResult.roadmap);
      } catch(e) { setError(e.message||"Failed to generate"); }
      setGenerating(false);
    }, 80);
  };

  const handleScheduleEdit = (newSched) => {
    setEditedSchedule(newSched);
    let derivedSci = form.current_science_level||"";
    Object.values(form.completed_courses_by_grade).forEach(arr=>arr.forEach(code=>{
      const c=TJ_COURSES.find(x=>x.course_code===code);
      if (c?.subject_area==="Science"&&!derivedSci) derivedSci=c.course_name;
    }));
    const inputs = {
      current_grade:parseInt(form.current_grade), gpa:parseFloat(form.gpa),
      interests:form.interests, rigor_preference:form.rigor_preference,
      current_math_level:form.current_math_level, completed_math_courses:completedMath,
      completed_courses:completedFlat, current_science_level:derivedSci,
      world_language:form.world_language||null,
      world_language_level:form.world_language_level?parseInt(form.world_language_level):null
    };
    const r = generateFourYearRoadmap(inputs, newSched);
    setEditedRoadmap(r.roadmap);
  };

  const handleSave = () => {
    setSaveStatus("saving");
    const payload = {
      student_name:form.student_name||"Anonymous", current_grade:parseInt(form.current_grade),
      gpa:parseFloat(form.gpa), interests:form.interests, rigor_preference:form.rigor_preference,
      research_pathway:form.research_pathway, summer_pe:form.summer_pe,
      summer_language:form.summer_language, willing_8th_course:form.willing_8th_course,
      counselor_notes:form.counselor_notes,
      original_generated_schedule:result.schedule, final_schedule:editedSchedule,
      four_year_roadmap:editedRoadmap||result.roadmap, warnings:result.warnings, is_confirmed:true
    };
    onSave(payload);
    setTimeout(()=>setSaveStatus("saved"),300);
    setTimeout(()=>setSaveStatus(null),3500);
  };

  const nextGrade = form.current_grade ? parseInt(form.current_grade)+1 : null;

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const newMessages = [...chatMessages, { role:"user", content:userMsg }];
    setChatMessages(newMessages);
    setChatLoading(true);
    try {
      const scheduleContext = (editedSchedule||[]).map((c,i)=>`${i+1}. ${c.course_name} (${c.subject_area}${c.level_tags?.length?" - "+c.level_tags.join("/"):""})${c.reason?" — "+c.reason:""}`).join("\n");
      const isFreshman = nextGrade === 9;
      const freshmanContext = isFreshman ? `
FRESHMAN-SPECIFIC REQUIREMENTS (Grade 9):
All TJ freshmen are REQUIRED to take — these CANNOT be removed:
- Foundations of Computer Science TJ HN (year-long, required of every TJ student)
- Design & Technology (year-long, required of every TJ student)
- Health & PE 9 (year-long, required)
- Biology 1 HN (starts the required Bio → Chem → Physics → 4th year science sequence)
- English 9 HN (required; there is no AP English for 9th grade at TJ)

TYPICAL TJ FRESHMAN MATH PLACEMENT:
- Most TJ freshmen enter having completed Geometry in middle school → start at Algebra 2 HN
- Advanced track freshmen who completed Algebra 2 in middle school → start at AP Precalculus (AB or BC)
- Very advanced freshmen may start at AP Calculus AB or higher
- TJ does NOT offer standard/non-honors sections; all math is Honors, AP, or DE

STANDARD FRESHMAN SCHEDULE (7 courses total):
1. English 9 HN (required — only English option for 9th grade)
2. Math (Algebra 2 HN for most; AP Precalculus for advanced)
3. Biology 1 HN (required first-year science)
4. Foundations of Computer Science TJ HN (required)
5. Design & Technology (required)
6. Health & PE 9 (required)
7. World Language (continuing from middle school) — OR a World History I elective if no language

SOCIAL STUDIES FOR 9TH GRADE (optional — only if no world language fills slot 7):
TJ freshmen are NOT required to take social studies in 9th grade (it starts in 10th with World History II).
However, students without a world language can fulfill a "World History I" credit with:
- AP Human Geography (221204) — for aggressive/AP-track students
- History of Science TJ HN (2996T1) — great for STEM-oriented freshmen
- Psychology: Brain & Behavior TJ HN (2900T1) — popular choice
- Law and Society TJ HN (2420T1), Ancient & Classical Civilizations TJ HN (2219T1), etc.

SOCIAL STUDIES SEQUENCE (grades 10–12, all required):
- 10th: World History & Geography 2 HN or AP World History
- 11th: US/VA History HN or AP US History (often paired with AP English Language)
- 12th: US/VA Government HN or AP US Government (often paired with AP English Literature)
` : "";

      const systemPrompt = `You are an AI academic advisor for Thomas Jefferson High School for Science & Technology (TJHSST). You are helping a student currently in grade ${form.current_grade} plan their courses for grade ${nextGrade}.

The student's proposed Grade ${nextGrade} schedule is:
${scheduleContext}

Student info:
- GPA: ${form.gpa}
- Interests: ${form.interests.join(", ")}
- Rigor preference: ${form.rigor_preference}
- World language: ${form.world_language||"None"}
- Research pathway: ${form.research_pathway||"Undecided"}
- VVA summer plan: ${form.summer_pe?"PE over summer (freeing a TJ slot)":""}${form.summer_language?`${form.summer_pe?"; ":""}${form.summer_language} via Virtual Virginia over summer`:""||"None"}

TJ-SPECIFIC CONTEXT:
- TJ students take exactly 7 courses per year (a few opt into an 8th course online)
- ALL students take math and science all 4 years; English all 4 years
- Science sequence (required): Biology 1 HN → Chemistry 1 HN → Physics 1 HN → 4th year science
- Math sequence typical: Algebra 2 HN → AP Precalculus → AP Calculus AB or BC → post-calc math
- World language: strongly recommended all 4 years for college admissions; counted toward the 7 slots
- Senior Research (grade 12): specialized TJ lab/project courses in CS, bio, chem, physics, engineering, etc.
- Semester pairs: some courses are offered as two linked semester courses (e.g., AP World History paired with AP Seminar, AP Eng Lang paired with APUSH, AP Eng Lit paired with AP Gov)
${freshmanContext}
You can answer questions about courses, prerequisites, explain why courses were chosen, and suggest changes. For questions about REMOVING required freshman courses (Foundations of CS, Design & Technology, Health & PE 9, Biology 1 HN, English 9 HN), explain that these cannot be changed.

When the user asks to change the schedule, append this EXACTLY at the end of your response (no extra text after it):
SCHEDULE_CHANGE: [{"action":"replace","old":"EXACT CURRENT COURSE NAME","new":"EXACT NEW COURSE NAME"}]
or for adding: SCHEDULE_CHANGE: [{"action":"add","course":"EXACT COURSE NAME"}]
or for removing: SCHEDULE_CHANGE: [{"action":"remove","course":"EXACT COURSE NAME"}]

Only include SCHEDULE_CHANGE if the user explicitly asked to modify the schedule. Be conversational and helpful.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          system: systemPrompt,
          messages: newMessages.map(m=>({ role:m.role, content:m.content }))
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(`API error ${response.status}: ${JSON.stringify(data)}`);
      const fullText = data.content?.map(b=>b.text||"").join("") || "Sorry, I couldn't process that.";
      const changeMatch = fullText.match(/SCHEDULE_CHANGE:\s*(\[[\s\S]*?\])/);
      let displayText = fullText.replace(/SCHEDULE_CHANGE:\s*\[[\s\S]*?\]/, "").trim();

      if (changeMatch) {
        try {
          const changes = JSON.parse(changeMatch[1]);
          let newSched = [...(editedSchedule||[])];
          changes.forEach(change => {
            if (change.action==="replace") {
              const idx = newSched.findIndex(c=>c.course_name===change.old);
              const newCourse = TJ_COURSES.find(c=>c.course_name===change.new);
              if (idx!==-1 && newCourse) newSched[idx] = { ...newCourse, reason:"Changed by AI advisor" };
            } else if (change.action==="add") {
              const newCourse = TJ_COURSES.find(c=>c.course_name===change.course);
              if (newCourse && newSched.length < 7) newSched.push({ ...newCourse, reason:"Added by AI advisor" });
            } else if (change.action==="remove") {
              newSched = newSched.filter(c=>c.course_name!==change.course);
            }
          });
          handleScheduleEdit(newSched);
          displayText += "\n\n✅ I've updated your schedule!";
        } catch(e) { /* ignore parse error */ }
      }
      setChatMessages([...newMessages, { role:"assistant", content:displayText }]);
    } catch(e) {
      setChatMessages([...newMessages, { role:"assistant", content:`Error: ${e.message}` }]);
    }
    setChatLoading(false);
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"500px 1fr", gap:32, padding:"32px 48px", backgroundColor:C.bg, minHeight:"calc(100vh - 56px)", alignItems:"start" }}>
      {/* ── FORM ── */}
      <div style={{ backgroundColor:"white", borderRadius:16, padding:"32px", border:`1px solid ${C.border}`, display:"flex", flexDirection:"column", gap:22, position:"sticky", top:72 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
            <h2 style={{ fontSize:20, fontWeight:800, color:C.textPrimary, margin:0 }}>Student Profile</h2>
            <button onClick={()=>{ fillDemo(); setTimeout(handleGenerate, 50); }}
              style={{ padding:"5px 14px", borderRadius:8, fontSize:12, fontWeight:700, backgroundColor:"#F0FDF4", color:C.success, border:`1px solid ${C.success}`, cursor:"pointer" }}>
              ⚡ Demo Mode
            </button>
          </div>
          <p style={{ fontSize:13, color:C.textSecondary, margin:0 }}>Fill out your profile and click Generate</p>
        </div>

        <div>
          <label style={lbl}>Name (optional)</label>
          <input style={inp} placeholder="Your name" value={form.student_name} onChange={e=>set("student_name",e.target.value)} />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div>
            <label style={lbl}>Current Grade *</label>
            <select style={inp} value={form.current_grade} onChange={e=>{ set("current_grade",e.target.value); setError(null); }}>
              <option value="">Select grade</option>
              <option value="8">8th (rising 9th)</option>
              <option value="9">9th (rising 10th)</option>
              <option value="10">10th (rising 11th)</option>
              <option value="11">11th (rising 12th)</option>
            </select>
          </div>
          <div>
            <label style={lbl}>GPA (0–4.5) *</label>
            <input type="number" step="0.01" min="0" max="4.5" placeholder="e.g. 3.85"
              style={inp} value={form.gpa} onChange={e=>set("gpa",e.target.value)} />
          </div>
        </div>

        <div>
          <label style={lbl}>Areas of Interest *</label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
            {INTEREST_OPTIONS.map(i=>(
              <label key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:8, border:`1px solid ${form.interests.includes(i)?C.secondary:C.border}`, backgroundColor:form.interests.includes(i)?"#EEF2F6":"white", cursor:"pointer", fontSize:13, color:form.interests.includes(i)?C.primary:C.textPrimary }}>
                <input type="checkbox" checked={form.interests.includes(i)} onChange={()=>toggleInterest(i)} />
                {i}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label style={lbl}>Rigor Preference *</label>
          <select style={inp} value={form.rigor_preference} onChange={e=>set("rigor_preference",e.target.value)}>
            <option value="">Select preference</option>
            <option value="balanced">Balanced – Challenge and manageability</option>
            <option value="aggressive">Aggressive – Maximum rigor and APs</option>
          </select>
        </div>

        <div>
          <label style={lbl}>Senior Research Pathway</label>
          <select style={inp} value={form.research_pathway} onChange={e=>set("research_pathway",e.target.value)}>
            <option value="">Select research area</option>
            {RESEARCH_PATHWAYS.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div style={{ padding:"14px", borderRadius:10, border:`1px solid ${C.border}`, backgroundColor:C.bg }}>
          <label style={{ ...lbl, marginBottom:2 }}>Virtual Virginia Summer Courses
            <span style={{ fontWeight:400, color:C.textSecondary, marginLeft:6, fontSize:12 }}>(outside your 7 TJ slots)</span>
          </label>
          <p style={{ fontSize:11, color:C.textSecondary, margin:"0 0 10px" }}>VVA summer runs June–July (~$375/course; FCPS students may qualify for a discount)</p>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <label style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:13, cursor:"pointer", color:C.textPrimary }}>
              <input type="checkbox" style={{ marginTop:2 }} checked={form.summer_pe} onChange={e=>set("summer_pe",e.target.checked)} />
              <span>
                <strong>Health &amp; PE {form.current_grade==="9"||form.current_grade==="8"?"9":"10"} over summer</strong>
                <span style={{ color:C.textSecondary }}> — frees up one TJ slot for an extra elective</span>
              </span>
            </label>
            <div>
              <label style={{ fontSize:13, fontWeight:500, color:C.textPrimary, display:"block", marginBottom:4 }}>World Language via VVA summer</label>
              <select style={inp} value={form.summer_language} onChange={e=>set("summer_language",e.target.value)}>
                <option value="">None — I'll start my language at TJ</option>
                <optgroup label="Spanish">
                  <option value="Spanish I">Spanish I (beginner)</option>
                  <option value="Spanish II">Spanish II</option>
                  <option value="Spanish III">Spanish III</option>
                  <option value="Spanish IV">Spanish IV</option>
                </optgroup>
                <optgroup label="French">
                  <option value="French I">French I (beginner)</option>
                  <option value="French II">French II</option>
                  <option value="French III">French III</option>
                </optgroup>
                <optgroup label="German">
                  <option value="German I">German I (beginner)</option>
                  <option value="German II">German II</option>
                  <option value="German III">German III</option>
                </optgroup>
                <optgroup label="Latin">
                  <option value="Latin III">Latin III</option>
                </optgroup>
              </select>
              {form.summer_language && (
                <p style={{ fontSize:11, color:C.accent, margin:"4px 0 0" }}>
                  Your TJ schedule will start at the next level after {form.summer_language}.
                </p>
              )}
            </div>
            <label style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:13, cursor:"pointer", color:C.textPrimary }}>
              <input type="checkbox" style={{ marginTop:2 }} checked={form.willing_8th_course} onChange={e=>set("willing_8th_course",e.target.checked)} />
              <span>
                <strong>8th online course during the school year</strong>
                <span style={{ color:C.textSecondary }}> — rare; typically an additional elective via VVA</span>
              </span>
            </label>
          </div>
        </div>

        {form.current_grade === "8" && (
          <div style={{ padding:"14px", borderRadius:10, border:`1px solid ${C.accent}`, backgroundColor:"#F0FDFB" }}>
            <label style={{ ...lbl, marginBottom:6 }}>Entering Math Placement
              <span style={{ fontWeight:400, color:C.textSecondary, marginLeft:6, fontSize:12 }}>(most critical input for freshmen)</span>
            </label>
            <select style={inp} value={form.current_math_level} onChange={e=>set("current_math_level",e.target.value)}>
              <option value="">Select your current math level...</option>
              <option value="314336">Completed Geometry → starts at Algebra 2 HN at TJ</option>
              <option value="3135TM">Completed Algebra 2 → starts at AP Precalculus at TJ (most common)</option>
              <option value="316005">Completed Precalculus → starts at AP Calculus AB at TJ</option>
              <option value="3160TL">Completed AP Precalculus BC → starts at AP Calculus BC at TJ</option>
              <option value="317004">Completed Calculus AB → starts at post-calc math at TJ</option>
            </select>
            <p style={{ fontSize:11, color:C.textSecondary, margin:"6px 0 0" }}>
              Not sure? Check your FCPS transcript or ask your 8th grade math teacher. Most TJ freshmen enter at Algebra 2.
            </p>
          </div>
        )}

        <CompletedCoursesInput currentGrade={form.current_grade} completedByGrade={form.completed_courses_by_grade} onChange={v=>set("completed_courses_by_grade",v)} />

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div>
            <label style={lbl}>World Language</label>
            <select style={inp} value={form.world_language} onChange={e=>set("world_language",e.target.value)}>
              <option value="">Not taking / N/A</option>
              {WORLD_LANGUAGES.map(l=><option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          {form.world_language && (
            <div>
              <label style={lbl}>Current Level</label>
              <select style={inp} value={form.world_language_level} onChange={e=>set("world_language_level",e.target.value)}>
                <option value="0">Starting Level 1</option>
                <option value="1">Completed Level 1</option>
                <option value="2">Completed Level 2</option>
                <option value="3">Completed Level 3</option>
                <option value="4">Completed Level 4</option>
                <option value="5">Completed Level 5+</option>
              </select>
            </div>
          )}
        </div>

        <div style={{ border:`1px solid ${C.border}`, borderRadius:12, padding:16, backgroundColor:C.bg }}>
          <label style={{ ...lbl, marginBottom:6 }}>
            🎓 Import from StudentVue
            <span style={{ fontWeight:400, color:C.textSecondary, marginLeft:6, fontSize:11 }}>(auto-fills completed courses)</span>
          </label>
          <p style={{ fontSize:12, color:C.textSecondary, margin:"0 0 10px" }}>Log in with your FCPS StudentVue credentials to automatically import your transcript.</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <input value={svUser} onChange={e=>setSvUser(e.target.value)} placeholder="StudentVue username"
              style={{ ...inp, margin:0 }} autoComplete="username" />
            <input type="password" value={svPass} onChange={e=>setSvPass(e.target.value)} placeholder="StudentVue password"
              style={{ ...inp, margin:0 }} autoComplete="current-password" />
            <button onClick={async ()=>{
              if (!svUser||!svPass) return;
              setSvLoading(true); setSvStatus(null);
              try {
                const resp = await fetch(`${BACKEND_URL}/api/studentvue/login`, {
                  method:"POST",
                  headers:{ "Content-Type":"application/json" },
                  body: JSON.stringify({ username:svUser, password:svPass })
                });
                const data = await resp.json();
                if (data.success) {
                  const byGrade = { ...form.completed_courses_by_grade };

                  // Helper to match a course name/code to TJ catalog — code match takes priority
                  const matchCourse = (c) => {
                    if (c.code) {
                      const byCode = TJ_COURSES.find(t => t.course_code === c.code);
                      if (byCode) return byCode;
                    }
                    if (c.name) {
                      const nameLower = c.name.toLowerCase();
                      // Alias match — check against both name and code
                      const aliasMatch = TJ_COURSES.find(t => t.aliases && t.aliases.some(a => { const al = a.toLowerCase(); return al === nameLower || nameLower.startsWith(al) || al.startsWith(nameLower) || (c.code && a === c.code); }));
                      if (aliasMatch) return aliasMatch;
                      // Exact match
                      const exact = TJ_COURSES.find(t => t.course_name.toLowerCase() === nameLower);
                      if (exact) return exact;
                      // Prefix match — catalog name starts with input (or vice versa), min 12 chars
                      if (nameLower.length >= 12) {
                        const prefix = TJ_COURSES.find(t => {
                          const cat = t.course_name.toLowerCase();
                          return cat.startsWith(nameLower.slice(0, 12)) || nameLower.startsWith(cat.slice(0, 12));
                        });
                        if (prefix) return prefix;
                      }
                      // Token match — STRICT: require 3+ matching tokens AND level tag match (HN/AP/TJ/DE)
                      const levelTags = ["ap", "hn", "tj", "de", "av"];
                      const inputLevel = levelTags.filter(t => nameLower.includes(t));
                      const inputTokens = nameLower.replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length >= 4 && !levelTags.includes(w));
                      if (inputTokens.length >= 2) {
                        const scores = TJ_COURSES.map(t => {
                          const cat = t.course_name.toLowerCase();
                          const catWords = cat.replace(/[^a-z0-9 ]/g, " ").split(/\s+/);
                          // Token must prefix-match a catalog word
                          const hits = inputTokens.filter(tok => catWords.some(cw => cw.startsWith(tok.slice(0,5)) && tok.length >= 4)).length;
                          // Level tags must match
                          const catLevel = levelTags.filter(l => cat.includes(l));
                          const levelMatch = inputLevel.every(l => catLevel.includes(l));
                          return { course: t, hits, levelMatch };
                        });
                        scores.sort((a,b) => b.hits - a.hits);
                        const best = scores[0];
                        if (best && (best.levelMatch || inputLevel.length === 0 || best.course.level_tags?.length === 0) && best.hits >= 3 && best.hits >= inputTokens.length * 0.7) return best.course;
                      }
                    }
                    return null;
                  };

                  // Import transcript — map StudentVue grade levels to TJ grades
                  // StudentVue grade = actual grade when taken (6,7,8 = middle school, 9+ = TJ)
                  const currentTJGrade = parseInt(form.current_grade || 9);
                  (data.transcript || []).forEach(c => {
                    const match = matchCourse(c);
                    console.log("Transcript:", c.name, c.code, "grade:", c.grade, "→ match:", match?.course_name || "NONE");
                    if (!match) return;
                    const svGrade = parseInt(c.grade) || 9;
                    let tjGrade;
                    if (svGrade < 9) {
                      // Middle school — store under grade 8 (middle school bucket)
                      tjGrade = 8;
                    } else {
                      // High school — use the actual grade (9, 10, 11, 12)
                      tjGrade = Math.min(svGrade, 12);
                    }
                    if (!byGrade[tjGrade]) byGrade[tjGrade] = [];
                    if (!byGrade[tjGrade].includes(match.course_code)) byGrade[tjGrade].push(match.course_code);
                  });

                  // Import current schedule (in-progress courses)
                  console.log("Gradebook courses from server:", (data.schedule || []).map(c => c.name));
                  const curGrade = parseInt(data.student?.grade || form.current_grade || 9);
                  (data.schedule || []).forEach(c => {
                    const match = matchCourse(c);
                    if (match) {
                      if (!byGrade[curGrade]) byGrade[curGrade] = [];
                      if (!byGrade[curGrade].includes(match.course_code)) byGrade[curGrade].push(match.course_code);
                    }
                  });

                  set("completed_courses_by_grade", byGrade);
                  if (data.student?.name) set("student_name", data.student.name);
                  if (data.student?.grade) set("current_grade", String(parseInt(data.student.grade)));
                  setSvStatus("success");
                } else { setSvStatus("error"); }
              } catch(e) { setSvStatus("error"); }
              setSvLoading(false);
            }}
              style={{ padding:"9px", borderRadius:8, fontSize:13, fontWeight:600, backgroundColor:C.secondary, color:"white", border:"none", cursor:"pointer" }}>
              {svLoading ? "⏳ Importing..." : "Import My Courses"}
            </button>
            {svStatus==="success" && <p style={{ fontSize:12, color:C.success, margin:0 }}>✅ Courses imported! Check Completed Courses below.</p>}
            {svStatus==="error" && <p style={{ fontSize:12, color:C.error, margin:0 }}>❌ Could not connect. Check your credentials or try manually.</p>}
          </div>
        </div>

        <div>
          <label style={lbl}>Notes for Counselor (optional)</label>
          <textarea rows={3} placeholder="Any special circumstances, goals, or questions..."
            style={{ ...inp, resize:"vertical" }} value={form.counselor_notes}
            onChange={e=>set("counselor_notes",e.target.value)} />
        </div>

        {error && <div style={{ padding:"10px 14px", borderRadius:8, backgroundColor:"#FEE2E2", color:C.error, fontSize:13 }}>⚠️ {error}</div>}

        <button onClick={handleGenerate} disabled={generating}
          style={{ padding:"13px", borderRadius:10, fontSize:15, fontWeight:700, color:"white", backgroundColor:generating?"#94A3B8":C.primary, border:"none", cursor:generating?"not-allowed":"pointer", letterSpacing:"0.01em" }}>
          {generating ? "⏳ Generating..." : "✨ Generate My Schedule"}
        </button>

        <button onClick={handleSaveToAccount}
          style={{ padding:"11px", borderRadius:10, fontSize:14, fontWeight:600, color:user?C.primary:"white", backgroundColor:user?"white":C.secondary, border:user?`1px solid ${C.primary}`:"none", cursor:"pointer" }}>
          {user ? "💾 Save Progress" : "🔒 Sign In to Save"}
        </button>
      </div>

      {/* ── RESULTS ── */}
      <div>
        {result ? (
          <>
            <div style={{ display:"flex", borderRadius:12, overflow:"hidden", border:`1px solid ${C.border}`, marginBottom:20, backgroundColor:"white" }}>
              {[{id:"nextyear",label:`📅 Next Year (Grade ${nextGrade})`},{id:"roadmap",label:"🗺️ 4-Year Roadmap"}].map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)}
                  style={{ flex:1, padding:"13px 16px", fontSize:14, fontWeight:700, border:"none", cursor:"pointer", backgroundColor:tab===t.id?C.primary:"white", color:tab===t.id?"white":C.textSecondary }}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab==="nextyear" && (
              <div style={{ backgroundColor:"white", borderRadius:16, padding:"28px 32px", border:`1px solid ${C.border}` }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                  <div>
                    <h3 style={{ fontSize:18, fontWeight:800, color:C.textPrimary, margin:"0 0 3px" }}>Grade {nextGrade} Schedule</h3>
                    <p style={{ fontSize:12, color:C.textSecondary, margin:0 }}>Click Replace or Remove to edit any course</p>
                  </div>
                  <span style={{ fontSize:14, fontWeight:700, padding:"5px 14px", borderRadius:20, backgroundColor:editedSchedule?.length===7?"#DCFCE7":"#FEF3C7", color:editedSchedule?.length===7?C.success:C.warning }}>
                    {editedSchedule?.length||0} / 7 courses
                  </span>
                </div>

                {result.warnings.length>0 && (
                  <div style={{ marginBottom:16, padding:"12px 16px", borderRadius:10, backgroundColor:"#FFFBEB", border:"1px solid #FDE68A" }}>
                    <p style={{ fontWeight:700, fontSize:13, color:"#92400E", margin:"0 0 6px" }}>⚠️ Notes</p>
                    <ul style={{ margin:0, paddingLeft:18 }}>
                      {result.warnings.map((w,i)=><li key={i} style={{ fontSize:12, color:"#78350F" }}>{w}</li>)}
                    </ul>
                  </div>
                )}

                {editedSchedule && (
                  <EditableSchedule schedule={editedSchedule} onScheduleChange={handleScheduleEdit} nextGrade={nextGrade} />
                )}

                {(form.summer_pe || form.summer_language) && (
                  <div style={{ marginTop:16, padding:"14px 16px", borderRadius:10, backgroundColor:"#F0FDFB", border:`1px solid ${C.accent}` }}>
                    <p style={{ fontWeight:700, fontSize:13, color:C.accent, margin:"0 0 8px" }}>Virtual Virginia Summer Courses</p>
                    <p style={{ fontSize:11, color:C.textSecondary, margin:"0 0 8px" }}>These are outside your 7 TJ slots and completed before the school year starts.</p>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {form.summer_pe && (
                        <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13 }}>
                          <span style={{ padding:"2px 8px", borderRadius:6, backgroundColor:"#DCFCE7", color:"#166534", fontWeight:600, fontSize:11 }}>VVA Summer</span>
                          <span style={{ color:C.textPrimary }}>Health &amp; PE {nextGrade===9?"9":"10"}</span>
                          <span style={{ color:C.textSecondary, fontSize:12 }}>— satisfies graduation PE requirement; frees one TJ slot</span>
                        </div>
                      )}
                      {form.summer_language && (
                        <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13 }}>
                          <span style={{ padding:"2px 8px", borderRadius:6, backgroundColor:"#DCFCE7", color:"#166534", fontWeight:600, fontSize:11 }}>VVA Summer</span>
                          <span style={{ color:C.textPrimary }}>{form.summer_language}</span>
                          <span style={{ color:C.textSecondary, fontSize:12 }}>
                            — your TJ schedule starts at {(() => {
                              const v = VVA_SUMMER_LANGUAGES.find(c=>c.value===form.summer_language);
                              return v ? `${v.lang} ${v.level+1}` : "the next level";
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                    <p style={{ fontSize:11, color:C.textSecondary, margin:"8px 0 0" }}>
                      Cohort 1: Jun 2–Jul 10 &nbsp;·&nbsp; Cohort 2: Jun 16–Jul 24 &nbsp;·&nbsp; <a href="https://virtualvirginia.org/summer/" target="_blank" rel="noreferrer" style={{ color:C.accent }}>virtualvirginia.org/summer</a>
                    </p>
                  </div>
                )}

                <div style={{ marginTop:20, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
                  <button onClick={handleSave} disabled={editedSchedule?.length!==7||saveStatus==="saving"}
                    style={{ width:"100%", padding:"13px", borderRadius:10, fontSize:14, fontWeight:700, color:"white", backgroundColor:editedSchedule?.length===7?C.success:"#94A3B8", border:"none", cursor:editedSchedule?.length===7?"pointer":"not-allowed" }}>
                    {saveStatus==="saving"?"Saving..." : saveStatus==="saved"?"✅ Schedule Saved!" : "✅ Confirm & Save Schedule"}
                  </button>
                  <p style={{ fontSize:12, color:C.textSecondary, textAlign:"center", margin:"8px 0 0" }}>
                    {editedSchedule?.length===7?"Saved schedules count toward admin demand analytics":"Need exactly 7 courses to confirm"}
                  </p>
                </div>
              </div>
            )}

            {tab==="roadmap" && (
              <div style={{ backgroundColor:"white", borderRadius:16, padding:"28px 32px", border:`1px solid ${C.border}` }}>
                <h3 style={{ fontSize:18, fontWeight:800, color:C.textPrimary, margin:"0 0 4px" }}>4-Year Academic Roadmap</h3>
                <p style={{ fontSize:12, color:C.textSecondary, margin:"0 0 20px" }}>Your full high school course plan at a glance</p>
                {editedRoadmap && (() => {
                  const years = Object.entries(editedRoadmap).sort(([a],[b])=>parseInt(a.split("_")[1])-parseInt(b.split("_")[1]));
                  const maxCourses = Math.max(...years.map(([,y])=>y.courses.length));
                  const rows = Array.from({ length: maxCourses }, (_,i) => i);
                  const subjects = ["English","Math","Science","Social Studies","Computer Science","Technology & Engineering","World Language","Health & PE","Fine Arts","Research","General"];
                  // Build rows — one per course slot, grouped by subject
                  const bySubject = {};
                  years.forEach(([key, yearData]) => {
                    const grade = parseInt(key.split("_")[1]);
                    yearData.courses.forEach(c => {
                      const subj = subjects.find(s => c.subject_area?.includes(s)) || c.subject_area || "Other";
                      if (!bySubject[subj]) bySubject[subj] = {};
                      if (!bySubject[subj][grade]) bySubject[subj][grade] = [];
                      bySubject[subj][grade].push(c);
                    });
                  });
                  const grades = years.map(([key])=>parseInt(key.split("_")[1]));
                  const subjectsUsed = Object.keys(bySubject).sort((a,b)=>subjects.indexOf(a)-subjects.indexOf(b));
                  const colW = `${Math.floor(80/grades.length)}%`;
                  return (
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                        <thead>
                          <tr>
                            <th style={{ padding:"10px 14px", textAlign:"left", backgroundColor:C.card, color:C.textSecondary, fontWeight:600, fontSize:11, width:"18%", border:`1px solid ${C.border}` }}>Subject</th>
                            {grades.map(g => (
                              <th key={g} style={{ padding:"10px 14px", textAlign:"center", backgroundColor:g===nextGrade?C.primary:C.card, color:g===nextGrade?"white":C.textPrimary, fontWeight:700, fontSize:12, width:colW, border:`1px solid ${C.border}` }}>
                                Grade {g}
                                {g===nextGrade && <div style={{ fontSize:10, fontWeight:400, opacity:0.85 }}>Next Year</div>}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {subjectsUsed.map((subj, si) => (
                            <tr key={subj} style={{ backgroundColor: si%2===0 ? "white" : "#FAFBFC" }}>
                              <td style={{ padding:"10px 14px", fontWeight:600, fontSize:11, color:C.textSecondary, border:`1px solid ${C.border}`, verticalAlign:"top" }}>{subj}</td>
                              {grades.map(g => {
                                const courses = bySubject[subj]?.[g] || [];
                                return (
                                  <td key={g} style={{ padding:"8px 12px", border:`1px solid ${C.border}`, verticalAlign:"top", textAlign:"center" }}>
                                    {courses.length > 0 ? (
                                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                                        {courses.map((course, ci) => (
                                          <div key={ci} style={{ padding:"4px 6px", borderRadius:6, backgroundColor:g===nextGrade?"#EEF2FF":"#F8FAFC", border:`1px solid ${g===nextGrade?"#C7D2FE":C.border}` }}>
                                            <div style={{ fontWeight:600, color:C.textPrimary, lineHeight:1.3 }}>{course.course_name}</div>
                                            {course.level_tags?.filter(t=>t!=="TJ").length>0 && (
                                              <div style={{ marginTop:2, display:"flex", gap:2, justifyContent:"center", flexWrap:"wrap" }}>
                                                {course.level_tags.filter(t=>t!=="TJ").map(t=>(
                                                  <span key={t} style={{ fontSize:9, padding:"1px 4px", borderRadius:3, backgroundColor:t==="AP"?"#EEF2FF":t==="HN"?"#F0FDF4":t==="AV"?"#FFF7ED":"#F1F5F9", color:t==="AP"?"#4338CA":t==="HN"?"#166534":t==="AV"?"#9A3412":"#475569", fontWeight:700 }}>{t}</span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span style={{ color:C.border, fontSize:11 }}>—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
                <div style={{ marginTop:20, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
                  <button onClick={handleSave}
                    style={{ width:"100%", padding:"13px", borderRadius:10, fontSize:14, fontWeight:700, color:"white", backgroundColor:C.primary, border:"none", cursor:"pointer" }}>
                    {saveStatus==="saved"?"✅ Plan Saved!":"💾 Save Complete 4-Year Plan"}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ backgroundColor:"white", borderRadius:16, minHeight:520, display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${C.border}` }}>
            <div style={{ textAlign:"center", padding:56 }}>
              <div style={{ fontSize:64, marginBottom:20 }}>🎓</div>
              <h3 style={{ fontSize:22, fontWeight:700, color:C.textPrimary, margin:"0 0 10px" }}>Your Schedule Will Appear Here</h3>
              <p style={{ fontSize:14, color:C.textSecondary, maxWidth:380, margin:"0 auto 16px" }}>
                Fill out your profile on the left and click "Generate My Schedule" to get personalized course recommendations.
              </p>
              <p style={{ fontSize:13, color:C.secondary }}>← Fill out the form and click Generate</p>
            </div>
          </div>
        )}
      </div>

      {/* ── AI CHAT ── */}
      {result && (
        <>
          <button onClick={()=>{ setChatOpen(o=>!o); if(!chatOpen&&chatMessages.length===0) setChatMessages([{ role:"assistant", content:`Hi! I can see your Grade ${nextGrade} schedule with ${editedSchedule?.length||0} courses. Ask me anything about it, or tell me what you'd like to change — for example "swap AP Chemistry for AP Biology" or "add more CS courses".` }]); }}
            style={{ position:"fixed", bottom:32, right:32, width:60, height:60, borderRadius:"50%", backgroundColor:C.primary, color:"white", fontSize:26, border:"none", cursor:"pointer", zIndex:200, boxShadow:"0 4px 20px rgba(0,0,0,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {chatOpen ? "✕" : "🤖"}
          </button>

          {chatOpen && (
            <div style={{ position:"fixed", bottom:104, right:32, width:400, height:540, backgroundColor:"white", borderRadius:20, boxShadow:"0 8px 40px rgba(0,0,0,0.18)", border:`1px solid ${C.border}`, zIndex:200, display:"flex", flexDirection:"column", overflow:"hidden" }}>
              <div style={{ padding:"16px 20px", backgroundColor:C.primary, color:"white" }}>
                <p style={{ margin:0, fontWeight:700, fontSize:15 }}>🤖 AI Course Advisor</p>
                <p style={{ margin:"2px 0 0", fontSize:12, opacity:0.8 }}>Ask me to explain or change your schedule</p>
              </div>

              <div style={{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:10 }}>
                {chatMessages.map((m,i)=>(
                  <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                    <div style={{ maxWidth:"85%", padding:"10px 14px", borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", fontSize:13, lineHeight:1.5, backgroundColor:m.role==="user"?C.primary:"#F1F5F9", color:m.role==="user"?"white":C.textPrimary, whiteSpace:"pre-wrap" }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display:"flex", justifyContent:"flex-start" }}>
                    <div style={{ padding:"10px 14px", borderRadius:"16px 16px 16px 4px", backgroundColor:"#F1F5F9", fontSize:13, color:C.textSecondary }}>⏳ Thinking...</div>
                  </div>
                )}
              </div>

              <div style={{ padding:"12px 16px", borderTop:`1px solid ${C.border}`, display:"flex", gap:8 }}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder="Ask me anything or request changes..."
                  style={{ flex:1, padding:"9px 12px", fontSize:13, border:`1px solid ${C.border}`, borderRadius:10, outline:"none", color:C.textPrimary, fontFamily:"inherit" }} />
                <button onClick={sendChat} disabled={chatLoading||!chatInput.trim()}
                  style={{ padding:"9px 16px", borderRadius:10, backgroundColor:C.primary, color:"white", border:"none", cursor:"pointer", fontSize:13, fontWeight:600 }}>
                  Send
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


// ── Auth Modal ────────────────────────────────────────────────────────────────
function AuthModal({ onAuth }) {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  const handleSubmit = async () => {
    setLoading(true); setError(null); setMsg(null);
    try {
      if (mode === "signup") {
        const data = await signUp(email, password);
        if (data.error) { setError(data.error.message || "Sign up failed"); }
        else { setMsg("Check your email to confirm your account, then sign in."); setMode("signin"); }
      } else {
        const data = await signIn(email, password);
        if (data.error) { setError(data.error.message || "Sign in failed"); }
        else { onAuth(data); }
      }
    } catch(e) { setError("Something went wrong. Try again."); }
    setLoading(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.5)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ backgroundColor:"white", borderRadius:20, padding:"36px 40px", width:380, boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🎓</div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:C.textPrimary }}>TJ CoursePath AI</h2>
          <p style={{ margin:"6px 0 0", fontSize:13, color:C.textSecondary }}>
            {mode === "signin" ? "Sign in to save your schedule" : "Create an account to get started"}
          </p>
        </div>

        {error && <div style={{ padding:"10px 14px", borderRadius:8, backgroundColor:"#FEE2E2", color:"#991B1B", fontSize:13, marginBottom:16 }}>{error}</div>}
        {msg && <div style={{ padding:"10px 14px", borderRadius:8, backgroundColor:"#DCFCE7", color:"#166534", fontSize:13, marginBottom:16 }}>{msg}</div>}

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <input value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="FCPS email (e.g. 1234567@fcpsschools.net)"
            type="email" style={{ ...inp }} />
          <input value={password} onChange={e=>setPassword(e.target.value)}
            onKeyDown={e=>e.key==="Enter" && handleSubmit()}
            placeholder="Password" type="password" style={{ ...inp }} />

          <button onClick={handleSubmit} disabled={loading || !email || !password}
            style={{ padding:"11px", borderRadius:10, backgroundColor:C.primary, color:"white", border:"none", cursor:"pointer", fontSize:14, fontWeight:700, opacity: loading ? 0.7 : 1 }}>
            {loading ? "..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>

          <div style={{ display:"flex", alignItems:"center", gap:10, margin:"4px 0" }}>
            <div style={{ flex:1, height:1, backgroundColor:C.border }} />
            <span style={{ fontSize:12, color:C.textSecondary }}>or</span>
            <div style={{ flex:1, height:1, backgroundColor:C.border }} />
          </div>

          <button onClick={signInWithGoogle}
            style={{ padding:"11px", borderRadius:10, backgroundColor:"white", color:C.textPrimary, border:`1px solid ${C.border}`, cursor:"pointer", fontSize:14, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <p style={{ textAlign:"center", fontSize:13, color:C.textSecondary, margin:0 }}>
            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={()=>{ setMode(mode==="signin"?"signup":"signin"); setError(null); setMsg(null); }}
              style={{ background:"none", border:"none", cursor:"pointer", color:C.secondary, fontWeight:600, fontSize:13, padding:0 }}>
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("planner");
  const [submissions, setSubmissions] = useState([]);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [savedProfile, setSavedProfile] = useState(null);
  const [saveStatus, setSaveStatusRoot] = useState(null); // "saving" | "saved" | "error"

  // Check for existing session on load + handle Google OAuth redirect
  useEffect(() => {
    // Handle Google OAuth redirect (hash fragment has access_token)
    const hash = window.location.hash;
    if (hash.includes("access_token")) {
      const params = new URLSearchParams(hash.slice(1));
      const session = {
        access_token: params.get("access_token"),
        refresh_token: params.get("refresh_token"),
        user: { id: params.get("user_id") }
      };
      // Fetch user info
      sbFetch("/auth/v1/user", { headers: { Authorization: "Bearer " + session.access_token } })
        .then(u => {
          session.user = u;
          localStorage.setItem("sb_session", JSON.stringify(session));
          setUser(u);
          window.history.replaceState({}, "", window.location.pathname);
        });
    } else {
      const session = getSession();
      if (session?.user) setUser(session.user);
    }
  }, []);

  // Load profile when user is set
  useEffect(() => {
    if (user && !profileLoaded) {
      loadProfile().then(p => {
        if (p) setSavedProfile(p);
        setProfileLoaded(true);
      });
    }
  }, [user, profileLoaded]);

  const handleAuth = (session) => {
    setUser(session.user);
    setShowAuth(false);
    setProfileLoaded(false); // trigger load
  };

  const handleSignOut = () => {
    signOut();
    setUser(null);
    setSavedProfile(null);
    setProfileLoaded(false);
  };

  const handleSaveProfile = async (profileData) => {
    if (!user) return;
    setSaveStatusRoot("saving");
    try {
      await saveProfile(profileData);
      setSavedProfile(profileData);
      setSaveStatusRoot("saved");
      setTimeout(() => setSaveStatusRoot(null), 2000);
    } catch(e) {
      setSaveStatusRoot("error");
    }
  };

  return (
    <div style={{ fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", minHeight:"100vh", backgroundColor:C.bg }}>
      {showAuth && <AuthModal onAuth={handleAuth} />}

      {/* Navbar */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, height:56, backgroundColor:"white", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 32px" }}>
        <button onClick={()=>setPage("planner")}
          style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, fontWeight:800, color:C.primary, display:"flex", alignItems:"center", gap:8 }}>
          🎓 TJ CoursePath AI
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {[{id:"planner",label:"Student Planner"},{id:"admin",label:"⚙️ Admin"}].map(p=>(
            <button key={p.id} onClick={()=>setPage(p.id)}
              style={{ padding:"6px 16px", borderRadius:8, fontSize:13, fontWeight:600, border:"none", cursor:"pointer", backgroundColor:page===p.id?C.primary:"transparent", color:page===p.id?"white":C.textSecondary }}>
              {p.label}
            </button>
          ))}
          <div style={{ width:1, height:24, backgroundColor:C.border, margin:"0 4px" }} />
          {user ? (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {saveStatus==="saving" && <span style={{ fontSize:12, color:C.textSecondary }}>💾 Saving...</span>}
              {saveStatus==="saved" && <span style={{ fontSize:12, color:C.success }}>✓ Saved</span>}
              <div style={{ fontSize:12, color:C.textSecondary, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {user.email?.split("@")[0]}
              </div>
              <button onClick={handleSignOut}
                style={{ padding:"5px 12px", borderRadius:8, fontSize:12, fontWeight:600, border:`1px solid ${C.border}`, cursor:"pointer", backgroundColor:"white", color:C.textSecondary }}>
                Sign Out
              </button>
            </div>
          ) : (
            <button onClick={()=>setShowAuth(true)}
              style={{ padding:"6px 16px", borderRadius:8, fontSize:13, fontWeight:600, border:"none", cursor:"pointer", backgroundColor:C.secondary, color:"white" }}>
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Page */}
      <div style={{ paddingTop:56 }}>
        {page==="planner" && (
          <>
            <div style={{ textAlign:"center", padding:"36px 48px 0", backgroundColor:C.bg }}>
              <div style={{ display:"inline-block", fontSize:12, fontWeight:600, padding:"5px 16px", borderRadius:99, backgroundColor:C.card, color:C.secondary, border:`1px solid ${C.border}`, marginBottom:14 }}>
                Thomas Jefferson High School for Science & Technology
              </div>
              <h1 style={{ fontSize:42, fontWeight:900, color:C.textPrimary, margin:"0 0 10px", letterSpacing:"-0.02em" }}>TJ CoursePath AI</h1>
              <p style={{ fontSize:16, color:C.textSecondary, margin:"0 0 4px" }}>Intelligent course planning tailored to TJ's unique curriculum</p>
            </div>
            <StudentPlanner
              onSave={p=>setSubmissions(prev=>[...prev,{...p,id:Date.now()}])}
              user={user}
              savedProfile={profileLoaded ? savedProfile : undefined}
              onSaveProfile={handleSaveProfile}
              onSignInPrompt={()=>setShowAuth(true)}
            />
          </>
        )}
        {page==="admin" && <AdminDashboard submissions={submissions} />}
      </div>

      <footer style={{ textAlign:"center", padding:"20px 48px", fontSize:12, color:C.textSecondary, borderTop:`1px solid ${C.border}`, marginTop:32 }}>
        TJ CoursePath AI • Based on TJHSST Course Selection Sheet 2026-2027 • Always consult your counselor for final decisions
      </footer>
    </div>
  );
}
