// used by "ng build" (the live site on Vercel)
// "/api" = same site as the frontend: vercel.json forwards /api/* to the Render backend.
// Same site is what lets the browser keep the httpOnly login cookie (Render's own domain would be a
// third-party cookie, which Safari and many browsers block).
export const environment = {
  production: true,
  apiUrl: '/api',
};
