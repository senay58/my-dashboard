const fs = require('fs');

async function checkScripts() {
  const dir = 'C:\\Users\\SENAY\\Desktop\\Projects\\jegnit-inventory\\frontend';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') || f.endsWith('.json'));
  for (const f of files) {
    const content = fs.readFileSync(`${dir}\\${f}`, 'utf-8');
    if (content.includes('2026-09-19')) {
      console.log(`Found in file ${f}`);
    }
  }
}
checkScripts();
