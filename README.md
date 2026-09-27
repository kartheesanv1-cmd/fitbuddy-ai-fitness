# FitBuddy – AI Fitness Plan Generator using Gemini Models

Beginner-friendly web app that generates a sample workout routine and general healthy-eating suggestions with Google Gemini.

## Tech stack
HTML, CSS, JavaScript, Node.js, Express, Google GenAI SDK.

## Run locally
1. Install Node.js LTS.
2. Open this folder in VS Code and open its terminal.
3. Run `npm install`.
4. Copy `.env.example` to `.env` and add your Google AI Studio API key:
   `GEMINI_API_KEY=your_actual_key_here`
5. Run `npm start`.
6. Open http://localhost:3000.

Get an API key at https://aistudio.google.com/. Never upload `.env` or expose your API key publicly. The `.gitignore` excludes `.env` and `node_modules`.

## Upload to GitHub
Create an empty GitHub repository, then run these commands from this folder (replace URL with your repository URL):
```bash
git init
git add .
git commit -m "Initial FitBuddy project"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```
Check that `.env` is not staged or committed.

## Safety
Educational information only, not medical advice. Stop if exercise causes pain and consult a qualified professional for medical concerns.


Github Link :https://kartheesanv1-cmd.github.io/fitbuddy-ai-fitness/

Run link : node server.js
