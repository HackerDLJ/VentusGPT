# VentusGPT v2.0 Feature Matrix

VentusGPT v2.0 is an evolution of the original multimodal assistant, not a replacement for it.

| Capability | Original VentusGPT | v2.0 direction | SIH26068 relevance |
|---|---|---|---|
| Conversational AI | Yes | Weather-grounded contextual agent | Core interface |
| Live voice | Yes | Preserve and connect to weather context | Accessibility / conversational UX |
| Web-grounded search | Yes | Preserve with source display | Current-information verification |
| Calculator | Yes | Preserve as safe tool | General assistant utility |
| Vision | Yes | Preserve for image/satellite/scene analysis | Multimodal intelligence |
| Image generation | Yes | Preserve as creative capability | Demonstration / communication |
| TTS | Yes | Preserve with Tamil/English support | Accessibility |
| Transcription | Yes | Preserve for voice workflows | Accessibility |
| Weather forecast | Yes, previously mocked | Live numerical forecast layer | Core SIH requirement |
| IMD | Planned/represented | Official-provider adapter with credential gate | Official warnings and India-specific data |
| GFS/NWP | Planned | Dedicated NWP provider layer | Forecast intelligence |
| Alerts | Yes | Official warning precedence + model signals | Disaster awareness |
| Agriculture | Yes | Crop/activity/weather decision support | Agrometeorological advisory |
| Climate history | Limited | Historical trend explorer | Climate intelligence |
| Location intelligence | Yes | Geocoding + forecast context + map | User-specific weather context |
| Provenance | Limited | Provider/model/timestamp/source UI | Trust and explainability |

## Product principle

**VentusGPT is a multimodal conversational AI with weather, climate, agriculture and disaster intelligence as its strongest domain.**

The v2.0 rebuild should keep the original personality and useful tools while replacing mock weather data with a provider-backed intelligence architecture.

## Data honesty

- Never label model-derived risk as an official warning.
- Official IMD products take precedence when configured and available.
- Provider, model and update time should be visible where practical.
- Missing credentials must result in a clear degraded state, not fabricated data.
