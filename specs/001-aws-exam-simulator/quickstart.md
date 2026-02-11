# Quickstart: AWS Cloud Practitioner Exam Simulator

## Prerequisites

- **Node.js** 20.x or later
- **npm** 10.x or later
- **Expo CLI**: `npm install -g expo-cli`
- **Android Studio** with Android SDK (for emulator) OR physical Android device with Expo Go
- **PostgreSQL** 15+ (for backend, local or Docker)

## Project Setup

### 1. Clone and install dependencies

```bash
# From repository root
cd mobile && npm install
cd ../api && npm install
```

### 2. Backend setup

```bash
cd api

# Copy environment template
cp .env.example .env

# Edit .env with your values:
# DATABASE_URL=postgresql://user:password@localhost:5432/exam_simulator
# ADMIN_API_KEY=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
# PORT=3000

# Run database migrations
npm run db:migrate

# Seed default question bank
npm run db:seed

# Start the API server
npm run dev
```

### 3. Mobile app setup

```bash
cd mobile

# Copy environment template
cp .env.example .env

# Edit .env with:
# API_URL=http://localhost:3000 (or your deployed API URL)

# Start Expo development server
npx expo start
```

### 4. Run on Android

- **Emulator**: Press `a` in the Expo CLI to open on Android emulator
- **Physical device**: Install Expo Go app, scan QR code from terminal

## Development Commands

### Mobile

```bash
cd mobile
npx expo start          # Start Expo dev server
npm test                # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run lint            # Lint code
npm run typecheck       # TypeScript type checking
```

### API

```bash
cd api
npm run dev             # Start with hot reload
npm run build           # Build for production
npm start               # Start production server
npm test                # Run unit + integration tests
npm run db:migrate      # Run pending migrations
npm run db:seed         # Seed question bank
npm run db:reset        # Reset database (destructive)
```

## Key Screens (Mobile)

| Screen | Route | Description |
|--------|-------|-------------|
| Home | `/` | Main menu: Start Exam, Practice, Analytics |
| Exam | `/exam` | 65-question timed exam simulation |
| Practice Setup | `/practice/setup` | Select domain/difficulty filters |
| Practice | `/practice` | Practice questions with immediate feedback |
| Results | `/results/:examId` | Post-exam score and domain breakdown |
| Review | `/review/:examId` | Detailed answer review with explanations |
| Analytics | `/analytics` | Performance trends and weak areas |
| Settings | `/settings` | App preferences, sync controls |

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | None | Health check |
| GET | `/api/questions/sync` | None | Incremental question sync |
| GET | `/api/questions/sync/full` | None | Full question sync |
| GET | `/api/admin/questions` | API Key | List questions (paginated) |
| POST | `/api/admin/questions` | API Key | Create question |
| GET | `/api/admin/questions/:id` | API Key | Get question details |
| PUT | `/api/admin/questions/:id` | API Key | Update question |
| DELETE | `/api/admin/questions/:id` | API Key | Archive question |
| POST | `/api/admin/questions/:id/approve` | API Key | Approve question |
| POST | `/api/admin/questions/bulk-approve` | API Key | Bulk approve |
| GET | `/api/admin/stats` | API Key | Question bank stats |

## Testing Strategy

1. **Unit tests** (Jest): Scoring algorithm, question selection, domain weighting, timer logic
2. **Component tests** (React Native Testing Library): QuestionCard, Timer, ProgressBar
3. **Integration tests** (Supertest): API endpoints, sync flow
4. **E2E tests** (Detox): Full exam flow, practice flow, offline behavior

## Building for Play Store

```bash
cd mobile

# Build Android APK/AAB
npx expo build:android

# Or with EAS Build
npx eas build --platform android --profile production
```

## Environment Variables

### API (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ADMIN_API_KEY` | Yes | Admin authentication key |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (default: development) |

### Mobile (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `API_URL` | Yes | Backend API base URL |
