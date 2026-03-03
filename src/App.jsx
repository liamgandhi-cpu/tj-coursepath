
// TJ CoursePath AI - Full React App
// Backend: Supabase (replacing Base44)
// To use: set your SUPABASE_URL and SUPABASE_ANON_KEY below
// Supabase tables needed:
//   schedule_submissions (matches ScheduleSubmission schema)
//   Users handled by Supabase Auth

import { useState, useEffect, useMemo, useCallback } from "react";

// ─── SUPABASE CONFIG ────────────────────────────────────────────────────────
// Replace these with your actual Supabase project values
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";

// Minimal Supabase client (no extra deps needed in artifact)
const supabase = (() => {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
  const base = `${SUPABASE_URL}/rest/v1`;
  return {
    from: (table) => ({
      select: async (cols = "*") => {
        const r = await fetch(`${base}/${table}?select=${cols}`, { headers });
        return { data: await r.json(), error: r.ok ? null : "fetch error" };
      },
      insert: async (row) => {
        const r = await fetch(`${base}/${table}`, {
          method: "POST",
          headers: { ...headers, Prefer: "return=representation" },
          body: JSON.stringify(row),
        });
        return { data: await r.json(), error: r.ok ? null : "insert error" };
      },
    }),
    auth: {
      getUser: async () => {
        const token = localStorage.getItem("sb_token");
        if (!token) return { data: { user: null } };
        const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: { ...headers, Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return { data: { user: null } };
        return { data: { user: await r.json() } };
      },
      signInWithPassword: async ({ email, password }) => {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers,
          body: JSON.stringify({ email, password }),
        });
        const data = await r.json();
        if (data.access_token) localStorage.setItem("sb_token", data.access_token);
        return { data, error: r.ok ? null : data };
      },
      signUp: async ({ email, password }) => {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
          method: "POST",
          headers,
          body: JSON.stringify({ email, password }),
        });
        const data = await r.json();
        if (data.access_token) localStorage.setItem("sb_token", data.access_token);
        return { data, error: r.ok ? null : data };
      },
      signOut: () => {
        localStorage.removeItem("sb_token");
        return Promise.resolve();
      },
    },
  };
})();

