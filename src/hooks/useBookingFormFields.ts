import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BookingFormField {
    id: string;
    label: string;
    field_type: "text" | "textarea" | "number" | "select" | "file";
    placeholder: string | null;
    required: boolean;
    applies_to: "user" | "agent" | "both";
    sort_order: number;
    options: string[] | null;
    accept: string | null;
    // System-field properties
    field_name: string | null;     // maps to a bookings DB column; null = custom_data
    is_system: boolean;
    enabled: boolean;
    section: "pilgrim_info" | "visa_details" | "travel" | "additional";
}

// ── Config object returned per system field ───────────────────────────────────

export interface SystemFieldConfig {
    enabled: boolean;
    label: string;
    placeholder: string | null;
}

const DEFAULT_CONFIG: SystemFieldConfig = { enabled: true, label: "", placeholder: null };

/**
 * Returns a getter function `get(fieldName)` that resolves the admin-editable
 * config (enabled, label, placeholder) for any named system field.
 * Falls back gracefully if the DB row doesn't exist.
 */
export function useSystemFieldConfig() {
    const { data: rows = [], isLoading } = useQuery<BookingFormField[]>({
        queryKey: ["booking-form-fields", "system"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("booking_form_fields" as any)
                .select("*")
                .eq("is_system", true);
            if (error) throw error;
            return (data ?? []) as unknown as BookingFormField[];
        },
        staleTime: 60_000,
    });

    const map = new Map<string, SystemFieldConfig>();
    rows.forEach((r) => {
        if (r.field_name) {
            map.set(r.field_name, {
                enabled: r.enabled,
                label: r.label,
                placeholder: r.placeholder,
            });
        }
    });

    const get = (fieldName: string, defaultLabel: string, defaultPlaceholder?: string): SystemFieldConfig => {
        return map.get(fieldName) ?? { enabled: true, label: defaultLabel, placeholder: defaultPlaceholder ?? null };
    };

    return { get, isLoading };
}

/** Fetch fields that apply to a given scope (user or agent). Only custom fields (not system). */
export function useBookingFormFields(scope: "user" | "agent") {
    return useQuery<BookingFormField[]>({
        queryKey: ["booking-form-fields", scope],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("booking_form_fields" as any)
                .select("*")
                .eq("is_system", false)
                .in("applies_to", [scope, "both"])
                .eq("enabled", true)
                .order("sort_order", { ascending: true });
            if (error) throw error;
            return (data ?? []) as unknown as BookingFormField[];
        },
        staleTime: 30_000,
    });
}

/** Fetch ALL fields (for admin management view). */
export function useAllBookingFormFields() {
    return useQuery<BookingFormField[]>({
        queryKey: ["booking-form-fields", "all"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("booking_form_fields" as any)
                .select("*")
                .order("section", { ascending: true })
                .order("sort_order", { ascending: true });
            if (error) throw error;
            return (data ?? []) as unknown as BookingFormField[];
        },
    });
}
