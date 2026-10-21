// Local browser verification against the disposable PostgreSQL test database.
// This is never a production backend. Start only after npm run test:database.
const http = require('node:http');
const { spawn } = require('node:child_process');
const connection = process.env.JEGNIT_TEST_DATABASE_URL;
if (!connection) throw new Error('JEGNIT_TEST_DATABASE_URL is required');
const parsed = new URL(connection);
if (!['localhost', '127.0.0.1'].includes(parsed.hostname) || parsed.pathname !== '/jegnit_regression') throw new Error('Only the disposable local database is allowed');
const psql = process.env.JEGNIT_PSQL || 'C:/Program Files/PostgreSQL/18/bin/psql.exe';
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
const server = http.createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  response.setHeader('Access-Control-Allow-Headers', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  response.setHeader('Content-Type', 'application/json');
  if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
  if (request.url !== '/rest/v1/rpc/inventory_commit_v2' || request.method !== 'POST') { response.writeHead(404); response.end('{}'); return; }
  try {
    let raw = ''; for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw);
    if (!Number.isSafeInteger(body.p_expected_revision)) throw new Error('Invalid revision');
    const query = `SET ROLE anon; SELECT public.inventory_commit_v2(${body.p_mutation_id ? quote(body.p_mutation_id) + '::uuid' : 'NULL'}, ${body.p_expected_revision}, ${body.p_state ? quote(JSON.stringify(body.p_state)) + '::jsonb' : 'NULL'});`;
    const child = spawn(psql, ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-d', connection], { windowsHide: true });
    let output = ''; let error = '';
    child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { error += chunk; });
    child.on('error', err => { response.writeHead(500); response.end(JSON.stringify({message:err.message})); });
    child.on('exit', code => {
      response.writeHead(code ? 400 : 200);
      response.end(code ? JSON.stringify({ message: error }) : output.trim());
    });
    child.stdin.end(query);
  } catch (error) { response.writeHead(400); response.end(JSON.stringify({ message: error.message })); }
});
server.listen(55440, '127.0.0.1', () => console.log('Disposable test API: http://127.0.0.1:55440'));
