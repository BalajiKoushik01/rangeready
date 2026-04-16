# RangeReady HIL V6.0 -- User Manual & AI Guide

> [!CAUTION]
> **CONFIDENTIAL AND PROPRIETARY SOFTWARE**  
> This documentation and the associated software are the exclusive intellectual property of **GVB Tech**.

## 1. Environment Setup (One-Click Initialization)
The global Control Hub can be ignited with a single command, automatically loading Python backends, modular React frontends, and the local APEX AI engine.

**Windows:**
1. Open Command Prompt or PowerShell in the `range ready` folder.
2. Run: `INIT_READY.bat`

**Fedora / Linux:**
1. Open Terminal in the `range ready` directory.
2. Run: `chmod +x INIT_READY.sh && ./INIT_READY.sh`

---

## 2. 🧠 The Apex AI Co-Pilot (Supervised Autonomy)
In V6.0, RangeReady features a supervised intelligence engine that assists with hardware repairs.

### 2.1 The Consent Loop (Consent-First Execution)
When a hardware error is detected during a test sequence (e.g., a SCPI -113 Header Error), the AI engine generates a **Security Proposal**.
- **Pause**: The test sequence is automatically paused.
- **Review**: A high-fidelity modal pops up showing the **Failing Command**, the **AI Proposed Fix**, and the **Technical Reasoning (XAI)**.
- **Action**: You MUST click **[APPROVE]** to apply the fix or **[DECLINE]** to abort the sequence.

### 2.2 The Intelligence HUD
Navigate to the **Intelligence** tab to access the full AI interface:
- **Chat**: Conversational assistant for RF domain knowledge and SCPI lookup.
- **Agentic**: Direct hardware control. Type what you want (e.g., "Set signal gen to 5GHz at -10dBm") and the AI will translate and execute the command.
- **Model**: Monitor the local Gemma-2 engine state, download progress, and context loading.

---

## 3. Hardware Orchestration & Auto-Discovery
The system auto-discovers instruments on standard subnets (port 5025).

**Intelligent Auto-Discovery:**
- Ensure Keysight and **Rohde & Schwarz** devices are connected via LAN.
- Use the **Dashboard** to interrogate the network. The system uses recursive `*IDN?` interrogation to identify and bind the correct drivers automatically.

---

## 4. Troubleshooting & Self-Healing
If a hardware link fails:
1. Check the **Glass Console™** for live bus traffic.
2. Look for the **🔧 HEALED** badge on commands — this indicates the AI has automatically mitigated a firmware quirk or dialect mismatch.
3. If a **FATAL ERROR** persists, check the physical LAN connection and IP static binding in `config.json`.

---

## 5. Offline & Pendrive Portability
1. Copy the `RangeReady_OFFLINE` folder to a secure pendrive.
2. Plug into an air-gapped station.
3. Run **`START_OFFLINE.bat`**.
*The system uses a standalone Ollama binary and a portable Python venv. No internet or system-level installs required.*

**© 2026 GVB LABS CORE**  
**Project Lead: Balaji Koushik // GVB Tech**
