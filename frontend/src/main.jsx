import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { Provider } from "react-redux";
import { store } from "./store/store.js";
import { SocketProvider } from "./contexts/SocketContext.jsx";
import { registerSW } from "virtual:pwa-register";
import InstallPrompt from "./components/InstallPrompt.jsx";

registerSW({ immediate: true });

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <SocketProvider>
        <BrowserRouter>
          <InstallPrompt />
          <Toaster richColors position="top-center" />
          <App />
        </BrowserRouter>
      </SocketProvider>
    </Provider>
  </StrictMode>,
);
