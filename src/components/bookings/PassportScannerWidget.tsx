import { useState, useRef } from "react";
import { Upload, User, Loader2, ScanLine, AlertTriangle, CheckCircle2, Pencil, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractPassportDataClient, ExtractedPassportData } from "@/utils/passportExtractor";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Extract face crop from passport image using canvas */
async function cropFace(
    file: File,
    bbox: { ymin: number; xmin: number; ymax: number; xmax: number }
): Promise<string | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (!ctx) { resolve(null); return; }
                const x = bbox.xmin * img.width;
                const y = bbox.ymin * img.height;
                const w = (bbox.xmax - bbox.xmin) * img.width;
                const h = (bbox.ymax - bbox.ymin) * img.height;
                if (w < 10 || h < 10) { resolve(null); return; }
                canvas.width = w;
                canvas.height = h;
                ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
                resolve(canvas.toDataURL("image/jpeg", 0.9));
            } catch { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = URL.createObjectURL(file);
    });
}

/** Parse passport date strings → YYYY-MM-DD */
function parsePassportDate(raw: string): string {
    if (!raw) return "";
    const months: Record<string, string> = {
        JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
        JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
    };
    const m1 = raw.match(/(\d{1,2})\s+([A-Z]{3})\s+(\d{2,4})/i);
    if (m1) {
        const mon = months[m1[2].toUpperCase()] ?? "01";
        const yr = m1[3].length === 2 ? (parseInt(m1[3]) > 30 ? "19" : "20") + m1[3] : m1[3];
        return `${yr}-${mon}-${m1[1].padStart(2, "0")}`;
    }
    if (/^\d{8}$/.test(raw.replace(/\D/g, ""))) {
        const d = raw.replace(/\D/g, "");
        return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    }
    const parts = raw.split(/[\/\-\.]/);
    if (parts.length === 3) {
        const [a, b, c] = parts;
        if (c.length === 4) return `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
    }
    return raw;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PassportExtractedFields {
    fullName: string;
    passportNumber: string;
    nationality: string;
    dateOfBirth: string;   // YYYY-MM-DD
    passportExpiry: string; // YYYY-MM-DD
    gender: "male" | "female";
    profilePicDataUrl: string | null;   // face crop (data URL)
    rawFile: File;                       // original passport image file
    manualPhotoFile?: File | null;       // photo uploaded in manual mode
}

interface Props {
    onExtracted: (fields: PassportExtractedFields) => void;
    className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PassportScannerWidget({ onExtracted, className = "" }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const manualPhotoRef = useRef<HTMLInputElement>(null);
    const [state, setState] = useState<"idle" | "scanning" | "success" | "error" | "manual">("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [manualPhotoPreview, setManualPhotoPreview] = useState<string | null>(null);
    const [manualPhotoFile, setManualPhotoFile] = useState<File | null>(null);

    // Manual fields
    const [manual, setManual] = useState({
        fullName: "", passportNumber: "", nationality: "",
        dateOfBirth: "", passportExpiry: "", gender: "male" as "male" | "female",
    });

    const handleFile = async (file: File) => {
        setErrorMsg("");
        setState("scanning");
        setProfilePic(null);

        try {
            const data: ExtractedPassportData = await extractPassportDataClient(file);

            if (!data.isAcceptableQuality) {
                setErrorMsg(data.rejectionReason || "Image quality too low. Please upload a clearer photo.");
                setState("error");
                setManual((m) => ({
                    ...m,
                    fullName: `${data.firstName} ${data.lastName}`.trim(),
                    passportNumber: data.documentNumber,
                    nationality: data.nationality,
                    dateOfBirth: parsePassportDate(data.dateOfBirth),
                    passportExpiry: parsePassportDate(data.dateOfExpiry),
                    gender: data.sex?.toLowerCase().startsWith("f") ? "female" : "male",
                }));
                return;
            }

            // Crop face
            let facePic: string | null = null;
            if (data.faceBoundingBox) {
                facePic = await cropFace(file, data.faceBoundingBox);
            }
            setProfilePic(facePic);
            setState("success");

            const fields: PassportExtractedFields = {
                fullName: `${data.firstName} ${data.lastName}`.trim(),
                passportNumber: data.documentNumber,
                nationality: data.nationality,
                dateOfBirth: parsePassportDate(data.dateOfBirth),
                passportExpiry: parsePassportDate(data.dateOfExpiry),
                gender: data.sex?.toLowerCase().startsWith("f") ? "female" : "male",
                profilePicDataUrl: facePic,
                rawFile: file,
            };
            onExtracted(fields);
        } catch (err: any) {
            const msg = err.message || "Extraction failed.";
            setErrorMsg(msg);
            setState("error");
        }
    };

    const handleManualPhotoChange = (file: File) => {
        setManualPhotoFile(file);
        const url = URL.createObjectURL(file);
        setManualPhotoPreview(url);
    };

    const handleManualSubmit = () => {
        if (!manual.fullName || !manual.passportNumber) return;
        const fields: PassportExtractedFields = {
            ...manual,
            profilePicDataUrl: manualPhotoPreview,
            rawFile: new File([], "manual.jpg"),
            manualPhotoFile: manualPhotoFile,
        };
        onExtracted(fields);
        setState("success");
        if (manualPhotoPreview) setProfilePic(manualPhotoPreview);
    };

    const inset = "w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm shadow-[inset_0_1px_4px_rgba(0,0,0,0.07)] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow";

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Profile photo + scan button row */}
            <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* Circular photo preview */}
                <div className="relative shrink-0">
                    <div className="w-28 h-28 rounded-full overflow-hidden bg-muted border-4 border-background shadow-md flex items-center justify-center">
                        {(profilePic || manualPhotoPreview) ? (
                            <img src={profilePic || manualPhotoPreview!} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-10 h-10 text-muted-foreground/50" />
                        )}
                    </div>
                    {state === "success" && (
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-background">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                    )}
                </div>

                {/* Scan/upload button area */}
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileRef}
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />

                    {state === "scanning" ? (
                        <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                            <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-foreground">Analyzing passport…</p>
                                <p className="text-xs text-muted-foreground">This takes 5–15 seconds</p>
                            </div>
                        </div>
                    ) : state === "success" ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                <p className="text-sm font-medium text-emerald-800">Data extracted — verify details below</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 w-full"
                                onClick={() => { setState("idle"); setProfilePic(null); fileRef.current?.click(); }}
                            >
                                <ScanLine className="h-4 w-4" /> Rescan Passport
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Button className="gap-2 w-full" onClick={() => fileRef.current?.click()}>
                                <ScanLine className="h-4 w-4" /> Upload & Scan Passport
                            </Button>
                            <p className="text-xs text-center text-muted-foreground">
                                AI will auto-fill your details from the passport photo
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Error banner */}
            {state === "error" && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-800">
                            {errorMsg.includes("not properly configured") ? "AI extraction unavailable" : "Passport scan failed"}
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">{errorMsg}</p>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0" onClick={() => fileRef.current?.click()}>
                        Retry
                    </Button>
                </div>
            )}

            {/* Manual entry form — shown on error OR manual mode */}
            {(state === "error" || state === "manual") && (
                <div className="border border-dashed border-muted-foreground/30 rounded-xl p-4 space-y-4 bg-muted/20">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Pencil className="h-3.5 w-3.5" /> Enter passport details manually
                    </p>

                    {/* Photo upload for manual mode */}
                    <div>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={manualPhotoRef}
                            onChange={(e) => e.target.files?.[0] && handleManualPhotoChange(e.target.files[0])}
                        />
                        <button
                            type="button"
                            onClick={() => manualPhotoRef.current?.click()}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                        >
                            {manualPhotoPreview ? (
                                <img src={manualPhotoPreview} className="w-12 h-14 rounded-lg object-cover border border-border" alt="Photo" />
                            ) : (
                                <div className="w-12 h-14 rounded-lg bg-muted flex items-center justify-center border border-border">
                                    <Camera className="h-5 w-5 text-muted-foreground/50" />
                                </div>
                            )}
                            <div className="text-left">
                                <p className="text-sm font-medium">{manualPhotoPreview ? "Change Photo" : "Upload Passport Photo"}</p>
                                <p className="text-xs text-muted-foreground">Optional — used as profile picture</p>
                            </div>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                            <Label className="text-xs">Full Name (as on passport) *</Label>
                            <input className={`${inset} mt-1`} value={manual.fullName}
                                onChange={(e) => setManual((m) => ({ ...m, fullName: e.target.value }))}
                                placeholder="e.g. Fatima Abubakar Musa" />
                        </div>
                        <div>
                            <Label className="text-xs">Passport Number *</Label>
                            <input className={`${inset} mt-1 uppercase`} value={manual.passportNumber}
                                onChange={(e) => setManual((m) => ({ ...m, passportNumber: e.target.value.toUpperCase() }))}
                                placeholder="A12345678" />
                        </div>
                        <div>
                            <Label className="text-xs">Nationality</Label>
                            <input className={`${inset} mt-1`} value={manual.nationality}
                                onChange={(e) => setManual((m) => ({ ...m, nationality: e.target.value }))}
                                placeholder="e.g. Nigerian" />
                        </div>
                        <div>
                            <Label className="text-xs">Date of Birth</Label>
                            <input type="date" className={`${inset} mt-1`} value={manual.dateOfBirth}
                                onChange={(e) => setManual((m) => ({ ...m, dateOfBirth: e.target.value }))} />
                        </div>
                        <div>
                            <Label className="text-xs">Passport Expiry *</Label>
                            <input type="date" className={`${inset} mt-1`} value={manual.passportExpiry}
                                onChange={(e) => setManual((m) => ({ ...m, passportExpiry: e.target.value }))} />
                        </div>
                        <div className="sm:col-span-2">
                            <Label className="text-xs">Gender</Label>
                            <select className={`${inset} mt-1`} value={manual.gender}
                                onChange={(e) => setManual((m) => ({ ...m, gender: e.target.value as "male" | "female" }))}>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>
                    </div>
                    <Button
                        className="w-full"
                        disabled={!manual.fullName || !manual.passportNumber || !manual.passportExpiry}
                        onClick={handleManualSubmit}
                    >
                        Use These Details
                    </Button>
                </div>
            )}

            {/* "Enter manually" toggle when idle */}
            {state === "idle" && (
                <button
                    className="text-xs text-muted-foreground underline underline-offset-2 w-full text-center"
                    onClick={() => setState("manual")}
                >
                    Enter passport details manually instead
                </button>
            )}
        </div>
    );
}
