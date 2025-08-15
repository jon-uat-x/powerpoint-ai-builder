# AI-Powered Pitchbook Generation Web App - Proof of Concept

A single-user web application for configuring AI-generated pitchbook content using a dark-themed admin dashboard. The app allows users to define slide structures, assign AI prompts to placeholders, and prepare data for PowerPoint generation via python-pptx.

## 1. Application Architecture

### Front-end (React.js with Vite)
- Build using Vite for fast development and modern tooling
- Convert material-dashboard-dark-edition-v2.1.0 HTML/jQuery components to React
- Use React Context API for state management (sufficient for PoC complexity)
- Axios for REST API communication with Node.js backend

### Back-end (Node.js with Express)
- Parse OpenXML template files to extract slide layouts and placeholder information
- Serve REST API endpoints for:
  - Retrieving parsed slide layouts with placeholder positions
  - Storing/retrieving prompt configurations (JSON file storage)
  - Stubbed Google Gemini 2.5 Flash API integration
- Generate slide thumbnails from OpenXML specifications
- Serve static React application

### Data Flow
1. User configures pitchbook structure → saved as JSON
2. User assigns prompts to placeholders → stored in configuration
3. Configuration passed to AI (stubbed) → returns generated text
4. Generated content + template → python-pptx for final PowerPoint (external process)

## 2. Core Workflow

### Step 1: Pitchbook Configuration
- User launches "Create Pitchbook" wizard from dashboard
- Specifies:
  - Pitchbook title
  - Number of sections
  - For each section: title and number of slides
- System automatically includes: Title, Contents, Legal Notice slides

### Step 2: Prompt Assignment
- Dashboard displays thumbnail grid of configured slides
- Thumbnails dynamically generated from OpenXML layouts
- Placeholders highlighted and interactive
- User clicks placeholder → modal/inline editor opens
- User enters prompt (e.g., "Create a 50 word company profile of XXXX plc")
- Prompt saved and associated with specific placeholder

### Step 3: Content Generation (Stubbed)
- "Generate Content" button triggers AI processing
- Stubbed endpoint returns mock responses matching Gemini 2.5 Flash format
- Status card shows processing progress

## 3. Technical Implementation Details

### OpenXML Processing
```javascript
// Node.js backend extracts from slideLayouts:
{
  layoutName: "Title Slide",
  placeholders: [
    { id: "title", type: "text", x: 100, y: 200, width: 800, height: 100 },
    { id: "subtitle", type: "text", x: 100, y: 350, width: 800, height: 80 }
  ]
}
```

### Prompt Storage Structure
```json
{
  "pitchbookId": "uuid",
  "title": "Q4 Investment Review",
  "created": "2025-01-15T10:00:00Z",
  "slides": [
    {
      "slideNumber": 1,
      "layoutName": "Title Slide",
      "prompts": {
        "title": "Generate a compelling title for Q4 investment review",
        "subtitle": "Create a subtitle with today's date and company name"
      }
    }
  ]
}
```

### Stubbed AI Response (Gemini 2.5 Flash format)
```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "text": "Generated content here..."
      }]
    }
  }]
}
```

## 4. UI Components (React)

### Dashboard Layout
- Convert material-dashboard sidebar navigation to React component
- Main content area for wizard and thumbnail grid
- Status card for feedback/errors

### Thumbnail Component
- SVG or Canvas rendering from OpenXML data
- Hover effects on placeholders
- Click handlers for prompt editing

### Prompt Editor
- Modal or inline textarea
- Character count indicator
- Save/Cancel actions
- Auto-save on blur

### Wizard Component
- Multi-step form with validation
- Dynamic section addition
- Progress indicator

## 5. API Endpoints

```
GET  /api/layouts              → List available slide layouts
GET  /api/layouts/:name        → Get specific layout with placeholders
POST /api/pitchbooks           → Create new pitchbook configuration
GET  /api/pitchbooks/:id       → Retrieve pitchbook configuration
PUT  /api/pitchbooks/:id       → Update prompts for pitchbook
POST /api/generate/:id         → Trigger AI generation (stubbed)
GET  /api/thumbnails/:layout   → Get thumbnail for layout
```

## 6. Development Priorities

1. **Phase 1**: React app setup, dashboard conversion, basic routing
2. **Phase 2**: OpenXML parsing, thumbnail generation from XML specs
3. **Phase 3**: Wizard implementation, prompt storage
4. **Phase 4**: Prompt editing UI, state management
5. **Phase 5**: Stubbed AI integration with Gemini format
6. **Phase 6**: Error handling, status feedback

## 7. Key Technical Decisions

- **No authentication** (single-user PoC)
- **File-based storage** (JSON files for simplicity)
- **No real-time collaboration** (single user)
- **No export functionality** (handled externally by python-pptx)
- **Browser support**: Chrome and Edge only
- **Local deployment** for PoC

## 8. Project Structure

```
powerpoint-ai-builder/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # React Context for state
│   │   ├── services/         # API communication
│   │   └── styles/           # Converted dark theme styles
│   └── package.json
├── server/                    # Node.js backend
│   ├── src/
│   │   ├── routes/           # API endpoints
│   │   ├── services/         # Business logic
│   │   ├── parsers/          # OpenXML parsing
│   │   └── data/             # JSON file storage
│   └── package.json
├── OpenXMLTemplate/          # Existing PowerPoint templates
└── material-dashboard-dark/  # Reference UI template
```

## 9. Implementation Notes

- Focus on creating a functional prompt configuration interface
- PowerPoint generation handled externally by python-pptx
- Stub AI responses should match Google Gemini 2.5 Flash API format
- Prioritize user experience for prompt editing workflow
- Maintain visual consistency with dark dashboard theme throughout

This specification serves as the foundation for building the proof of concept. The emphasis is on demonstrating the workflow and user interface for configuring AI prompts, with actual AI integration and PowerPoint generation to be implemented in future phases.