import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    UserPlus,
    Shield,
    ShieldCheck,
    Trash2,
    Edit2,
    Loader2,
    MessageSquare,
} from "lucide-react";

const SUPPORT_CATEGORIES = [
    { key: "general", label: "General Inquiry", description: "General questions and inquiries" },
    { key: "booking", label: "Booking Issues", description: "Booking-related problems" },
    { key: "payment", label: "Payment Issues", description: "Payment and billing queries" },
    { key: "documents", label: "Document Problems", description: "Document upload or verification" },
    { key: "technical", label: "Technical Support", description: "Technical or system issues" },
    { key: "booking_assistance", label: "Pilgrim Booking Assistance", description: "Help guiding pilgrim booking" },
    { key: "visa", label: "Visa Processing", description: "Visa issuance and tracking" },
    { key: "flights", label: "Flights & Transport", description: "Flight ticketing and logistics" },
    { key: "agent_commissions", label: "Agent Commissions", description: "Agent limits and top-ups" },
];

/* ─── Permission definitions ─────────────────────────────── */
const ALL_PERMISSIONS = [
    { key: "overview", label: "Overview", description: "View admin dashboard overview" },
    { key: "packages", label: "Packages", description: "Manage hajj/umrah packages" },
    { key: "payments", label: "Payments", description: "View and manage payments" },
    { key: "pilgrims", label: "Pilgrims", description: "View and manage pilgrim records" },
    { key: "analytics", label: "Analytics", description: "Access analytics and reports" },
    { key: "id_tags", label: "ID Tags", description: "Generate and manage ID tags" },
    { key: "agents", label: "Agent Applications", description: "Review agent applications" },
    { key: "bank_accounts", label: "Bank Accounts", description: "Manage bank account details" },
    { key: "activity", label: "Activity Log", description: "View system activity log" },
    { key: "amendments", label: "Amendments", description: "Handle booking amendment requests" },
    { key: "support", label: "Support Tickets", description: "Manage customer support tickets" },
    { key: "settings", label: "Settings", description: "Modify site settings" },
    { key: "visa_management", label: "Visa Providers", description: "Manage the list of visa providers" },
    { key: "staff_management", label: "Staff Management", description: "Manage staff accounts and permissions" },
];

type StaffMember = {
    user_id: string;
    full_name: string | null;
    email: string | null;
    role: string;
    permissions: string[];
    specialties: string[];
};

/* ─── Hooks ───────────────────────────────────────────────── */
function useStaffList() {
    return useQuery({
        queryKey: ["staff-list"],
        queryFn: async (): Promise<StaffMember[]> => {
            // Get all admin/staff/super_admin user_roles
            const { data: roleRows, error: roleErr } = await supabase
                .from("user_roles")
                .select("user_id, role")
                .in("role", ["admin", "staff", "super_admin"] as never[]);
            if (roleErr) throw roleErr;

            if (!roleRows || roleRows.length === 0) return [];

            const userIds = roleRows.map((r) => r.user_id);

            // Fetch profiles
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name, email")
                .in("id", userIds);

            // Fetch permissions
            const { data: perms } = await supabase
                .from("staff_permissions")
                .select("user_id, permission")
                .in("user_id", userIds);

            const { data: specs } = await supabase
                .from("staff_support_specialties" as any)
                .select("user_id, category")
                .in("user_id", userIds);

            return roleRows.map((r) => {
                const profile = profiles?.find((p) => p.id === r.user_id);
                return {
                    user_id: r.user_id,
                    role: r.role as string,
                    full_name: profile?.full_name ?? null,
                    email: profile?.email ?? null,
                    permissions: perms?.filter((p) => p.user_id === r.user_id).map((p) => p.permission) ?? [],
                    specialties: (specs as any[])?.filter((s) => s.user_id === r.user_id).map((s) => s.category) ?? [],
                };
            });
        },
    });
}

