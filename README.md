# Workly

A modern marketplace for hiring people for real-world and digital tasks.

**Tagline:** Find the right person for any task.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Lucide React** icons

This is a **frontend-only** demo with realistic mock data. No backend or Supabase is integrated yet.

## Getting Started

### 1. Install dependencies

```bash
cd workly
npm install
```

### 2. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Build for production

```bash
npm run build
npm start
```

## Project Structure

```
src/
  app/                    # Next.js App Router pages
    page.tsx              # Landing page
    workers/              # Marketplace & worker profile
    become-worker/        # Multi-step worker onboarding
    dashboard/            # Customer dashboard
    worker-dashboard/     # Worker dashboard
    requests/[id]/       # Job request detail
    bookings/             # Bookings list
    messages/             # Chat UI
    saved/                # Saved workers
    notifications/        # Notifications
    login/ signup/        # Auth UI (mock)
    admin/                # Admin dashboard UI
  components/
    ui/                   # Button, Input, Card, Badge, etc.
    navbar/ footer/
    workers/              # WorkerCard
    location/             # LocationPicker
  data/                   # Mock data (workers, bookings, categories)
  services/               # Data access layer (returns mock data)
  types/                  # TypeScript interfaces
  lib/                    # Utils (cn, formatCurrency, etc.)
```

## Mock Data

Located in `src/data/`:

- `workers.ts` — Worker profiles
- `categories.ts` — Service categories
- `bookings.ts` — Job requests, bookings, reviews, messages, notifications

## Services Layer (for future Supabase)

Located in `src/services/`:

- `workersService.ts`
- `bookingService.ts`
- `messageService.ts`

These currently return mock data. Replace the implementations with Supabase queries later without changing page components.

## Location System

- `LocationPicker` component supports GPS and manual entry
- Worker profiles store city, area, lat/lng, service radius
- Public profiles show approximate location only (city + distance)
- Job requests store separate job location fields
- Filters support distance and remote/on-site modes

## Design Tokens

- Primary yellow: `#F6C945`
- Background: `#FFF9E6`
- Text: `#18181B` / `#71717A`
- Borders: `#E5E7EB`

## Future Supabase Integration

1. Create tables matching types in `src/types/index.ts`
2. Add location fields (lat/lng, service_radius_km) and consider PostGIS
3. Replace service functions in `src/services/` with Supabase client calls
4. Add auth (Auth UI already exists as placeholders)
5. Never expose worker private home addresses publicly

## License

MIT
