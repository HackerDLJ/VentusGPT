# VentusGPT v2

### Conversational Weather Intelligence for SIH26068

VentusGPT is a voice-friendly, multilingual weather intelligence platform designed to turn live meteorological data into clear, actionable answers for citizens, farmers, researchers and disaster-management users.

## What changed in v2

- Live location-aware forecast data through a numerical weather model provider
- 7-day forecast with rain probability, wind, humidity, pressure and UV context
- Conversational AI that receives live weather context before answering
- Contextual follow-up questions and recent conversation history
- Climate Explorer with historical rainfall and temperature trends
- Agriculture advisory engine for weather-sensitive farm activities
- Model-derived hazard signals with explicit non-official warning labelling
- Source and freshness indicators for weather answers
- Browser voice input and read-aloud responses
- Responsive dashboard redesigned for desktop and mobile
- Provider adapter architecture prepared for official IMD products

## SIH26068 alignment

The application is structured around the problem statement requirements: real-time weather retrieval, conversational natural-language access, numerical forecast data, extreme-weather intelligence, location-specific guidance, agriculture/disaster advisories, multilingual voice interaction, and historical climate analysis.

## Data integrity

VentusGPT v2 does **not** fabricate weather values. Forecast answers are generated from fetched meteorological data. Model-derived hazard signals are clearly labelled and must not be presented as official warnings. Severe-weather users are directed to verify official IMD/NDMA bulletins.

## Run locally

**Prerequisites:** Node.js 20+

1. Install dependencies:
   `npm install`
2. Set `GEMINI_API_KEY` in `.env.local` for conversational AI.
3. Run:
   `npm run dev`
4. Open `http://localhost:3000`

## Version

**2.0.0 — VentusGPT Weather Intelligence rebuild**

Created by Team JATABELS.
