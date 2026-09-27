
require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

// Middleware
app.use(express.json({ limit: "20kb" }));

app.use(
    express.static(path.join(__dirname, "public"))
);

// Gemini API Configuration
const API_KEY = process.env.GEMINI_API_KEY;

const MODEL = "gemini-3.8-flash";

const GEMINI_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

console.log(
    "Gemini API Key:",
    API_KEY ? "Loaded successfully" : "Missing"
);

// Helper: Send JSON error
function sendError(res, status, message) {
    return res.status(status).json({
        success: false,
        error: message
    });
}

// Helper: Call Gemini with retry for temporary errors
async function callGemini(prompt) {

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {

        let response;

        try {

            response = await fetch(GEMINI_URL, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": API_KEY
                },

                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],

                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 3000
                    }
                }),

                signal: AbortSignal.timeout(60000)
            });

        } catch (error) {

            if (error.name === "TimeoutError" ||
                error.name === "AbortError") {

                throw new Error(
                    "Gemini request timed out. Please try again."
                );
            }

            throw new Error(
                "Could not connect to Gemini. Check your internet connection."
            );
        }

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                "Gemini returned an invalid response."
            );
        }

        // Retry temporary high demand / server errors
        if (
            [429, 500, 502, 503, 504].includes(response.status) &&
            attempt < maxAttempts
        ) {

            const waitTime = attempt * 2000;

            console.log(
                `Gemini temporary error ${response.status}. ` +
                `Retrying in ${waitTime / 1000} seconds...`
            );

            await new Promise(resolve =>
                setTimeout(resolve, waitTime)
            );

            continue;
        }

        // Handle final Gemini errors
        if (!response.ok) {

            console.error(
                "Gemini API error:",
                response.status,
                data.error?.message || "Unknown error"
            );

            if (response.status === 400) {
                throw new Error(
                    "Invalid Gemini request. Check your model and request settings."
                );
            }

            if (response.status === 401 ||
                response.status === 403) {

                throw new Error(
                    "Gemini API key is invalid or does not have permission."
                );
            }

            if (response.status === 404) {
                throw new Error(
                    "Gemini model not found. Check the model name in server.js."
                );
            }

            if (response.status === 429) {
                throw new Error(
                    "Gemini API quota exceeded. Please try again later."
                );
            }

            if (
                response.status === 503 ||
                response.status === 500
            ) {
                throw new Error(
                    "Gemini is currently experiencing high demand. Please try again later."
                );
            }

            throw new Error(
                "Gemini API request failed. Please try again."
            );
        }

        // Extract Gemini generated text
        const plan = data.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();

        if (!plan) {

            console.error(
                "Gemini returned no text:",
                JSON.stringify(data)
            );

            throw new Error(
                "Gemini returned an empty fitness plan."
            );
        }

        return plan;
    }

    throw new Error(
        "Gemini could not generate a plan. Please try again."
    );
}

// Generate Fitness Plan API
app.post("/api/plan", async (req, res) => {

    try {

        const body = req.body || {};

        // Read fields from the updated frontend
        const name = String(body.name || "").trim();

        const age = Number(body.age);

        const goal = String(body.goal || "").trim();

        const level = String(body.level || "").trim();

        const days = Number(body.days);

        const equipment = String(
            body.equipment || ""
        ).trim();

        const notes = String(
            body.notes || ""
        ).trim();

        // Backward compatibility for older frontend
        const ageRange = String(
            body.ageRange || ""
        ).trim();

        // Validate required fields
        if (
            !goal ||
            !level ||
            !days ||
            !equipment ||
            (!ageRange && !Number.isFinite(age))
        ) {

            return sendError(
                res,
                400,
                "Please complete all required fields."
            );
        }

        // Validate age
        if (
            !ageRange &&
            (!Number.isFinite(age) || age < 13 || age > 100)
        ) {

            return sendError(
                res,
                400,
                "Please enter a valid age between 13 and 100."
            );
        }

        // Validate workout days
        if (!Number.isInteger(days) || days < 2 || days > 6) {

            return sendError(
                res,
                400,
                "Workout days must be between 2 and 6."
            );
        }

        // Validate text lengths
        if (
            name.length > 40 ||
            goal.length > 100 ||
            level.length > 50 ||
            equipment.length > 100 ||
            notes.length > 500
        ) {

            return sendError(
                res,
                400,
                "One or more fields exceed the allowed length."
            );
        }

        // Check Gemini API key
        if (!API_KEY) {

            return sendError(
                res,
                500,
                "Gemini API key missing. Check your .env file."
            );
        }

        const userAge = ageRange || `${age} years`;

        // Construct Gemini prompt
        const prompt = `
You are FitBuddy, an AI fitness planning assistant.

Create a personalized, beginner-friendly and practical
general fitness plan based on the following information.

USER DETAILS:
Name: ${name || "User"}
Age: ${userAge}
Fitness Goal: ${goal}
Experience Level: ${level}
Workout Days Per Week: ${days}
Available Equipment: ${equipment}
Additional Preferences: ${notes || "None"}

INSTRUCTIONS:

1. Create a weekly workout schedule for the requested
   number of workout days.

2. Include a warm-up of approximately 5-10 minutes.

3. Give suitable exercises with sets, repetitions,
   or duration.

4. Include rest days and recovery recommendations.

5. Provide general balanced meal ideas. Do not prescribe
   extreme diets, calorie restrictions, or supplements.

6. Adapt exercises to the user's experience and equipment.

7. Explain the exercises in simple, clear English.

8. Do not diagnose medical conditions or promise
   specific fitness results.

9. Include a safety note advising the user to stop
   exercising if they experience pain, dizziness,
   or unusual discomfort.

10. Format the response with clear headings and a
    day-by-day weekly schedule.

11. Keep the plan concise, readable, and easy to follow.

Generate the fitness plan now.
`;

        // Call Gemini
        const plan = await callGemini(prompt);

        // Send result to frontend
        return res.json({
            success: true,
            plan: plan
        });

    } catch (error) {

        console.error(
            "Fitness plan error:",
            error.message
        );

        return sendError(
            res,
            500,
            error.message ||
            "Could not generate a fitness plan."
        );
    }
});

// Health check
app.get("/api/health", (req, res) => {

    res.json({
        success: true,
        message: "FitBuddy server is running.",
        geminiKeyLoaded: Boolean(API_KEY)
    });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(
        `FitBuddy running at http://localhost:${PORT}`
    );
});