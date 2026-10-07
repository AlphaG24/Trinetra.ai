# FUTURE CHANGE PROTOCOL & ENGINEERING GOVERNANCE

> **Mandatory Operating Protocol for Every Future Modification**:
> This protocol is binding on all software engineers, database architects, and AI coding assistants working in this repository.

---

## 1. Core Operating Philosophy

1. **EXISTING FUNCTIONALITY HAS PRIORITY OVER NEW FUNCTIONALITY**:
   - A working production feature must never be degraded, refactored, or broken to accommodate a new feature.
2. **MINIMAL CHANGE PRINCIPLE**:
   - Always prefer the **SMALLEST SAFE CHANGE** over the **LARGEST CLEAN REFACTOR**.
   - If a new requirement can be satisfied by adding a new component, a new route, or an additive helper function without altering existing working code, prefer that additive design.
3. **NO UNAUTHORIZED REFACTORING**:
   - If instructed to "Add feature X" or "Fix bug Y", do NOT rewrite the subsystem or reorganize directories.
   - If a refactoring is genuinely necessary due to an architectural conflict, you must halt, explain the conflict clearly, present the alternatives, and wait for explicit authorization.
4. **PRESERVE UI & CONTRACTS**:
   - Do NOT redesign existing screens, change colors, or adjust layouts unless explicitly requested.
   - Do NOT change existing API schemas or database table columns without impact analysis.

---

## 2. The Mandatory 12-Step Development Protocol

```
STEP 1: Understand the Goal
        Read the user request thoroughly. Determine whether it is an addition, fix, or modification.
   │
STEP 2: Search the Existing Codebase
        Locate the relevant files, routes, tables, and existing implementations. Never assume something is missing.
   │
STEP 3: Identify the Smallest Possible Change
        Design an implementation that touches the minimum number of lines and files.
   │
STEP 4: Trace All Dependencies
        Check upstream callers, downstream consumers, database foreign keys, and shared services.
   │
STEP 5: Assess Non-Breaking Feasibility
        Can this feature be added as an additive layer or wrapper around existing logic?
   │
STEP 6: Document Necessary Modifications
        If existing code must change, document the exact reason and why an additive approach is insufficient.
   │
STEP 7: Identify Regression Risks
        List specific existing features that could be impacted by this change.
   │
STEP 8: Formulate Implementation Plan
        Write a concise, step-by-step plan before opening any files for editing.
   │
STEP 9: Implement Minimal Additive Code
        Make the precise edits. Respect existing coding style, type annotations, and comments.
   │
STEP 10: Run Targeted Tests
        Execute automated unit tests directly covering the modified lines.
   │
STEP 11: Run Critical Regression Tests
        Execute the relevant tests from the 32-point Critical Regression Test List.
   │
STEP 12: Verify Unrelated Functionality
        Verify that frozen files remain intact (`verify_frozen_files.py`) and unrelated systems remain unaffected.
```

---

## 3. Feature Addition Architecture

When introducing a new feature, follow this architectural pattern:

```
┌────────────────────────────────────────────────────────┐
│               EXISTING SYSTEM CORE                     │
│  - Stays stable, protected, and fully operational      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             NEW FEATURE EXTENSION LAYER                │
│  - Additive components, new routes, isolated services  │
│  - Communicates via existing APIs or adapters          │
└────────────────────────────────────────────────────────┘
```

---

## 4. Post-Modification Verification Reporting Standard

After completing any code modification, the developer or AI assistant MUST output a verification report in this exact format:

```markdown
### Verification Report: [Feature / Fix Name]

- **Type Check**: [PASSED / FAILED / NOT TESTED] — [Details]
- **Frozen Compliance Check**: [PASSED / FAILED / NOT TESTED] — [Output of verify_frozen_files.py]
- **Targeted Unit Tests**: [PASSED / FAILED / NOT TESTED] — [Test command & result]
- **Critical Regression Tests**: [PASSED / FAILED / NOT TESTED] — [Subsystems verified]
- **Database Schema Validation**: [PASSED / FAILED / NOT TESTED] — [Additive check]

#### Reasoning for Any Unchecked Items:
- [Explicitly explain why any item was marked NOT TESTED (e.g. requires live carrier hardware)]
```
