// --- 1. Load all the tools we need ---
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const cors = require('cors');

// --- 2. Setup ---
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

// --- 3. Middleware ---
app.use(cors());
// Increased the JSON limit to 50mb to allow for large image uploads later
app.use(express.json({ limit: '50mb' })); 

// --- 4. Initialize Gemini & Setup 3 Brains ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const systemPrompt = "You are Gamma, a highly intelligent AI. Structure answers with Markdown. Use ### for headers, use bullets, and bold keywords. Generate Mermaid diagrams if asked.";

// Brain 1: Normal Text 
const textModel = genAI.getGenerativeModel({ 
    model: "gemini-3.1-flash-lite", 
    systemInstruction: systemPrompt 
});

// Brain 2: Deep Research & Image Processing 
const researchModel = genAI.getGenerativeModel({ 
    model: "gemma-4-31b", 
    systemInstruction: systemPrompt 
});

// Brain 3: Speech & Live Talking 
const audioModel = genAI.getGenerativeModel({ 
    model: "gemini-3-flash-live", 
    systemInstruction: systemPrompt 
});

// --- 5. The Chat Endpoint (The Router) ---
app.post('/chat', async (req, res) => {
    try {
        // The frontend will pass these flags to tell the server what to do
        const { message, useVoice, useResearch, imageData } = req.body;

        if (!message && !imageData) {
            return res.status(400).json({ reply: 'No message or image provided.' });
        }

        let aiReply = "";
        let audioBase64 = null;

        // ROUTE 1: Speech / Live Talking
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
        
        // ROUTE 2: Deep Research / Image Processing
        else if (useResearch || imageData) {
            const parts = [{ text: message || "Analyze this image." }];
            
            // If the user uploaded an image, attach it to the prompt
            if (imageData) {
                parts.push({
                    inlineData: {
                        data: imageData.base64,
                        mimeType: imageData.mimeType
                    }
                });
            }

            const result = await researchModel.generateContent(parts);
            aiReply = result.response.text();
        } 
        
        // ROUTE 3: Normal Fast Text Output (Default)
        else {
            const result = await textModel.generateContent(message);
            aiReply = result.response.text();
        }

        // Send the final data back to the frontend
        res.json({ reply: aiReply, audio: audioBase64 });

    } catch (error) {
        console.error('AI Error:', error);
        res.status(500).json({ reply: 'Error communicating with AI. Check Render logs.' });
    }
});

// --- 6. Start the Server ---
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});