# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, Dexie.js (IndexedDB), WebCrypto PBKDF2 + AES-GCM, Vite PWA (Workbox), Capacitor 8 (Android/iOS native wrapper configuration).

## Users

Primary users are neurodivergent adults and adolescents (specifically individuals with autism spectrum disorder, ADHD, and alexithymia) managing psychiatric polypharmacy or serotonergic medications, along with emergency responders (OMSZ paramedics) reading the patient's handover card during acute crisis or selective mutism.

## Product Purpose

Provide a 100% offline-first, non-diagnostic serotonergic medication safety log, clinical washout tracker, alexithymia-adapted visual symptom/emotion diary, and dual-pathway emergency AAC handover system so users can track daily bodily signals without guilt and transmit critical medication and communication needs within 10–15 seconds during an emergency.

## Positioning

Unlike generic pill reminders (which ignore OTC serotonergic overlap and clinical washout periods), clinician-only pharmacology calculators (which lack layperson symptom tracking and AAC handover), or static autism ICE cards (which ignore time-dependent medication exposure), SeroSafe combines a curated 30-substance Hungarian (OGYÉI) washout-aware interaction filter, metaphor-free visual interoception instruments, and zero-second MIST emergency handover in one zero-server local tool.

## Operating Context

- Runs directly in desktop PC browsers (for testing, with a responsive-vs-mobile-frame toggle) and as an installable offline PWA or Capacitor-wrapped app on Android and iOS.
- Daily check-ins target ~10–20 seconds across 5 views (*Ma*, *Gyógyszer*, *Naptár*, *Elemzés*, *Biztonság*) with zero red "failure" marks for missed days.
- Dual-pathway crisis delivery: (1) zero-second in-app MIST Crisis Card with direct `tel:112` calling and Hungarian/English TTS readout, and (2) 1080×1920 lock-screen PNG + offline QR export readable without unlocking the phone.

## Capabilities and Constraints

- **EU MDR / MDCG 2019-11 Non-Diagnostic Boundary:** Structured personal log, published pharmacological reference filter, and AAC aid only; never calculates diagnostic probabilities or provides dosing advice.
- **Anti-Reassurance Logic:** Never returns a "Green / Safe / Biztonságos" state (`INFO_LOGGED`, `CONSULT`, `CALL_EMERGENCY_112`). Fever >= 38.0 °C with muscle stiffness or involuntary twitching escalates to `CALL_EMERGENCY_112` regardless of medication list (NMS/sepsis guard).
- **Zero-Server Privacy:** No cloud backend, telemetry, or external network fonts/APIs at runtime; optional PBKDF2 + AES-GCM PIN lock preserves emergency Crisis Card bypass for paramedic safety by default.
- **Unverified / Open Item:** Formal clinical pharmacist and psychiatrist mentor sign-off on the 30-substance Hungarian washout matrix and OTIO empirical validation tests (SUS, NASA-TLX, paramedic A/B timing) remain pending external execution.

## Brand Commitments

- **Name:** SeroSafe
- **Languages:** Hungarian (`hu`, default) and English (`en`) across UI, clinical disclaimers, and TTS speech synthesis.
- **Confirmed Sensory & Accessibility Constraints:** Low-sensory organic sage light mode as default, toggleable low-glare dark mode, fixed high-contrast black/amber Crisis Card surface, reduced-motion toggle, minimum Tailwind `text-xs` (12px) typography everywhere, and zero unicode emojis standing in for UI icons.

## Evidence on Hand

- Project specification and OTIO validation plan in [SeroSafe projektterv végső optimalizálása.md](docs/otio/SeroSafe%20projektterv%20v%C3%A9gs%C5%91%20optimaliz%C3%A1l%C3%A1sa.md).
- Reference HTML prototypes in [serosafe_neurodivergens_t_mogat_s_biztons_gi_app.html](docs/prototypes/serosafe_neurodivergens_t_mogat_s_biztons_gi_app.html) and [serosafe_v3_mobile_swipe_prototype.html](docs/prototypes/serosafe_v3_mobile_swipe_prototype.html).
- Curated 30-substance matrix in `src/data/substances.ts`, deterministic unit test suite (`src/engine/__tests__/safetyEngine.test.ts`, `src/services/__tests__/crypto.test.ts`), and 1-click demo/crisis presets (`src/services/demoData.ts`) for jury and paramedic simulation.

## Product Principles

1. **Anti-Reassurance Over False Comfort:** Absence of a serotonergic interaction flag never implies physical safety; unusual fever or neuromuscular signs always escalate independently.
2. **Zero-Second Crisis Accessibility:** Emergency handover and 112 calling must remain reachable in one tap from every screen—and without PIN unlock when enabled—before any questionnaire.
3. **Metaphor-Free Interoception:** Replace abstract 1–10 scales and guilt-inducing adherence percentages with tactile visual instruments (emotion wheel, body map, sensory battery, washout arc) and neutral calendar gaps.
4. **Local-Only Data Sovereignty:** Sensitive psychiatric and medication logs never leave the user's device.

## Accessibility & Inclusion

- Designed for ASD, ADHD, and alexithymia: concrete plain-language labels, non-judgmental copy, keyboard-accessible SVG regions (`role="button"`, `tabIndex={0}`), high-contrast `>= 4.5:1` typography, minimum `12px` (`text-xs`) text floor, and full `prefers-reduced-motion` + manual motion suppression.
