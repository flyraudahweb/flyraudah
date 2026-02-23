import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Paperclip, CheckCircle2 } from "lucide-react";
import type { BookingFormField } from "@/hooks/useBookingFormFields";

interface Props {
    fields: BookingFormField[];
    values: Record<string, string>;
    onChange: (key: string, value: string) => void;
    errors?: Record<string, string>;
    uploading?: Record<string, boolean>;
    onUploadingChange?: (key: string, loading: boolean) => void;
}

/**
 * Renders the admin-defined custom booking form fields dynamically.
 * File uploads go to the `booking-attachments` Supabase Storage bucket.
 * The resulting public URL is stored as the field value.
 */
const CustomFieldsSection = ({
    fields,
    values,
    onChange,
    errors = {},
    uploading = {},
    onUploadingChange,
}: Props) => {
    const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const handleFileChange = async (field: BookingFormField, file: File | null) => {
        if (!file) return;
        onUploadingChange?.(field.id, true);
        try {
            const ext = file.name.split(".").pop();
            const path = `${Date.now()}_${field.id}.${ext}`;
            const { error } = await supabase.storage
                .from("booking-attachments")
                .upload(path, file, { upsert: true });
            if (error) throw error;
            const { data: urlData } = supabase.storage
                .from("booking-attachments")
                .getPublicUrl(path);
            onChange(field.id, urlData.publicUrl);
        } catch (err) {
            console.error("File upload error:", err);
            onChange(field.id, "");
        } finally {
            onUploadingChange?.(field.id, false);
        }
    };

    if (fields.length === 0) return null;

    return (
        <div className="space-y-4">
            {fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                    <Label htmlFor={field.id}>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>

                    {/* Text */}
                    {field.field_type === "text" && (
                        <Input
                            id={field.id}
                            placeholder={field.placeholder ?? ""}
                            value={values[field.id] ?? ""}
                            onChange={(e) => onChange(field.id, e.target.value)}
                        />
                    )}

                    {/* Textarea */}
                    {field.field_type === "textarea" && (
                        <textarea
                            id={field.id}
                            placeholder={field.placeholder ?? ""}
                            value={values[field.id] ?? ""}
                            onChange={(e) => onChange(field.id, e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        />
                    )}

                    {/* Number */}
                    {field.field_type === "number" && (
                        <Input
                            id={field.id}
                            type="number"
                            placeholder={field.placeholder ?? ""}
                            value={values[field.id] ?? ""}
                            onChange={(e) => onChange(field.id, e.target.value)}
                        />
                    )}

                    {/* Select */}
                    {field.field_type === "select" && (
                        <Select
                            value={values[field.id] ?? ""}
                            onValueChange={(v) => onChange(field.id, v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={field.placeholder ?? "Select an option"} />
                            </SelectTrigger>
                            <SelectContent>
                                {(field.options ?? []).map((opt) => (
                                    <SelectItem key={opt} value={opt}>
                                        {opt}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* File upload */}
                    {field.field_type === "file" && (
                        <div className="flex items-center gap-3">
                            <input
                                ref={(el) => { fileRefs.current[field.id] = el; }}
                                type="file"
                                id={field.id}
                                accept={field.accept ?? undefined}
                                className="hidden"
                                onChange={(e) => handleFileChange(field, e.target.files?.[0] ?? null)}
                            />
                            <button
                                type="button"
                                onClick={() => fileRefs.current[field.id]?.click()}
                                disabled={uploading[field.id]}
                                className="flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors disabled:opacity-50"
                            >
                                {uploading[field.id] ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Paperclip className="h-4 w-4" />
                                )}
                                {uploading[field.id] ? "Uploading…" : "Choose File"}
                            </button>
                            {values[field.id] && !uploading[field.id] && (
                                <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <a
                                        href={values[field.id]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline truncate max-w-[180px]"
                                    >
                                        Uploaded ✓
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {errors[field.id] && (
                        <p className="text-xs text-destructive">{errors[field.id]}</p>
                    )}
                </div>
            ))}
        </div>
    );
};

export default CustomFieldsSection;
