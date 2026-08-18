# Retail Shop Manager

React Native foundation for the inventory, point-of-sale, accounts, payroll, and reporting system described in the project SRD.

## Technology

- Expo SDK 57 and React Native
- Expo Router with typed routes
- TypeScript in strict mode
- Convex database and server functions
- Convex Auth with secure native token storage

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example` and enter the development deployment values.

3. Start the Convex development process:

   ```bash
   npm run convex:dev
   ```

4. In another terminal, start the application:

   ```bash
   npm start
   ```

5. Open the app with Expo Go, an Android emulator, or the web option shown by Expo.

## Convex backend and authentication

The development deployment is configured locally through `.env.local`. The committed `.env.example` documents the required cloud and HTTP Actions URLs without exposing deployment credentials.

The current backend foundation includes:

- Convex Auth tables, HTTP routes, and server-side signing keys
- Development email/password sign-in
- SecureStore-backed authentication persistence on Android and iOS
- Shop, membership, and category tables with shop-scoped indexes
- Owner, manager, and cashier membership roles
- A public health check plus authenticated user and shop functions

Password reset and email verification require an email provider and must be configured before production launch. Never place secrets in an `EXPO_PUBLIC_` environment variable.

## Quality checks

```bash
npm run check
npm run convex:once
```

## Project documents

- [Architecture decisions](docs/architecture.md)
- [Delivery roadmap](docs/roadmap.md)
- [Software requirements](docs/requirements/retail-shop-management-srd.md)
