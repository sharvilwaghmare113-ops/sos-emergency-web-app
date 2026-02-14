# Emergency SOS Web Application - Specification

## Project Overview
- **Project Name**: Emergency SOS Web Application
- **Type**: Single-page web application
- **Core Functionality**: Emergency SOS system that sends location and emergency contacts SMS alerts via Twilio
- **Target Users**: Anyone needing quick emergency assistance dispatch

## Tech Stack
- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js + Express
- Database: MongoDB (Mongoose)
- SMS API: Twilio

## UI/UX Specification

### Layout Structure
- **Single Page Layout**: All content on one page
- **Sections**:
  1. Header - App title and emergency icon
  2. Emergency Contact Section - Add/view contacts
  3. SOS Section - Large SOS button with status
  4. Location Display - Shows current location/map link
  5. Footer - App info

### Responsive Breakpoints
- Mobile: < 480px (primary target)
- Tablet: 480px - 768px
- Desktop: > 768px

### Visual Design

#### Color Palette
- **Background**: #0a0a0a (near black)
- **Card Background**: #1a1a1a (dark gray)
- **Primary (SOS Red)**: #ff3b3b (bright red)
- **Primary Hover**: #ff5555 (lighter red)
- **Secondary**: #2d2d2d (medium gray)
- **Accent**: #00ff88 (emergency green for success)
- **Text Primary**: #ffffff (white)
- **Text Secondary**: #888888 (gray)
- **Error**: #ff4444 (red)
- **Warning**: #ffaa00 (amber)

#### Typography
- **Font Family**: 'Orbitron' for headers (emergency feel), 'Roboto' for body
- **Header Size**: 2rem
- **Subheader**: 1.2rem
- **Body**: 1rem
- **Small**: 0.875rem

#### Spacing
- Container padding: 20px
- Card padding: 20px
- Element gap: 15px
- Button padding: 15px 30px

### Components

#### Header
- App title "EMERGENCY SOS" with warning icon 🚨
- Subtitle "Quick Emergency Assistance"

#### Contact Section
- Input fields: Name, Phone Number
- Add Contact button (green)
- Contact list with delete option
- Each contact shows name, phone, and delete button

#### SOS Section
- Large circular SOS button (150px diameter)
- SOS text in center
- Pulsing animation on hover
- Slide-to-activate option (bonus)

#### Status Display
- Status indicator with colored dots
- Status messages: "Ready", "Getting Location...", "Sending SOS...", "Success!", "Error"
- Location display with Google Maps link

#### Contact Card
- Dark card background
- Name and phone number
- Delete button (red X)

## Functionality Specification

### Contact Management
1. Add contact with name and phone number
2. Validate phone number format
3. Save contacts to localStorage
4. Sync contacts to MongoDB (avoid duplicates)
5. Display contact list
6. Delete individual contacts

### SOS Functionality
1. User clicks large SOS button
2. Disable button to prevent multiple clicks
3. Get user location via navigator.geolocation
4. Show "Getting Location..." status
5. On location obtained:
   - Display latitude/longitude
   - Show Google Maps link
   - Send POST request to backend
6. On backend success:
   - Show "Success!" status
   - SMS sent to all contacts
7. On error:
   - Show error message
   - Re-enable SOS button

### Backend API Endpoints
- POST /api/contacts - Add/sync contacts
- POST /api/sos - Send SOS (receives location + contacts)
- GET /api/contacts - Get all contacts (optional)

### Data Models

#### SOS Model
```
javascript
{
  lat: Number (required),
  lng: Number (required),
  time: Date (default: now)
}
```

#### Contact Model
```
javascript
{
  name: String (required),
  phone: String (required),
  createdAt: Date (default: now)
}
```

### SMS Content
"🚨 EMERGENCY SOS! Location: https://maps.google.com/?q=LAT,LNG"

## Acceptance Criteria

### Visual Checkpoints
- [ ] Dark theme with red SOS button visible
- [ ] Contact input fields visible
- [ ] Contact list displays correctly
- [ ] SOS button is large and prominent
- [ ] Status messages appear and update

### Functional Checkpoints
- [ ] Can add contacts (saved to localStorage and MongoDB)
- [ ] Contacts persist after page reload
- [ ] Can delete contacts
- [ ] SOS button triggers location request
- [ ] Location displayed on screen
- [ ] Google Maps link works
- [ ] Status messages update correctly
- [ ] Multiple SOS clicks prevented during sending
- [ ] Backend receives and processes SOS
- [ ] SMS sent to contacts (with Twilio credentials)

### Error Handling
- [ ] Handle geolocation permission denied
- [ ] Handle geolocation timeout
- [ ] Handle network errors
- [ ] Handle backend errors
- [ ] Validate contact inputs
