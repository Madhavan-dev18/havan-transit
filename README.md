<div align="center">

# 🚌 Havan Bus Booking Engine

### *The infrastructure that moves people — reliably, at scale.*

[![Django](https://img.shields.io/badge/Django-REST_Framework-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL-00E5FF?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Render](https://img.shields.io/badge/Render-API_Host-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-Automation-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/features/actions)

---

> **Havan** is a production-grade, multi-tenant bus ticket reservation platform engineered for **high-concurrency**, **zero inventory drift**, and **operator-grade reliability**. Built on a modern decoupled architecture, it handles everything from seat locking to PDF ticket generation — automatically.

</div>

---

## 📌 Table of Contents

- [Value Proposition](#-value-proposition)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Key Features](#-key-features)
- [Security Design](#-security-design)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)

---

## 💡 Value Proposition

Most bus booking systems fail under pressure — **double bookings** when traffic spikes, **stale inventory** from manual ops, and **brittle monoliths** that collapse when one service sneezes.

**Havan is designed differently:**

| Problem | Havan's Answer |
|---|---|
| Double bookings under load | Row-level locking via `select_for_update()` |
| Stale or missing daily inventory | Self-healing automation via GitHub Actions CRON |
| Slow PDF generation blocking UX | Async Celery + Redis background task pipeline |
| Security gaps in internal APIs | Bearer Token auth + strict environment variable isolation |
| Vendor lock-in | Decoupled frontend/backend — swap either independently |

---

## 🛠️ Tech Stack

### Frontend

| Layer | Technology | Hosting | Notes |
|---|---|---|---|
| **UI Framework** | React 18 | Vercel | Component-driven SPA |
| **Routing** | React Router v6 | — | Client-side navigation |
| **State Management** | Context API / Hooks | — | Lightweight, no Redux overhead |
| **HTTP Client** | Axios | — | Interceptors for auth headers |
| **Styling** | Tailwind CSS | — | Utility-first, zero bloat |

### Backend

| Layer | Technology | Hosting | Notes |
|---|---|---|---|
| **API Framework** | Django REST Framework | Render | Hypermedia-ready REST API |
| **Task Queue** | Celery | Render (Worker) | Async job processing |
| **Message Broker** | Redis | Render | Celery broker + result backend |
| **ORM** | Django ORM | — | `select_for_update()` for atomicity |
| **Auth** | Bearer Token (DRF TokenAuth) | — | Stateless API security |
| **PDF Generation** | ReportLab / WeasyPrint | — | Ticket rendering in background tasks |

### Data & DevOps

| Layer | Technology | Notes |
|---|---|---|
| **Database** | Neon (Serverless PostgreSQL) | Auto-suspend, branching-ready |
| **CI/CD & Automation** | GitHub Actions | Daily inventory CRON + deployment hooks |
| **Secrets Management** | GitHub Secrets + Render Env Vars | Zero plaintext credentials in code |
| **Monitoring** | Render Logs + GitHub Actions audit trail | Operational observability |

---

## 🏗️ Architecture

### System Overview

Havan follows a **strict three-tier decoupled architecture**. The frontend never touches the database — every operation flows through the authenticated REST API.

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│                    React SPA  ·  Vercel CDN                      │
└─────────────────────────────┬────────────────────────────────────┘
                              │  HTTPS + Bearer Token
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      DJANGO REST API                             │
│                   DRF · Render · Gunicorn                        │
│                                                                  │
│   ┌─────────────────┐    ┌──────────────────────────────────┐   │
│   │  Booking Views  │    │        Celery Worker             │   │
│   │ select_for_     │    │  PDF Generation · Email Tasks    │   │
│   │ update() lock   │    └──────────────┬───────────────────┘   │
│   └────────┬────────┘                  │                        │
└────────────┼───────────────────────────┼────────────────────────┘
             │  Django ORM               │  Task Queue
             ▼                           ▼
┌─────────────────────────┐   ┌──────────────────────┐
│   Neon PostgreSQL DB    │   │   Redis (Broker)     │
│   (Serverless · ACID)   │   │   Render Managed     │
└─────────────────────────┘   └──────────────────────┘
             ▲
             │  Automated Inventory Writes
┌────────────┴────────────────────────────────────────────────────┐
│                       GITHUB ACTIONS                            │
│        CRON: Daily Inventory Generation  ·  00:00 UTC           │
│        Calls secured internal API endpoint with Bearer Token     │
└─────────────────────────────────────────────────────────────────┘
```

### 🔄 High-Concurrency Seat Booking — Sequence Flow

```mermaid
sequenceDiagram
    participant U as 🧑 User (React)
    participant A as ⚡ Django API (Render)
    participant DB as 🗄️ Neon PostgreSQL
    participant W as 🔧 Celery Worker
    participant R as 📮 Redis

    U->>A: POST /api/bookings/ {seat_id, trip_id}
    A->>A: Validate Bearer Token
    A->>DB: BEGIN TRANSACTION
    A->>DB: SELECT * FROM seats WHERE id=? FOR UPDATE
    Note over DB: Row-level lock acquired.<br/>Concurrent requests queue here.
    DB-->>A: Seat row (locked)
    A->>A: Check availability
    alt Seat Available
        A->>DB: UPDATE seat SET is_booked=True
        A->>DB: INSERT INTO bookings (...)
        A->>DB: COMMIT
        DB-->>A: ✅ Booking confirmed
        A->>R: Enqueue PDF generation task
        R->>W: Dispatch task
        W->>W: Generate PDF ticket
        W-->>U: 📧 Email with PDF ticket (async)
        A-->>U: 200 OK {booking_id, status: "confirmed"}
    else Seat Already Taken
        A->>DB: ROLLBACK
        A-->>U: 409 Conflict {error: "Seat no longer available"}
    end
```

### 🔁 Self-Healing Inventory — GitHub Actions Flow

```mermaid
flowchart TD
    CRON["⏰ GitHub Actions CRON\n0 0 * * * UTC"] --> RUN["▶️ Trigger Workflow\ninventory_generation.yml"]
    RUN --> AUTH["🔐 Load INVENTORY_API_TOKEN\nfrom GitHub Secrets"]
    AUTH --> CALL["📡 POST /api/internal/generate-inventory/\nAuthorization: Bearer $TOKEN"]
    CALL --> API["⚡ Django API on Render\nValidates token · Runs business logic"]
    API --> DB["🗄️ Neon PostgreSQL\nINSERT daily trips + seat rows"]
    DB --> OK{"✅ Success?"}
    OK -- Yes --> LOG["📋 GitHub Actions Log:\ninventory_generated: true"]
    OK -- No --> FAIL["❌ Workflow fails\nGitHub notifies via email"]
    FAIL --> RETRY["🔄 Manual re-run available\nvia GitHub UI"]
```

---

## ✨ Key Features & Technical Centerpiece

### 🔒 Concurrency-Safe Pessimistic Seat Booking (Race Condition Prevention)

The core architectural strength of Havan is its **high-concurrency seat booking system**. Without database-level synchronization, a classic race condition (double booking) occurs when multiple users attempt to reserve the same seat simultaneously:

```
User A (Request) ────┐
                     ├───► [Read Available Seats] ──► Both see "Seat L-1A Free" ──► [Write Bookings] ──► DOUBLE BOOKED!
User B (Request) ────┘
```

Havan prevents this by applying **pessimistic row-level database locking** via Django's `select_for_update()` under an atomic transaction block. The database itself serializes execution:

```
User A (Request) ──► [Lock Bus Row] ────────────────────────► [Update DB] ──► [Commit & Unlock]
User B (Request) ───────────────► [Blocked: Queueing on Lock] ──────────────────────────► [Fails: L-1A Taken]
```

#### The Lock Implementation (`ticketreservation/services.py`)
```python
def process_ticket_transaction(user, bus_id, passengers):
    requested_seats = [p['seat'] for p in passengers]
    seats_count = len(requested_seats)

    with transaction.atomic():
        # 1. Acquire pessimistic lock on the Bus row
        bus = Bus.objects.select_for_update().get(id=bus_id)

        # 2. Collision Detection: Read confirmed bookings under lock
        active_bookings = Booking.objects.filter(bus=bus, status='CONFIRMED')
        already_taken_seats = set()
        for b in active_bookings:
            if b.selected_seats:
                already_taken_seats.update(b.selected_seats)

        overlapping_claims = set(requested_seats).intersection(already_taken_seats)
        if overlapping_claims:
            raise ValidationError({
                "error": f"Transaction dropped. Seats recently booked: {list(overlapping_claims)}"
            })

        if bus.available_seats < seats_count:
            raise ValidationError({
                "error": f"Insufficient capacity. Only {bus.available_seats} remaining."
            })

        # 3. Mutate Inventory and Write Booking
        bus.available_seats -= seats_count
        bus.save()

        booking = Booking.objects.create(
            user=user,
            bus=bus,
            selected_seats=requested_seats,
            passenger_details=passengers,
            seats_booked=seats_count,
            total_price=bus.price * seats_count,
            status='CONFIRMED'
        )
    
    # 4. Background PDF Task (Enqueued AFTER transaction committing)
    generate_and_send_ticket.delay(booking.id)
    return booking
```

We stress-test this behavior using multi-threaded integration tests (`ConcurrencyBookingTest` in [tests.py](file:///m:/Personal/Workspace/havan-transit/busticketreservation/ticketreservation/tests.py)) executing simultaneous reservation requests against the same seat. The test asserts that at most one request succeeds, proving the thread safety and zero-overselling guarantee.

---

### 🤖 Self-Healing Daily Inventory

> **Feature:** A lightweight daily Render keep-alive cron job calling a secured internal webhook endpoint to automatically populate buses for the next calendar day.
>
> **Benefit:** No manual administration needed to spin up daily operations. If the server on Render goes idle/sleeps, the next CRON ping wakes it up and regenerates fresh bus routes automatically.

```yaml
# .github/workflows/keepalive.yml (excerpt)
on:
  schedule:
    - cron: '0 0 * * *'   # Daily at 00:00 UTC
  workflow_dispatch:      # Allows manual trigger

jobs:
  ping-render:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render API
        run: |
          curl -X POST https://havan-bus-booking-engine.onrender.com/api/internal/generate-buses/ \
          -H "Authorization: Bearer ${{ secrets.RENDER_CRON_SECRET }}" \
          -H "Content-Type: application/json"
```

---

### 📄 Async PDF Ticket Generation

> **Feature:** Layout rendering is offloaded to a Celery worker via Redis task queues, keeping the HTTP cycle non-blocking.
>
> **Benefit:** Boarding pass PDF compiling takes time. Rather than blocking the user's booking response (saving ~2-4s of latency), the ticket is created in a background thread. Response time stays under 200ms.

---

### 🏢 Decoupled React Frontend

> **Feature:** The React SPA is deployed independently on Vercel's global CDN edge network.
>
> **Benefit:** Frontend and backend scale, deploy, and fail independently. A backend deployment doesn't flash the UI. Frontend updates ship in seconds with zero downtime.

---

## 🛡️ Security Design

Havan is engineered with a **security-first posture** at every layer of the stack.

### Authentication Model

| Endpoint Type | Auth Mechanism | Used By |
|---|---|---|
| User-facing booking endpoints | `Authorization: Token <token>` (DRF Token Auth) | React frontend, authenticated users |
| Internal automation endpoints | `Authorization: Bearer <INVENTORY_API_TOKEN>` | GitHub Actions CRON only |
| Admin panel | Django session auth + superuser flag | Ops team |

> [IMPORTANT]
> **Internal endpoints are never exposed to the frontend.** The `/api/internal/` namespace is protected by a separate, long-lived secret token checked in `views.py` against both `CRON_SECRET` and `INVENTORY_API_TOKEN`.

### Environment Variable Isolation

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   GitHub Secrets    │     │   Render Env Vars   │     │   Vercel Env Vars   │
│                     │     │                     │     │                     │
│ RENDER_CRON_SECRET  │     │ SECRET_KEY          │     │ VITE_API_BASE_URL   │
│                     │     │ DATABASE_URL        │     │                     │
│                     │     │ REDIS_URL           │     │                     │
│                     │     │ CRON_SECRET         │     │                     │
│                     │     │ ALLOWED_HOSTS       │     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
         │                           │                           │
         └───────────────────────────┴───────────────────────────┘
                    ✅ Zero plaintext secrets in source code
```

---

## 🚀 Getting Started

### Prerequisites

Ensure the following are installed before proceeding:

- **Python** `>= 3.11`
- **Node.js** `>= 18.x`
- **Redis** (local instance or Docker)
- **PostgreSQL** (local) *or* a [Neon](https://neon.tech) account for cloud DB

---

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/havan-bus-booking.git
cd havan-bus-booking
```

---

### 2️⃣ Backend Setup (Django)

```bash
# Navigate to the backend directory
cd busticketreservation

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Copy the environment template
cp .env.example .env
```

**Edit `.env`** with your values, then:

```bash
# Apply database migrations
python manage.py migrate

# Create a superuser for the admin panel
python manage.py createsuperuser

# Start the development server
python manage.py runserver
```

**Start the Celery worker** (in a separate terminal):

```bash
cd busticketreservation
source venv/bin/activate
celery -A busticketreservation worker --loglevel=info
```

---

### 3️⃣ Frontend Setup (React)

```bash
# Navigate to the frontend directory
cd ../frontend

# Install Node dependencies
npm install

# Copy the environment template
cp .env.example .env.local
```

Set `VITE_API_BASE_URL=http://localhost:8000/api/` in `.env.local`, then:

```bash
# Start the development server
npm run dev
```

The React app will be available at `http://localhost:5173`.

---

### 4️⃣ Test the Inventory Automation Locally

```bash
# Simulate what GitHub Actions does every midnight
curl -X POST http://localhost:8000/api/internal/generate-buses/ \
  -H "Authorization: Bearer your_local_dev_token" \
  -H "Content-Type: application/json"
```

---

## ⚠️ Known Limitations & Assumptions

As a showcase portfolio project, Havan makes the following design decisions and assumptions:

1. **Email Delivery Mocking**: The Celery task for PDF generation operates synchronously inside tests and creates local PDF files in the `generated_tickets/` directory. In production, this output path should be connected to a secure cloud blob storage provider (e.g. AWS S3) rather than storing files directly on Render's ephemeral filesystem.
2. **Simplified Seat Mapping**: Seats are stored as an array of identifiers (e.g. `L-1A`) directly inside the JSON-serialized fields of the `Booking` model, rather than building a highly normalized separate table for each individual physical seat. High-concurrency is achieved by acquiring a database lock (`select_for_update()`) on the target `Bus` row to serialize reservations and prevent concurrent seat overlaps.
3. **No Distributed Locks**: If the backend is scaled horizontally across multiple database nodes, a distributed lock provider (like Redlock via Redis) or a more granular database transaction isolation level (e.g., Serializable) would be required to prevent edge-case race conditions on distributed architectures. The current single-primary database setup is fully protected by pessimistic locking on PostgreSQL.
4. **Mocked Payment Verification**: The ticket is marked `CONFIRMED` immediately upon saving the booking details. A full production implementation would put the booking in `PENDING` state and leverage a payment gateway webhook (e.g. Stripe) to update status to `CONFIRMED` asynchronously.

---

## 🔑 Environment Variables

### Backend (`busticketreservation/.env`)

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | ✅ | Django secret key — generate with `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DEBUG` | ✅ | `True` for local dev, **`False` in production** |
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Neon format: `postgresql://user:pass@host/db?sslmode=require`) |
| `REDIS_URL` | ✅ | Redis connection string (`redis://localhost:6379/0` locally) |
| `ALLOWED_HOSTS` | ✅ | Comma-separated allowed hosts (e.g., `localhost,your-app.onrender.com`) |
| `CORS_ALLOWED_ORIGINS` | ✅ | Frontend origin (e.g., `https://your-app.vercel.app`) |
| `INVENTORY_API_TOKEN` | ✅ | Long, random secret used by GitHub Actions to authenticate inventory calls |
| `CRON_SECRET` | ✅ | Alternative environment variable name used in codebase for webhook pings |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | ✅ | Base URL of the Django API (e.g., `https://your-api.onrender.com/api/`) |

> [WARNING]
> **Never commit `.env` or `.env.local` files.** Both are already in `.gitignore`. Use your hosting platform's environment variable management (Render Dashboard / Vercel Project Settings) for production values.

---

## 📡 API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/login/` | None | Obtain user auth token |
| `POST` | `/api/register/` | None | Register a new user |
| `GET` | `/api/buses/` | Bearer Token | List scheduled buses |
| `GET` | `/api/buses/{id}/occupied-seats/` | Bearer Token | Get occupied seats for a bus |
| `POST` | `/api/bookings/` | Bearer Token | Create a booking (concurrency-safe) |
| `GET` | `/api/bookings/` | Bearer Token | List user bookings |
| `GET` | `/api/bookings/{id}/download/` | Bearer Token | Download PDF boarding pass |
| `POST` | `/api/internal/generate-buses/` | Internal Token | **Automation webhook** — generate daily bus fleet |

---

## ⚡ API Load Testing (k6 Performance Script)

To ensure the row-locking booking engine handles spikes in concurrent traffic without deadlocking, Havan includes a **k6 performance load test script** (`load_test.js`) in the root directory.

The script models real user behavior:
1. Performs a setup phase to register and login a load test user to obtain a stateless Bearer token.
2. Queries the `/api/buses/` endpoint to view available routes.
3. Queries `/api/buses/{id}/occupied-seats/` to check taken seats.
4. Generates simultaneous booking requests targeting random seats (measuring how many get a confirmation and how many are cleanly rejected with `400 Bad Request` once seats are filled).

### Running the Load Test
Ensure [k6](https://k6.io/) is installed, start your local server, then execute:
```bash
# Run stress test against local server
k6 run load_test.js

# Or run against a custom deployment base URL
k6 run -e API_URL=https://your-api.onrender.com/api load_test.js
```

### Target SLA Thresholds
* **Failure Rate**: < 1% error rate (no server crashes or 500 Internals under locking contention).
* **p95 Latency**: 95% of API requests completed in under **500ms** (ensuring swift lock releases).

---

## 🤝 Contributing

Contributions are welcome. Please follow this workflow:

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Commit** with conventional commit messages: `feat: add seat map component`
4. **Push** to your fork: `git push origin feature/your-feature-name`
5. **Open a Pull Request** against `main`

> [!NOTE]
> All PRs require passing CI checks. Run `python manage.py test` and `npm run lint` before submitting.

---

<div align="center">

**Built with precision by the Havan team.**

*If this project helped you, consider starring the repository ⭐*

</div>
