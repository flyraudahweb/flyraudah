import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

const clientSchema = z.object({
  full_name: z.string().min(2, "Name is required"),
  phone: z.string().regex(/^\+234\d{10}$/, "Use +234 format"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  passport_number: z.string().optional(),
  passport_expiry: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  notes: z.string().optional(),
});

type ClientForm = z.infer<typeof clientSchema>;

interface AddClientDialogProps {
  agentId: string;
  onSuccess: () => void;
  editClient?: any;
}

const AddClientDialog = ({ agentId, onSuccess, editClient }: AddClientDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEdit = !!editClient;

  const form = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: editClient
      ? {
        full_name: editClient.full_name,
        phone: editClient.phone,
        email: editClient.email || "",
        passport_number: editClient.passport_number || "",
        passport_expiry: editClient.passport_expiry || "",
        date_of_birth: editClient.date_of_birth || "",
        gender: editClient.gender || "",
        notes: editClient.notes || "",
      }
      : { gender: "" },
  });

  const onSubmit = async (values: ClientForm) => {
    setLoading(true);
    try {
      const payload = {
        agent_id: agentId,
        full_name: values.full_name,
        phone: values.phone,
        email: values.email || null,
        passport_number: values.passport_number || null,
        passport_expiry: values.passport_expiry || null,
        date_of_birth: values.date_of_birth || null,
        gender: values.gender || null,
        notes: values.notes || null,
      };

      if (isEdit) {
        const { error } = await supabase.from("agent_clients").update(payload).eq("id", editClient.id);
        if (error) throw error;
        toast.success("Client updated");
      } else {
        const { error } = await supabase.from("agent_clients").insert(payload);
        if (error) throw error;
        toast.success("Client added");
      }

      setOpen(false);
      form.reset();
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm">Edit</Button>
        ) : (
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Client
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Client" : "Add New Client"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update client profile information below." : "Enter the client's details to register them for bookings."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Full Name *</Label>
            <Input {...form.register("full_name")} placeholder="Pilgrim full name" />
            {form.formState.errors.full_name && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.full_name.message}</p>
            )}
          </div>
          <div>
            <Label>Phone *</Label>
            <Input {...form.register("phone")} placeholder="+2348123456789" />
            {form.formState.errors.phone && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.phone.message}</p>
            )}
          </div>
          <div>
            <Label>Email</Label>
            <Input {...form.register("email")} placeholder="client@email.com" type="email" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Passport Number</Label>
              <Input {...form.register("passport_number")} placeholder="A12345678" />
            </div>
            <div>
              <Label>Passport Expiry</Label>
              <Input type="date" {...form.register("passport_expiry")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" {...form.register("date_of_birth")} />
            </div>
            <div>
              <Label>Gender</Label>
              <select {...form.register("gender")} className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea {...form.register("notes")} placeholder="Any notes about this client..." rows={2} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Update Client" : "Add Client"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientDialog;
