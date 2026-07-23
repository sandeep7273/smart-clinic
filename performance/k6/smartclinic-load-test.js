import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

export const searchLatency = new Trend("doctor_search_latency_ms");
export const apiFailures = new Rate("api_failures");

const baseUrl = __ENV.BASE_URL || "http://localhost:3000";
const authToken = __ENV.AUTH_TOKEN || "";
const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};

export const options = {
  scenarios: {
    smoke: {
      executor: "constant-vus",
      vus: Number(__ENV.VUS || 20),
      duration: __ENV.DURATION || "2m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000", "p(99)<2000"],
    doctor_search_latency_ms: ["p(95)<1000"],
    api_failures: ["rate<0.01"],
  },
};

export default function () {
  const health = http.get(`${baseUrl}/health`);
  check(health, {
    "health is 200": (response) => response.status === 200,
  }) || apiFailures.add(1);

  const query = JSON.stringify({
    query: `query SearchDoctors($search: String, $limit: Int) {
      searchDoctors(search: $search, limit: $limit) {
        doctors { id firstName lastName specializations rating }
        pagination { total page limit totalPages }
      }
    }`,
    variables: {
      search: "Cardiology",
      limit: 20,
    },
  });

  const startedAt = Date.now();
  const search = http.post(`${baseUrl}/graphql`, query, {
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
  searchLatency.add(Date.now() - startedAt);

  check(search, {
    "search is successful": (response) => response.status === 200,
    "search has no graphql errors": (response) =>
      !response.body.includes('"errors"'),
  }) || apiFailures.add(1);

  sleep(1);
}
