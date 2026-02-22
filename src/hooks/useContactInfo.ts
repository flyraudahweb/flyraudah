import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContactInfo {
    phone: string;
    email: string;
    address: string;
    whatsapp: string;
}

const DEFAULTS: ContactInfo = {
    phone: "+234 803 537 8973",
    email: "flyraudah@gmail.com",
    address: "Kano, Nigeria",
    whatsapp: "2348035378973",
};

export const useContactInfo = () => {
    const { data } = useQuery({
        queryKey: ["setting", "contact_info"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("site_settings" as any)
                .select("value")
                .eq("key", "contact_info")
                .single();

            if (error) return DEFAULTS;

            const val = (data as any)?.value;
            if (val && typeof val === "object") {
                // Ensure we don't let nulls from DB overwrite our DEFAULTS
                const cleanVal = Object.fromEntries(
                    Object.entries(val).filter(([_, v]) => v != null)
                );
                return { ...DEFAULTS, ...cleanVal };
            }
            return DEFAULTS;
        },
        staleTime: 5 * 60 * 1000,
    });

    // Always fallback to DEFAULTS if data is not yet available or missing fields
    const contact = (data as ContactInfo) || DEFAULTS;
    return {
        phone: contact.phone || DEFAULTS.phone,
        email: contact.email || DEFAULTS.email,
        address: contact.address || DEFAULTS.address,
        whatsapp: contact.whatsapp || DEFAULTS.whatsapp,
    };
};
