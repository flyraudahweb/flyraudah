import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ActivityEvent =
    | "package_view"
    | "booking_start"
    | "payment_attempt"
    | "payment_success"
    | "payment_failed";

export interface TrackActivityProps {
    eventType: ActivityEvent;
    packageId?: string;
    bookingId?: string;
    metadata?: Record<string, any>;
}

export const useTrackActivity = () => {
    const { user } = useAuth();

    const trackActivity = async ({
        eventType,
        packageId,
        bookingId,
        metadata = {},
    }: TrackActivityProps) => {
        try {
            const { error } = await supabase.from("user_activity" as any).insert({
                user_id: user?.id || null,
                event_type: eventType,
                package_id: packageId,
                booking_id: bookingId,
                metadata: {
                    ...metadata,
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString(),
                },
            });

            if (error) {
                console.error("Error tracking activity:", error);
            }
        } catch (e) {
            console.error("Failed to track activity:", e);
        }
    };

    return { trackActivity };
};
