import { useRef, forwardRef, useImperativeHandle } from "react";
import { QRCodeSVG } from "qrcode.react";
import { formatPrice } from "@/data/packages";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ReceiptData {
    reference: string;
    packageName: string;
    pilgrimName: string;
    amount: number;
    method: string;
    status: string;
    date: string;
    verifiedAt?: string;
}

export interface PaymentReceiptHandle {
    downloadPDF: () => Promise<void>;
    print: () => void;
}

const PaymentReceipt = forwardRef<PaymentReceiptHandle, { data: ReceiptData }>(
    ({ data }, ref) => {
        const receiptRef = useRef<HTMLDivElement>(null);
        const year = new Date().getFullYear();

        useImperativeHandle(ref, () => ({
            downloadPDF: async () => {
                if (!receiptRef.current) return;
                const canvas = await html2canvas(receiptRef.current, {
                    scale: 2,
                    backgroundColor: "#ffffff",
                    useCORS: true,
                });
                const imgData = canvas.toDataURL("image/png");
                const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
                const w = pdf.internal.pageSize.getWidth() - 20;
                const h = (canvas.height / canvas.width) * w;
                pdf.addImage(imgData, "PNG", 10, 10, w, h);
                pdf.save(`receipt-${data.reference}.pdf`);
            },
            print: () => {
                const content = receiptRef.current;
                if (!content) return;
                const win = window.open("", "_blank");
                if (!win) return;
                win.document.write(`
          <html><head><title>Receipt - ${data.reference}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: 'Inter', -apple-system, sans-serif; }
            @media print { body { padding: 0; } }
          </style>
          </head><body>${content.outerHTML}</body></html>
        `);
                win.document.close();
                win.print();
            },
        }));

        const methodLabel =
            data.method === "paystack" ? "Paystack (Card)" :
                data.method === "bank_transfer" ? "Bank Transfer" :
                    data.method === "card" ? "Card Payment" : data.method;

        return (
            <div
                ref={receiptRef}
                className="w-full max-w-[420px] mx-auto bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100"
                style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
            >
                {/* Header */}
                <div
                    style={{
                        background: "linear-gradient(135deg, #084733 0%, #0d6b4a 100%)",
                        padding: "20px 24px",
                        textAlign: "center",
                    }}
                >
                    <img
                        src="/logo.png"
                        alt="Raudah Logo"
                        style={{ height: 28, margin: "0 auto 6px", filter: "brightness(0) invert(1)" }}
                    />
                    <h2 style={{ color: "#ffffff", fontSize: 16, fontWeight: 700, margin: 0 }}>
                        PAYMENT RECEIPT
                    </h2>
                    <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, margin: "2px 0 0" }}>
                        Raudah Travels & Tours • {year}
                    </p>
                </div>

                {/* Green stripe */}
                <div
                    style={{
                        height: 4,
                        background: "repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(255,255,255,0.15) 6px, rgba(255,255,255,0.15) 12px), linear-gradient(135deg, #16a34a, #15803d, #166534)",
                    }}
                />

                {/* Status */}
                <div style={{ textAlign: "center", padding: "16px 24px 0" }}>
                    <span
                        style={{
                            display: "inline-block",
                            padding: "4px 16px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            background: data.status === "verified" ? "#dcfce7" : "#fef9c3",
                            color: data.status === "verified" ? "#16a34a" : "#ca8a04",
                            textTransform: "capitalize",
                        }}
                    >
                        {data.status === "verified" ? "✓ Verified" : data.status}
                    </span>
                </div>

                {/* Amount */}
                <div style={{ textAlign: "center", padding: "12px 24px 8px" }}>
                    <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 2px" }}>Amount Paid</p>
                    <p style={{ fontSize: 28, fontWeight: 800, color: "#111827", margin: 0 }}>
                        {formatPrice(data.amount)}
                    </p>
                </div>

                {/* Details Grid */}
                <div style={{ padding: "8px 24px 16px" }}>
                    <div
                        style={{
                            background: "#f9fafb",
                            borderRadius: 12,
                            padding: 16,
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "12px 16px",
                        }}
                    >
                        <Detail label="Reference" value={data.reference} mono />
                        <Detail label="Date" value={new Date(data.date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })} />
                        <Detail label="Package" value={data.packageName} />
                        <Detail label="Payment Method" value={methodLabel} />
                        <Detail label="Pilgrim" value={data.pilgrimName} span2 />
                        {data.verifiedAt && (
                            <Detail label="Verified" value={new Date(data.verifiedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })} />
                        )}
                    </div>
                </div>

                {/* QR Code */}
                <div style={{ textAlign: "center", padding: "0 24px 16px" }}>
                    <QRCodeSVG
                        value={`RAUDAH-RECEIPT:${data.reference}:${data.amount}`}
                        size={80}
                        level="M"
                        fgColor="#084733"
                        bgColor="transparent"
                    />
                    <p style={{ fontSize: 9, color: "#9ca3af", marginTop: 4 }}>
                        Scan to verify payment
                    </p>
                </div>

                {/* Footer */}
                <div
                    style={{
                        background: "#084733",
                        padding: "10px 24px",
                        textAlign: "center",
                    }}
                >
                    <p style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", margin: 0, fontStyle: "italic" }}>
                        Your Gateway to the Holy Lands • Kano, Nigeria
                    </p>
                    <p style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", margin: "2px 0 0" }}>
                        This is a computer-generated receipt.
                    </p>
                </div>
            </div>
        );
    }
);

PaymentReceipt.displayName = "PaymentReceipt";

const Detail = ({ label, value, mono, span2 }: { label: string; value: string; mono?: boolean; span2?: boolean }) => (
    <div style={span2 ? { gridColumn: "1 / -1" } : undefined}>
        <p style={{ fontSize: 10, color: "#9ca3af", margin: "0 0 1px", fontWeight: 500 }}>{label}</p>
        <p style={{ fontSize: 12, color: "#374151", margin: 0, fontWeight: 600, fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit" }}>
            {value}
        </p>
    </div>
);

export default PaymentReceipt;
