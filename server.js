//server.js
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import errorHandler from './errorHandler.js';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { validateSearchTerm, validatePrompt } from './validators.js';

// Configure dotenv to load variables from the .env file
dotenv.config();

const app = express();
const apiKey = process.env.OPENAI_API_KEY;
const bingApiKey = process.env.BING_API_KEY;

app.use(cors());
app.use(express.json());

// Apply to all requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// Add this before your routes
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Helper function to generate system and user messages
const generateSystemMessage = (context) => ({
  role: 'system',
  content: context,
});

const generateUserMessage = (content) => ({
  role: 'user',
  content,
});

// POST route for mainbox (higher token limit)

// POST route for other predictions (lower token limit)
app.post('/api/predict', validatePrompt, async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid prompt' });
  }

  let messages = [];
  const trimmedPrompt = prompt.trim().toLowerCase();

  // Handle different prompt types
  switch (true) {
    case trimmedPrompt.startsWith('@template'):
      const topic = prompt.trim().substring(15).trim();
      messages = [
        generateSystemMessage("You are an assistant that provides templates for the topic given. Start with Template: and then provide the template."),
        generateUserMessage(`@template ${topic}.`),
      ];
      break;

    case trimmedPrompt.startsWith('@summarize'):
      const textToSummarize = prompt.trim().substring(9).trim();
      messages = [
        generateSystemMessage('You are an assistant that summarizes texts.'),
        generateUserMessage(`Summarize: ${textToSummarize}.`),
      ];
      break;

    // Add other prompt handling cases like "translate", "list", "explain", etc.

    default:
      messages = [
        generateSystemMessage('You are an assistant that completes sentences.'),
        generateUserMessage(prompt),
      ];
      break;
  }

  // Call the OpenAI API for other predictions with a lower token limit
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 30,  // Lower token limit for regular predictions
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const message = response.data.choices[0].message.content.trim();
    res.json({ message });
  } catch (error) {
    console.error('Error with OpenAI API:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error with prediction' });
  }
});


app.post('/api/search', validateSearchTerm, async (req, res) => {
  const { searchTerm } = req.body;

  if (!searchTerm || typeof searchTerm !== 'string') {
    return res.status(400).json({ error: 'Invalid search term' });
  }

  try {
    const response = await axios.get(`https://api.bing.microsoft.com/v7.0/search`, {
      params: { q: searchTerm, count: 20 },
      headers: {
        'Ocp-Apim-Subscription-Key': bingApiKey, // Use Bing API key from env
      },
    });

    const items = response.data.webPages.value.map(item => ({
      title: item.name,
      url: item.url,
      description: item.snippet,
    }));

    res.json({ results: items });
  } catch (error) {
    console.error("Error fetching data from Bing API:", error);
    res.status(500).json({ error: 'Error fetching search results' });
  }
});

// Server port
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Add this after your routes
app.use(errorHandler);

app.use(helmet());
