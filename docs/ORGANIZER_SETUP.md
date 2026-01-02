# Organizer Setup Guide

This guide explains how to set up an organizer account and create test arenas in the JOGA platform.

## 1. Creating an Organizer Account

### Step 1: Register a User Account
1. Go to the JOGA app and click "Registar" (Register)
2. Fill in the registration form with your details
3. Complete the registration process

### Step 2: Upgrade to Organizer Role
1. Open Firebase Console (https://console.firebase.google.com)
2. Select your JOGA project
3. Navigate to **Firestore Database** > **users** collection
4. Find your user document (search by email or display name)
5. Click on the document to edit it
6. Add or modify the `role` field:
   - **Field name:** `role`
   - **Type:** string
   - **Value:** `organizer`
7. Click "Update" to save

### Step 3: Verify Access
1. Log out and log back into the JOGA app
2. You should now see "Gerir Arenas" in the sidebar menu
3. Click on it to access the Arena Management screen

---

## 2. Creating a Test Arena

### Option A: Using the App (Recommended)
1. Log in with your organizer account
2. Click "Gerir Arenas" in the sidebar
3. Click "Criar Arena" button
4. Fill in the arena details:
   - **Nome:** Arena JOGA Test
   - **Descrição:** Arena de teste para desenvolvimento
   - **Morada:** Rua do Desporto, 123
   - **Cidade:** Lisboa
   - **Desportos:** Select Futebol, Futsal, Basquetebol
   - **Preço por Hora:** 50
   - **Horário:** 08:00 - 23:00
   - **Facilidades:** Select desired options
5. Click "Criar Arena"

### Option B: Directly in Firebase Console
1. Go to Firebase Console > Firestore Database
2. Create or navigate to the **arenas** collection
3. Click "Add document" (auto-generate ID)
4. Add the following fields:

| Field | Type | Value |
|-------|------|-------|
| name | string | Arena JOGA Test |
| description | string | Arena de teste para desenvolvimento |
| address | string | Rua do Desporto, 123 |
| city | string | Lisboa |
| location | string | Lisboa |
| organizerId | string | `<your-user-id>` |
| organizerName | string | `<your-display-name>` |
| sports | array | ["Futebol", "Futsal", "Basquetebol"] |
| pricePerHour | number | 50 |
| openingHours | string | 08:00 |
| closingHours | string | 23:00 |
| facilities | array | ["Balneários", "Estacionamento"] |
| amenities | array | ["Cacifos", "Duches"] |
| images | array | [] |
| phone | string | +351 912 345 678 |
| email | string | teste@joga.pt |
| rating | number | 4.5 |
| totalReviews | number | 0 |
| isActive | boolean | true |
| createdAt | timestamp | (current time) |

---

## 3. Testing the Booking Flow

### As a Regular User:
1. Log in with a regular user account (not organizer)
2. Go to "Arenas" in the sidebar
3. Find your test arena and click "Reservar"
4. Select date, time, sport, and players
5. Click "Confirmar Reserva"
6. The booking is now pending

### As an Organizer:
1. Log in with your organizer account
2. Go to "Gerir Arenas"
3. Click on your arena card
4. Navigate to the "Reservas" tab
5. You should see all pending bookings
6. Click "Confirmar" or "Cancelar" to manage bookings

---

## 4. Organizer Capabilities

Once you have the organizer role, you can:

- **Create new arenas** via the "Gerir Arenas" screen
- **Edit arena details** (name, price, hours, facilities)
- **View all bookings** for your arenas
- **Confirm or cancel bookings**
- **Deactivate arenas** temporarily
- **Delete arenas** permanently

---

## 5. Data Structure Reference

### User with Organizer Role
```json
{
  "id": "abc123",
  "email": "organizer@example.com",
  "displayName": "Test Organizer",
  "role": "organizer",
  "level": 1,
  "wins": 0,
  "losses": 0,
  "draws": 0,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Arena Document
```json
{
  "id": "arena123",
  "name": "Arena JOGA Test",
  "description": "Arena de teste",
  "address": "Rua do Desporto, 123",
  "city": "Lisboa",
  "location": "Lisboa",
  "organizerId": "abc123",
  "organizerName": "Test Organizer",
  "sports": ["Futebol", "Futsal"],
  "pricePerHour": 50,
  "openingHours": "08:00",
  "closingHours": "23:00",
  "facilities": ["Balneários", "Estacionamento"],
  "isActive": true,
  "rating": 4.5,
  "totalReviews": 0,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Arena Booking Document
```json
{
  "id": "booking123",
  "arenaId": "arena123",
  "arenaName": "Arena JOGA Test",
  "organizerId": "abc123",
  "userId": "user456",
  "userName": "João Silva",
  "date": "2024-01-15",
  "time": "18:00",
  "endTime": "19:00",
  "duration": 60,
  "sport": "Futebol",
  "players": 10,
  "status": "pending",
  "totalPrice": 50,
  "paymentStatus": "pending",
  "createdAt": "2024-01-10T00:00:00Z"
}
```

---

## 6. Troubleshooting

### "Gerir Arenas" not appearing in menu
- Verify the user has `role: "organizer"` in Firestore
- Log out and log back in
- Clear browser cache if needed

### Bookings not appearing
- Check that `organizerId` matches your user ID
- Verify the booking has the correct `arenaId`
- Check Firestore rules allow read access

### Can't create arena
- Verify you're logged in as organizer
- Check all required fields are filled
- Look at browser console for errors
