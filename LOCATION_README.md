# SCIP Interactive Geolocation & Live Mapping System

This document outlines the detailed features, user flows, and technical integration of the interactive mapping and browser-based GPS services built for the Smart Community Intelligence Platform (SCIP) across both the Citizen Portal and Admin Authority Console.

---

## 🛠️ Tech Stack & Key Modules
*   **Engine:** `react-leaflet` (Leaflet.js) open-source maps.
*   **Styling:** Customized Leaflet assets and CSS layers integration.
*   **API:** Browser `navigator.geolocation` API with high accuracy enabled.
*   **Database:** MongoDB via Mongoose storage schema.

---

## 📱 citizen Portal: Features & User Flows

### 1. Unified Community Map
*   **Location:** Integrated at the bottom of the **Citizen Dashboard**.
*   **Behavior:** Displays high-density pins outlining all reported issues (garbage, leaks, road repair, electricity) in the Kakori/Lucknow area.
*   **Interaction:** Hovering and clicking on a pin triggers popup labels displaying details (e.g. status tags, categories, Title).

### 2. Location-Based Issue Submission
*   **Location:** Citizen **Report Issue** form (`/citizen/submit`).
*   **Detect GPS Location:** Clicking **Detect My GPS Coordinates** queries the browser's high-accuracy geolocation API to retrieve the user's active device coordinates (failsafe falls back to central Kakori area if rejected).
*   **Interactive Draggable Picker:** Renders a Leaflet interactive selector map with a draggable pin. Users can drag the indicator or click anywhere on the Lucknow-Kakori map to automatically updates coords inputs.
*   **Database Sync:** Stores target coordinates in MongoDB alongside title/description forms.

### 3. Dynamic Case Timeline & Detail Map
*   **Location:** Citizen **My Complaints** status view (`/citizen/complaint/:id`).
*   **Features:**
    *   Loads dynamic logs matching database complaint records.
    *   Includes a sidebar cards detailing the exact Lucknow/Kakori address tag.
    *   Embeds a responsive map tracking the precise location of the issue.

---

## 👔 Admin Panel (Authority Terminal): Features & User Flows

### 1. Complaints Hub Interactive Map
*   **Location:** Admin **Complaints List** page (`/admin/complaints`).
*   **Features:**
    *   Renders a central dynamic **Complaint Map** right above the database results.
    *   The map automatically syncs with the admin's toolbar search filter (e.g. searching "water" or choosing status "Pending" immediately filters the map pins).
    *   Clicking pins displays standard category overlays.

### 2. Dashboard Recent Complaints Geolocation
*   **Location:** Admin **Overview Dashboard** (`/admin`).
*   **Features:**
    *   The recent complaints table's **Area** column renders both string location records and exact coordinates `(latitude, longitude)`.

### 3. Complaint Detail Location Pins
*   **Location:** Admin complaints table list card.
*   **Features:**
    *   Every complaint stamp card inherits a location tag with a gray **MapPin icon** (`MapPin` from Lucide) and displays precise coordinates formatted inline: `Kakori (26.8687, 80.8146)`.

---

## 💾 MongoDB Schema Design (`models/Complaint.ts`)
The server persists geolocation records into MongoDB using this Mongoose format:
```typescript
const ComplaintSchema = new Schema<IComplaint>({
  id: { type: String }, // Custom string identifier from frontend/json seeds
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  location: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending' },
  lat: { type: Number },
  lng: { type: Number },
  createdAt: { type: Schema.Types.Mixed, default: Date.now }
});
```

---

## 📂 Verification Checkpoints (Artifacts)
Check verification logs and walkthrough sequences inside:
*   [walkthrough.md](file:///C:/Users/HP/.gemini/antigravity/brain/e07ea273-2f78-4d4b-817b-5e64cfbb007c/walkthrough.md) (carousel includes all admin and citizen maps screenshot slides).
