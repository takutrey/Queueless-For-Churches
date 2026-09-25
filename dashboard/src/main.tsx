import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { Provider } from "react-redux";
import { store } from "./store/store.ts";
import { SocketProvider } from "./contexts/SocketContext.tsx";
import { NotificationProvider } from "./contexts/NotificationContext.tsx";
import { useSelector } from "react-redux";
import type { RootState } from "./store/store.ts";

function AppProviders() {
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <BrowserRouter basename="/admin">
      <NotificationProvider user={user}>
        <Toaster richColors position="top-center" />
        <App />
      </NotificationProvider>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <SocketProvider>
        <AppProviders />
      </SocketProvider>
    </Provider>
  </StrictMode>,
);
