/**
 * AssessmentVerse OS — independent assessment product (not OdelPay).
 * Public lobby on this hub: /AssessmentVerseOS
 * Live OS (when running locally): Vite 5000 + Flask 5001.
 */
export function assessmentVerseUrls() {
  const ui = String(process.env.NEXT_PUBLIC_ASSESSMENTVERSE_URL || "http://127.0.0.1:5000/").replace(
    /\/?$/,
    "/",
  );
  const api = String(
    process.env.NEXT_PUBLIC_ASSESSMENTVERSE_API_URL || ui.replace(/:5000\/?$/, ":5001/"),
  ).replace(/\/?$/, "/");
  return {
    ui,
    api,
    login: `${ui}login`,
    schools: `${ui}schools`,
    higher: `${ui}higher`,
  };
}
