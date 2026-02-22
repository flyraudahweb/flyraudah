import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Listens to browser online/offline events and shows a non-intrusive
 * toast so the user knows when connectivity drops or restores.
 */
const OfflineBanner = () => {
    useEffect(() => {
        const handleOffline = () => {
            toast.warning("You're offline", {
                id: "network-status",
                description: "Some features may not work. Reconnecting…",
                duration: Infinity, // stays until dismissed or back online
            });
        };

        const handleOnline = () => {
            toast.success("Back online", {
                id: "network-status",
                description: "Connection restored.",
                duration: 3000,
            });
        };

        window.addEventListener("offline", handleOffline);
        window.addEventListener("online", handleOnline);

        // Check immediately in case the app loaded while offline
        if (!navigator.onLine) handleOffline();

        return () => {
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
        };
    }, []);

    return null;
};

export default OfflineBanner;