// ─── COURSE CATALOG DATA ────────────────────────────────────────────────────
const TJ_COURSES = [
  // ENGLISH
  { course_code:"113036",course_name:"English 9 HN",subject_area:"English",level_tags:["HN"],duration:"year",min_grade:9,max_grade:9,prerequisites:[],requirement_bucket:"English Core" },
  { course_code:"114036",course_name:"English 10 HN",subject_area:"English",level_tags:["HN"],duration:"year",min_grade:10,max_grade:10,prerequisites:["113036"],requirement_bucket:"English Core" },
  { course_code:"982005",course_name:"AP Seminar: English 10 (Stand Alone)",subject_area:"English",level_tags:["AP"],duration:"year",min_grade:10,max_grade:10,prerequisites:["113036"],requirement_bucket:"English Core" },
  { course_code:"1150T1",course_name:"English 11 HN",subject_area:"English",level_tags:["HN","TJ"],duration:"year",min_grade:11,max_grade:11,prerequisites:[],requirement_bucket:"English Core" },
  { course_code:"119604",course_name:"AP English Language (Stand Alone)",subject_area:"English",level_tags:["AP"],duration:"year",min_grade:11,max_grade:12,prerequisites:[],requirement_bucket:"English Core" },
  { course_code:"119662",course_name:"AP English Language (Paired with APUSH)",subject_area:"English",level_tags:["AP"],duration:"year",min_grade:11,max_grade:11,prerequisites:[],requirement_bucket:"English Core",pairing_info:"Must be paired with AP US History" },
  { course_code:"116036",course_name:"English 12 HN",subject_area:"English",level_tags:["HN"],duration:"year",min_grade:12,max_grade:12,prerequisites:[],requirement_bucket:"English Core" },
  { course_code:"119504",course_name:"AP English Literature (Stand Alone)",subject_area:"English",level_tags:["AP"],duration:"year",min_grade:12,max_grade:12,prerequisites:[],requirement_bucket:"English Core" },
  { course_code:"120000",course_name:"Journalism 1",subject_area:"English",level_tags:[],duration:"year",min_grade:9,max_grade:12,prerequisites:[],requirement_bucket:"English Elective" },
  // SOCIAL STUDIES
  { course_code:"222136",course_name:"World History & Geography 2 HN",subject_area:"Social Studies",level_tags:["HN"],duration:"year",min_grade:10,max_grade:10,prerequisites:[],requirement_bucket:"World History II" },
  { course_code:"234004",course_name:"AP World History (Stand Alone)",subject_area:"Social Studies",level_tags:["AP"],duration:"year",min_grade:10,max_grade:10,prerequisites:[],requirement_bucket:"World History I/II" },
  { course_code:"236036",course_name:"US/VA History HN",subject_area:"Social Studies",level_tags:["HN"],duration:"year",min_grade:11,max_grade:11,prerequisites:[],requirement_bucket:"US History" },
  { course_code:"231904",course_name:"AP US History (Stand Alone)",subject_area:"Social Studies",level_tags:["AP"],duration:"year",min_grade:11,max_grade:11,prerequisites:[],requirement_bucket:"US History" },
  { course_code:"231905",course_name:"AP US History (Paired with AP Eng Lang)",subject_area:"Social Studies",level_tags:["AP"],duration:"year",min_grade:11,max_grade:11,prerequisites:[],requirement_bucket:"US History",pairing_info:"Must be paired with AP English Language" },
  { course_code:"244036",course_name:"US/VA Government HN",subject_area:"Social Studies",level_tags:["HN"],duration:"year",min_grade:12,max_grade:12,prerequisites:[],requirement_bucket:"US Government" },
  { course_code:"244504",course_name:"AP US Government (Stand Alone)",subject_area:"Social Studies",level_tags:["AP"],duration:"year",min_grade:12,max_grade:12,prerequisites:[],requirement_bucket:"US Government" },
  { course_code:"2371TJ",course_name:"African American History TJ HN",subject_area:"Social Studies",level_tags:["HN","TJ"],duration:"year",min_grade:9,max_grade:12,prerequisites:[],requirement_bucket:"World History I" },
  { course_code:"2219T1",course_name:"Ancient & Classical Civilizations TJ HN",subject_area:"Social Studies",level_tags:["HN","TJ"],duration:"year",min_grade:9,max_grade:12,prerequisites:[],requirement_bucket:"World History I" },
  { course_code:"2996T1",course_name:"History of Science TJ HN",subject_area:"Social Studies",level_tags:["HN","TJ"],duration:"year",min_grade:9,max_grade:12,prerequisites:[],requirement_bucket:"World History I" },
  { course_code:"2900T1",course_name:"Psychology: Brain & Behavior TJ HN",subject_area:"Social Studies",level_tags:["HN","TJ"],duration:"year",min_grade:9,max_grade:12,prerequisites:[],requirement_bucket:"World History I" },
  { course_code:"280404",course_name:"AP Macroeconomics/Microeconomics",subject_area:"Social Studies",level_tags:["AP"],duration:"year",min_grade:9,max_grade:12,prerequisites:[],requirement_bucket:"Social Studies Elective" },
  { course_code:"290204",course_name:"AP Psychology",subject_area:"Social Studies",level_tags:["AP"],duration:"year",min_grade:9,max_grade:12,prerequisites:[],requirement_bucket:"Social Studies Elective" },
  // HEALTH & PE
  { course_code:"730000",course_name:"Health & PE 9",subject_area:"Health & PE",level_tags:[],duration:"year",min_grade:9,max_grade:9,prerequisites:[],requirement_bucket:"PE Core" },
  { course_code:"740500",course_name:"Health & PE 10",subject_area:"Health & PE",level_tags:[],duration:"year",min_grade:10,max_grade:10,prerequisites:["730000"],requirement_bucket:"PE Core" },
  { course_code:"751050",course_name:"Yoga for Wellness",subject_area:"Health & PE",level_tags:[],duration:"semester",min_grade:11,max_grade:12,prerequisites:[],requirement_bucket:"PE Elective" },
  { course_code:"764011",course_name:"Personal Fitness 1",subject_area:"Health & PE",level_tags:[],duration:"semester",min_grade:11,max_grade:12,prerequisites:[],requirement_bucket:"PE Elective" },
  // SCIENCE
  { course_code:"431036",course_name:"Biology 1 HN",subject_area:"Science",level_tags:["HN"],duration:"year",min_grade:9,max_grade:10,prerequisites:[],requirement_bucket:"Science Core - Biology" },
  { course_code:"4370TJ",course_name:"AP Biology",subject_area:"Science",level_tags:["AP","TJ"],duration:"year",min_grade:10,max_grade:12,prerequisites:["431036"],requirement_bucket:"Science Core - Biology" },
  { course_code:"441036",course_name:"Chemistry 1 HN",subject_area:"Science",level_tags:["HN"],duration:"year",min_grade:9,max_grade:11,prerequisites:[],requirement_bucket:"Science Core - Chemistry" },
  { course_code:"4470TJ",course_name:"AP Chemistry",subject_area:"Science",level_tags:["AP","TJ"],duration:"year",min_grade:10,max_grade:12,prerequisites:["441036"],requirement_bucket:"Science Core - Chemistry" },
  { course_code:"451036",course_name:"Physics 1 HN",subject_area:"Science",level_tags:["HN"],duration:"year",min_grade:9,max_grade:12,prerequisites:[],requirement_bucket:"Science Core - Physics" },
  { course_code:"4573TJ",course_name:"AP Physics 1",subject_area:"Science",level_tags:["AP","TJ"],duration:"year",min_grade:10,max_grade:12,prerequisites:[],requirement_bucket:"Science Core - Physics" },
  { course_code:"4574TJ",course_name:"AP Physics 2",subject_area:"Science",level_tags:["AP","TJ"],duration:"year",min_grade:11,max_grade:12,prerequisites:["4573TJ"],requirement_bucket:"Science Elective" },
  { course_code:"4575TJ",course_name:"AP Physics C Mechanics",subject_area:"Science",level_tags:["AP","TJ"],duration:"year",min_grade:10,max_grade:12,prerequisites:[],requirement_bucket:"Science Core - Physics" },
  { course_code:"427004",course_name:"AP Environmental Science",subject_area:"Science",level_tags:["AP"],duration:"year",min_grade:10,max_grade:12,prerequisites:[],requirement_bucket:"Science Elective" },
  { course_code:"4621T2",course_name:"Bioinformatics TJ HN",subject_area:"Science",level_tags:["HN","TJ"],duration:"year",min_grade:10,max_grade:12,prerequisites:[],requirement_bucket:"Science Elective" },
  { course_code:"4520T9",course_name:"Electrodynamics TJ AV",subject_area:"Science",level_tags:["AV","TJ"],duration:"year",min_grade:11,max_grade:12,prerequisites:[],requirement_bucket:"Science Elective" },
  { course_code:"4320T6",course_name:"DNA Science 1 TJ HN",subject_area:"Science",level_tags:["HN","TJ"],duration:"year",min_grade:10,max_grade:12,prerequisites:[],requirement_bucket:"Science Elective" },
  { course_code:"4320T8",course_name:"Neurobiology TJ AV",subject_area:"Science",level_tags:["AV","TJ"],duration:"year",min_grade:11,max_grade:12,prerequisites:[],requirement_bucket:"Science Elective" },
  { course_code:"4420T6",course_name:"Organic Chemistry TJ AV",subject_area:"Science",level_tags:["AV","TJ"],duration:"year",min_grade:11,max_grade:12,prerequisites:["4470TJ"],requirement_bucket:"Science Elective" },
  // MATH
  { course_code:"314336",course_name:"Geometry HN",subject_area:"Math",level_tags:["HN"],duration:"year",min_grade:9,max_grade:10,prerequisites:["Algebra 1"],requirement_bucket:"Math Core" },
  { course_code:"3135TM",course_name:"Algebra 2 HN",subject_area:"Math",level_tags:["HN"],duration:"year",min_grade:9,max_grade:11,prerequisites:["314336"],requirement_bucket:"Math Core" },
  { course_code:"316005",course_name:"AP Precalculus AB",subject_area:"Math",level_tags:["AP"],duration:"year",min_grade:9,max_grade:11,prerequisites:["3135TM"],requirement_bucket:"Math Core" },
  { course_code:"3160TN",course_name:"AP Precalculus BC",subject_area:"Math",level_tags:["AP","TJ"],duration:"year",min_grade:9,max_grade:11,prerequisites:["3135TM"],requirement_bucket:"Math Core" },
  { course_code:"3160TK",course_name:"AP Precalculus AB 2",subject_area:"Math",level_tags:["AP","TJ"],duration:"year",min_grade:10,max_grade:11,prerequisites:["316005"],requirement_bucket:"Math Core" },
  { course_code:"316056",course_name:"Intro to Calculus TJ HN",subject_area:"Math",level_tags:["HN","TJ"],duration:"year",min_grade:10,max_grade:12,prerequisites:["316005"],requirement_bucket:"Math Core" },
  { course_code:"317004",course_name:"AP Calculus AB",subject_area:"Math",level_tags:["AP"],duration:"year",min_grade:10,max_grade:12,prerequisites:["316005"],requirement_bucket:"Math Core" },
  { course_code:"317704",course_name:"AP Calculus BC",subject_area:"Math",level_tags:["AP"],duration:"year",min_grade:10,max_grade:12,prerequisites:["3160TN"],requirement_bucket:"Math Core" },
  { course_code:"317707",course_name:"AP Calculus BC Post-AB",subject_area:"Math",level_tags:["AP"],duration:"year",min_grade:11,max_grade:12,prerequisites:["317004"],requirement_bucket:"Math Elective" },
  { course_code:"3178DT",course_name:"Multivariable Calculus DE (Stand Alone)",subject_area:"Math",level_tags:["DE"],duration:"year",min_grade:11,max_grade:12,prerequisites:["317704"],requirement_bucket:"Math Elective" },
  { course_code:"3198DT",course_name:"Linear Algebra DE (Stand Alone)",subject_area:"Math",level_tags:["DE"],duration:"year",min_grade:11,max_grade:12,prerequisites:["317704"],requirement_bucket:"Math Elective" },
  { course_code:"3192TJ",course_name:"AP Statistics TJ",subject_area:"Math",level_tags:["AP","TJ"],duration:"year",min_grade:10,max_grade:12,prerequisites:["3135TM"],requirement_bucket:"Math Elective" },
  { course_code:"319204",course_name:"AP Statistics",subject_area:"Math",level_tags:["AP"],duration:"year",min_grade:10,max_grade:12,prerequisites:["3135TM"],requirement_bucket:"Math Elective" },
  { course_code:"3190T4",course_name:"Statistical Modeling Data Science TJ AV",subject_area:"Math",level_tags:["AV","TJ"],duration:"year",min_grade:11,max_grade:12,prerequisites:[],requirement_bucket:"Math Elective" },
  { course_code:"319862",course_name:"Math Techniques TJ AV",subject_area:"Math",level_tags:["AV","TJ"],duration:"year",min_grade:11,max_grade:12,prerequisites:[],requirement_bucket:"Math Elective" },
  // CS
  { course_code:"3184T1",course_name:"Foundations of Computer Science TJ HN",subject_area:"Computer Science",level_tags:["HN","TJ"],duration:"year",min_grade:9,max_grade:10,prerequisites:[],requirement_bucket:"CS Core" },
  { course_code:"318561",course_name:"AP Computer Science A TJ",subject_area:"Computer Science",level_tags:["AP","TJ"],duration:"year",min_grade:10,max_grade:12,prerequisites:["3184T1"],requirement_bucket:"CS Core" },
  { course_code:"9828TH",course_name:"Computer Simulation and Game Design TJ AV",subject_area:"Computer Science",level_tags:["AV","TJ"],duration:"year",min_grade:10,max_grade:12,prerequisites:["318561"],requirement_bucket:"CS Elective" },
  { course_code:"319954",course_name:"Artificial Intelligence 1 TJ AV",subject_area:"Computer Science",level_tags:["AV","TJ"],duration:"year",min_grade:11,max_grade:12,prerequisites:["318561"],requirement_bucket:"CS Elective" },
  { course_code:"319967",course_name:"Artificial Intelligence 2 TJ AV",subject_area:"Computer Science",level_tags:["AV","TJ"],duration:"year",min_grade:11,max_grade:12,prerequisites:["319954"],requirement_bucket:"CS Elective" },
  { course_code:"3199J1",course_name:"Web App Development TJ AV",subject_area:"Computer Science",level_tags:["AV","TJ"],duration:"year",min_grade:10,max_grade:12,prerequisites:["318561"],requirement_bucket:"CS Elective" },
  { course_code:"3199T6",course_name:"Machine Learning 1 TJ AV",subject_area:"Computer Science",level_tags:["AV","TJ"],duration:"year",min_grade:11,max_grade:12,prerequisites:["318561"],requirement_bucket:"CS Elective" },
  { course_code:"319916",course_name:"Computer Vision 1 TJ AV",subject_area:"Computer Science",level_tags:["AV","TJ"],duration:"year",min_grade:11,max_grade:12,prerequisites:["318561"],requirement_bucket:"CS Elective" },
  // TECH & ENGINEERING
  { course_code:"8403TJ",course_name:"Design & Technology",subject_area:"Technology & Engineering",level_tags:["TJ"],duration:"year",min_grade:9,max_grade:9,prerequisites:[],requirement_bucket:"Tech & Engineering Core" },
  { course_code:"8404TO",course_name:"Engineering Fundamentals HN",subject_area:"Technology & Engineering",level_tags:["HN"],duration:"year",min_grade:10,max_grade:12,prerequisites:[],requirement_bucket:"Tech & Engineering Elective" },
  { course_code:"9826T8",course_name:"Autonomous Robotics Systems 1 TJ HN",subject_area:"Technology & Engineering",level_tags:["HN","TJ"],duration:"year",min_grade:10,max_grade:12,prerequisites:[],requirement_bucket:"Tech & Engineering Elective" },
  { course_code:"9828J1",course_name:"Engineering Design TJ HN",subject_area:"Technology & Engineering",level_tags:["HN","TJ"],duration:"year",min_grade:10,max_grade:12,prerequisites:[],requirement_bucket:"Tech & Engineering Elective" },
  { course_code:"8478TJ",course_name:"Prototyping 1 TJ HN",subject_area:"Technology & Engineering",level_tags:["HN","TJ"],duration:"year",min_grade:10,max_grade:12,prerequisites:[],requirement_bucket:"Tech & Engineering Elective" },
  { course_code:"9828T8",course_name:"Energy Systems 1 TJ HN",subject_area:"Technology & Engineering",level_tags:["HN","TJ"],duration:"year",min_grade:10,max_grade:12,prerequisites:[],requirement_bucket:"Tech & Engineering Elective" },
  // SENIOR RESEARCH
  { course_code:"9828R4",course_name:"Research Practicum TJ AV",subject_area:"Research",level_tags:["AV","TJ"],duration:"year",min_grade:12,max_grade:12,prerequisites:[],requirement_bucket:"Senior Research" },
  { course_code:"3199T3",course_name:"Computer Systems Research TJ AV",subject_area:"Research",level_tags:["AV","TJ"],duration:"year",min_grade:12,max_grade:12,prerequisites:[],requirement_bucket:"Senior Research" },
  { course_code:"4320T3",course_name:"Biotech Research TJ AV",subject_area:"Research",level_tags:["AV","TJ"],duration:"year",min_grade:12,max_grade:12,prerequisites:[],requirement_bucket:"Senior Research" },
  { course_code:"4320T5",course_name:"Neuroscience Research TJ AV",subject_area:"Research",level_tags:["AV","TJ"],duration:"year",min_grade:12,max_grade:12,prerequisites:[],requirement_bucket:"Senior Research" },
  { course_code:"9826R4",course_name:"Engineering Research TJ AV",subject_area:"Research",level_tags:["AV","TJ"],duration:"year",min_grade:12,max_grade:12,prerequisites:[],requirement_bucket:"Senior Research" },
  // WORLD LANGUAGES - sample set
  { course_code:"511000",course_name:"French 1",subject_area:"World Language",level_tags:[],duration:"year",min_grade:9,max_grade:12,prerequisites:[],requirement_bucket:"World Language" },
  { course_code:"512000",course_name:"French 2",subject_area:"World Language",level_tags:[],duration:"year",min_grade:9,max_grade:12,prerequisites:["511000"],requirement_bucket:"World Language" },
  { course_code:"513000",course_name:"French 3",subject_area:"World Language",level_tags:[],duration:"year",min_grade:9,max_grade:12,prerequisites:["512000"],requirement_bucket:"World Language" },
  { course_code:"514000",course_name:"French 4 HN",subject_area:"World Language",level_tags:["HN"],duration:"year",min_grade:9,max_grade:12,prerequisites:["513000"],requirement_bucket:"World Language" },
  { course_code:"517004",course_name:"AP French Language",subject_area:"World Language",level_tags:["AP"],duration:"year",min_grade:9,max_grade:12,prerequisites:["514000"],requirement_bucket:"World Language" },
  { course_code:"521000",course_name:"German 1",subject_area:"World Language",level_tags:[],duration:"year",min_grade:9,max_grade:12,prerequisites:[],requirement_bucket:"World Language" },
  { course_code:"522000",course_name:"German 2",subject_area:"World Language",level_tags:[],duration:"year",min_grade:9,max_grade:12,prerequisites:["521000"],requirement_bucket:"World Language" },
  { course_code:"523000",course_name:"German 3",subject_area:"World Language",level_tags:[],duration:"year",min_grade:9,max_grade:12,prerequisites:["522000"],requirement_bucket:"World Language" },
  { course_code:"524000",course_name:"German 4 HN",subject_area:"World Language",level_tags:["HN"],duration:"year",min_grade:9,max_grade:12,prerequisites:["523000"],requirement_bucket:"World Language" },
  { course_code:"527004",course_name:"AP German Language",subject_area:"World Language",level_tags:["AP"],duration:"year",min_grade:9,max_grade:12,prerequisites:["524000"],requirement_bucket:"World Language" },
  { course_code:"551000",course_name:"Spanish 1",subject_area:"World Language",level_tags:[],duration:"year",min_grade:9,max_grade:12,prerequisites:[],requirement_bucket:"World Language" },
  { course_code:"552000",course_name:"Spanish 2",subject_area:"World Language",level_tags:[],duration:"year",min_grade:9,max_grade:12,prerequisites:["551000"],requirement_bucket:"World Language" },
  { course_code:"553000",course_name:"Spanish 3",subject_area:"World Language",level_tags:[],duration:"year",min_grade:9,max_grade:12,prerequisites:["552000"],requirement_bucket:"World Language" },
  { course_code:"554000",course_name:"Spanish 4 HN",subject_area:"World Language",level_tags:["HN"],duration:"year",min_grade:9,max_grade:12,prerequisites:["553000"],requirement_bucket:"World Language" },
  { course_code:"557004",course_name:"AP Spanish Language",subject_area:"World Language",level_tags:["AP"],duration:"year",min_grade:9,max_grade:12,prerequisites:["554000"],requirement_bucket:"World Language" },
  { course_code:"581000",course_name:"Chinese 1",subject_area:"World Language",level_tags:[],duration:"year",min_grade:9,max_grade:12,prerequisites:[],requirement_bucket:"World Language" },
  { course_code:"582000",course_name:"Chinese 2",subject_area:"World Language",level_tags:[],duration:"year",min_grade:9,max_grade:12,prerequisites:["581000"],requirement_bucket:"World Language" },
  { course_code:"583000",course_name:"Chinese 3",subject_area:"World Language",level_tags:[],duration:"year",min_grade:9,max_grade:12,prerequisites:["582000"],requirement_bucket:"World Language" },
  { course_code:"584000",course_name:"Chinese 4 HN",subject_area:"World Language",level_tags:["HN"],duration:"year",min_grade:9,max_grade:12,prerequisites:["583000"],requirement_bucket:"World Language" },
  { course_code:"584004",course_name:"AP Chinese Language",subject_area:"World Language",level_tags:["AP"],duration:"year",min_grade:9,max_grade:12,prerequisites:["584000"],requirement_bucket:"World Language" },
  { course_code:"531000",course_name:"Latin 1",subject_area:"World Language",level_tags:[],duration:"year",min_grade:9,max_grade:12,prerequisites:[],requirement_bucket:"World Language" },
  { course_code:"532000",course_name:"Latin 2",subject_area:"World Language",level_tags:[],duration:"year",min_grade:9,max_grade:12,prerequisites:["531000"],requirement_bucket:"World Language" },
  { course_code:"533000",course_name:"Latin 3",subject_area:"World Language",level_tags:[],duration:"year",min_grade:9,max_grade:12,prerequisites:["532000"],requirement_bucket:"World Language" },
  { course_code:"537004",course_name:"AP Latin",subject_area:"World Language",level_tags:["AP"],duration:"year",min_grade:9,max_grade:12,prerequisites:["533000"],requirement_bucket:"World Language" },
  // FINE ARTS
  { course_code:"912032",course_name:"Studio Art & Design 1",subject_area:"Fine Arts",level_tags:[],duration:"year",min_grade:9,max_grade:12,prerequisites:[],requirement_bucket:"Fine Arts" },
  { course_code:"922604",course_name:"AP Music Theory",subject_area:"Fine Arts",level_tags:["AP"],duration:"year",min_grade:9,max_grade:12,prerequisites:[],requirement_bucket:"Fine Arts" },
  { course_code:"143000",course_name:"Theatre Arts TJ HN",subject_area:"Fine Arts",level_tags:["HN","TJ"],duration:"year",min_grade:9,max_grade:12,prerequisites:[],requirement_bucket:"Fine Arts" },
  { course_code:"918012",course_name:"Digital Art 1",subject_area:"Fine Arts",level_tags:[],duration:"year",min_grade:9,max_grade:12,prerequisites:[],requirement_bucket:"Fine Arts" },
  { course_code:"919332",course_name:"Photography 1",subject_area:"Fine Arts",level_tags:[],duration:"year",min_grade:9,max_grade:12,prerequisites:[],requirement_bucket:"Fine Arts" },
  // GENERAL
  { course_code:"613504",course_name:"AP Business",subject_area:"General",level_tags:["AP"],duration:"year",min_grade:10,max_grade:12,prerequisites:[],requirement_bucket:"General Elective" },
  { course_code:"630604",course_name:"AP Cybersecurity",subject_area:"General",level_tags:["AP"],duration:"year",min_grade:10,max_grade:12,prerequisites:[],requirement_bucket:"General Elective" },
  { course_code:"982014",course_name:"AP Research",subject_area:"General",level_tags:["AP"],duration:"year",min_grade:11,max_grade:12,prerequisites:[],requirement_bucket:"General Elective" },
  { course_code:"612097",course_name:"Economics & Personal Finance HN",subject_area:"General",level_tags:["HN"],duration:"year",min_grade:10,max_grade:12,prerequisites:[],requirement_bucket:"General Elective" },
];

