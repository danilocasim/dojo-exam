# Implementation Plan: Play Integrity Guard

**Branch**: `003-play-integrity-guard` | **Date**: February 13, 2026 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-play-integrity-guard/spec.md`

## Summary

Add one-time Play Integrity verification on first app launch to block sideloaded/tampered APKs. Mobile app requests an encrypted integrity token via `react-native-google-play-integrity`, sends it to a thin NestJS backend endpoint for decryption via Google's API, evaluates the verdict client-side (checking `PLAY_RECOGNIZED`, `LICENSED`, `MEETS_DEVICE_INTEGRITY`), caches the pass result in AsyncStorage, and blocks with a full-screen overlay if verification fails. Development builds bypass via `__DEV__`. Requires a Phase 0 to register the app on Google Play Console (internal test track) and enable Play Integrity API on GCP.

**Key research finding**: Play Integrity tokens are encrypted and can only be decoded server-side via Google's API — a thin backend decryption endpoint is required (see [research.md](research.md) R1).

## Technical Context

**Language/Version**: TypeScript 5.x (all components)
**Primary Dependencies**: React Native (Expo SDK ~54), NestJS, `react-native-google-play-integrity`, `googleapis`/`google-auth-library`, `expo-dev-client`
**Storage**: AsyncStorage (mobile verification cache — 2 key-value pairs), PostgreSQL unchanged
**Testing**: Jest, React Native Testing Library (mobile), Supertest (API endpoint), manual E2E on physical device
**Target Platform**: Android 5.0+ (API 21+), Google Play Services required
**Project Type**: Mobile + API (existing architecture from 002-cloudprep-mobile)
**Performance Goals**: First-launch integrity check <5s (with network), subsequent launches zero overhead (cached)
**Constraints**: Offline-capable after first verification, single network call on first launch only, no new database tables
**Scale/Scope**: 1 new API endpoint, 1 new mobile service, 1 new UI component, ~200 LOC mobile + ~100 LOC backend

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Constitution is currently a template (not customized for this project). No specific gates to evaluate. Proceeding with standard best practices inherited from 002-cloudprep-mobile plan:

- Test-first approach for critical paths (integrity service, verdict evaluation)
- Simple architecture preferred (thin pass-through endpoint, no new DB tables)
- Documentation required for all public APIs (OpenAPI contract provided)

**Post-design re-check**: Design adds exactly 1 backend endpoint (stateless pass-through) and 1 mobile service. No new patterns, no new architectural layers. Constitution-compliant.

## Project Structure

### Documentation (this feature)

```text
specs/003-play-integrity-guard/
├── plan.md              # This file
├── research.md          # Phase 0 output — 8 research findings
├── data-model.md        # Phase 1 output — AsyncStorage schema, verdict types
├── quickstart.md        # Phase 1 output — setup & verification steps
├── contracts/
│   └── integrity-api.yaml  # Phase 1 output — OpenAPI for POST /api/integrity/verify
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
api/                                    # Backend API (NestJS) — existing
├── src/
│   ├── integrity/                      # NEW: Integrity verification module
│   │   ├── integrity.module.ts         # NestJS module registration
│   │   ├── integrity.controller.ts     # POST /api/integrity/verify
│   │   ├── integrity.service.ts        # Google API token decryption
│   │   └── dto/
│   │       └── verify-integrity.dto.ts # Request validation DTO
│   ├── app.module.ts                   # MODIFIED: import IntegrityModule
│   └── ...                             # Existing modules unchanged
└── ...

mobile/                                 # Mobile app (React Native + Expo) — existing
├── eas.json                            # NEW: EAS Build profiles (dev, preview, production)
├── app.json                            # MODIFIED: add android.package, expo-dev-client plugin
├── App.tsx                             # MODIFIED: add integrity gate to initialization
├── src/
│   ├── services/
│   │   ├── integrity.service.ts        # NEW: Integrity check orchestration
│   │   └── ...                         # Existing services unchanged
│   └── components/
│       ├── IntegrityBlockScreen.tsx     # NEW: Full-screen blocking UI
│       └── ...                         # Existing components unchanged
└── ...
```

**Structure Decision**: Mobile + API architecture from 002-cloudprep-mobile. New code follows existing patterns: NestJS module structure for backend, service + component for mobile. No new directories beyond `api/src/integrity/`.

## Complexity Tracking

> No constitution violations. Feature is additive with minimal surface area.

| Aspect                                                | Decision | Justification                                                                                                                                   |
| ----------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend endpoint (token decryption proxy)             | Required | Play Integrity tokens are encrypted; decryption only possible server-side via Google API. Endpoint is stateless pass-through — no DB, no state. |
| `react-native-google-play-integrity` (new native dep) | Required | Only maintained RN wrapper for Play Integrity. Requires custom dev client but daily dev stays in Expo Go via `__DEV__` bypass.                  |
