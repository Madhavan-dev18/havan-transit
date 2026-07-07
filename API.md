# 📡 Havan Bus Booking Engine — API Contract

All requests should be sent to the API base URL: `https://havan-bus-booking-engine.onrender.com/api/` (in production) or `http://localhost:8000/api/` (in local development).

---

## 🔑 Authentication

Most endpoints (except for authentication endpoints) require a DRF Token authentication header:
```http
Authorization: Token <your_token_value>
```

---

## 🚀 Endpoint Reference

### 1. Register User
* **Method**: `POST`
* **Path**: `/register/`
* **Auth Required**: None
* **Request Body (JSON)**:
  ```json
  {
    "username": "madhavan",
    "email": "madhavan@example.com",
    "password": "strongpassword123"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "user": {
      "username": "madhavan",
      "email": "madhavan@example.com"
    },
    "token": "a1b2c3d4e5f6g7h8i9j0..."
  }
  ```

### 2. Login / Obtain Token
* **Method**: `POST`
* **Path**: `/login/`
* **Auth Required**: None
* **Request Body (JSON)**:
  ```json
  {
    "username": "madhavan",
    "password": "strongpassword123"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "token": "a1b2c3d4e5f6g7h8i9j0..."
  }
  ```

### 3. Search & List Buses
* **Method**: `GET`
* **Path**: `/buses/`
* **Auth Required**: Token (Authenticated)
* **Query Parameters (Optional)**:
  * `source` (string): Filter buses starting from this location (case-insensitive substring).
  * `dest` (string): Filter buses going to this destination (case-insensitive substring).
  * `date` (string, `YYYY-MM-DD` format): Filter buses scheduled on this exact date.
* **Success Response (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "bus_name": "Havan Express Scania Multi-Axle",
      "source": "Chennai",
      "dest": "Bangalore",
      "date": "2026-07-08",
      "time": "18:00:00",
      "total_seats": 40,
      "available_seats": 38,
      "price": "950.00"
    }
  ]
  ```

### 4. Fetch Bus Occupied Seats
* **Method**: `GET`
* **Path**: `/buses/{id}/occupied-seats/`
* **Auth Required**: Token (Authenticated)
* **Success Response (200 OK)**:
  ```json
  {
    "occupied_seats": ["L-1A", "L-1B"]
  }
  ```

### 5. List Bookings
* **Method**: `GET`
* **Path**: `/bookings/`
* **Auth Required**: Token (Authenticated)
* **Success Response (200 OK)**:
  ```json
  [
    {
      "id": 12,
      "ticket_id": "e2c0e86b-a25c-44b2-841f-508b49a5b3a1",
      "selected_seats": ["L-1A", "L-1B"],
      "passenger_details": [
        {"seat": "L-1A", "name": "John Doe", "age": 30, "gender": "Male"},
        {"seat": "L-1B", "name": "Jane Doe", "age": 28, "gender": "Female"}
      ],
      "seats_booked": 2,
      "total_price": "1900.00",
      "status": "CONFIRMED",
      "booked_on": "2026-07-07T12:00:00Z",
      "user": 1,
      "bus": 1
    }
  ]
  ```

### 6. Create Booking (Concurrency-Safe)
* **Method**: `POST`
* **Path**: `/bookings/`
* **Auth Required**: Token (Authenticated)
* **Request Body (JSON)**:
  ```json
  {
    "bus_id": 1,
    "passenger_details": [
      {
        "seat": "L-1A",
        "name": "John Doe",
        "age": 30,
        "gender": "Male"
      }
    ]
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "id": 13,
    "ticket_id": "f5f5e27a-8b1a-4d7a-8e2b-f638148b1234",
    "selected_seats": ["L-1A"],
    "passenger_details": [
      {"seat": "L-1A", "name": "John Doe", "age": 30, "gender": "Male"}
    ],
    "seats_booked": 1,
    "total_price": "950.00",
    "status": "CONFIRMED",
    "booked_on": "2026-07-07T12:05:00Z",
    "user": 1,
    "bus": 1
  }
  ```
* **Error Response (400 Bad Request — Race Condition / Double Booking / Sold Out)**:
  ```json
  {
    "error": "Transaction dropped. Seats recently booked: ['L-1A']"
  }
  ```

### 7. Download PDF Boarding Pass
* **Method**: `GET`
* **Path**: `/bookings/{id}/download/`
* **Auth Required**: Token (Authenticated)
* **Success Response (200 OK)**:
  * Content-Type: `application/pdf`
  * Body: Binary PDF stream containing boarding pass.
* **Error Response (404 Not Found — PDF still generating)**:
  ```json
  {
    "error": "Ticket layout rendering. Wait 5 seconds and retry."
  }
  ```

---

## ⚡ Internal Webhooks

### 1. Trigger Tomorrow's Bus Fleet Generation
* **Method**: `POST`
* **Path**: `/internal/generate-buses/`
* **Auth Required**: Bearer token (matches the backend `CRON_SECRET` / `INVENTORY_API_TOKEN` secret)
  ```http
  Authorization: Bearer <CRON_SECRET>
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "message": "Bus generation successful."
  }
  ```
* **Error Response (401 Unauthorized)**:
  ```json
  {
    "error": "Unauthorized."
  }
  ```
