// --- 1. Load all the tools we need ---
const express = require('express');           // The server framework
const { GoogleGenerativeAI } = require('@google/generative-ai'); // The Gemini AI
const dotenv = require('dotenv');             // To read your secret API key
const cors = require('cors');                 // To let your frontend talk to this backend

// --- 2. Setup ---
dotenv.config(); // Load the API key from the environment
const app = express(); // Create the server
const port = process.env.PORT || 3000; // Render will tell us what port to use

// --- 3. Middleware (Tools for the server) ---
app.use(cors());         // Allow cross-origin requests (from your frontend)
app.use(express.json()); // Allow the server to understand JSON (how we send messages)

// --- 4. Initialize Gemini ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    systemInstruction: "You are Gamma, a highly intelligent and engaging AI. You MUST structure your answers clearly using Markdown. Always follow this format: 1) Start with a clear, capitalized Header using ###. 2) Write a short, friendly paragraph explaining the concept. 3) Use line breaks to separate ideas. 4) Always provide real-life examples using bullet points. Highlight keywords in **bold**. Never output a giant block of text."
});

// --- 5. The Chat Endpoint ---
// This is the URL your frontend will 'fetch'
app.post('/chat', async (req, res) => {
    try {
        // Get the user's message from the frontend's request
        const userMessage = req.body.message;

        if (!userMessage) {
            return res.status(400).json({ reply: 'No message provided.' });
        }

        // Send the message to Gemini
        const result = await model.generateContent(userMessage);
        const response = await result.response;
        const aiReply = response.text();

        // Send the AI's reply back to the frontend
        res.json({ reply: aiReply });

    } catch (error) {
        console.error('AI Error:', error);
        res.status(500).json({ reply: 'Error communicating with AI.' });
    }
});

// --- 6. Start the Server ---
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});