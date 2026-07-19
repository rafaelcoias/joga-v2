# JOGA! — Quick Start Guide 🚀

Everything in the app is wired to Firebase. To run it you only need a Firebase project and your credentials in `.env.local`.

## Step 1: Set Up Firebase (~15 minutes)

1. **Create Firebase Project**
   - Go to https://console.firebase.google.com/
   - Click "Add project", name it (e.g. "joga")

2. **Enable Authentication**
   - Authentication → Sign-in method → enable **Email/Password**

3. **Create Firestore Database**
   - Firestore Database → "Create database"
   - Start in **production mode**, choose a location (e.g. `europe-west`)

4. **Enable Storage**
   - Storage → "Get started" → production mode

5. **Get Your Config**
   - Project Settings (gear icon) → "Your apps" → web icon (`</>`)
   - Copy the `firebaseConfig` values into `.env.local` (template: `.env.example`)

## Step 2: Deploy Security Rules (~5 minutes)

Use the rules in **`FIREBASE_SECURITY_RULES.md`** (Firestore → Rules). They match the app's flows: transactional match joins, match-completion stats write-back, friend requests, arenas and bookings.

**Storage Rules** (Storage → Rules):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Step 2b (Optional): Enable Email Automations (~5 minutes)

1. Create a free account at https://resend.com and generate an API key
2. Add to `.env.local`:
   ```env
   RESEND_API_KEY=re_xxxxxxxx
   EMAIL_FROM=JOGA! <onboarding@resend.dev>
   ```
   For production, verify your own domain in Resend and use it in `EMAIL_FROM`.
3. Restart `npm run dev`

You'll then get automatic emails for: welcome on registration, booking created (user + arena owner, with price), booking confirmed/cancelled, player joined your game, match result + MVP, and friend requests/acceptances. **Without the key everything still works — emails are simply skipped** (a note appears in the server console).

## Step 3: Run and Test (~5 minutes)

```bash
npm install
npm run dev
```

1. Go to http://localhost:3000 and register an account
2. Check Firebase Console → Authentication and Firestore → `users` — your user is there
3. In `/app`: update your profile, upload a photo, create a game in MatchMaking
4. Open the **Descobrir** view and swipe through open games
5. As the organizer, open a game, mark it as concluded, assign teams and elect an MVP — the players' stats update automatically

## Step 4: Optional Sample Data

**Venue** (Firestore → `venues`):
```json
{
  "name": "Campo do Jamor",
  "address": "Av. Pierre de Coubertin",
  "city": "Lisboa",
  "location": "Lisboa",
  "sports": ["Futebol"],
  "rating": 4.5,
  "pricePerHour": "25",
  "openingHours": "08:00 - 22:00",
  "facilities": ["Balneários", "Estacionamento"],
  "amenities": ["Bar"],
  "phone": "+351 214 198 500"
}
```

Matches are best created from within the app (the create dialog writes the full, correctly-aligned roster model).

## Common Issues

| Symptom | Fix |
|---|---|
| `auth/invalid-api-key` | `.env.local` missing or wrong — copy from `.env.example` and restart `npm run dev` |
| Photos not uploading | Check Storage rules and file size < 5MB |
| Data not saving | Deploy the Firestore rules from `FIREBASE_SECURITY_RULES.md`; check the browser console |
| Joins failing with permission errors | You are running old Firestore rules — redeploy the current ones |

## Files You Should Know

| File | What It Does |
|------|-------------|
| `.env.local` | Firebase credentials |
| `lib/firebase/server.ts` | Generic Firestore/Storage helpers (undefined-safe writes) |
| `lib/firebase/matchService.ts` | Transactional joins + match completion with stats/MVP |
| `lib/contexts/AuthContext.tsx` | Authentication + session |
| `lib/types/index.ts` | TypeScript models for all data |
| `hooks/useFirestore.ts` | Data hooks (realtime collections, queries, CRUD) |
