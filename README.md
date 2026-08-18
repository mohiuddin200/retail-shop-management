# Retail Shop Manager

React Native foundation for the inventory, point-of-sale, accounts, payroll, and reporting system described in the project SRD.

## Technology

- Expo SDK 57 and React Native
- Expo Router with typed routes
- TypeScript in strict mode
- Convex client, ready to connect to a deployment
- Convex Auth planned after the first deployment is initialized

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the application:

   ```bash
   npm start
   ```

3. Open the app with Expo Go, an Android emulator, or the web option shown by Expo.

## Connect Convex

The application runs without Convex during the foundation milestone. To create and connect a development deployment:

```bash
npx convex dev
```

The Convex CLI will create the backend folder and write `EXPO_PUBLIC_CONVEX_URL` to `.env.local`. Keep that file local and never place secrets in any `EXPO_PUBLIC_` value.

Convex Auth will be configured after this deployment exists so its generated backend files and credentials are tied to the correct project.

## Quality checks

```bash
npm run check
```

## Project documents

- [Architecture decisions](docs/architecture.md)
- [Delivery roadmap](docs/roadmap.md)
- [Software requirements](docs/requirements/retail-shop-management-srd.md)