/* ─── Component ───────────────────────────────────────────── */
export default function AdminStaffManagement() {
    const { user, roles } = useAuth();
    const qc = useQueryClient();
    const isSuperAdmin = roles.includes("super_admin" as never);

    const { data: staff = [], isLoading } = useStaffList();

    // ── Create staff dialog state
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteFullName, setInviteFullName] = useState("");
    const [inviteRole, setInviteRole] = useState<"admin" | "staff">("staff");
    const [invitePerms, setInvitePerms] = useState<string[]>(["overview"]);
    const [inviteSpecs, setInviteSpecs] = useState<string[]>([]);
    const [inviteTempPassword, setInviteTempPassword] = useState("");
    const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
    const [inviting, setInviting] = useState(false);

    const generateTempPassword = () => {
        const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
        const pw = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        setInviteTempPassword(pw);
    };

    // ── Edit permissions dialog state
    const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
    const [editPerms, setEditPerms] = useState<string[]>([]);
    const [editRole, setEditRole] = useState<string>("staff");
    const [editSpecs, setEditSpecs] = useState<string[]>([]);

    /* ── Mutations */
    const savePermissions = useMutation({
        mutationFn: async ({ userId, perms, role, specs }: { userId: string; perms: string[]; role: string; specs: string[] }) => {
            // Update role
            const { error: roleErr } = await supabase
                .from("user_roles")
                .update({ role: role as never })
                .eq("user_id", userId);
            if (roleErr) throw roleErr;

            // Delete old permissions then insert new ones
            await supabase.from("staff_permissions").delete().eq("user_id", userId);
            if (perms.length > 0 && role === "staff") {
                const { error: permErr } = await supabase.from("staff_permissions").insert(
                    perms.map((p) => ({ user_id: userId, permission: p, granted_by: user?.id }))
                );
                if (permErr) throw permErr;
            }

            // Update support specialties
            await supabase.from("staff_support_specialties" as any).delete().eq("user_id", userId);
            if (specs.length > 0) {
                const { error: specErr } = await supabase.from("staff_support_specialties" as any).insert(
                    specs.map((c) => ({ user_id: userId, category: c }))
                );
                if (specErr) throw specErr;
            }
        },
        onSuccess: () => {
            toast.success("Staff profile updated successfully");
            qc.invalidateQueries({ queryKey: ["staff-list"] });
            setEditTarget(null);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const removeStaff = useMutation({
        mutationFn: async (userId: string) => {
            await supabase.from("staff_permissions").delete().eq("user_id", userId);
            await supabase.from("user_roles").update({ role: "user" as never }).eq("user_id", userId);
        },
        onSuccess: () => {
            toast.success("Staff access revoked");
            qc.invalidateQueries({ queryKey: ["staff-list"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    /* ── Create staff handler */
    const handleInvite = async () => {
        if (!inviteEmail.trim()) return toast.error("Email is required");
        if (!inviteTempPassword.trim()) return toast.error("Temporary password is required");
        setInviting(true);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData?.session?.access_token) { toast.error("You must be logged in"); return; }

            const { data, error } = await supabase.functions.invoke("invite-staff", {
                body: {
                    email: inviteEmail.trim(),
                    full_name: inviteFullName.trim() || undefined,
                    role: inviteRole,
                    permissions: inviteRole === "staff" ? invitePerms : [],
                    temp_password: inviteTempPassword,
                },
            });

            if (error) { toast.error(error.message ?? "Failed to create staff account"); return; }
            if (data?.error) { toast.error(data.error); return; }

            // Save specialties for newly created user
            if (data?.user_id && inviteSpecs.length > 0) {
                await supabase.from("staff_support_specialties" as any).insert(
                    inviteSpecs.map((c) => ({ user_id: data.user_id, category: c }))
                );
            }

            // Show credentials so admin can share them manually
            setCreatedCredentials({ email: inviteEmail.trim(), password: inviteTempPassword });
            qc.invalidateQueries({ queryKey: ["staff-list"] });
        } catch (e: any) {
            toast.error(e.message ?? "Something went wrong");
        } finally {
            setInviting(false);
        }
    };

    const closeInviteDialog = () => {
        setInviteOpen(false);
        setInviteEmail("");
        setInviteFullName("");
        setInviteTempPassword("");
        setInvitePerms(["overview"]);
        setInviteSpecs([]);
        setCreatedCredentials(null);
    };

    /* ── Toggle a permission in a list */
    const togglePerm = (list: string[], key: string) =>
        list.includes(key) ? list.filter((p) => p !== key) : [...list, key];

    /* ── Role badge */
    const RoleBadge = ({ role }: { role: string }) => {
        if (role === "super_admin") return <Badge className="bg-purple-600 text-white">Super Admin</Badge>;
        if (role === "admin") return <Badge className="bg-blue-600 text-white">Admin</Badge>;
        return <Badge variant="secondary">Staff</Badge>;
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-heading font-bold">Staff Management</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Invite team members and control what each person can access.
                    </p>
                </div>

                {/* Invite button */}
                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <UserPlus className="h-4 w-4" />
                            Invite Staff
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg" onInteractOutside={(e) => { if (createdCredentials) e.preventDefault(); }}>
                        <DialogHeader>
                            <DialogTitle>{createdCredentials ? "✅ Staff Account Created" : "Add Staff Member"}</DialogTitle>
                            <DialogDescription>
                                {createdCredentials
                                    ? "Share these login credentials with the staff member. They can change their password after logging in."
                                    : "Create a login for a team member. You'll share the temporary password with them directly — no email will be sent."
                                }
                            </DialogDescription>
                        </DialogHeader>

                        {/* ── Success: show credentials ── */}
                        {createdCredentials ? (
                            <div className="space-y-4 py-2">
                                <div className="rounded-lg bg-muted p-4 space-y-3 font-mono text-sm border">
                                    <div>
                                        <p className="text-xs text-muted-foreground font-sans mb-1">Email / Username</p>
                                        <p className="font-semibold select-all">{createdCredentials.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-sans mb-1">Temporary Password</p>
                                        <p className="font-semibold select-all">{createdCredentials.password}</p>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">⚠️ Copy these credentials now — the password won't be shown again after you close this dialog.</p>
                                <Button className="w-full" onClick={closeInviteDialog}>Done</Button>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4 py-2">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label>Full Name</Label>
                                            <Input
                                                placeholder="Amina Sani"
                                                value={inviteFullName}
                                                onChange={(e) => setInviteFullName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Email <span className="text-destructive">*</span></Label>
                                            <Input
                                                type="email"
                                                placeholder="amina@raudah.ng"
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label>Role</Label>
                                        <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "staff")}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {isSuperAdmin && <SelectItem value="admin">Admin (full access)</SelectItem>}
                                                <SelectItem value="staff">Staff (limited access)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {inviteRole === "staff" && (
                                        <div className="space-y-2">
                                            <Label>Permissions</Label>
                                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                                {ALL_PERMISSIONS.map((p) => (
                                                    <label key={p.key} className="flex items-start gap-2 cursor-pointer rounded-md border p-2 hover:bg-muted/40 transition-colors">
                                                        <Checkbox
                                                            checked={invitePerms.includes(p.key)}
                                                            onCheckedChange={() => setInvitePerms((prev) => togglePerm(prev, p.key))}
                                                            className="mt-0.5"
                                                        />
                                                        <div>
                                                            <p className="text-sm font-medium leading-none">{p.label}</p>
                                                            <p className="text-xs text-muted-foreground">{p.description}</p>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Support Specialties */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-1.5">
                                            <MessageSquare className="h-3.5 w-3.5 text-primary" />
                                            Support Ticket Specialties
                                        </Label>
                                        <p className="text-xs text-muted-foreground">Which ticket categories will this person handle?</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {SUPPORT_CATEGORIES.map((c) => (
                                                <label key={c.key} className="flex items-start gap-2 cursor-pointer rounded-md border p-2 hover:bg-muted/40 transition-colors">
                                                    <Checkbox
                                                        checked={inviteSpecs.includes(c.key)}
                                                        onCheckedChange={() => setInviteSpecs((prev) => togglePerm(prev, c.key))}
                                                        className="mt-0.5"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium leading-none">{c.label}</p>
                                                        <p className="text-xs text-muted-foreground">{c.description}</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Temp password */}
                                    <div className="space-y-1.5">
                                        <Label>Temporary Password <span className="text-destructive">*</span></Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="text"
                                                placeholder="Set a temporary password"
                                                value={inviteTempPassword}
                                                onChange={(e) => setInviteTempPassword(e.target.value)}
                                                className="font-mono"
                                            />
                                            <Button type="button" variant="outline" size="sm" onClick={generateTempPassword} className="shrink-0">
                                                Generate
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Share this with the staff member. They'll be prompted to change it after first login.</p>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={closeInviteDialog}>Cancel</Button>
                                    <Button
                                        onClick={handleInvite}
                                        disabled={inviting || !inviteTempPassword.trim() || !inviteEmail.trim()}
                                        className="gap-2"
                                    >
                                        {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Create Account
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            {/* Staff list */}
            {isLoading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : staff.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                        <Shield className="h-12 w-12 opacity-30" />
                        <p>No staff members yet. Invite someone to get started.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {staff.map((member) => {
                        const initials = member.full_name
                            ? member.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                            : "?";
                        const isMe = member.user_id === user?.id;
                        const canEdit = isSuperAdmin || (member.role === "staff");
                        const canRemove = !isMe && (isSuperAdmin || member.role === "staff");

                        return (
                            <Card key={member.user_id} className="overflow-hidden">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback className="bg-secondary/20 text-secondary font-semibold text-sm">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-base truncate">
                                                    {member.full_name ?? "Unnamed user"}
                                                </CardTitle>
                                                {isMe && <Badge variant="outline" className="text-xs">You</Badge>}
                                                <RoleBadge role={member.role} />
                                            </div>
                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                                {member.email && (
                                                    <span className="text-xs text-secondary font-medium truncate">
                                                        {member.email}
                                                    </span>
                                                )}
                                                <CardDescription className="text-xs">
                                                    {member.role === "staff"
                                                        ? `${member.permissions.length} permission${member.permissions.length !== 1 ? "s" : ""} assigned`
                                                        : "Full access to all sections"}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {canEdit && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-1.5 h-8"
                                                    onClick={() => {
                                                        setEditTarget(member);
                                                        setEditPerms(member.permissions);
                                                        setEditRole(member.role);
                                                        setEditSpecs(member.specialties);
                                                    }}
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                    Edit
                                                </Button>
                                            )}
                                            {canRemove && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-1.5 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => {
                                                        if (confirm(`Remove ${member.full_name ?? "this user"}'s admin access?`)) {
                                                            removeStaff.mutate(member.user_id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>

                                {(member.role === "staff" && member.permissions.length > 0) || member.specialties.length > 0 ? (
                                    <>
                                        <Separator />
                                        <CardContent className="pt-3 pb-3 space-y-2">
                                            {member.role === "staff" && member.permissions.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {member.permissions.map((p) => {
                                                        const def = ALL_PERMISSIONS.find((x) => x.key === p);
                                                        return (
                                                            <Badge key={p} variant="secondary" className="text-xs">
                                                                <ShieldCheck className="h-3 w-3 mr-1" />
                                                                {def?.label ?? p}
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {member.specialties.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {member.specialties.map((s) => {
                                                        const def = SUPPORT_CATEGORIES.find((x) => x.key === s);
                                                        return (
                                                            <Badge key={s} className="text-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
                                                                <MessageSquare className="h-3 w-3 mr-1" />
                                                                {def?.label ?? s}
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </CardContent>
                                    </>
                                ) : null}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Edit permissions dialog */}
            {editTarget && (
                <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Edit: {editTarget.full_name ?? "Staff Member"}</DialogTitle>
                            <DialogDescription>
                                Update this person's role and access permissions.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label>Role</Label>
                                <Select
                                    value={editRole}
                                    onValueChange={setEditRole}
                                    disabled={editTarget.role === "super_admin" && !isSuperAdmin}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                                        {isSuperAdmin && <SelectItem value="admin">Admin (full access)</SelectItem>}
                                        <SelectItem value="staff">Staff (limited access)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {editRole === "staff" && (
                                <div className="space-y-2">
                                    <Label>Permissions</Label>
                                    <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                                        {ALL_PERMISSIONS.map((p) => (
                                            <label key={p.key} className="flex items-start gap-2 cursor-pointer rounded-md border p-2 hover:bg-muted/40 transition-colors">
                                                <Checkbox
                                                    checked={editPerms.includes(p.key)}
                                                    onCheckedChange={() => setEditPerms((prev) => togglePerm(prev, p.key))}
                                                    className="mt-0.5"
                                                />
                                                <div>
                                                    <p className="text-sm font-medium leading-none">{p.label}</p>
                                                    <p className="text-xs text-muted-foreground">{p.description}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Support Specialties */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5">
                                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                                    Support Ticket Specialties
                                </Label>
                                <p className="text-xs text-muted-foreground">Which ticket categories will this person handle?</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {SUPPORT_CATEGORIES.map((c) => (
                                        <label key={c.key} className="flex items-start gap-2 cursor-pointer rounded-md border p-2 hover:bg-muted/40 transition-colors">
                                            <Checkbox
                                                checked={editSpecs.includes(c.key)}
                                                onCheckedChange={() => setEditSpecs((prev) => togglePerm(prev, c.key))}
                                                className="mt-0.5"
                                            />
                                            <div>
                                                <p className="text-sm font-medium leading-none">{c.label}</p>
                                                <p className="text-xs text-muted-foreground">{c.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
                            <Button
                                onClick={() =>
                                    savePermissions.mutate({ userId: editTarget.user_id, perms: editPerms, role: editRole, specs: editSpecs })
                                }
                                disabled={savePermissions.isPending}
                                className="gap-2"
                            >
                                {savePermissions.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
