# Firebase Security Rules for JOGA

This document describes the recommended Firestore security rules for the JOGA sports matchmaking application.

## Overview

The application uses role-based access control with three user roles:
- `user` - Regular users who can search players, join matches, send friend requests, and book arenas
- `organizer` - Users who can create and manage arenas, view bookings for their arenas
- `admin` - Full access to all resources (for future admin panel)

## Firestore Rules

Create or update your `firestore.rules` file with the following content:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    function isOrganizer() {
      return isAuthenticated() && getUserRole() == 'organizer';
    }
    
    function isAdmin() {
      return isAuthenticated() && getUserRole() == 'admin';
    }
    
    // Fields other players' clients may touch when a match completes
    // (stats write-back) — everything else on a user doc stays owner-only.
    function onlyStatsFields() {
      return request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['gamesPlayed', 'wins', 'losses', 'draws', 'mvps',
                  'points', 'level', 'updatedAt']);
    }
    
    // Fields any participant may touch on a match (join/leave/complete)
    function onlyRosterOrResultFields() {
      return request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['participants', 'participantNames', 'playersNeeded',
                  'status', 'hasHappened', 'result', 'teams',
                  'statsApplied', 'updatedAt']);
    }
    
    // Users collection
    match /users/{userId} {
      // Anyone authenticated can read user profiles
      allow read: if isAuthenticated();
      
      // Users can update their own profile; other authenticated users may
      // only update stat counters (match-completion write-back).
      // NOTE: for tamper-proof stats move this write-back into a Cloud
      // Function and drop the onlyStatsFields() branch.
      allow update: if isOwner(userId) ||
        (isAuthenticated() && onlyStatsFields());
      
      // Users can create their own profile on signup
      allow create: if isOwner(userId);
      
      // Only admins can delete users
      allow delete: if isAdmin();
    }
    
    // Matches collection
    match /matches/{matchId} {
      // Anyone authenticated can read matches
      allow read: if isAuthenticated();
      
      // Anyone authenticated can create a match
      allow create: if isAuthenticated();
      
      // Organizer/admin can update anything; other authenticated users may
      // only touch roster and result fields (transactional join/leave and
      // match completion from the app).
      allow update: if isAuthenticated() && 
        (resource.data.organizerId == request.auth.uid || isAdmin() ||
         onlyRosterOrResultFields());
      
      allow delete: if isAuthenticated() && 
        (resource.data.organizerId == request.auth.uid || isAdmin());
    }
    
    // Friend Requests collection
    match /friendRequests/{requestId} {
      // Users can read their own friend requests (sent or received)
      allow read: if isAuthenticated() && 
        (resource.data.senderId == request.auth.uid || 
         resource.data.receiverId == request.auth.uid);
      
      // List query - users can query their own requests
      allow list: if isAuthenticated();
      
      // Anyone authenticated can create a friend request
      allow create: if isAuthenticated() && 
        request.resource.data.senderId == request.auth.uid;
      
      // Sender can delete, receiver can update (accept/reject)
      allow update: if isAuthenticated() && 
        (resource.data.senderId == request.auth.uid || 
         resource.data.receiverId == request.auth.uid);
      
      allow delete: if isAuthenticated() && 
        (resource.data.senderId == request.auth.uid || 
         resource.data.receiverId == request.auth.uid);
    }
    
    // Arenas collection (managed by organizers)
    match /arenas/{arenaId} {
      // Anyone can read active arenas
      allow read: if isAuthenticated();
      
      // Only organizers can create arenas
      allow create: if isOrganizer() && 
        request.resource.data.organizerId == request.auth.uid;
      
      // Only the arena owner or admin can update/delete
      allow update: if isAuthenticated() && 
        (resource.data.organizerId == request.auth.uid || isAdmin());
      
      allow delete: if isAuthenticated() && 
        (resource.data.organizerId == request.auth.uid || isAdmin());
    }
    
    // Arena Bookings collection
    match /arenaBookings/{bookingId} {
      // Users can read their own bookings, organizers can read bookings for their arenas
      allow read: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || 
         resource.data.organizerId == request.auth.uid ||
         isAdmin());
      
      // List query for organizers to see bookings
      allow list: if isAuthenticated();
      
      // Anyone authenticated can create a booking
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
      
      // User can cancel, organizer can confirm/update status
      allow update: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || 
         resource.data.organizerId == request.auth.uid ||
         isAdmin());
      
      // Only admin can delete bookings
      allow delete: if isAdmin();
    }
    
    // Bookings collection (legacy user bookings)
    match /bookings/{bookingId} {
      allow read: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
      
      allow update, delete: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
    }
    
    // Match History collection
    match /matchHistory/{historyId} {
      allow read: if isAuthenticated();
      
      // Entries are written for every registered player when a match is
      // completed, so the creator is not always the entry's owner.
      allow create: if isAuthenticated();
      
      allow update, delete: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
    }
    
    // Local Games collection
    match /localGames/{gameId} {
      allow read: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
      
      allow update, delete: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
    }
    
    // Rankings collection
    match /rankings/{rankingId} {
      // Anyone can read rankings
      allow read: if isAuthenticated();
      
      // Only system/admin can write rankings
      allow write: if isAdmin();
    }
    
    // Venues collection (legacy - for backwards compatibility)
    match /venues/{venueId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

## Deployment

To deploy these rules:

1. Install Firebase CLI if not already installed:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project (if not done):
```bash
firebase init firestore
```

4. Copy the rules above to `firestore.rules`

5. Deploy:
```bash
firebase deploy --only firestore:rules
```

## Testing

Use the Firebase Emulator Suite to test rules before deploying:

```bash
firebase emulators:start --only firestore
```

## Notes

- The `getUserRole()` function requires a read operation, which counts against your Firebase quota
- Consider caching user roles in custom claims for better performance at scale
- Always test rules thoroughly before deploying to production
- Review rules regularly as your application evolves
