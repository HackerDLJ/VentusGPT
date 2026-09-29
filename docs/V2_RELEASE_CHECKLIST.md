# VentusGPT v2.0 Release Readiness

## Product
- [x] Unified weather decision engine
- [x] GFS/NWP risk routed through shared decision logic
- [x] Agriculture decision layer
- [x] Farmer advisory endpoint uses agriculture decision layer
- [x] Unified alert decision layer
- [x] Disaster advisory endpoint exposes structured risk/provenance
- [x] Official-warning state kept distinct from NWP/model signals
- [x] Conversational weather context includes live forecast and alert state

## Engineering
- [x] Typecheck/build commands defined in package.json
- [x] GitHub Actions CI workflow added for `ventus-v2` and `main`
- [ ] CI run observed green after the latest integration commit
- [ ] Production deployment smoke test
- [ ] Verify all primary UI routes against production backend

## Demo
- [ ] Command Center visibly consumes alert/NWP/agriculture intelligence
- [ ] Farmer Mode presents structured decision, evidence and action
- [ ] Alert/Disaster UI presents official vs model provenance
- [ ] Final branding/assets verified across browser title, favicon and UI

## Release
- [ ] Final regression pass
- [ ] Tag `v2.0`
- [ ] GitHub Release `v2.0`
- [ ] Demo URL recorded
