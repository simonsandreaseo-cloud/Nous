import mammoth from 'mammoth/mammoth.browser.js';
import { BlogPost } from '@/types/images';

export const parseDocx = async (file: File): Promise<BlogPost> => {
    try {
        const arrayBuffer = await file.arrayBuffer();

        // Extract raw text to split by paragraphs manually for better control
        const result = await mammoth.extractRawText({ arrayBuffer });
        const rawText = result.value;

        // Split by double newlines to approximate paragraphs in a raw text dump
        // Filter out empty strings or whitespace-only strings
        const paragraphs = rawText
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(p => p.length > 0);

        return {
            paragraphs,
            rawText
        };
    } catch (error) {
        console.error("Error parsing DOCX:", error);
        throw new Error("Failed to parse DOCX file. Please ensure it is a valid document.");
    }
};
