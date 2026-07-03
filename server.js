const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const systemPrompt = "You are Gamma, a highly intelligent AI assistant. You MUST structure answers using Markdown. Use ### for headers, bullet points, and bold text. CRITICAL: If asked for a diagram or flowchart, output valid Mermaid.js syntax inside a ```mermaid code block.";

// UPGRADED TO YOUR REQUESTED MODEL
const coreModel = genAI.getGenerativeModel({ 
    model: "gemini-3.1-flash-tts", 
    systemInstruction: systemPrompt 
});

app.post('/chat', async (req, res) => {
    try {
        const { message, useVoice, imageData } = req.body;

        if (!message && !imageData) {
            return res.status(400).json({ reply: 'Please provide a message or an image.' });
        }

        const promptParts = [];

        if (imageData && imageData.base64 && imageData.mimeType) {
            promptParts.push({ inlineData: { data: imageData.base64, mimeType: imageData.mimeType } });
        }
        promptParts.push({ text: message || "Analyze the uploaded content." });

        let aiReply = "";
        let audioBase64 = null;

        if (useVoice) {
            const audioRequest = {
                contents: [{ role: 'user', parts: promptParts }],
                generationConfig: {
                    responseModalities: ["TEXT", "AUDIO"],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } }
                }
            };
            const result = await coreModel.generateContent(audioRequest);
            aiReply = result.response.text();

            const parts = result.response.candidates[0].content.parts;
            const audioPart = parts.find(p => p.inlineData && p.inlineData.mimeType.startsWith('audio/'));
            if (audioPart) audioBase64 = audioPart.inlineData.data;
        } else {
            const result = await coreModel.generateContent(promptParts);
            aiReply = result.response.text();
        }

        res.json({ reply: aiReply, audio: audioBase64 });

    } catch (error) {
        console.error('Backend Processing Error:', error);
        res.status(500).json({ reply: 'Transmission error.', error: error.message });
    }
});

app.listen(port, () => console.log(`Gamma Backend Service live on port ${port}`));