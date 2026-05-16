import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import "./index.css";
import "./App.css";
import { AuthProvider } from "./Context/AuthProvider";
import { FeedCacheProvider } from "./Context/FeedCacheContext";
import { ToastProvider } from "./Context/ToastContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <FeedCacheProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </FeedCacheProvider>
    </AuthProvider>
  </BrowserRouter>,
);
