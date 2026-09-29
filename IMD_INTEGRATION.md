# Official IMD integration

VentusGPT v2 deliberately distinguishes model-derived weather intelligence from official Indian Meteorological Department warnings.

## Environment

Set these server-side when IMD API access is provisioned:

```env
IMD_API_BASE_URL=https://api.imd.gov.in/public
IMD_API_KEY=your_server_side_key
```

Never expose `IMD_API_KEY` in the browser or commit it to Git.

## Adapter contract

The production adapter should normalize official IMD products into these internal concepts:

- current observations / AWS / ARG
- city and district forecasts
- district nowcast
- district warnings
- rainfall observations
- cyclone / marine warnings where applicable
- Agromet advisories

The frontend should not depend on raw IMD response shapes. Normalize them server-side and attach:

```json
{
  "source": "India Meteorological Department",
  "official": true,
  "updatedAt": "...",
  "product": "district warning"
}
```

## Safety rule

A numerical weather model signal from Open-Meteo/GFS/etc. is **not** an official warning. VentusGPT must label it as model-derived. When an official IMD warning is available, it takes precedence in the alert UI and conversational answer.

Official API reference: https://api.imd.gov.in/public/api_reference.html
