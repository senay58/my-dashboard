const fs = require('fs');
const readline = require('readline');

async function inspectFirst() {
  const fileStream = fs.createReadStream('C:\\Users\\SENAY\\.gemini\\antigravity\\brain\\61928a28-84ef-431a-b7b5-461b4e5e3b0f\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let count = 0;
  for await (const line of rl) {
    count++;
    if (count === 660 || line.includes('2026-03-19')) {
      const parsed = JSON.parse(line);
      console.log(`Line ${count}:`, parsed.content ? parsed.content.slice(0, 500) : 'no content');
    }
  }
}
inspectFirst();
