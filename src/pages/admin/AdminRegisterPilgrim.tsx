import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus } from "lucide-react";
import UnifiedBookingWizard from "@/components/bookings/UnifiedBookingWizard";

const AdminRegisterPilgrim = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="admin-section-title">Register New Pilgrim</h1>
                    <p className="text-sm text-muted-foreground">
                        Select a package, scan the passport to auto-fill details, then create the booking
                    </p>
                </div>
            </div>

            <div className="max-w-xl">
                <UnifiedBookingWizard
                    mode="admin"
                    backUrl="/admin/pilgrims"
                />
            </div>
        </div>
    );
};

export default AdminRegisterPilgrim;
