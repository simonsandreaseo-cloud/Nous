
import { GoogleGenAI } from "@google/genai";
try {
    const genAI = new GoogleGenAI("test-key");
    console.log("Constructor with string works");
    console.log("Has getGenerativeModel:", !!genAI.getGenerativeModel);
} catch (e) {
    console.error("Constructor with string failed:", e.message);
}
try {
    const genAI = new GoogleGenAI({ apiKey: "test-key" });
    console.log("Constructor with object works");
    console.log("Has getGenerativeModel:", !!genAI.getGenerativeModel);
} catch (e) {
    console.error("Constructor with object failed:", e.message);
}
