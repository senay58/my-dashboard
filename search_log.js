const fs = require('fs');
const readline = require('readline');

async function searchTranscript() {
  const fileStream = fs.createReadStream('C:\\Users\\SENAY\\.gemini\\antigravity\\brain\\61928a28-84ef-431a-b7b5-461b4e5e3b0f\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.includes('2026-09-19')) {
      const parsed = JSON.parse(line);
      // look for user messages or content containing 2026-09-19
      if (parsed.content && (parsed.type === 'USER_INPUT' || parsed.content.includes('2026-09-19'))) {
        console.log(`[${parsed.type}] ${parsed.content.slice(0, 300)}...`);
      }
    }
  }
}
searchTranscript();
