import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";

export const downloadMultipleDocuments = async (
    documents: { url: string; fileName: string; type: string; pilgrimName?: string }[],
    zipName: string = "documents.zip"
) => {
    if (documents.length === 0) return;

    try {
        const zip = new JSZip();
        let addedCount = 0;

        // Create folders based on type if needed, or flat structure
        for (const doc of documents) {
            // Extract path from public URL if it's a full URL, or just use the path
            // Assuming documents.file_url might be the storage path or full url
            let storagePath = doc.url;

            // If it's a full URL, we might need to extract the path (e.g. from passport-photos bucket)
            // But usually in this project, file_url holds the path like "user_id/timestamp_name.jpg"

            // Try downloading from Supabase storage
            // Note: Adjust the bucket name if you store different docs in different buckets. 
            // Assuming "passport-photos" based on AdminBookPilgrim.tsx
            const { data, error } = await supabase.storage
                .from("passport-photos")
                .download(storagePath);

            if (error) {
                console.error(`Error downloading ${storagePath}:`, error);
                continue;
            }

            if (data) {
                // Construct a clean filename
                const safePilgrimName = doc.pilgrimName ? doc.pilgrimName.replace(/[^a-z0-9]/gi, '_') : 'Unknown';
                const extension = doc.fileName.split('.').pop() || 'pdf';
                const cleanFileName = `${safePilgrimName}_${doc.type}_${Date.now()}.${extension}`;

                zip.file(cleanFileName, data);
                addedCount++;
            }
        }

        if (addedCount === 0) {
            throw new Error("No files could be downloaded.");
        }

        const content = await zip.generateAsync({ type: "blob" });

        // Trigger download
        const url = window.URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = zipName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return true;
    } catch (error) {
        console.error("Bulk download error:", error);
        throw error;
    }
};
