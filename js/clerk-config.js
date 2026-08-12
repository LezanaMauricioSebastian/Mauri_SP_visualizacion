// Publishable key only (safe in the browser).
//
// Create a NEW Clerk app (recommended for this map):
//   1. https://dashboard.clerk.com → Create application → name e.g. "Mapa Chaco"
//   2. Auth options: Email + Google (dev Google works with Clerk's shared credentials)
//   3. Copy Publishable key → paste below
//   4. Configure → Domains / Allowed origins: http://127.0.0.1:8090 and your prod URL
//   5. User & Auth → SSO connections → Add Google (if not checked at create)
//
// Until you paste a new key, this uses Feedlyze's development instance.
const CLERK_PUBLISHABLE_KEY =
  'pk_test_Zml0LXN3YW4tNS5jbGVyay5hY2NvdW50cy5kZXYk';
