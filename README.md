# EMS MDT Modernized 🏥

A fully modernized, clinical-grade Medical Data Terminal (MDT) designed for FiveM servers using **Qbox**. This resource focuses on administrative efficiency, clinical data archival, and operational readiness for emergency medical services.

## ✨ Key Features

*   **Operational Dashboard**: Replaced unstable stats with a functional **Information Hub**.
    *   **Radio Codes**: Quick reference for emergency communication.
    *   **Triage Protocol**: Standardized clinical assessment guide.
    *   **Local Scratchpad**: Persistent browser-based notes for active calls.
*   **Patient Profiles**: Comprehensive medical history, search functionality, and profile management synced with Qbox character data.
*   **Archiv Medis (Evidence)**: Dedicated module for storing clinical imagery and investigative medical notes.
*   **Employee Management**: Detailed rosters including employee phone numbers and streamlined recruitment (Hire/Fire) lists.
*   **Clinical UI**: A premium, soft blue-white aesthetic designed to feel like modern hospital management software.
*   **Duty-Restricted Access**: Automatic MDT lockout and blip deactivation for off-duty personnel.

## 🛠️ Installation

1.  Place the `ems-mdt` folder into your `resources` directory.
2.  Add `ensure ems-mdt` to your `server.cfg`.
3.  Ensure dependencies are installed:
    *   [qbx_core](https://github.com/Qbox-Project/qbx_core)
    *   [ox_lib](https://github.com/overextended/ox_lib)
    *   [oxmysql](https://github.com/overextended/oxmysql)

## 📋 Requirements
This MDT is optimized for the **Qbox framework**. Ensure your database has the necessary tables for characters and medical records.

## 🕹️ Controls
*   Use the designated in-game command or item to open the tablet.
*   Access is restricted to players with the `ambulance` job (or configured medical jobs) who are currently **On-Duty**.

---
*Developed for advanced clinical roleplay.*
