export type ImdProduct = "current" | "forecast" | "nowcast" | "district-warning" | "rainfall" | "agromet";

/**
 * Server-side adapter for official IMD products.
 * The exact endpoint can be configured with IMD_*_URL variables because
 * IMD exposes multiple product endpoints and access can vary by account.
 */
export class ImdProvider {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor() {
    this.baseUrl = (process.env.IMD_API_BASE_URL || "https://api.imd.gov.in/public").replace(/\/$/, "");
    this.apiKey = process.env.IMD_API_KEY;
  }

  get configured() {
    return Boolean(this.apiKey);
  }

  async fetchProduct(product: ImdProduct, params: Record<string, string> = {}) {
    if (!this.apiKey) return null;
    const configuredUrl = process.env[`IMD_${product.replace(/-/g, "_").toUpperCase()}_URL`];
    const url = new URL(configuredUrl || `${this.baseUrl}/${product}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "X-API-Key": this.apiKey,
      },
    });
    if (!response.ok) throw new Error(`IMD ${product} request failed (${response.status})`);
    return response.json();
  }

  async districtWarning(district: string) {
    return this.fetchProduct("district-warning", { district });
  }

  async nowcast(district: string) {
    return this.fetchProduct("nowcast", { district });
  }

  async rainfall(district: string) {
    return this.fetchProduct("rainfall", { district });
  }

  async agromet(district: string) {
    return this.fetchProduct("agromet", { district });
  }
}
