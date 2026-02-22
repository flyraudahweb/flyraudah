import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to check if Paystack online payments are enabled.
 * Reads from the `site_settings` table — admin can toggle in Settings.
 */
export const usePaystackEnabled = () => {
    const { data, isLoading } = useQuery({
        queryKey: ["setting", "paystack_enabled"],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("site_settings")
                .select("value")
                .eq("key", "paystack_enabled")
                .single();
            if (error) return true; // default to enabled if can't fetch
            return data?.value === true || data?.value === "true";
        },
        staleTime: 60_000, // cache for 1 minute
    });

    return { paystackEnabled: data ?? true, isLoading };
};
