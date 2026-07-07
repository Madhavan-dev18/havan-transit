import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metric to track actual server/network failures (5xx and network drops)
const systemFailures = new Rate('system_failures');

export const options = {
  stages: [
    { duration: '10s', target: 10 }, // Ramp up to 10 concurrent virtual users
    { duration: '30s', target: 50 }, // Stress test at 50 virtual users
    { duration: '10s', target: 0 },  // Ramp down
  ],
  thresholds: {
    system_failures: ['rate<0.01'],   // System/network failure rate must be less than 1%
    http_req_duration: ['p(95)<1500'], // 95% of requests must complete under 1.5s (accommodating Render limits)
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8000/api';

// Shared test credentials (setup before running or registered dynamically)
const USERNAME = 'loadtest_user';
const PASSWORD = 'loadtest_password123';

export function setup() {
  const headers = { 'Content-Type': 'application/json' };

  // Try registering the user
  const regPayload = JSON.stringify({
    username: USERNAME,
    password: PASSWORD,
    email: 'loadtest@example.com',
  });
  const regRes = http.post(`${BASE_URL}/register/`, regPayload, { headers });
  systemFailures.add(regRes.status >= 500 || regRes.status === 0);

  // Login to obtain authentication token
  const loginPayload = JSON.stringify({
    username: USERNAME,
    password: PASSWORD,
  });
  const loginRes = http.post(`${BASE_URL}/login/`, loginPayload, { headers });
  systemFailures.add(loginRes.status >= 500 || loginRes.status === 0);
  
  if (loginRes.status === 200) {
    return { token: loginRes.json().token };
  }
  
  return { token: null };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (data.token) {
    headers['Authorization'] = `Token ${data.token}`;
  }

  // 1. User views active bus list
  const busesRes = http.get(`${BASE_URL}/buses/`, { headers });
  systemFailures.add(busesRes.status >= 500 || busesRes.status === 0);
  check(busesRes, {
    'buses status is 200': (r) => r.status === 200,
  });

  // Short pause to simulate user browsing
  sleep(1);

  // If there are buses, view occupied seats for the first bus
  const buses = busesRes.json();
  if (buses && buses.length > 0) {
    const busId = buses[0].id;

    const occupiedRes = http.get(`${BASE_URL}/buses/${busId}/occupied-seats/`, { headers });
    systemFailures.add(occupiedRes.status >= 500 || occupiedRes.status === 0);
    check(occupiedRes, {
      'occupied-seats status is 200': (r) => r.status === 200,
    });

    sleep(1);

    // Attempt concurrent seat booking
    // Note: We generate a randomized seat mapping L-xx[A-D] to check locking
    const row = Math.floor(Math.random() * 10) + 1;
    const cols = ['A', 'B', 'C', 'D'];
    const col = cols[Math.floor(Math.random() * cols.length)];
    const seatId = `L-${row}${col}`;

    const bookingPayload = JSON.stringify({
      bus_id: busId,
      passenger_details: [
        {
          seat: seatId,
          name: `Load Test User ${__VU}`,
          age: 30,
          gender: 'Male',
        }
      ]
    });

    const bookingRes = http.post(`${BASE_URL}/bookings/`, bookingPayload, { headers });
    systemFailures.add(bookingRes.status >= 500 || bookingRes.status === 0);
    check(bookingRes, {
      'booking response is either 201 or 400': (r) => r.status === 201 || r.status === 400,
    });
  }

  sleep(1);
}