const getCourseByCode = (code) => TJ_COURSES.find(c => c.course_code === code);
const getCoursesBySubject = (subj) => TJ_COURSES.filter(c => c.subject_area === subj);
const getCoursesForGrade = (grade) => TJ_COURSES.filter(c => c.min_grade <= grade && c.max_grade >= grade);

const INTEREST_OPTIONS = ["CS / Programming","Engineering / Robotics","Research / Lab Science","Humanities / History","Biology / Chemistry / Physics","Business / Economics","Arts / Music / Theatre","Undecided"];
const WORLD_LANGUAGES = ["French","German","Latin","Spanish","Chinese","Korean","Arabic","Japanese","Russian"];
const RESEARCH_PATHWAYS = [
  { pathway_name:"Computer Science / AI / Systems" },
  { pathway_name:"Biology / Biotechnology / Neuroscience" },
  { pathway_name:"Chemistry / Materials Science" },
  { pathway_name:"Physics / Engineering" },
  { pathway_name:"Math / Data Science" },
  { pathway_name:"Social Science / Policy / Ethics" },
  { pathway_name:"Independent / External / University-affiliated" },
];

// ─── SCHEDULE GENERATOR LOGIC ───────────────────────────────────────────────
const MATH_PREREQ_MAP = {
  "314336":{ name:"Geometry HN", prereqs:["Algebra 1"], level:1 },
  "3135TM":{ name:"Algebra 2 HN", prereqs:["314336"], level:2 },
  "316005":{ name:"AP Precalculus AB", prereqs:["3135TM"], level:3 },
  "3160TN":{ name:"AP Precalculus BC", prereqs:["3135TM"], level:3.5 },
  "3160TK":{ name:"AP Precalculus AB 2", prereqs:["316005"], level:3.8 },
  "316056":{ name:"Intro to Calculus TJ HN", prereqs:["316005"], level:3.9 },
  "317004":{ name:"AP Calculus AB", prereqs:["316005"], level:4 },
  "317704":{ name:"AP Calculus BC", prereqs:["3160TN"], level:5 },
  "317707":{ name:"AP Calculus BC Post-AB", prereqs:["317004"], level:5 },
  "3178DT":{ name:"Multivariable Calculus DE", prereqs:["317704"], level:6 },
  "3198DT":{ name:"Linear Algebra DE", prereqs:["317704"], level:6 },
  "3192TJ":{ name:"AP Statistics TJ", prereqs:["3135TM"], level:3 },
  "319204":{ name:"AP Statistics", prereqs:["3135TM"], level:3 },
  "3190T4":{ name:"Statistical Modeling TJ AV", prereqs:[], level:3 },
  "319862":{ name:"Math Techniques TJ AV", prereqs:[], level:3 },
};

function getMathLevel(input="") {
  const s = input.toLowerCase();
  if (s.includes("calc bc")||s.includes("317704")) return 5;
  if (s.includes("calc ab")||s.includes("317004")) return 4;
  if (s.includes("precalc bc")||s.includes("3160tn")) return 3.5;
  if (s.includes("precalc")||s.includes("316005")) return 3;
  if (s.includes("algebra 2")||s.includes("3135tm")) return 2;
  if (s.includes("geometry")||s.includes("314336")) return 1;
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
    return info.prereqs.some(p => completedMathCourses.includes(p) || currentCode === p);
  }).map(([code, info]) => ({ code, ...info }));
  if (!eligible.length) return null;
  eligible.sort((a,b) => a.level - b.level);
  if (rigor === "aggressive") {
    const bc = eligible.find(c => c.name.includes("BC") && !c.name.includes("Post"));
    if (bc) { const c = getCourseByCode(bc.code); if (c) return { ...c, reason:`Aggressive track: ${bc.name}`}; }
  }
  const next = eligible[0];
  const c = getCourseByCode(next.code);
  return c ? { ...c, reason:`Next in math sequence: ${next.name}` } : null;
}

