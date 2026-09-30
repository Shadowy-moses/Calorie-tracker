# Calorie tracker

A small calorie and macro tracker for David. It runs in the browser, works from a phone home screen, and keeps every meal on the device. There is no account and no server.

## Run it on your computer

1. Install [Node.js](https://nodejs.org/) 20 or newer.
2. In this folder, install dependencies and start the app:

```bash
npm install
npm run dev
```

3. Open the address Vite prints. It looks like `http://localhost:5173/Calorie-tracker/`.

The `/Calorie-tracker/` part is intentional. The same build is what GitHub Pages serves.

To try the production build locally:

```bash
npm run build
npm run preview
```

Then open `http://127.0.0.1:4173/Calorie-tracker/`.

## Put it on GitHub Pages

Pushes to `main` are built and published by GitHub Actions (`.github/workflows/pages.yml`). Turn Pages on once:

1. Open this repository on GitHub.
2. Go to **Settings > Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.

The next push to `main` publishes the app at `https://<your-username>.github.io/Calorie-tracker/`.

From your phone’s browser, use the share menu and choose **Add to Home Screen**. The icon, name, and offline shell come from the web app manifest and service worker.

Barcode scanning uses the camera, which browsers only allow on a secure page. GitHub Pages serves the app over HTTPS, so the camera can start there. `localhost` is also treated as secure when you try the camera on your computer.

## How to use it

- **Today** shows calories against the daily goal, plus protein, carbs, and fat. Meals are grouped into breakfast, lunch, dinner, and snacks. Tap an entry to change the amount or meal, or delete it.
- **Add** searches [Open Food Facts](https://world.openfoodfacts.org/), scans a barcode with the camera (or lets you type one), and can record a food by hand if it isn’t in the database. After you pick a food, choose grams or servings and a meal.
- **Recipe** takes a pasted link or the recipe text. When the page publishes calories and macros (schema.org Recipe data), those numbers are used. When it only lists ingredients, they are looked up and added up, and the total is marked as an estimate. You can change the serving count, then save it to My foods. It is not logged until you choose a meal.
- Foods you have logged show up as **recent** items. Tap one to log that same portion again.
- **History** lists past days and their totals. Open a day to see the meals, or log something onto that day.
- **Settings** holds the daily calorie goal and the protein, carb, and fat targets.

Targets start at 2,000 kcal, 120 g protein, 225 g carbs, and 65 g fat. That is a starting point, not medical advice.

## What is stored

Meals, foods, and targets stay in this browser (IndexedDB), on a profile named David. The records include a profile id so another person could be added later. Nothing is uploaded except food searches and barcode lookups, which go to Open Food Facts. That database is available under the [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/).
