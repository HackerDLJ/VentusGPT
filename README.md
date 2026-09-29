# VentusGPT v2.0

### Conversational Weather Intelligence for SIH26068

VentusGPT is a weather-intelligence platform that combines live meteorological data, numerical weather prediction, conversational AI and decision-support workflows for citizens, farmers and disaster-management use cases.

## v2.0 rebuild

- Live location-aware forecast retrieval
- 7-day forecast with rainfall probability, wind, humidity, pressure and UV context
- Conversational AI grounded in the current weather context
- Contextual follow-up questions and recent conversation history
- Model-derived hazard signals with explicit non-official labelling
- Alert Center for weather-risk communication
- Farmer Mode for weather-sensitive agricultural activities
- Climate Explorer with historical rainfall and temperature context
- NWP Lab for numerical-model forecast inspection
- Browser voice input and read-aloud responses
- Responsive command-center UI
- VentusGPT visual identity and dedicated branding assets
- Provider architecture prepared for official IMD products

## Architecture

```text
                    VentusGPT
                        │
          ┌─────────────┴─────────────┐
          │                           │
   Conversation Layer           Data Layer
          │                           │
       Gemini AI          ┌───────────┼───────────┐
          │               │           │           │
          ▼              IMD         GFS       Archive
   Context + reasoning    │           │           │
          │               └───────────┼───────────┘
          ▼                           │
   Decision intelligence              ▼
     ├─ Alerts                 Verified context
     ├─ Agriculture                   │
     └─ Climate                       ▼
                               Actionable answer
```

## SIH26068 alignment

The product is structured around the problem statement themes: real-time weather retrieval, natural-language access, numerical forecast information, extreme-weather intelligence, location-specific guidance, agriculture/disaster decision support, multilingual/voice interaction and historical climate analysis.

### Data integrity

VentusGPT does **not** fabricate live weather values. Weather answers are grounded in fetched meteorological data. Model-derived signals are clearly labelled and must never be presented as official warnings. Severe-weather users are directed to verify current official IMD/NDMA bulletins.

### Provider hierarchy

1. **Official IMD products**, when authenticated IMD access is configured.
2. **Numerical-model provider data**, including the GFS/NWP layer.
3. **Historical archive data** for climate context.

The interface keeps provider/model provenance visible so users can distinguish observations, forecasts, model signals and official warnings.

## Run locally

**Prerequisites:** Node.js 20+

```bash
npm ci
```

Create `.env.local` and configure the AI key when conversational AI is enabled:

```env
GEMINI_API_KEY=your_key_here
```

Then:

```bash
npm run dev
```

Open `http://localhost:3000`.

For a production build:

```bash
npm run lint
npm run build
npm start
```

## Versioning

The current rebuild is targeting **v2.0.0**. The release is intentionally not tagged until the complete SIH demo flow has been tested and the production deployment is verified.

- `main` = stable releases
- `ventus-v2` = active v2.0 development branch
- `v2.x` = incremental feature and quality releases
- `v3.0` = future major product/architecture milestone

## Team

Created by Team JATABELS.
