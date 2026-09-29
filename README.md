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

**v2.0.0 is the current stable release.** The V2 rebuild has been merged into `main` and published as the `v2.0` release.

- `main` = current stable V2 code
- `ventus-v1` = preserved V1.0 code snapshot
- `v1.0` = original V1.0 release/tag
- `v2.0` = current V2.0 release/tag
- `v3.x` = future major product/architecture work

The historical V1.0 code is preserved and can be reproduced with:

```bash
git checkout v1.0
```

## Team

Created by Team JATABELS.