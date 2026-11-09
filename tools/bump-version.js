// version.js 의 버전을 한 칸 올림: v0.2 → v0.2.01, v0.2.01 → v0.2.02 (두 자리 이상은 그대로 늘어남)
const fs = require('fs'), file = process.argv[2] || 'version.js';
const src = fs.readFileSync(file, 'utf8'), m = /'v(\d+)\.(\d+)(?:\.(\d+))?'/.exec(src);
if (!m) { console.error('version.js 에서 버전을 찾지 못함'); process.exit(1); }
const next = `v${m[1]}.${m[2]}.${String(+(m[3] || 0) + 1).padStart(2, '0')}`;
fs.writeFileSync(file, src.replace(m[0], `'${next}'`));
console.log(next);
