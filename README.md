# File Manager App
<p align="center">
  <img src="https://github.com/Manpreet-Singh-2004/File-Manager-EXE/blob/main/iconPNG.png" width="100" alt="File Manager Icon">
</p>

A personal desktop application built by **Manpreet Singh** to manage files, take notes, and use a built-in calendar — all in one lightweight, portable app.

---

## Features

- 📂 **File Storage**  
  Upload and manage files using a clean UI. Files are saved locally and tracked using an embedded SQLite database.

- 🗓️ **Calendar Integration**  
  View, plan, and manage your tasks and events on a custom in-app calendar.

- 📝 **Notes System**  
  Create, edit, and delete notes. Never lose track of your thoughts.

---

## Download

📥 Download the latest portable version here:  
🔗 [Download File-Manager ZIP (v1.0.1)](https://github.com/Manpreet-Singh-2004/File-Manager-EXE/releases/download/app/File-Manager-win32-x64.zip)

>️ Just extract the zip and double-click `File-Manager.exe` to run — no installation needed!

---

## ❓ Why EXE Instead of a Setup?

Unlike traditional installers, this version is a **portable `.exe`** for the following reasons:

- ✅ Preserves internal file structure used by the app (critical for SQLite + file handling).
- ✅ Allows direct local file uploads without permission errors.
- ✅ Ideal for users who want a **ready-to-run experience** without going through installation steps.
- ✅ Fixes path-related issues that occur in `AppData` when packaged as a Setup installer.

> TL;DR: This `.exe` gives better performance and stability for how this app handles files.

---

## Troubleshooting & Known Issues

### 1. ❌ `file-manager` or `file-manager-app` dependency error

**Issue:** 
If you get a `Failed to locate module "file-manager"` or something similar...


**Fix:**
- Delete `node_modules` and `package-lock.json`
- Make sure your `package.json` does NOT have `"file-manager": "file:"` under `dependencies`
- Run:
  ```bash
  npm cache clean --force
  npm install
  ```

---

### 2. 🔒 Input fields (like username) not working

**Issue:** Sometimes input fields like username/password may appear unresponsive.

**Cause:**  
This happens when `preload.js` becomes inactive (common in some Electron windows on initial load).

**Fix:**
- Simply **minimize** the window and then **reopen** it.  
  This reloads `preload.js` and restores full input field interactivity.

You’ll now be able to type and click as expected.

---

## Built With

-  [Electron](https://www.electronjs.org/)  
- SQLite (for file path storage)
- HTML, CSS, JS

---

##  Author

Made with passion by **Manpreet Singh**  
[GitHub Profile »](https://github.com/Manpreet-Singh-2004)


