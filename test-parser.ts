import * as fs from 'fs';
import { sanitizeLLMHtml } from './src/utils/html-parser';

const filepath = 'C:/Users/Simon Sandrea/.gemini/antigravity/brain/d9f18309-438a-45c6-a0d9-69d2a5ce0ece/.system_generated/steps/26/output.txt';
const data = fs.readFileSync(filepath, 'utf-8');

const match = data.match(/<untrusted-data-[a-z0-9\-]+>([\s\S]+?)<\/untrusted-data-[a-z0-9\-]+>/);

if (match && match[1]) {
    try {
        const jsonStr = match[1].trim();
        const tasks = JSON.parse(jsonStr);
        
        const task = tasks[0];
        console.log(`Title: ${task.title}`);
        console.log(`Original length: ${task.content_body.length}`);
        
        const cleaned = sanitizeLLMHtml(task.content_body);
        console.log(`Cleaned length: ${cleaned.length}`);
        
        fs.writeFileSync('clean_output.html', cleaned);
        console.log('Saved cleaned HTML to clean_output.html');
    } catch (e) {
        console.error('Error parsing JSON:', e);
    }
} else {
    console.log('Could not extract JSON from the file.');
}
