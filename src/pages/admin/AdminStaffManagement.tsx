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
} from "lucide-react";

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
    { key: "staff_management", label: "Staff Management", description: "Manage staff accounts and permissions" },
];

type StaffMember = {
    user_id: string;
    full_name: string | null;
    role: string;
    permissions: string[];
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
                .select("id, full_name")
                .in("id", userIds);

            // Fetch permissions
            const { data: perms } = await supabase
                .from("staff_permissions")
                .select("user_id, permission")
                .in("user_id", userIds);

            return roleRows.map((r) => ({
                user_id: r.user_id,
                role: r.role as string,
                full_name: profiles?.find((p) => p.id === r.user_id)?.full_name ?? null,
                permissions: perms?.filter((p) => p.user_id === r.user_id).map((p) => p.permission) ?? [],
            }));
        },
    });
}

/* ─── Component ───────────────────────────────────────────── */
export default function AdminStaffManagement() {
    const { user, roles } = useAuth();
    const qc = useQueryClient();
    const isSuperAdmin = roles.includes("super_admin" as never);

    const { data: staff = [], isLoading } = useStaffList();

    // ── Invite dialog state
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteFullName, setInviteFullName] = useState("");
    const [inviteRole, setInviteRole] = useState<"admin" | "staff">("staff");
    const [invitePerms, setInvitePerms] = useState<string[]>(["overview"]);
    const [inviting, setInviting] = useState(false);

    // ── Edit permissions dialog state
    const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
    const [editPerms, setEditPerms] = useState<string[]>([]);
    const [editRole, setEditRole] = useState<string>("staff");

    /* ── Mutations */
    const savePermissions = useMutation({
        mutationFn: async ({ userId, perms, role }: { userId: string; perms: string[]; role: string }) => {
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
        },
        onSuccess: () => {
            toast.success("Permissions updated successfully");
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

    /* ── Invite staff handler */
    const handleInvite = async () => {
        if (!inviteEmail.trim()) return toast.error("Email is required");
        setInviting(true);
        try {
            const { data, error } = await supabase.functions.invoke("invite-staff", {
                body: {
                    email: inviteEmail.trim(),
                    full_name: inviteFullName.trim() || undefined,
                    role: inviteRole,
                    permissions: inviteRole === "staff" ? invitePerms : [],
                },
            });

            if (error) {
                toast.error(error.message ?? "Failed to send invitation");
                return;
            }

            if (data?.error) {
                toast.error(data.error);
                return;
            }

            toast.success(`Invitation sent to ${inviteEmail}`);
            qc.invalidateQueries({ queryKey: ["staff-list"] });
            setInviteOpen(false);
            setInviteEmail("");
            setInviteFullName("");
            setInvitePerms(["overview"]);
        } catch (e: any) {
            toast.error(e.message ?? "Something went wrong");
        } finally {
            setInviting(false);
        }
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
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Invite a Team Member</DialogTitle>
                            <DialogDescription>
                                They will receive an email invitation to set up their account.
                            </DialogDescription>
                        </DialogHeader>
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
                                    <Label>Email</Label>
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
                                    <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
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
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                            <Button onClick={handleInvite} disabled={inviting} className="gap-2">
                                {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
                                Send Invitation
                            </Button>
                        </DialogFooter>
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
                                            <CardDescription className="text-xs mt-0.5">
                                                {member.role === "staff"
                                                    ? `${member.permissions.length} permission${member.permissions.length !== 1 ? "s" : ""} assigned`
                                                    : "Full access to all sections"}
                                            </CardDescription>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            {canEdit && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-1.5 h-8"
                                                    onClick={() => {
                                                        setEditTarget(member);
                                                        setEditPerms(member.permissions);
                                                        setEditRole(member.role);
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

                                {member.role === "staff" && member.permissions.length > 0 && (
                                    <>
                                        <Separator />
                                        <CardContent className="pt-3 pb-3">
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
                                        </CardContent>
                                    </>
                                )}
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
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
                            <Button
                                onClick={() =>
                                    savePermissions.mutate({ userId: editTarget.user_id, perms: editPerms, role: editRole })
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
