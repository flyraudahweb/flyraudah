import { GoogleGenAI, Type } from '@google/genai';

// Initialize lazily — won't crash if VITE_GEMINI_API_KEY is missing
let ai: GoogleGenAI | null = null;
try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
        ai = new GoogleGenAI({ apiKey });
    } else {
        console.warn('VITE_GEMINI_API_KEY is missing. Passport AI extraction will fall back to manual entry.');
    }
} catch (error) {
    console.warn('Failed to initialize GoogleGenAI', error);
}

export interface ExtractedPassportData {
    isAcceptableQuality: boolean;
    rejectionReason: string;
    firstName: string;
    lastName: string;
    documentNumber: string;
    nationality: string;
    dateOfBirth: string;
    sex: string;
    dateOfIssue: string;
    dateOfExpiry: string;
    faceBoundingBox: {
        ymin: number;
        xmin: number;
        ymax: number;
        xmax: number;
    };
}

export async function extractPassportDataClient(file: File): Promise<ExtractedPassportData> {
    if (!ai) {
        throw new Error('Gemini API is not properly configured. Please set VITE_GEMINI_API_KEY in your .env file.');
    }

    // Convert file to base64
    const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error('Failed to read file'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    // Use flat contents array (no role/parts wrapper) — this matches @google/genai SDK format
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
            {
                inlineData: {
                    data: base64,
                    mimeType: file.type || 'image/jpeg',
                },
            },
            {
                text: "Analyze the provided passport image. First, evaluate the image quality. If the image is blurry, cropped, has severe glare, or is otherwise hard to read, set 'isAcceptableQuality' to false and provide a specific 'rejectionReason'. If the image is clear and readable, set 'isAcceptableQuality' to true and leave 'rejectionReason' empty. Then, extract: First Name (Given Names), Last Name (Surname), Document Number (Passport Number), Nationality, Date of Birth, Sex, Date of Issue, Date of Expiry. Also, find the bounding box of the person's face photo on the passport page. Return the bounding box as an object with ymin, xmin, ymax, xmax properties, where values are normalized between 0 and 1. If the image is rejected, return empty strings for text fields and 0 for bounding box coordinates. Return only a JSON object.",
            },
        ],
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    isAcceptableQuality: { type: Type.BOOLEAN },
                    rejectionReason: { type: Type.STRING },
                    firstName: { type: Type.STRING },
                    lastName: { type: Type.STRING },
                    documentNumber: { type: Type.STRING },
                    nationality: { type: Type.STRING },
                    dateOfBirth: { type: Type.STRING },
                    sex: { type: Type.STRING },
                    dateOfIssue: { type: Type.STRING },
                    dateOfExpiry: { type: Type.STRING },
                    faceBoundingBox: {
                        type: Type.OBJECT,
                        properties: {
                            ymin: { type: Type.NUMBER },
                            xmin: { type: Type.NUMBER },
                            ymax: { type: Type.NUMBER },
                            xmax: { type: Type.NUMBER },
                        },
                        required: ['ymin', 'xmin', 'ymax', 'xmax'],
                    },
                },
                required: [
                    'isAcceptableQuality',
                    'rejectionReason',
                    'firstName',
                    'lastName',
                    'documentNumber',
                    'nationality',
                    'dateOfBirth',
                    'sex',
                    'dateOfIssue',
                    'dateOfExpiry',
                    'faceBoundingBox',
                ],
            },
        },
    });

    if (response.text) {
        return JSON.parse(response.text) as ExtractedPassportData;
    } else {
        throw new Error('No response from AI');
    }
}
