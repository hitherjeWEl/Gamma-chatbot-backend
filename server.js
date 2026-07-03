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

// --- 4. Initialize Gemini (TWO MODELS NOW) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemPrompt = "You are Gamma, a highly intelligent AI. Structure answers with Markdown. Use ### for headers, use bullets, and bold keywords. Generate Mermaid diagrams if asked.";

// Brain 1: The Fast Text Model
const textModel = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash", 
    systemInstruction: systemPrompt 
});

// Brain 2: The Audio/Voice Model
const audioModel = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp", 
    systemInstruction: systemPrompt 
});

// --- 5. The Chat Endpoint ---
app.post('/chat', async (req, res) => {
    try {
        // We now expect the frontend to send a 'useVoice' boolean!
        const { message, useVoice } = req.body;

        if (!message) {
            return res.status(400).json({ reply: 'No message provided.' });
        }

        let aiReply = "";
        let audioBase64 = null;

        // ROUTE 1: The user wants audio
        if (useVoice) {
            const request = {
                contents: [{ role: 'user', parts: [{ text: message }] }],
                generationConfig: {
                    responseModalities: ["TEXT", "AUDIO"],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } }
                }
            };
            const result = await audioModel.generateContent(request);
            aiReply = result.response.text();
            
            const parts = result.response.candidates[0].content.parts;
            const audioPart = parts.find(p => p.inlineData && p.inlineData.mimeType.startsWith('audio/'));
            if (audioPart) audioBase64 = audioPart.inlineData.data;
        } 
        // ROUTE 2: Normal, fast text chat
        else {
            const result = await textModel.generateContent(message);
            aiReply = result.response.text();
        }

        // Send the data back
        res.json({ reply: aiReply, audio: audioBase64 });

    } catch (error) {
        console.error('AI Error:', error);
        res.status(500).json({ reply: 'Error communicating with AI.' });
    }
});

// --- 5. The Chat Endpoint ---
app.post('/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;

        if (!userMessage) {
            return res.status(400).json({ reply: 'No message provided.' });
        }

        // We ask Gemini for TEXT and AUDIO, and choose a voice!
        // Voice options: "Puck", "Aoede", "Charon", "Kore", "Fenrir"
        const request = {
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            generationConfig: {
                responseModalities: ["TEXT", "AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: "Aoede" // A clear, natural voice
                        }
                    }
                }
            }
        };

        const result = await model.generateContent(request);
        const response = await result.response;
        
        // Extract the text
        const aiReply = response.text();

        // Extract the audio data (it comes back as a base64 text string)
        let audioBase64 = null;
        const parts = response.candidates[0].content.parts;
        const audioPart = parts.find(part => part.inlineData && part.inlineData.mimeType.startsWith('audio/'));
        
        if (audioPart) {
            audioBase64 = audioPart.inlineData.data;
        }

        // Send BOTH the text and the audio back to your website
        res.json({ 
            reply: aiReply,
            audio: audioBase64 
        });

    } catch (error) {
        console.error('AI Error:', error);
        res.status(500).json({ reply: 'Error communicating with AI.' });
    }
});

// --- 6. Start the Server ---
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});