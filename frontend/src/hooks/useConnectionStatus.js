import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setConnectionStatus } from "../lib/QueueSlice";

export default function useConnectionStatus() {
  const dispatch = useDispatch();

  useEffect(() => {
    const goOnline = () => dispatch(setConnectionStatus({ online: true }));
    const goOffline = () => dispatch(setConnectionStatus({ online: false }));

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    dispatch(setConnectionStatus({ online: navigator.onLine }));

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [dispatch]);
}
