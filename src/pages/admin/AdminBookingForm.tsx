import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Plus, ChevronUp, ChevronDown, Trash2, Pencil,
    FileText, AlignLeft, Hash, ListChecks, Paperclip, FormInput,
    Eye, EyeOff, Asterisk,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { BookingFormField } from "@/hooks/useBookingFormFields";

// ─── Component ────────────────────────────────────────────────────────────────

const AdminBookingForm = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // ── State ────────────────────────────────────────────────────────────────────
    const [showFieldDialog, setShowFieldDialog] = useState(false);
    const [editingField, setEditingField] = useState<BookingFormField | null>(null);
    const [fieldForm, setFieldForm] = useState({
        label: "",
        field_type: "text" as BookingFormField["field_type"],
        placeholder: "",
        required: false,
        applies_to: "all" as BookingFormField["applies_to"],
        options_raw: "",
        accept: "",
    });

    type SectionKey = "pilgrim_info" | "visa_details" | "travel" | "additional";
    const [activeSection, setActiveSection] = useState<SectionKey>("pilgrim_info");

    const sectionLabels: Record<SectionKey, string> = {
        pilgrim_info: "Pilgrim Info",
        visa_details: "Visa & Health",
        travel: "Travel",
        additional: "Additional (Custom)",
    };

    // ── Query ─────────────────────────────────────────────────────────────────────
    const { data: formFields = [] } = useQuery<BookingFormField[]>({
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

    const sectionFields = formFields.filter((f) => f.section === activeSection);

    // ── Dialog helpers ────────────────────────────────────────────────────────────
    const openAddDialog = () => {
        setEditingField(null);
        setFieldForm({ label: "", field_type: "text", placeholder: "", required: false, applies_to: "all", options_raw: "", accept: "" });
        setShowFieldDialog(true);
    };

    const openEditDialog = (f: BookingFormField) => {
        setEditingField(f);
        setFieldForm({
            label: f.label,
            field_type: f.field_type,
            placeholder: f.placeholder ?? "",
            required: f.required,
            applies_to: f.applies_to,
            options_raw: (f.options ?? []).join(", "),
            accept: f.accept ?? "",
        });
        setShowFieldDialog(true);
    };

    // ── Mutations ────────────────────────────────────────────────────────────────

    const saveFieldMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                label: fieldForm.label,
                field_type: fieldForm.field_type,
                placeholder: fieldForm.placeholder || null,
                required: fieldForm.required,
                applies_to: fieldForm.applies_to,
                options: fieldForm.field_type === "select"
                    ? fieldForm.options_raw.split(",").map((s) => s.trim()).filter(Boolean)
                    : null,
                accept: fieldForm.field_type === "file" ? (fieldForm.accept || null) : null,
                sort_order: editingField?.sort_order ?? sectionFields.length,
                section: editingField?.section ?? ("additional" as BookingFormField["section"]),
                updated_at: new Date().toISOString(),
            };
            if (editingField) {
                const { error } = await supabase
                    .from("booking_form_fields" as any)
                    .update(payload as any)
                    .eq("id", editingField.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("booking_form_fields" as any)
                    .insert(payload as any);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["booking-form-fields"] });
            setShowFieldDialog(false);
            toast({ title: editingField ? "Field updated" : "Field added" });
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    const deleteFieldMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("booking_form_fields" as any)
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["booking-form-fields"] }),
    });

    // ── FIX: swap uses a temp value to avoid unique constraint conflict ──────────
    const swapOrderMutation = useMutation({
        mutationFn: async ({ aId, aOrder, bId, bOrder }: { aId: string; aOrder: number; bId: string; bOrder: number }) => {
            const TEMP = -9999;
            // Step 1: move A to temp to free its slot
            const { error: e0 } = await supabase
                .from("booking_form_fields" as any)
                .update({ sort_order: TEMP } as any)
                .eq("id", aId);
            if (e0) throw e0;
            // Step 2: move B into A's original slot
            const { error: e1 } = await supabase
                .from("booking_form_fields" as any)
                .update({ sort_order: aOrder } as any)
                .eq("id", bId);
            if (e1) throw e1;
            // Step 3: move A from temp into B's original slot
            const { error: e2 } = await supabase
                .from("booking_form_fields" as any)
                .update({ sort_order: bOrder } as any)
                .eq("id", aId);
            if (e2) throw e2;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["booking-form-fields"] }),
        onError: (e: any) => toast({ title: "Reorder failed", description: e.message, variant: "destructive" }),
    });

    const swapOrder = (list: BookingFormField[], idx: number, dir: -1 | 1) => {
        const a = list[idx];
        const b = list[idx + dir];
        if (!a || !b) return;
        swapOrderMutation.mutate({ aId: a.id, aOrder: a.sort_order, bId: b.id, bOrder: b.sort_order });
    };

    // ── FIX: enable/disable toggle for ALL fields including system fields ─────────
    const toggleEnabledMutation = useMutation({
        mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
            const { error } = await supabase
                .from("booking_form_fields" as any)
                .update({ enabled } as any)
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: ["booking-form-fields"] });
            toast({ title: vars.enabled ? "Field enabled" : "Field hidden" });
        },
        onError: (e: any) => toast({ title: "Toggle failed", description: e.message, variant: "destructive" }),
    });

    // ── Required toggle — works for ALL fields including system ───────────────────
    const toggleRequiredMutation = useMutation({
        mutationFn: async ({ id, required }: { id: string; required: boolean }) => {
            const { error } = await supabase
                .from("booking_form_fields" as any)
                .update({ required } as any)
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: ["booking-form-fields"] });
            toast({ title: vars.required ? "Marked as required" : "Marked as optional" });
        },
        onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
    });

    // ── Render ────────────────────────────────────────────────────────────────────

    const typeIcons: Record<string, React.ReactNode> = {
        text: <FileText className="h-4 w-4" />,
        textarea: <AlignLeft className="h-4 w-4" />,
        number: <Hash className="h-4 w-4" />,
        select: <ListChecks className="h-4 w-4" />,
        file: <Paperclip className="h-4 w-4" />,
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <FormInput className="h-5 w-5 text-secondary" />
                </div>
                <div>
                    <h1 className="font-heading text-2xl font-bold text-foreground">Booking Form Builder</h1>
                    <p className="text-sm text-muted-foreground">Manage booking form fields — enable/disable, relabel, reorder, add custom fields</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <FormInput className="h-5 w-5" />
                                Form Fields
                            </CardTitle>
                            <CardDescription className="mt-1">
                                System fields can be hidden and relabelled. Custom fields can be fully edited or deleted.
                            </CardDescription>
                        </div>
                        {activeSection === "additional" && (
                            <Button size="sm" onClick={openAddDialog} className="gap-2">
                                <Plus className="h-4 w-4" /> Add Field
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">

                    {/* Section tabs */}
                    <div className="flex gap-1 bg-muted p-1 rounded-lg flex-wrap">
                        {(["pilgrim_info", "visa_details", "travel", "additional"] as const).map((sec) => (
                            <button
                                key={sec}
                                onClick={() => setActiveSection(sec)}
                                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${activeSection === sec
                                    ? "bg-background shadow text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {sectionLabels[sec]}
                            </button>
                        ))}
                    </div>

                    {/* Field list */}
                    {sectionFields.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">
                            {activeSection === "additional"
                                ? "No custom fields yet. Click Add Field to get started."
                                : "No fields in this section."}
                        </p>
                    )}

                    {sectionFields.map((field, idx) => (
                        <div
                            key={field.id}
                            className={`flex items-center gap-3 p-3 border rounded-lg transition-opacity ${field.enabled ? "bg-muted/30" : "bg-muted/10 opacity-60"}`}
                        >
                            {/* Up/Down reorder buttons */}
                            <div className="flex flex-col gap-0.5 shrink-0">
                                <button
                                    className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                    disabled={idx === 0 || swapOrderMutation.isPending}
                                    onClick={() => swapOrder(sectionFields, idx, -1)}
                                    title="Move up"
                                >
                                    <ChevronUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                    disabled={idx === sectionFields.length - 1 || swapOrderMutation.isPending}
                                    onClick={() => swapOrder(sectionFields, idx, 1)}
                                    title="Move down"
                                >
                                    <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            {/* Type icon */}
                            <span className="text-muted-foreground shrink-0">{typeIcons[field.field_type]}</span>

                            {/* Field info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium truncate">{field.label}</p>
                                    {field.is_system && (
                                        <Badge variant="outline" className="text-[10px] gap-1 py-0 shrink-0">
                                            🔒 System
                                        </Badge>
                                    )}
                                    {!field.enabled && (
                                        <Badge variant="secondary" className="text-[10px] shrink-0">Hidden</Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {field.field_type}
                                    {field.placeholder ? ` — "${field.placeholder}"` : ""}
                                    {field.applies_to !== "all" ? ` · ${field.applies_to}` : ""}
                                </p>
                            </div>

                            {/* Required toggle — clickable for ALL fields including system */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-xs text-muted-foreground">Required</span>
                                <Switch
                                    checked={field.required}
                                    onCheckedChange={(v) => toggleRequiredMutation.mutate({ id: field.id, required: v })}
                                    disabled={toggleRequiredMutation.isPending}
                                    title={field.required ? "Mark as optional" : "Mark as required"}
                                />
                            </div>

                            {/* Hide/Show button — works for ALL fields including system */}
                            <button
                                className={`p-1.5 rounded shrink-0 transition-colors ${field.enabled
                                    ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    : "text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                                    }`}
                                onClick={() => toggleEnabledMutation.mutate({ id: field.id, enabled: !field.enabled })}
                                title={field.enabled ? "Hide this field from booking form" : "Show this field on booking form"}
                                disabled={toggleEnabledMutation.isPending}
                            >
                                {field.enabled
                                    ? <Eye className="h-4 w-4" />
                                    : <EyeOff className="h-4 w-4" />
                                }
                            </button>

                            {/* Edit button */}
                            <button
                                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                                onClick={() => openEditDialog(field)}
                                title="Edit field"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </button>

                            {/* Delete — only for non-system fields */}
                            {!field.is_system && (
                                <button
                                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                                    onClick={() => {
                                        if (confirm(`Delete field "${field.label}"?`)) deleteFieldMutation.mutate(field.id);
                                    }}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Add / Edit Field Dialog */}
            <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingField ? "Edit Field" : "Add Field"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* System field notice */}
                        {editingField?.is_system && (
                            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                                🔒 <span><strong>System field</strong> — you can only edit the label and placeholder. Type and settings are locked.</span>
                            </div>
                        )}

                        {/* Label */}
                        <div className="space-y-1.5">
                            <Label>Label <span className="text-destructive">*</span></Label>
                            <Input
                                placeholder="e.g. Passport Bio Page"
                                value={fieldForm.label}
                                onChange={(e) => setFieldForm((f) => ({ ...f, label: e.target.value }))}
                            />
                        </div>

                        {/* Field Type — locked for system fields */}
                        {!editingField?.is_system && (
                            <div className="space-y-1.5">
                                <Label>Field Type</Label>
                                <Select
                                    value={fieldForm.field_type}
                                    onValueChange={(v) => setFieldForm((f) => ({ ...f, field_type: v as BookingFormField["field_type"] }))}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text">Text Input</SelectItem>
                                        <SelectItem value="textarea">Textarea</SelectItem>
                                        <SelectItem value="number">Number</SelectItem>
                                        <SelectItem value="select">Dropdown (Select)</SelectItem>
                                        <SelectItem value="file">File Upload</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Placeholder */}
                        {fieldForm.field_type !== "file" && (
                            <div className="space-y-1.5">
                                <Label>Placeholder (optional)</Label>
                                <Input
                                    placeholder="Hint text shown to user"
                                    value={fieldForm.placeholder}
                                    onChange={(e) => setFieldForm((f) => ({ ...f, placeholder: e.target.value }))}
                                />
                            </div>
                        )}

                        {/* Select options */}
                        {!editingField?.is_system && fieldForm.field_type === "select" && (
                            <div className="space-y-1.5">
                                <Label>Options <span className="text-xs text-muted-foreground">(comma-separated)</span></Label>
                                <Input
                                    placeholder="e.g. Yes, No, N/A"
                                    value={fieldForm.options_raw}
                                    onChange={(e) => setFieldForm((f) => ({ ...f, options_raw: e.target.value }))}
                                />
                            </div>
                        )}

                        {/* File accept */}
                        {!editingField?.is_system && fieldForm.field_type === "file" && (
                            <div className="space-y-1.5">
                                <Label>Accepted File Types <span className="text-xs text-muted-foreground">(optional)</span></Label>
                                <Input
                                    placeholder="e.g. .pdf,.jpg,.png"
                                    value={fieldForm.accept}
                                    onChange={(e) => setFieldForm((f) => ({ ...f, accept: e.target.value }))}
                                />
                            </div>
                        )}

                        {/* Applies To */}
                        {!editingField?.is_system && (
                            <div className="space-y-1.5">
                                <Label>Applies To</Label>
                                <Select
                                    value={fieldForm.applies_to}
                                    onValueChange={(v) => setFieldForm((f) => ({ ...f, applies_to: v as BookingFormField["applies_to"] }))}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Everywhere (User, Agent, Admin)</SelectItem>
                                        <SelectItem value="both">Both (User & Agent)</SelectItem>
                                        <SelectItem value="user">User Booking Form Only</SelectItem>
                                        <SelectItem value="agent">Agent Booking Form Only</SelectItem>
                                        <SelectItem value="admin">Admin Booking Form Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Required toggle */}
                        {!editingField?.is_system && (
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div>
                                    <p className="text-sm font-medium">Required</p>
                                    <p className="text-xs text-muted-foreground">User must fill this field to proceed</p>
                                </div>
                                <Switch
                                    checked={fieldForm.required}
                                    onCheckedChange={(v) => setFieldForm((f) => ({ ...f, required: v }))}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowFieldDialog(false)}>Cancel</Button>
                        <Button
                            onClick={() => saveFieldMutation.mutate()}
                            disabled={!fieldForm.label || saveFieldMutation.isPending}
                        >
                            {saveFieldMutation.isPending ? "Saving…" : editingField ? "Save Changes" : "Add Field"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminBookingForm;
