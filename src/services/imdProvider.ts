/**
 * Official India Meteorological Department adapter.
 *
 * The current IMD API management platform requires an authenticated API
 * connection for the live v1 endpoints. Keep this adapter isolated so the
 * product can switch from the operational NWP fallback to official IMD
 * observations/warnings without changing the UI or agent layer.
 */

export type ImdConfig = {
  baseUrl?: string;
  apiKey: string;
};

export class ImdProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: ImdConfig) {
    this.baseUrl = (config.baseUrl || "https://api.imd.gov.in/api/v1").replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/${path.replace(/^\//, "")}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url, { headers: { Authorization: `Bearer ${this.apiKey}`, Accept: "application/json" } });
    if (!response.ok) throw new Error(`IMD API ${response.status}: ${await response.text()}`);
    return response.json() as Promise<T>;
  }

  cityForecast(id?: string) {
    return this.get("cityforecast", id ? { id } : {});
  }

  locationForecast(id?: string) {
    return this.get("cityforecastloc", id ? { id } : {});
  }

  currentWeather(id?: string) {
    return this.get("current_wx", id ? { id } : {});
  }

  districtNowcast(id?: string) {
    return this.get("districtnowcast", id ? { id } : {});
  }

  districtWarnings(id?: string) {
    return this.get("districtwarning", id ? { id } : {});
  }

  districtRainfall(id?: string) {
    return this.get("distrain", id ? { id } : {});
  }

  agrometAdvisory(id?: string) {
    return this.get("agromet", id ? { id } : {});
  }
}

export function createImdProvider() {
  const apiKey = process.env.IMD_API_KEY;
  return apiKey ? new ImdProvider({ apiKey, baseUrl: process.env.IMD_API_BASE_URL }) : null;
}
