const RESOURCE_ID = "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69";
const BASE_URL = `https://api.data.gov.in/resource/${RESOURCE_ID}`;
const NCR_STATES = ["Delhi", "Haryana", "Uttar Pradesh", "Rajasthan"] as const;

export type DataGovRecord = Record<string, unknown>;

interface DataGovResponse {
  records?: DataGovRecord[];
  message?: string;
}

export async function fetchNcrCpcbRecords(): Promise<DataGovRecord[]> {
  const apiKey = process.env.DATA_GOV_IN_API_KEY;
  if (!apiKey) {
    throw new Error("DATA_GOV_IN_API_KEY is not configured on the server");
  }

  const responses = await Promise.all(NCR_STATES.map(async (state) => {
    const url = new URL(BASE_URL);
    url.searchParams.set("api-key", apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1000");
    url.searchParams.set("filters[state]", state);

    const response = await fetch(url, {
      next: { revalidate: 900 },
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`data.gov.in returned ${response.status} for ${state}`);

    const data = (await response.json()) as DataGovResponse;
    if (!Array.isArray(data.records)) {
      throw new Error(data.message ? `data.gov.in (${state}): ${data.message}` : `data.gov.in returned no ${state} records`);
    }
    return data.records;
  }));

  return responses.flat();
}
