# VentusGPT v2 — SIH26068 coverage

| Requirement area | v2 implementation | Evidence / status |
|---|---|---|
| Natural-language weather queries | Gemini conversational endpoint | Implemented |
| Location-aware forecasts | Geocoding + coordinates | Implemented |
| Live weather | Open-Meteo operational forecast | Implemented |
| NWP | GFS adapter with provider-neutral interface | Implemented |
| Official Indian warnings | IMD provider adapter | Adapter ready; requires official API credentials/endpoints |
| Extreme-weather intelligence | Model-derived hazard signal + alert UI | Implemented, explicitly non-official |
| Climate analysis | 10-year historical archive + annual trend visualization | Implemented |
| Agriculture | Forecast-based crop/activity advisory endpoint | Implemented |
| Voice | Browser speech recognition + speech synthesis | Implemented |
| Indian-language interaction | Tamil detection + multilingual prompting | Implemented baseline |
| Explainability | Source, timestamp, provider and warning-status labels | Implemented |
| Rural usability | Voice-first chat and concise advisory responses | Implemented baseline |
| Disaster response | Alert cards + action guidance | Implemented baseline |

## Remaining production hardening

1. Wire the exact authenticated IMD product endpoints available to the SIH team.
2. Add district/state/cyclone/marine warning normalization and official-alert precedence.
3. Add map/radar layers backed by licensed/official data where available.
4. Add WRF ingestion if local high-resolution model output becomes available.
5. Add automated tests for weather calculations, alert thresholds, provider fallbacks and multilingual chat.
6. Run browser/device testing before merging the PR into `main`.

The system must never label a numerical-model signal as an official warning.
