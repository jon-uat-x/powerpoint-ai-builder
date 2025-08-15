# AI-Powered Pitchbook Generation Web App

A proof-of-concept web application for creating AI-generated pitchbook content using a dark-themed admin dashboard. The app allows users to define slide structures, assign AI prompts to placeholders, and prepare data for PowerPoint generation.

## Features

- 🎨 Dark-themed Material Design UI
- 📊 Create and manage pitchbooks with custom sections
- 🎯 Interactive slide thumbnails with placeholder editing
- 🤖 AI prompt assignment for content generation (stubbed)
- 💾 Auto-save and draft management
- 📱 Responsive design for all devices

## Tech Stack

- **Frontend**: React.js with Vite, Material-UI, React Router
- **Backend**: Node.js with Express
- **Storage**: JSON file-based storage
- **UI Template**: Material Dashboard Dark Edition

## Project Structure

```
powerpoint-ai-builder/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # React Context for state
│   │   ├── pages/           # Page components
│   │   ├── services/         # API communication
│   │   └── styles/          # CSS styles
│   └── package.json
├── server/                   # Node.js backend
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── parsers/         # OpenXML parsing
│   │   └── data/            # JSON file storage
│   └── package.json
└── OpenXMLTemplate/         # PowerPoint templates
```

## Prerequisites

- Node.js (v22.11.0 or later)
- npm (v10.9.0 or later)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd powerpoint-ai-builder
```

2. Install backend dependencies:
```bash
cd server
npm install
```

3. Install frontend dependencies:
```bash
cd ../client
npm install
```

## Running the Application

1. Start the backend server:
```bash
cd server
npm start
```
The server will run on http://localhost:5000

2. In a new terminal, start the frontend:
```bash
cd client
npm run dev
```
The app will open at http://localhost:5173

## Usage

### Creating a Pitchbook

1. Click "Create New Pitchbook" from the dashboard
2. Enter the pitchbook title and type
3. Add sections with titles and number of slides
4. Review the structure and create

### Adding Prompts

1. Open a pitchbook from the list
2. Click on any placeholder in the slide thumbnails
3. Enter your AI prompt (e.g., "Write 50 words about...")
4. Prompts are auto-saved as you type

### Generating Content

1. After adding prompts, click "Generate Content"
2. The system will use the stubbed AI to generate responses
3. Generated content follows Google Gemini 2.5 Flash format

## API Endpoints

### Layouts
- `GET /api/layouts` - List all slide layouts
- `GET /api/layouts/:name` - Get specific layout details

### Pitchbooks
- `GET /api/pitchbooks` - List all pitchbooks
- `POST /api/pitchbooks` - Create new pitchbook
- `GET /api/pitchbooks/:id` - Get pitchbook details
- `PUT /api/pitchbooks/:id` - Update pitchbook

### Thumbnails
- `GET /api/thumbnails/:layout` - Get layout thumbnail

### Generation
- `POST /api/generate/:id` - Generate AI content (stubbed)

## Development

### Backend Development
The backend uses Express.js with the following key services:
- **OpenXML Parser**: Extracts slide layouts from PowerPoint templates
- **Thumbnail Generator**: Creates SVG thumbnails from layouts
- **Storage Service**: Manages JSON file storage

### Frontend Development
The React frontend uses:
- **React Context**: Global state management
- **React Router**: Client-side routing
- **Material-UI**: Modal components
- **Custom CSS**: Dark theme styling

## Configuration

### Environment Variables
Create `.env` files in both server and client directories:

Server `.env`:
```
PORT=5000
```

Client `.env`:
```
VITE_API_URL=http://localhost:5000
```

## Known Limitations

- AI generation is currently stubbed with mock responses
- PowerPoint export functionality not yet implemented
- Single-user proof of concept (no authentication)
- File-based storage (not suitable for production)

## Future Enhancements

- Integration with Google Gemini 2.5 Flash API
- PowerPoint export via python-pptx
- User authentication and multi-tenancy
- Database storage (PostgreSQL/MongoDB)
- Real-time collaboration features
- Cloud deployment

## License

MIT

## Support

For issues or questions, please open an issue in the project repository.