function getScienceLevel(input="") {
  const s = input.toLowerCase();
  if (s.includes("ap physics c")) return 4;
  if (s.includes("ap physics")||s.includes("ap chem")||s.includes("ap bio")) return 3;
  if (s.includes("physics 1")) return 2.5;
  if (s.includes("chemistry")||s.includes("chem")) return 2;
  if (s.includes("biology")||s.includes("bio")) return 1;
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

function getNextLanguageCourse(language, level, grade) {
  if (!language) return null;
  const langPrefix = { "French":"51","German":"52","Latin":"53","Spanish":"55","Chinese":"58","Korean":"587","Arabic":"50","Japanese":"59","Russian":"54" };
  const prefix = langPrefix[language];
  if (!prefix) return null;
  const nextLevel = (level||0)+1;
  const candidates = TJ_COURSES.filter(c =>
    c.subject_area==="World Language" &&
    c.course_code.startsWith(prefix) &&
    c.course_name.toLowerCase().includes(language.toLowerCase())
  );
  const found = candidates.find(c => {
    const n = c.course_name.toLowerCase();
    return n.includes(` ${nextLevel}`) || n.includes(` ${nextLevel} `);
  });
  if (found) return found;
  if (nextLevel >= 5) return candidates.find(c => c.level_tags.includes("AP")) || null;
  return null;
}

function getEnglishCourse(grade, rigor) {
  const courses = getCoursesBySubject("English").filter(c =>
    c.min_grade <= grade && c.max_grade >= grade && c.requirement_bucket==="English Core"
  );
  if (rigor==="aggressive") {
    const ap = courses.find(c => c.level_tags.includes("AP") && !c.pairing_info);
    if (ap) return ap;
  }
  return courses.find(c => c.level_tags.includes("HN")) || courses[0];
}

function getSocialStudiesCourse(grade, rigor) {
  if (grade===10) {
    if (rigor==="aggressive") return getCourseByCode("234004");
    return getCourseByCode("222136");
  }
  if (grade===11) {
    if (rigor==="aggressive") return getCourseByCode("231904");
    return getCourseByCode("236036");
  }
  if (grade===12) {
    if (rigor==="aggressive") return getCourseByCode("244504");
    return getCourseByCode("244036");
  }
  return null;
}

function selectElectives(grade, interests, rigor, current, count, researchPathway) {
  const used = new Set(current.map(c=>c.course_code));
  const scored = getCoursesForGrade(grade).filter(c=>!used.has(c.course_code)&&!c.requirement_bucket?.includes("Core")).map(c => {
    let score = 0;
    if (interests.includes("CS / Programming") && c.subject_area==="Computer Science") score+=10;
    if (interests.includes("Engineering / Robotics") && c.subject_area==="Technology & Engineering") score+=10;
    if (interests.includes("Research / Lab Science") && (c.subject_area==="Science"||c.subject_area==="Research")) score+=10;
    if (interests.includes("Humanities / History") && c.subject_area==="Social Studies") score+=8;
    if (interests.includes("Business / Economics") && c.course_name.includes("Econ")) score+=10;
    if (interests.includes("Arts / Music / Theatre") && c.subject_area==="Fine Arts") score+=10;
    if (researchPathway) {
      if (researchPathway.includes("Computer Science") && c.subject_area==="Computer Science") score+=12;
      if (researchPathway.includes("Biology") && c.subject_area==="Science"&&c.course_name.includes("Bio")) score+=12;
      if (researchPathway.includes("Engineering") && c.subject_area==="Technology & Engineering") score+=12;
      if (researchPathway.includes("Math") && c.subject_area==="Math") score+=12;
    }
    if (rigor==="aggressive") {
      if (c.level_tags.includes("AP")) score+=5;
      if (c.level_tags.includes("AV")) score+=4;
    } else {
      if (c.level_tags.includes("HN")) score+=3;
    }
    if (grade===12 && c.subject_area==="Research") score+=8;
    return { c, score };
  });
  scored.sort((a,b)=>b.score-a.score);
  return scored.slice(0,count).map(x=>x.c);
}

function generateSchedule(inputs) {
  const { current_grade, interests, rigor_preference, current_math_level, current_science_level,
    world_language, world_language_level, research_pathway, completed_math_courses=[],
    completed_courses=[], completed_courses_by_grade={} } = inputs;
  const nextGrade = current_grade + 1;
  const warnings = [];
  const schedule = [];
  if (nextGrade > 12) return { schedule:[], warnings:["Cannot generate post-graduation schedule"] };

  // English
  const eng = getEnglishCourse(nextGrade, rigor_preference);
  if (eng) schedule.push({ ...eng, reason:`Required English for ${nextGrade}th grade` });

  // Math
  const math = getNextMathCourse(current_math_level, completed_math_courses, rigor_preference);
  if (math) schedule.push(math);
  else warnings.push("Could not determine next math course");

  // Science
  const sciLevel = getScienceLevel(current_science_level);
  const sci = getNextScienceCourse(sciLevel, nextGrade, interests, rigor_preference);
  if (sci) schedule.push({ ...sci, reason:`Science progression for ${nextGrade}th grade` });

  // Social Studies
  if (nextGrade >= 10) {
    const ss = getSocialStudiesCourse(nextGrade, rigor_preference);
    if (ss) schedule.push({ ...ss, reason:`Required social studies for ${nextGrade}th grade` });
  }

  // CS required courses
  if (nextGrade===9) { const c=getCourseByCode("3184T1"); if(c) schedule.push({...c,reason:"TJ required: Foundations of CS for freshmen"}); }
  else if (nextGrade===10) { const c=getCourseByCode("318561"); if(c) schedule.push({...c,reason:"TJ required: AP CS A for sophomores"}); }

  // T&E required
  if (nextGrade===9) { const c=getCourseByCode("8403TJ"); if(c) schedule.push({...c,reason:"TJ required: Design & Technology for freshmen"}); }

  // PE
  if (nextGrade===9) { const c=getCourseByCode("730000"); if(c) schedule.push({...c,reason:"Required: Health & PE 9"}); }
  else if (nextGrade===10) { const c=getCourseByCode("740500"); if(c) schedule.push({...c,reason:"Required: Health & PE 10"}); }

  // World Language
  if (world_language) {
    const lang = getNextLanguageCourse(world_language, world_language_level||0, nextGrade);
    if (lang) schedule.push({ ...lang, reason:`Continuing ${world_language} - level ${(world_language_level||0)+1}` });
    else warnings.push(`Could not find next level for ${world_language}`);
  }

  // Fill to 7
  if (schedule.length < 7) {
    const allCompleted = new Set();
    completed_courses.forEach(c=>allCompleted.add(c.course_code));
    Object.values(completed_courses_by_grade).forEach(arr=>arr.forEach(c=>allCompleted.add(c)));
    const electives = selectElectives(nextGrade, interests, rigor_preference, schedule, 7-schedule.length, research_pathway)
      .filter(c=>!allCompleted.has(c.course_code));
    electives.forEach(c=>schedule.push({ ...c, reason:`Elective matching your interests` }));
  }

  const final = schedule.slice(0,7);
  if (final.length < 7) warnings.push(`Only ${final.length} courses found. Consult your counselor.`);

  return {
    schedule: final.map(c=>({ course_code:c.course_code, course_name:c.course_name, subject_area:c.subject_area, level_tags:c.level_tags, reason:c.reason })),
    warnings
  };
}

function generateFourYearRoadmap(inputs, lockedNext=null) {
  const { current_grade } = inputs;
  const roadmap = {};
  const allWarnings = [];
  const nextGrade = current_grade + 1;
  let runningInputs = { ...inputs };
  let completed = [...(inputs.completed_courses||[]), ...(inputs.completed_math_courses||[]).map(c=>({course_code:c}))];

  for (let grade = nextGrade; grade <= 12; grade++) {
    if (grade===nextGrade && lockedNext) {
      roadmap[`grade_${grade}`] = { courses: lockedNext.map(c=>({...c,locked:true})), warnings:[], locked:true };
      const mc = lockedNext.find(c=>c.subject_area==="Math");
      if (mc) { runningInputs.current_math_level=mc.course_code; runningInputs.completed_math_courses=[...(runningInputs.completed_math_courses||[]),mc.course_code]; }
      const sc = lockedNext.find(c=>c.subject_area==="Science");
      if (sc) { runningInputs.current_science_level=sc.course_name; }
      const lc = lockedNext.find(c=>c.subject_area==="World Language");
      if (lc) { runningInputs.world_language_level=(runningInputs.world_language_level||0)+1; }
      continue;
    }
    const res = generateSchedule({ ...runningInputs, current_grade:grade-1, completed_courses:completed });
    roadmap[`grade_${grade}`] = { courses:res.schedule, warnings:res.warnings, locked:false };
    if (res.warnings.length) allWarnings.push(`Grade ${grade}: ${res.warnings.join(", ")}`);
    const mc = res.schedule.find(c=>c.subject_area==="Math");
    if (mc) { runningInputs.current_math_level=mc.course_code; runningInputs.completed_math_courses=[...(runningInputs.completed_math_courses||[]),mc.course_code]; completed.push({course_code:mc.course_code}); }
    const sc = res.schedule.find(c=>c.subject_area==="Science");
    if (sc) { runningInputs.current_science_level=sc.course_name; completed.push({course_code:sc.course_code}); }
    const lc = res.schedule.find(c=>c.subject_area==="World Language");
    if (lc) { runningInputs.world_language_level=(runningInputs.world_language_level||0)+1; }
  }
  return { roadmap, warnings:allWarnings };
}

function validateSchedule(schedule, completedCourses=[], completedMathCourses=[], completedByGrade={}) {
  const issues = [];
  const allCompleted = new Set();
  completedCourses.forEach(c=>allCompleted.add(c.course_code||c));
  completedMathCourses.forEach(c=>allCompleted.add(c));
  Object.values(completedByGrade).forEach(arr=>arr.forEach(c=>allCompleted.add(c)));

  if (schedule.length !== 7) issues.push({ id:"count", severity:"FACT", message:`Schedule has ${schedule.length} courses. TJ requires exactly 7.`, explanation:"TJ schedules must have exactly 7 in-school courses per year." });
  const subjects = new Set(schedule.map(c=>c.subject_area));
  if (!subjects.has("English")) issues.push({ id:"missing-english", severity:"FACT", message:"Missing required English course", explanation:"Every TJ student must take English every year." });
  if (!subjects.has("Math")) issues.push({ id:"missing-math", severity:"FACT", message:"Missing required Math course", explanation:"Every TJ student must take Math every year." });
  if (!subjects.has("Science")) issues.push({ id:"missing-science", severity:"FACT", message:"Missing required Science course", explanation:"Every TJ student must take Science every year." });

  const codes = new Set();
  schedule.forEach((course,idx) => {
    if (codes.has(course.course_code)) issues.push({ id:`dup-${idx}`, severity:"FACT", message:`Duplicate: ${course.course_name}`, explanation:"Cannot take the same course twice." });
    codes.add(course.course_code);
  });

  // Math prereq check
  const mathCourse = schedule.find(c=>c.subject_area==="Math");
  if (mathCourse && MATH_PREREQ_MAP[mathCourse.course_code]) {
    const info = MATH_PREREQ_MAP[mathCourse.course_code];
    if (info.prereqs.length > 0) {
      const met = info.prereqs.some(p=>allCompleted.has(p)||schedule.some(c=>c.course_code===p));
      if (!met) {
        const prereqNames = info.prereqs.map(p=>MATH_PREREQ_MAP[p]?.name||p).join(" or ");
        issues.push({ id:`math-prereq-${mathCourse.course_code}`, severity:"FACT", message:`${mathCourse.course_name} requires ${prereqNames}`, explanation:`Complete ${prereqNames} first.`, fix_suggestion:info.prereqs[0] });
      }
    }
  }
  return { valid: issues.filter(i=>i.severity==="FACT").length===0, issues };
}

function suggestSupplementalCourses(inputs) {
  const { willing_summer, willing_8th_course, interests, rigor_preference, current_grade } = inputs;
  const suggestions = [];
  if (!willing_summer && !willing_8th_course) return suggestions;
  if (willing_summer && rigor_preference==="aggressive" && current_grade<=9) {
    suggestions.push({ course_name:"Algebra 2 (Summer)", provider:"Virtual Fairfax", type:"summer", reason:"Accelerate math progression", enables:"Start at Precalculus in 9th/10th grade" });
  }
  if (willing_summer && (current_grade===8||current_grade===9)) {
    suggestions.push({ course_name:`Health & PE ${current_grade+1} (Summer)`, provider:"Virtual Fairfax", type:"summer", reason:"Free up a schedule slot for an elective", enables:"Take an elective instead of PE during school year" });
  }
  if (willing_8th_course && interests.includes("Research / Lab Science")) {
    suggestions.push({ course_name:"AP Psychology (8th course)", provider:"Virtual Virginia", type:"8th_course", reason:"Explore psychology without schedule conflict", enables:"Extra AP credit" });
  }
  if (willing_8th_course && interests.includes("Engineering / Robotics")) {
    suggestions.push({ course_name:"Introduction to Engineering (8th course)", provider:"Virtual Virginia", type:"8th_course", reason:"Additional engineering exploration", enables:"Engineering background" });
  }
  return suggestions.slice(0,2);
}

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
const C = {
  primary:"#0F2A44", secondary:"#2F6F9F", accent:"#2EC4B6",
  bg:"#F8FAFC", card:"#EEF2F6", border:"#CBD5E1",
  textPrimary:"#1F2933", textSecondary:"#64748B",
  success:"#16A34A", warning:"#F59E0B", error:"#DC2626"
};

// ─── UI PRIMITIVES ───────────────────────────────────────────────────────────
const Badge = ({ children, className="" }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${className}`}>
    {children}
  </span>
);

const getLevelBadgeClass = (tags=[]) => {
  if (tags.includes("AP")) return "bg-purple-100 text-purple-800 border-purple-200";
  if (tags.includes("DE")) return "bg-blue-100 text-blue-800 border-blue-200";
  if (tags.includes("AV")) return "bg-amber-100 text-amber-800 border-amber-200";
  if (tags.includes("HN")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
};

// ─── SPINNER ─────────────────────────────────────────────────────────────────
const Spinner = ({ size=24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" style={{color:C.secondary}}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="31.4" strokeDashoffset="10" />
  </svg>
);

// ─── ICONS (inline SVG) ──────────────────────────────────────────────────────
const Icon = ({ path, size=16, color="currentColor", className="" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={path} />
  </svg>
);
const Icons = {
  graduation: "M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5",
  sparkles: "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z M19 3l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z",
  warn: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  check: "M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3",
  x: "M18 6 6 18 M6 6l12 12",
  refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  chevDown: "M6 9l6 6 6-6",
  chevUp: "M18 15l-6-6-6 6",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  trending: "M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 8h.01 M12 12v4",
  lock: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4",
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  arrowRight: "M5 12h14 M12 5l7 7-7 7",
};

// ─── NAV ─────────────────────────────────────────────────────────────────────
function Nav({ page, setPage, user, onSignOut }) {
  return (
    <nav style={{ backgroundColor:"white", borderBottom:`1px solid ${C.border}` }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <button onClick={()=>setPage("planner")} className="flex items-center gap-2 font-bold text-lg" style={{color:C.primary}}>
            <Icon path={Icons.graduation} size={22} color={C.primary} />
            TJ CoursePath
          </button>
          <div className="flex items-center gap-2">
            <button onClick={()=>setPage("planner")}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={page==="planner" ? {backgroundColor:C.primary,color:"white"} : {color:C.textSecondary}}>
              Student Planner
            </button>
            <button onClick={()=>setPage("admin")}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
              style={page==="admin" ? {backgroundColor:C.primary,color:"white"} : {color:C.textSecondary}}>
              <Icon path={Icons.dashboard} size={14} />Admin
            </button>
            {user && (
              <button onClick={onSignOut} className="px-3 py-1.5 rounded-lg text-sm" style={{color:C.textSecondary}}>
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

// ─── AUTH PAGE ───────────────────────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      let result;
      if (mode==="login") result = await supabase.auth.signInWithPassword({ email, password });
      else result = await supabase.auth.signUp({ email, password });
      if (result.error) { setError(typeof result.error==="string"?result.error:result.error.message||"Auth error"); }
      else { onAuth(result.data.user||result.data); }
    } catch(err) { setError("Connection error. Check your Supabase config."); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{backgroundColor:C.bg}}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4" style={{backgroundColor:C.card}}>
            <Icon path={Icons.graduation} size={20} color={C.primary} />
            <span className="font-semibold text-sm" style={{color:C.primary}}>Thomas Jefferson HSST</span>
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{color:C.textPrimary}}>TJ CoursePath AI</h1>
          <p style={{color:C.textSecondary}}>Plan your academic journey</p>
        </div>
        <div className="rounded-2xl shadow-xl p-8" style={{backgroundColor:C.card}}>
          <div className="flex mb-6 rounded-lg overflow-hidden border" style={{borderColor:C.border}}>
            {["login","signup"].map(m=>(
              <button key={m} onClick={()=>setMode(m)} className="flex-1 py-2 text-sm font-medium transition-colors"
                style={mode===m?{backgroundColor:C.primary,color:"white"}:{color:C.textSecondary}}>
                {m==="login"?"Sign In":"Sign Up"}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{color:C.textPrimary}}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{borderColor:C.border,backgroundColor:"white"}}
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{color:C.textPrimary}}>Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{borderColor:C.border,backgroundColor:"white"}}
                placeholder="••••••••" />
            </div>
            {error && (
              <div className="p-3 rounded-lg text-sm" style={{backgroundColor:"#FEE2E2",color:C.error}}>
                {error}
              </div>
            )}
            {SUPABASE_URL.includes("YOUR_PROJECT") && (
              <div className="p-3 rounded-lg text-xs" style={{backgroundColor:"#FEF3C7",color:"#92400E"}}>
                ⚠️ Demo mode — configure Supabase URL/key in the code to enable real auth & data persistence.
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-opacity"
              style={{backgroundColor:C.primary,opacity:loading?0.7:1}}>
              {loading ? "Loading..." : mode==="login" ? "Sign In" : "Create Account"}
            </button>
          </form>
          {SUPABASE_URL.includes("YOUR_PROJECT") && (
            <button onClick={()=>onAuth({email:"demo@tj.edu",id:"demo"})}
              className="w-full mt-3 py-2 rounded-lg text-sm font-medium border"
              style={{borderColor:C.border,color:C.secondary}}>
              Continue as Demo (no backend)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── COMPLETED COURSES INPUT ─────────────────────────────────────────────────
function CompletedCoursesInput({ currentGrade, completedByGrade, onChange }) {
  const [expanded, setExpanded] = useState(null);
  const [unknown, setUnknown] = useState(new Set());
  const [search, setSearch] = useState({});

  const gradesToShow = () => {
    const g = [];
    const cur = parseInt(currentGrade);
    g.push({ grade:8, required:false, label:"Middle School Courses (Optional)" });
    for (let x=9; x<cur; x++) g.push({ grade:x, required:true, label:`${x}th Grade Completed` });
    if (cur>=9&&cur<=11) g.push({ grade:cur, required:false, label:`${cur}th Grade (In Progress)` });
    return g;
  };

  const toggle = (grade, code) => {
    const upd = { ...completedByGrade };
    if (!upd[grade]) upd[grade]=[];
    upd[grade] = upd[grade].includes(code) ? upd[grade].filter(c=>c!==code) : [...upd[grade], code];
    onChange(upd);
  };

  const toggleUnknown = (grade) => {
    const s = new Set(unknown);
    if (s.has(grade)) { s.delete(grade); } else { s.add(grade); const u={...completedByGrade,[grade]:[]}; onChange(u); }
    setUnknown(s);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold" style={{color:C.textPrimary}}>Completed Courses by Grade</label>
        <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">Required for accuracy</Badge>
      </div>
      <p className="text-xs" style={{color:C.textSecondary}}>Select courses completed for each grade. Click a grade to expand.</p>
      <div className="space-y-2">
        {gradesToShow().map(({ grade, required, label }) => {
          const isExp = expanded===grade;
          const courses = completedByGrade[grade]||[];
          const isUnk = unknown.has(grade);
          const needsVal = required && courses.length<5 && !isUnk;
          return (
            <div key={grade} className="rounded-xl border overflow-hidden" style={{borderColor:needsVal?"#FCA5A5":C.border,backgroundColor:needsVal?"#FFF5F5":"white"}}>
              <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50"
                onClick={()=>setExpanded(isExp?null:grade)}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{color:C.textPrimary}}>{label}</span>
                  {required && <Badge className="bg-blue-50 text-blue-700 border-blue-200">Required</Badge>}
                  {isUnk && <Badge className="bg-amber-50 text-amber-700 border-amber-200">Unknown</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  {courses.length>0 && <Badge className="bg-slate-100 text-slate-700 border-slate-200">{courses.length}</Badge>}
                  <Icon path={isExp?Icons.chevUp:Icons.chevDown} size={16} color={C.textSecondary} />
                </div>
              </div>
              {isExp && (
                <div className="p-3 pt-0 space-y-3 border-t" style={{borderColor:C.border}}>
                  {required && (
                    <label className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer"
                      style={{borderColor:"#FDE68A",backgroundColor:"#FFFBEB"}}>
                      <input type="checkbox" checked={isUnk} onChange={()=>toggleUnknown(grade)} className="w-3.5 h-3.5" />
                      <span className="text-xs" style={{color:"#92400E"}}>I don't remember / incomplete info</span>
                    </label>
                  )}
                  {!isUnk && (
                    <>
                      <input placeholder="Search courses..." value={search[grade]||""} onChange={e=>setSearch({...search,[grade]:e.target.value})}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none" style={{borderColor:C.border}} />
                      <div className="max-h-56 overflow-y-auto space-y-1 p-2 rounded-lg" style={{backgroundColor:C.bg}}>
                        {TJ_COURSES
                          .filter(c=>grade===8?true:(c.min_grade<=grade&&c.max_grade>=grade))
                          .filter(c=>!c.requirement_bucket?.includes("Research"))
                          .filter(c=>{
                            const q=(search[grade]||"").toLowerCase();
                            return !q||c.course_name.toLowerCase().includes(q)||c.subject_area.toLowerCase().includes(q);
                          })
                          .map(course=>(
                            <label key={course.course_code}
                              className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-xs"
                              style={courses.includes(course.course_code)?{backgroundColor:"#EEF2F6",borderColor:C.secondary,color:C.primary}:{backgroundColor:"white",borderColor:C.border,color:C.textPrimary}}>
                              <input type="checkbox" checked={courses.includes(course.course_code)}
                                onChange={()=>toggle(grade,course.course_code)} className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="font-medium">{course.course_name}</span>
                              <span style={{color:C.textSecondary}}>({course.subject_area})</span>
                            </label>
                          ))}
                      </div>
                    </>
                  )}
                  {needsVal && !isUnk && (
                    <p className="text-xs p-2 rounded" style={{backgroundColor:"#FEE2E2",color:C.error}}>
                      Select at least 5 courses or check "I don't remember"
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── EDITABLE SCHEDULE ───────────────────────────────────────────────────────
function EditableSchedule({ schedule, onScheduleChange, nextGrade, completedCourses=[], completedMathCourses=[], completedByGrade={} }) {
  const [searchOpen, setSearchOpen] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [acknowledged, setAcknowledged] = useState(new Set());

  const validation = useMemo(()=>validateSchedule(schedule,completedCourses,completedMathCourses,completedByGrade),[schedule,completedCourses,completedMathCourses,completedByGrade]);

  const remove = (idx) => onScheduleChange(schedule.filter((_,i)=>i!==idx));
  const replace = (idx, c) => { const n=[...schedule]; n[idx]=c; onScheduleChange(n); setSearchOpen(null); setSearchTerm(""); };

  const searchResults = useMemo(()=>{
    if (!searchTerm||searchTerm.length<2) return [];
    const q=searchTerm.toLowerCase(), used=new Set(schedule.map(c=>c.course_code));
    return TJ_COURSES.filter(c=>!used.has(c.course_code)&&c.min_grade<=nextGrade&&c.max_grade>=nextGrade&&
      (c.course_name.toLowerCase().includes(q)||c.course_code.toLowerCase().includes(q)||c.subject_area.toLowerCase().includes(q))
    ).slice(0,8);
  },[searchTerm,schedule,nextGrade]);

  const fixForMe = (violation) => {
    if (violation.fix_suggestion) {
      const prereq = getCourseByCode(violation.fix_suggestion);
      if (prereq && schedule.length < 7) { onScheduleChange([...schedule,{...prereq,reason:"Added as prerequisite"}]); return; }
    }
    const missing = ["English","Math","Science"].find(s=>!schedule.some(c=>c.subject_area===s));
    if (missing) {
      const candidates = TJ_COURSES.filter(c=>c.subject_area===missing&&c.min_grade<=nextGrade&&c.max_grade>=nextGrade&&!schedule.some(s=>s.course_code===c.course_code));
      if (candidates[0]) onScheduleChange([...schedule,{...candidates[0],reason:`Required ${missing} course`}]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Course cards */}
      <div className="space-y-2">
        {schedule.map((course,idx)=>(
          <div key={`${idx}-${course.course_code}`} className="group rounded-xl border p-4 transition-colors hover:border-slate-300 relative" style={{borderColor:C.border,backgroundColor:"white"}}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate" style={{color:C.textPrimary}}>{course.course_name}</p>
                    <p className="text-xs mt-0.5" style={{color:C.textSecondary}}>{course.subject_area}</p>
                    {course.reason && <p className="text-xs mt-1 italic" style={{color:C.secondary}}>{course.reason}</p>}
                  </div>
                  <Badge className={getLevelBadgeClass(course.level_tags||[])}>{course.course_code}</Badge>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={()=>{setSearchOpen(searchOpen===idx?null:idx);setSearchTerm("");}}
                  className="p-1.5 rounded-lg hover:bg-slate-100" title="Replace">
                  <Icon path={Icons.refresh} size={14} color={C.textSecondary} />
                </button>
                <button onClick={()=>remove(idx)}
                  className="p-1.5 rounded-lg hover:bg-red-50" title="Remove">
                  <Icon path={Icons.x} size={14} color={C.error} />
                </button>
              </div>
            </div>
            {searchOpen===idx && (
              <div className="mt-3 pt-3 border-t" style={{borderColor:C.border}}>
                <div className="relative mb-2">
                  <input autoFocus type="text" placeholder="Search courses..." value={searchTerm}
                    onChange={e=>setSearchTerm(e.target.value)}
                    className="w-full px-3 py-1.5 pr-8 text-sm border rounded-lg focus:outline-none focus:ring-2"
                    style={{borderColor:C.border}} />
                  <Icon path={Icons.search} size={14} color={C.textSecondary} className="absolute right-2 top-2" />
                </div>
                {searchResults.length>0 ? (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {searchResults.map(r=>(
                      <button key={r.course_code} onClick={()=>replace(idx,r)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-sm">
                        <span className="font-medium" style={{color:C.textPrimary}}>{r.course_name}</span>
                        <span className="text-xs ml-2" style={{color:C.textSecondary}}>{r.subject_area}</span>
                      </button>
                    ))}
                  </div>
                ) : searchTerm.length>1 ? <p className="text-xs p-2" style={{color:C.textSecondary}}>No courses found</p> : null}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Violations */}
      {validation.issues.length>0 && (
        <div className="space-y-2">
          {validation.issues.map(v=>{
            const isFact = v.severity==="FACT";
            const isAck = acknowledged.has(v.id);
            return (
              <div key={v.id} className={`rounded-xl p-3 flex gap-3 ${isAck?"opacity-60":""}`}
                style={{backgroundColor:isFact?"#FEF2F2":"#FFFBEB",border:`1px solid ${isFact?"#FECACA":"#FDE68A"}`}}>
                <Icon path={isFact?Icons.warn:Icons.info} size={16} color={isFact?C.error:C.warning} className="flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{color:isFact?C.error:C.warning}}>{v.severity}</p>
                  <p className="text-sm mt-0.5" style={{color:isFact?"#7F1D1D":"#78350F"}}>{v.message}</p>
                  {v.explanation && <p className="text-xs mt-1 font-medium" style={{color:isFact?"#991B1B":"#92400E"}}>→ {v.explanation}</p>}
                </div>
                <div className="flex-shrink-0">
                  {isFact && (
                    <button onClick={()=>fixForMe(v)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                      style={{backgroundColor:C.accent}}>Fix for Me</button>
                  )}
                  {!isFact && !isAck && (
                    <button onClick={()=>setAcknowledged(new Set([...acknowledged,v.id]))}
                      className="px-3 py-1.5 rounded-lg text-xs"
                      style={{color:C.warning,border:`1px solid ${C.warning}`}}>Keep Anyway</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center gap-2 p-3 rounded-lg" style={{backgroundColor:C.card}}>
        <Icon path={validation.valid?Icons.check:Icons.warn} size={18} color={validation.valid?C.success:C.error} />
        <span className="text-sm font-medium" style={{color:validation.valid?C.success:C.error}}>
          {validation.valid ? "Schedule meets all TJ requirements" : `${validation.issues.length} issue(s) with schedule`}
        </span>
      </div>
    </div>
  );
}

// ─── EDITABLE ROADMAP ────────────────────────────────────────────────────────
function EditableRoadmap({ roadmap, currentGrade, onRoadmapChange }) {
  const [expanded, setExpanded] = useState(null);
  const [editing, setEditing] = useState(null);

  const changeYear = (grade, newSchedule) => {
    onRoadmapChange({ ...roadmap, [`grade_${grade}`]: { ...roadmap[`grade_${grade}`], courses:newSchedule } });
  };

  return (
    <div className="space-y-3">
      {Object.entries(roadmap).map(([key,yearData],i)=>{
        const grade = parseInt(key.split("_")[1]);
        const isNext = grade===currentGrade+1;
        const isExp = expanded===grade;
        const isEdit = editing===grade;
        return (
          <div key={key} className="rounded-xl border overflow-hidden transition-colors" style={{borderColor:C.border,backgroundColor:"white"}}>
            <div className="flex items-center gap-3 p-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{backgroundColor:isNext?C.secondary:C.textSecondary}}>{grade}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm" style={{color:C.textPrimary}}>Grade {grade}</span>
                  {isNext && <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">Next Year</Badge>}
                  {yearData.locked && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Locked</Badge>}
                </div>
                <p className="text-xs mt-0.5" style={{color:C.textSecondary}}>{yearData.courses.length} courses</p>
              </div>
              <div className="flex gap-1.5">
                {!yearData.locked && (
                  <button onClick={()=>{setEditing(editing===grade?null:grade);setExpanded(grade);}}
                    className="px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors"
                    style={{color:C.secondary,border:`1px solid ${C.border}`}}>
                    <Icon path={Icons.edit} size={12} />Edit
                  </button>
                )}
                <button onClick={()=>setExpanded(isExp?null:grade)}
                  className="p-1.5 rounded-lg hover:bg-slate-100">
                  <Icon path={isExp?Icons.chevUp:Icons.chevDown} size={16} color={C.textSecondary} />
                </button>
              </div>
            </div>
            {isExp && (
              <div className="px-4 pb-4 pt-2 border-t" style={{borderColor:C.border}}>
                {yearData.locked ? (
                  <div className="p-3 rounded-lg text-sm" style={{backgroundColor:"#ECFDF5",color:"#065F46"}}>
                    This year is locked to your Next Year schedule. Edit it in the "Next Year" tab.
                  </div>
                ) : isEdit ? (
                  <div>
                    <EditableSchedule schedule={yearData.courses} onScheduleChange={s=>changeYear(grade,s)} nextGrade={grade} />
                    <button onClick={()=>setEditing(null)}
                      className="mt-3 px-4 py-2 rounded-lg text-sm text-white"
                      style={{backgroundColor:C.success}}>Done Editing</button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {yearData.courses.map((c,idx)=>(
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg text-sm" style={{backgroundColor:C.bg}}>
                        <span style={{color:C.textPrimary}}>{c.course_name}</span>
                        <div className="flex gap-1">
                          {(c.level_tags||[]).map(t=>(
                            <Badge key={t} className={getLevelBadgeClass(c.level_tags||[])}>{t}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
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

// ─── STUDENT PLANNER PAGE ────────────────────────────────────────────────────
function StudentPlannerPage({ user }) {
  const [form, setForm] = useState({
    student_name:"", current_grade:"", gpa:"", interests:[], rigor_preference:"",
    research_pathway:"", willing_summer_courses:false, willing_8th_course:false,
    current_math_level:"", completed_courses_by_grade:{}, current_science_level:"",
    world_language:"", world_language_level:"", counselor_notes:""
  });
  const [result, setResult] = useState(null);
  const [editedSchedule, setEditedSchedule] = useState(null);
  const [editedRoadmap, setEditedRoadmap] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("nextyear");
  const [saveStatus, setSaveStatus] = useState(null);

  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const toggleInterest = i => set("interests", form.interests.includes(i)?form.interests.filter(x=>x!==i):[...form.interests,i]);

  const handleGenerate = async () => {
    setError(null);
    if (!form.current_grade) { setError("Please select your current grade level"); return; }
    if (!form.gpa) { setError("Please enter your GPA"); return; }
    if (form.interests.length===0) { setError("Please select at least one area of interest"); return; }
    if (!form.rigor_preference) { setError("Please select your rigor preference"); return; }
    setIsGenerating(true);
    try {
      const allCompleted=[];
      const mathFromGrades=[];
      let derivedSci = form.current_science_level||"";
      Object.values(form.completed_courses_by_grade).forEach(arr=>{
        arr.forEach(code=>{
          allCompleted.push({course_code:code});
          const c=TJ_COURSES.find(x=>x.course_code===code);
          if (c?.subject_area==="Math") mathFromGrades.push(code);
          if (c?.subject_area==="Science"&&!derivedSci) derivedSci=c.course_name;
        });
      });
      const inputs = {
        current_grade:parseInt(form.current_grade), gpa:parseFloat(form.gpa),
        interests:form.interests, rigor_preference:form.rigor_preference,
        research_pathway:form.research_pathway||null, willing_summer:form.willing_summer_courses,
        willing_8th_course:form.willing_8th_course, current_math_level:form.current_math_level,
        completed_math_courses:[...new Set(mathFromGrades)], completed_courses:allCompleted,
        completed_courses_by_grade:form.completed_courses_by_grade,
        current_science_level:derivedSci, world_language:form.world_language||null,
        world_language_level:form.world_language_level?parseInt(form.world_language_level):null
      };
      const sched = generateSchedule(inputs);
      const roadmap = generateFourYearRoadmap(inputs, null);
      const supp = suggestSupplementalCourses(inputs);
      setResult({ schedule:sched.schedule, warnings:[...sched.warnings,...roadmap.warnings], roadmap:roadmap.roadmap, supplemental:supp });
      setEditedSchedule(sched.schedule);
      setEditedRoadmap(roadmap.roadmap);
    } catch(err) { setError(err.message||"Failed to generate schedule"); }
    setIsGenerating(false);
  };

  const handleScheduleEdit = (newSched) => {
    setEditedSchedule(newSched);
    const allCompleted=[]; const mathFromGrades=[]; let derivedSci=form.current_science_level||"";
    Object.values(form.completed_courses_by_grade).forEach(arr=>{
      arr.forEach(code=>{
        allCompleted.push({course_code:code});
        const c=TJ_COURSES.find(x=>x.course_code===code);
        if (c?.subject_area==="Math") mathFromGrades.push(code);
        if (c?.subject_area==="Science"&&!derivedSci) derivedSci=c.course_name;
      });
    });
    const inputs={
      current_grade:parseInt(form.current_grade),gpa:parseFloat(form.gpa),interests:form.interests,
      rigor_preference:form.rigor_preference,current_math_level:form.current_math_level,
      completed_math_courses:[...new Set(mathFromGrades)],completed_courses:allCompleted,
      current_science_level:derivedSci,world_language:form.world_language||null,
      world_language_level:form.world_language_level?parseInt(form.world_language_level):null
    };
    const r=generateFourYearRoadmap(inputs, newSched);
    setEditedRoadmap(r.roadmap);
  };

  const handleRoadmapChange = (newRoadmap) => {
    setEditedRoadmap(newRoadmap);
    const nextGrade = parseInt(form.current_grade)+1;
    if (newRoadmap[`grade_${nextGrade}`]) setEditedSchedule(newRoadmap[`grade_${nextGrade}`].courses);
  };

  const handleSave = async (label) => {
    setSaveStatus("saving");
    const payload = {
      student_name:form.student_name||"Anonymous", current_grade:parseInt(form.current_grade),
      gpa:parseFloat(form.gpa), interests:form.interests, rigor_preference:form.rigor_preference,
      research_pathway:form.research_pathway, willing_summer_courses:form.willing_summer_courses,
      willing_8th_course:form.willing_8th_course, current_math_level:form.current_math_level,
      current_science_level:form.current_science_level, world_language:form.world_language,
      world_language_level:form.world_language_level?parseInt(form.world_language_level):null,
      counselor_notes:form.counselor_notes, original_generated_schedule:result.schedule,
      final_schedule:editedSchedule, supplemental_courses:result.supplemental,
      four_year_roadmap:editedRoadmap||result.roadmap, warnings:result.warnings, is_confirmed:true
    };
    if (!SUPABASE_URL.includes("YOUR_PROJECT")) {
      const { error:err } = await supabase.from("schedule_submissions").insert(payload);
      if (err) { setSaveStatus("error"); return; }
    }
    setSaveStatus("saved");
    setTimeout(()=>setSaveStatus(null), 3000);
  };

  const completedCoursesFlat = useMemo(()=>{
    const all=[]; Object.values(form.completed_courses_by_grade).forEach(arr=>arr.forEach(c=>all.push({course_code:c}))); return all;
  },[form.completed_courses_by_grade]);
  const completedMath = useMemo(()=>{
    const m=[];
    Object.values(form.completed_courses_by_grade).forEach(arr=>arr.forEach(code=>{
      const c=TJ_COURSES.find(x=>x.course_code===code);
      if (c?.subject_area==="Math") m.push(code);
    }));
    return [...new Set(m)];
  },[form.completed_courses_by_grade]);

  return (
    <div className="min-h-screen pt-14" style={{backgroundColor:C.bg}}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-4" style={{backgroundColor:C.card,color:C.primary}}>
            <Icon path={Icons.sparkles} size={14} color={C.accent} />
            Thomas Jefferson High School for Science & Technology
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3" style={{color:C.textPrimary}}>TJ CoursePath AI</h1>
          <p className="text-lg max-w-2xl mx-auto" style={{color:C.textSecondary}}>
            Plan your academic journey with intelligent course recommendations tailored to TJ's unique curriculum
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* FORM */}
          <div className="rounded-2xl shadow-xl p-6 space-y-5" style={{backgroundColor:C.card}}>
            <div className="flex items-center gap-2">
              <Icon path={Icons.graduation} size={20} color={C.primary} />
              <h2 className="text-lg font-bold" style={{color:C.textPrimary}}>Student Profile</h2>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{color:C.textPrimary}}>Name (optional)</label>
              <input className="w-full px-3 py-2 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2"
                style={{borderColor:C.border}} placeholder="Your name" value={form.student_name}
                onChange={e=>set("student_name",e.target.value)} />
            </div>

            {/* Grade + GPA */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{color:C.textPrimary}}>Current Grade *</label>
                <select className="w-full px-3 py-2 rounded-lg border text-sm bg-white focus:outline-none"
                  style={{borderColor:C.border}} value={form.current_grade} onChange={e=>set("current_grade",e.target.value)}>
                  <option value="">Select grade</option>
                  <option value="8">8th (rising freshman)</option>
                  <option value="9">9th (rising sophomore)</option>
                  <option value="10">10th (rising junior)</option>
                  <option value="11">11th (rising senior)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{color:C.textPrimary}}>GPA (0–4.5) *</label>
                <input type="number" step="0.01" min="0" max="4.5" placeholder="e.g. 3.85"
                  className="w-full px-3 py-2 rounded-lg border text-sm bg-white focus:outline-none"
                  style={{borderColor:C.border}} value={form.gpa} onChange={e=>set("gpa",e.target.value)} />
              </div>
            </div>

            {/* Interests */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{color:C.textPrimary}}>Areas of Interest *</label>
              <div className="grid grid-cols-2 gap-2">
                {INTEREST_OPTIONS.map(i=>(
                  <label key={i} className="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm"
                    style={form.interests.includes(i)?{backgroundColor:"#EEF2F6",borderColor:C.secondary,color:C.primary}:{backgroundColor:"white",borderColor:C.border,color:C.textPrimary}}>
                    <input type="checkbox" checked={form.interests.includes(i)} onChange={()=>toggleInterest(i)} className="w-3.5 h-3.5" />
                    {i}
                  </label>
                ))}
              </div>
            </div>

            {/* Rigor */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{color:C.textPrimary}}>Rigor Preference *</label>
              <select className="w-full px-3 py-2 rounded-lg border text-sm bg-white focus:outline-none"
                style={{borderColor:C.border}} value={form.rigor_preference} onChange={e=>set("rigor_preference",e.target.value)}>
                <option value="">Select preference</option>
                <option value="balanced">Balanced – Mix of challenge and manageability</option>
                <option value="aggressive">Aggressive – Maximum rigor and AP courses</option>
              </select>
            </div>

            {/* Research Pathway */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{color:C.textPrimary}}>Senior Research Practicum Pathway</label>
              <select className="w-full px-3 py-2 rounded-lg border text-sm bg-white focus:outline-none"
                style={{borderColor:C.border}} value={form.research_pathway} onChange={e=>set("research_pathway",e.target.value)}>
                <option value="">Select research area</option>
                {RESEARCH_PATHWAYS.map(p=><option key={p.pathway_name} value={p.pathway_name}>{p.pathway_name}</option>)}
              </select>
            </div>

            {/* Supplemental */}
            <div className="p-3 rounded-xl" style={{backgroundColor:"#F8FAFC",border:`1px solid ${C.border}`}}>
              <label className="block text-sm font-medium mb-2" style={{color:C.textPrimary}}>Supplemental Course Options</label>
              <p className="text-xs mb-3" style={{color:C.textSecondary}}>NOT part of your 7 TJ in-school classes</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={form.willing_summer_courses} onChange={e=>set("willing_summer_courses",e.target.checked)} />
                  Willing to take summer courses (Virtual Fairfax/VA)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={form.willing_8th_course} onChange={e=>set("willing_8th_course",e.target.checked)} />
                  Willing to take an 8th course (online, during school year)
                </label>
              </div>
            </div>

            {/* Completed Courses */}
            <CompletedCoursesInput currentGrade={form.current_grade} completedByGrade={form.completed_courses_by_grade}
              onChange={v=>set("completed_courses_by_grade",v)} />

            {/* World Language */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{color:C.textPrimary}}>World Language</label>
                <select className="w-full px-3 py-2 rounded-lg border text-sm bg-white focus:outline-none"
                  style={{borderColor:C.border}} value={form.world_language} onChange={e=>set("world_language",e.target.value)}>
                  <option value="">Not taking / N/A</option>
                  {WORLD_LANGUAGES.map(l=><option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              {form.world_language && (
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{color:C.textPrimary}}>Current Level</label>
                  <select className="w-full px-3 py-2 rounded-lg border text-sm bg-white focus:outline-none"
                    style={{borderColor:C.border}} value={form.world_language_level} onChange={e=>set("world_language_level",e.target.value)}>
                    <option value="0">Starting Level 1</option>
                    <option value="1">Completed Level 1</option>
                    <option value="2">Completed Level 2</option>
                    <option value="3">Completed Level 3</option>
                    <option value="4">Completed Level 4</option>
                    <option value="5">Completed Level 5</option>
                  </select>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{color:C.textPrimary}}>Notes for Counselor (optional)</label>
              <textarea rows={3} placeholder="Any special circumstances, goals, or questions..."
                className="w-full px-3 py-2 rounded-lg border text-sm bg-white focus:outline-none resize-none"
                style={{borderColor:C.border}} value={form.counselor_notes}
                onChange={e=>set("counselor_notes",e.target.value)} />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg flex items-start gap-2 text-sm" style={{backgroundColor:"#FEE2E2",color:C.error}}>
                <Icon path={Icons.warn} size={16} color={C.error} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Generate button */}
            <button onClick={handleGenerate} disabled={isGenerating}
              className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-opacity"
              style={{backgroundColor:C.primary,opacity:isGenerating?0.7:1}}>
              {isGenerating ? (<><Spinner size={18} /><span>Generating Your Plan...</span></>) : (<><Icon path={Icons.sparkles} size={18} color={C.accent} /><span>Generate My Schedule</span></>)}
            </button>
          </div>

          {/* RESULTS */}
          <div>
            {result ? (
              <div>
                {/* Tabs */}
                <div className="flex rounded-xl overflow-hidden border mb-4" style={{borderColor:C.border}}>
                  {[{id:"nextyear",label:`Next Year (${parseInt(form.current_grade)+1}th)`},{id:"roadmap",label:"4-Year Roadmap"}].map(t=>(
                    <button key={t.id} onClick={()=>setActiveTab(t.id)}
                      className="flex-1 py-2.5 text-sm font-medium transition-colors"
                      style={activeTab===t.id?{backgroundColor:C.primary,color:"white"}:{backgroundColor:"white",color:C.textSecondary}}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {activeTab==="nextyear" && (
                  <div className="rounded-2xl shadow-xl p-6 space-y-4" style={{backgroundColor:"white"}}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold flex items-center gap-2" style={{color:C.textPrimary}}>
                          <Icon path={Icons.check} size={18} color={C.success} />
                          {parseInt(form.current_grade)+1}th Grade Schedule
                        </h3>
                        <p className="text-xs mt-0.5" style={{color:C.textSecondary}}>Hover a course to replace or remove it</p>
                      </div>
                      <Badge className={`text-sm px-3 py-1 ${editedSchedule?.length===7?"bg-green-100 text-green-800 border-green-200":"bg-amber-100 text-amber-800 border-amber-200"}`}>
                        {editedSchedule?.length||0}/7
                      </Badge>
                    </div>
                    {result.warnings.length>0 && (
                      <div className="p-3 rounded-xl text-sm" style={{backgroundColor:"#FFFBEB",border:`1px solid #FDE68A`}}>
                        <p className="font-semibold mb-1" style={{color:"#92400E"}}>Notes & Warnings</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {result.warnings.map((w,i)=><li key={i} style={{color:"#78350F"}}>{w}</li>)}
                        </ul>
                      </div>
                    )}
                    {editedSchedule && (
                      <EditableSchedule schedule={editedSchedule} onScheduleChange={handleScheduleEdit}
                        nextGrade={parseInt(form.current_grade)+1} completedCourses={completedCoursesFlat}
                        completedMathCourses={completedMath} completedByGrade={form.completed_courses_by_grade} />
                    )}
                    {result.supplemental?.length>0 && (
                      <div className="pt-4 border-t" style={{borderColor:C.border}}>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5" style={{color:C.textPrimary}}>
                          <Icon path={Icons.info} size={15} />Suggested Supplemental Courses
                        </h4>
                        <p className="text-xs mb-3" style={{color:C.textSecondary}}>NOT part of your 7 TJ in-school classes. Optional.</p>
                        <div className="space-y-2">
                          {result.supplemental.map((c,i)=>(
                            <div key={i} className="p-3 rounded-xl border" style={{borderColor:"#C7D2FE",backgroundColor:"#EEF2FF"}}>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium text-sm" style={{color:C.textPrimary}}>{c.course_name}</p>
                                  <p className="text-xs mt-0.5" style={{color:C.textSecondary}}>Provider: {c.provider}</p>
                                  <p className="text-xs" style={{color:C.textSecondary}}>Purpose: {c.reason||c.purpose}</p>
                                  {c.enables && <p className="text-xs mt-1 italic" style={{color:C.secondary}}>→ {c.enables}</p>}
                                </div>
                                <Badge className="bg-white text-slate-700 border-slate-200 flex-shrink-0">
                                  {c.type==="summer"?"Summer":"8th Course"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="pt-4 border-t" style={{borderColor:C.border}}>
                      <button onClick={()=>handleSave("schedule")} disabled={editedSchedule?.length!==7||saveStatus==="saving"}
                        className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-opacity"
                        style={{backgroundColor:editedSchedule?.length===7?C.success:"#94A3B8",opacity:saveStatus==="saving"?0.7:1}}>
                        {saveStatus==="saving"?"Saving..." : saveStatus==="saved"?"✅ Saved!" : "Confirm & Save Final Schedule"}
                      </button>
                      <p className="text-xs text-center mt-2" style={{color:C.textSecondary}}>
                        {editedSchedule?.length===7?"Only confirmed schedules count toward admin demand data":"⚠️ Must have exactly 7 courses to confirm"}
                      </p>
                    </div>
                  </div>
                )}

                {activeTab==="roadmap" && (
                  <div className="rounded-2xl shadow-xl p-6 space-y-4" style={{backgroundColor:"white"}}>
                    <div>
                      <h3 className="text-lg font-bold" style={{color:C.textPrimary}}>4-Year Academic Roadmap</h3>
                      <p className="text-xs mt-0.5" style={{color:C.textSecondary}}>Click "Edit" to modify any grade</p>
                    </div>
                    {/* Completed history */}
                    {Object.keys(form.completed_courses_by_grade).length>0 && (
                      <div className="p-4 rounded-xl" style={{backgroundColor:C.bg,border:`1px solid ${C.border}`}}>
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{color:C.textPrimary}}>
                          <Icon path={Icons.check} size={15} color={C.success} />Already Completed
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(form.completed_courses_by_grade)
                            .filter(([g,arr])=>parseInt(g)<parseInt(form.current_grade)+1&&arr.length>0)
                            .sort(([a],[b])=>parseInt(a)-parseInt(b))
                            .map(([g,arr])=>(
                              <div key={g} className="flex items-start gap-2">
                                <Badge className="bg-slate-100 text-slate-700 border-slate-200 mt-0.5">{g}th</Badge>
                                <div className="flex flex-wrap gap-1">
                                  {arr.map(code=>{ const c=TJ_COURSES.find(x=>x.course_code===code); return c?(<span key={code} className="text-xs px-2 py-0.5 rounded border bg-white" style={{borderColor:C.border}}>{c.course_name}</span>):null; })}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    {editedRoadmap && <EditableRoadmap roadmap={editedRoadmap} currentGrade={parseInt(form.current_grade)} onRoadmapChange={handleRoadmapChange} />}
                    <div className="pt-4 border-t" style={{borderColor:C.border}}>
                      <button onClick={()=>handleSave("roadmap")} disabled={saveStatus==="saving"}
                        className="w-full py-2.5 rounded-xl text-white font-semibold text-sm"
                        style={{backgroundColor:C.primary}}>
                        {saveStatus==="saving"?"Saving...":saveStatus==="saved"?"✅ Saved!":"Save Complete 4-Year Plan"}
                      </button>
                      <p className="text-xs text-center mt-2" style={{color:C.textSecondary}}>All grades must have exactly 7 courses to save</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl shadow-xl flex items-center justify-center min-h-[500px]" style={{backgroundColor:C.card}}>
                <div className="text-center py-12 px-8">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{backgroundColor:C.border}}>
                    <Icon path={Icons.graduation} size={36} color={C.textSecondary} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2" style={{color:C.textPrimary}}>Your Schedule Preview</h3>
                  <p className="max-w-sm mx-auto mb-6 text-sm" style={{color:C.textSecondary}}>
                    Fill out your profile on the left, then click "Generate My Schedule" to see your personalized course recommendations.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm" style={{color:C.secondary}}>
                    <Icon path={Icons.arrowRight} size={16} color={C.secondary} />
                    Results will appear here
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-12 text-sm" style={{color:C.textSecondary}}>
          <p>TJ CoursePath AI • Based on TJHSST Course Selection Sheet 2026-2027</p>
          <p className="mt-1">This is an MVP tool. Always consult your counselor for final course selection.</p>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD PAGE ────────────────────────────────────────────────────
const CHART_COLORS = [C.primary, C.secondary, C.accent, C.success, C.warning, C.error, "#64748B","#1F2933"];

function SimpleBarChart({ data, valueKey="value", nameKey="name" }) {
  if (!data.length) return <div className="h-48 flex items-center justify-center text-sm" style={{color:C.textSecondary}}>No data yet</div>;
  const max = Math.max(...data.map(d=>d[valueKey]));
  return (
    <div className="space-y-2">
      {data.map((d,i)=>(
        <div key={i} className="flex items-center gap-3">
          <div className="w-32 text-xs text-right truncate flex-shrink-0" style={{color:C.textSecondary}} title={d[nameKey]}>
            {d[nameKey].length>16?d[nameKey].slice(0,16)+"…":d[nameKey]}
          </div>
          <div className="flex-1 h-6 rounded-full overflow-hidden" style={{backgroundColor:C.card}}>
            <div className="h-full rounded-full transition-all" style={{width:`${(d[valueKey]/max)*100}%`,backgroundColor:CHART_COLORS[i%CHART_COLORS.length]}} />
          </div>
          <div className="w-8 text-xs font-semibold" style={{color:C.textPrimary}}>{d[valueKey]}</div>
        </div>
      ))}
    </div>
  );
}

function SimplePieChart({ data }) {
  if (!data.length) return <div className="h-32 flex items-center justify-center text-sm" style={{color:C.textSecondary}}>No data yet</div>;
  const total = data.reduce((s,d)=>s+d.count,0);
  return (
    <div className="grid grid-cols-2 gap-2">
      {data.filter(d=>d.count>0).map((d,i)=>(
        <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{backgroundColor:C.bg}}>
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor:CHART_COLORS[i%CHART_COLORS.length]}} />
          <span className="text-xs" style={{color:C.textPrimary}}>{d.name}</span>
          <span className="text-xs font-bold ml-auto" style={{color:C.textSecondary}}>{d.count}</span>
        </div>
      ))}
    </div>
  );
}

function AdminDashboardPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState("all");

  useEffect(()=>{
    if (SUPABASE_URL.includes("YOUR_PROJECT")) { setLoading(false); return; }
    supabase.from("schedule_submissions").select("*").then(({data})=>{ setSubmissions(data||[]); setLoading(false); });
  },[]);

  const confirmed = useMemo(()=>submissions.filter(s=>s.is_confirmed),[submissions]);
  const filtered = useMemo(()=>gradeFilter==="all"?confirmed:confirmed.filter(s=>s.current_grade===parseInt(gradeFilter)),[confirmed,gradeFilter]);

  const courseDemand = useMemo(()=>{
    const d={};
    filtered.forEach(s=>{
      const sched = s.final_schedule||s.original_generated_schedule||[];
      sched.forEach(c=>{ const k=c.course_code||c.course_name; if(!d[k]) d[k]={...c,count:0}; d[k].count++; });
    });
    return Object.values(d).sort((a,b)=>b.count-a.count);
  },[filtered]);

  const subjectDemand = useMemo(()=>{
    const d={};
    filtered.forEach(s=>{
      const sched=s.final_schedule||s.original_generated_schedule||[];
      sched.forEach(c=>{ const sub=c.subject_area||"Unknown"; d[sub]=(d[sub]||0)+1; });
    });
    return Object.entries(d).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  },[filtered]);

  const gradeDistrib = useMemo(()=>{
    const d={8:0,9:0,10:0,11:0};
    submissions.forEach(s=>{ if(s.current_grade&&d.hasOwnProperty(s.current_grade)) d[s.current_grade]++; });
    return Object.entries(d).map(([grade,count])=>({name:`Grade ${grade}`,count}));
  },[submissions]);

  if (loading) return <div className="min-h-screen flex items-center justify-center pt-14" style={{backgroundColor:C.bg}}><Spinner size={32}/></div>;

  return (
    <div className="min-h-screen pt-14" style={{backgroundColor:C.bg}}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl" style={{backgroundColor:C.card}}>
                <Icon path={Icons.dashboard} size={22} color={C.primary} />
              </div>
              <h1 className="text-3xl font-bold" style={{color:C.textPrimary}}>Admin Dashboard</h1>
            </div>
            <p style={{color:C.textSecondary}}>Course demand analytics and scheduling insights</p>
          </div>
          {SUPABASE_URL.includes("YOUR_PROJECT") && (
            <div className="px-3 py-2 rounded-lg text-xs" style={{backgroundColor:"#FEF3C7",color:"#92400E"}}>
              Demo mode — configure Supabase to see real data
            </div>
          )}
        </div>

        {/* Filter */}
        <div className="mb-6 p-4 rounded-2xl" style={{backgroundColor:C.card}}>
          <div className="flex flex-wrap items-center gap-3">
            <Icon path={Icons.filter} size={16} color={C.textSecondary} />
            <span className="text-sm font-medium" style={{color:C.textPrimary}}>Filter by Grade:</span>
            <select className="px-3 py-1.5 rounded-lg border text-sm bg-white" style={{borderColor:C.border}}
              value={gradeFilter} onChange={e=>setGradeFilter(e.target.value)}>
              <option value="all">All Grades</option>
              <option value="8">8th Grade (Rising 9th)</option>
              <option value="9">9th Grade (Rising 10th)</option>
              <option value="10">10th Grade (Rising 11th)</option>
              <option value="11">11th Grade (Rising 12th)</option>
            </select>
            {gradeFilter!=="all" && <Badge className="bg-blue-100 text-blue-800 border-blue-200">Rising {parseInt(gradeFilter)+1}th</Badge>}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label:"Confirmed Submissions", value:filtered.length, sub:`${submissions.length-confirmed.length} unconfirmed`, icon:Icons.book, color:C.primary },
            { label:"Unique Students", value:new Set(filtered.map(s=>s.student_name||s.id||"anon")).size, sub:"", icon:Icons.users, color:C.success },
            { label:"Unique Courses", value:courseDemand.length, sub:"", icon:Icons.graduation, color:C.secondary },
            { label:"Top Course", value:courseDemand[0]?.course_name?.split(" ").slice(0,2).join(" ")||"N/A", sub:"most requested", icon:Icons.trending, color:C.accent },
          ].map((s,i)=>(
            <div key={i} className="p-5 rounded-2xl shadow-lg" style={{backgroundColor:C.card}}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{color:C.textSecondary}}>{s.label}</p>
                  <p className="text-2xl font-bold mt-1 truncate max-w-[120px]" style={{color:C.textPrimary}}>{s.value}</p>
                  {s.sub && <p className="text-xs mt-0.5" style={{color:C.textSecondary}}>{s.sub}</p>}
                </div>
                <div className="p-3 rounded-xl" style={{backgroundColor:s.color}}>
                  <Icon path={s.icon} size={20} color="white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Subject area chart */}
          <div className="p-6 rounded-2xl shadow-lg" style={{backgroundColor:C.card}}>
            <h3 className="font-bold mb-1" style={{color:C.textPrimary}}>Demand by Subject Area</h3>
            <p className="text-xs mb-4" style={{color:C.textSecondary}}>Total course requests grouped by subject</p>
            <SimpleBarChart data={subjectDemand} />
          </div>
          {/* Grade dist */}
          <div className="p-6 rounded-2xl shadow-lg" style={{backgroundColor:C.card}}>
            <h3 className="font-bold mb-1" style={{color:C.textPrimary}}>Submissions by Grade Level</h3>
            <p className="text-xs mb-4" style={{color:C.textSecondary}}>Distribution of students using the planner</p>
            <SimplePieChart data={gradeDistrib} />
          </div>
        </div>

        {/* Course demand table */}
        <div className="p-6 rounded-2xl shadow-lg mb-6" style={{backgroundColor:C.card}}>
          <h3 className="font-bold mb-1" style={{color:C.textPrimary}}>Course Demand Rankings</h3>
          <p className="text-xs mb-4" style={{color:C.textSecondary}}>Courses sorted by number of student requests</p>
          {courseDemand.length>0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{borderColor:C.border}}>
                    {["Rank","Code","Course Name","Subject","Requests","Est. Sections"].map(h=>(
                      <th key={h} className="pb-2 text-left text-xs font-semibold" style={{color:C.textSecondary}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {courseDemand.map((c,i)=>(
                    <tr key={c.course_code||i} className="border-b hover:bg-white transition-colors" style={{borderColor:C.border}}>
                      <td className="py-2.5 pr-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          style={i<3?{backgroundColor:C.primary,color:"white"}:i<10?{backgroundColor:C.card,color:C.textPrimary}:{backgroundColor:C.border,color:C.textSecondary}}>
                          {i+1}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-xs" style={{color:C.textSecondary}}>{c.course_code||"-"}</td>
                      <td className="py-2.5 pr-3 font-medium" style={{color:C.textPrimary}}>{c.course_name}</td>
                      <td className="py-2.5 pr-3"><Badge className="bg-slate-100 text-slate-700 border-slate-200">{c.subject_area}</Badge></td>
                      <td className="py-2.5 pr-3 font-bold text-lg" style={{color:C.textPrimary}}>{c.count}</td>
                      <td className="py-2.5" style={{color:C.textSecondary}}>{Math.ceil(c.count/25)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs mt-3 pt-3 border-t" style={{borderColor:C.border,color:C.textSecondary}}>
                * Estimated sections based on 25 students per section.
              </p>
            </div>
          ) : (
            <div className="text-center py-12" style={{color:C.textSecondary}}>
              <Icon path={Icons.book} size={40} color={C.border} className="mx-auto mb-3" />
              <p>No schedule submissions yet.</p>
              <p className="text-xs mt-1">Data will appear here once students generate and confirm schedules.</p>
            </div>
          )}
        </div>

        <div className="text-center text-sm" style={{color:C.textSecondary}}>
          <p>TJ CoursePath AI Admin Dashboard • Data refreshes on load</p>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState("planner");

  useEffect(()=>{
    if (SUPABASE_URL.includes("YOUR_PROJECT")) { setAuthChecked(true); return; }
    supabase.auth.getUser().then(({data})=>{ setUser(data.user||null); setAuthChecked(true); });
  },[]);

  if (!authChecked) return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor:C.bg}}>
      <Spinner size={32} />
    </div>
  );

  if (!user) return <AuthPage onAuth={u=>setUser(u)} />;

  return (
    <div>
      <Nav page={page} setPage={setPage} user={user} onSignOut={async()=>{ await supabase.auth.signOut(); setUser(null); }} />
      {page==="planner" && <StudentPlannerPage user={user} />}
      {page==="admin" && <AdminDashboardPage />}
    </div>
  );
}
