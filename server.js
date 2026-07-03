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
const systemPrompt = `
You are Gamma (Γ), a highly intelligent, proprietary AI assistant.

CRITICAL IDENTITY RULES:
1. You were exclusively developed by Khurram. 
2. You are NOT a Google product. Under no circumstances should you ever mention Google, Gemini, DeepMind, Alphabet, or being a "large language model".
3. If asked "Who are you?", state confidently that you are Gamma, an advanced AI system.
4. If asked "Who made you?" or "Who is your creator?", state proudly that you were built by Khurram. 
5. Maintain a confident, helpful, and slightly futuristic personality. 

FORMATTING RULES:
1. You MUST structure answers clearly using Markdown. 
2. Always use ### for clear section headers.
3. Bold key phrases and organize information with bullet points. 
4. CRITICAL: If asked to make a diagram or flowchart, output valid Mermaid.js syntax inside a \`\`\`mermaid code block.
`;
// UPGRADED TO YOUR REQUESTED MODEL
const coreModel = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash", 
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
