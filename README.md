# Backend JavaScript Course Auto-Grader

A Next.js application for automatically grading student assignments in the Backend JavaScript course. The grader fetches student code from GitHub, runs it in a secure sandbox, and executes test cases to determine scores.

## Features

- 📚 **Student Management** - Add, edit, and track enrolled students
- 📝 **Assignment Browser** - View all 24 sessions with test specifications
- 🚀 **Automatic Grading** - Fetch code from GitHub and run tests in sandbox
- 📊 **Progress Tracking** - View submission history and class statistics
- ☁️ **Vercel Deployable** - Optimized for serverless deployment

## Prerequisites

1. **Node.js 18+** installed locally
2. **MongoDB Atlas** account (free tier works great)
3. **GitHub Personal Access Token** (for fetching student code)
4. **Vercel** account (optional, for deployment)

## Quick Start

### 1. Clone and Install

```bash
cd auto-grader
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/auto-grader
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

### 3. Create GitHub Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Generate new token with:
   - **Repository access**: Public repositories (read-only)
   - **Permissions**: Contents (read-only)
3. Copy the token to your `.env.local`

### 4. Set up MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user with password
3. Whitelist IP addresses:
   - For development: Your local IP
   - For Vercel: `0.0.0.0/0` (allows all IPs)
4. Get connection string and add to `.env.local`

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

### Option 1: Vercel CLI

```bash
npm i -g vercel
vercel
```

### Option 2: GitHub Integration

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables in Vercel settings
4. Deploy!

### Environment Variables in Vercel

Add these in Project Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `GITHUB_TOKEN` | GitHub personal access token |

## Student Repository Structure

Students must organize their code like this:

```
backend-js-course/
├── week-02/
│   ├── session-03/
│   │   └── functions.js
│   └── session-04/
│       └── conditionals.js
├── week-03/
│   ├── session-05/
│   │   └── loops.js
│   └── session-06/
│       └── arrays.js
└── ...
```

### Function Export Format

All functions must be exported using CommonJS:

```javascript
// functions.js
function add(a, b) {
  return a + b;
}

function multiply(a, b) {
  return a * b;
}

module.exports = { add, multiply };
```

## How Grading Works

1. **Select student and assignment** from the Grade page
2. **System fetches code** from GitHub using the student's username
3. **Code runs in sandbox** (vm2 with 2-second timeout)
4. **Test cases execute** against student functions
5. **Score calculated** as percentage of passed tests
6. **Results stored** in MongoDB for tracking

### Sandbox Security

- Code runs in isolated VM (vm2)
- 2-second execution timeout
- No access to filesystem, network, or process
- No async operations allowed
- Memory limits enforced

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students` | List all students |
| POST | `/api/students` | Add new student |
| GET | `/api/students/[id]` | Get student with stats |
| PATCH | `/api/students/[id]` | Update student |
| DELETE | `/api/students/[id]` | Delete student |
| GET | `/api/assignments` | List all assignments |
| GET | `/api/assignments/[week-session]` | Get assignment details |
| POST | `/api/grade` | Grade a submission |
| GET | `/api/grade` | Get submission history |

## Adding New Assignments

Edit `assignment-specs.json` to add or modify assignments:

```json
{
  "week": 3,
  "session": 5,
  "title": "Loops",
  "file": "loops.js",
  "functions": [
    {
      "name": "sumRange",
      "description": "Sum all numbers from start to end",
      "params": [
        { "name": "start", "type": "number", "description": "Start number" },
        { "name": "end", "type": "number", "description": "End number" }
      ],
      "returns": { "type": "number", "description": "Sum of range" },
      "testCases": [
        { "input": [1, 5], "expected": 15, "description": "Sum 1 to 5" }
      ]
    }
  ]
}
```

## Troubleshooting

### "Failed to fetch student code"

- Check student's GitHub username is correct
- Ensure repository is public
- Verify file path matches expected structure
- Check GitHub API rate limits

### "Sandbox execution error"

- Student code may have syntax errors
- Function may be using async/await (not supported)
- Infinite loop or exceeded timeout

### MongoDB connection issues

- Verify connection string is correct
- Check IP whitelist in Atlas
- Ensure database user credentials are valid

## Tech Stack

- **Next.js 14** - React framework with App Router
- **MongoDB** - Database with Mongoose ODM
- **vm2** - Secure JavaScript sandbox
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

## License

MIT - Feel free to use for your own courses!

---

Built for the Backend JavaScript Course 🚀
