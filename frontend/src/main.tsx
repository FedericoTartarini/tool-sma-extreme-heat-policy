import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { restorePagesRedirect } from "@/lib/pagesRedirect";

restorePagesRedirect(
  window.location.search,
  window.history,
  import.meta.env.BASE_URL,
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
