import app from "./app.js";

// On Vercel the app is exported; only listen when running locally.
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT);
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}
