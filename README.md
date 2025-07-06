# Goal Tracker

A sleek, secure, and Markdown-powered personal goal tracking web app hosted
at a private subdomain on my personal website and password protected. Designed
to help me track my own goals, including the development of this very app. This
web app requires no backend server. It works entirely with client-side
JavaScript.

## Features

- 🔐 **Firebase Authentication** — Password-protected access (only authorized users can log in)
- ☁️ **Firebase Firestore** — Real-time storage for goal data
- 📋 **Add, edit, complete, delete goals**
- 📌 **Progress tracking** — Set and visualize progress with percentage bars
- 🗂️ **Category/Tag support** — Classify goals for easy filtering
- 🔍 **Filter and sort** by:
    - Status (`in_progress`, `completed`)
    - Title (A–Z / Z–A)
    - Dates: `updatedAt`, `dueBy`, `completedAt`
- ⏳ **Timestamps** — `last updated`, `complete by`, and `completed at` dates for every goal
- 📝 **Markdown support** — Rich goal descriptions using EasyMDE + live preview
- ✅ **Checklist support** — Use markdown `[ ]` and `[x]` in descriptions
- 🖼️ **Modern Bootstrap UI** — Fully responsive and styled with dark theme overrides
- 🎯 **Meta-goal** — This goal tracker can track the progress of itself

## Tech Stack

- **Frontend**: HTML5, CSS, Bootstrap 5, JavaScript
- **Editor**: [EasyMDE](https://github.com/Ionaru/easy-markdown-editor) (Markdown Editor)
- **Backend**: Firebase (Authentication + Firestore)
- **Hosting**: [Lumi Solutions](https://lumisolutions.tech/)

## Future Ideas

- Multi-user support (with isolated goal collections)
- Filter/sort by category and tags
- Separation of categories and tags
- Separation of due dates and intended completion dates
- Better support for checklists

## File Structure

```
├── .gitignore - Excludes sensitive or irrelivant files & folders from git
├── index.html - Main HTML file
├── app.js - Core frontend logic
├── firebase-config.js - Firebase key & config (gitignored)
├── styles.css - Custom styles & dark mode overrides
└── README.md - What you're reading now
```

## How to Use

1. Deploy files to your Firebase hosting or shared hosting.
2. Create a Firebase project:
    - Enable **Authentication** (Email/Password)
    - Create user account(s)
    - Set **Firestore rules** to restrict access to only authenticated users
3. Fill in your `firebase-config.js`, setting `const firebaseConfig` to your firebase config object from Firebase 
4. Log in with your email and password from step 2 and start setting your goals!

## Firebase Security Rules Example

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /goals/{goalId} {
      allow read, write: if request.auth != null;
    }
  }
}
