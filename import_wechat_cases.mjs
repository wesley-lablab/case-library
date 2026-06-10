import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const decodedDirname = decodeURIComponent(__dirname).replace(/^\/([A-Za-z]):\//, '$1:/');

const wechatCasesPath = path.join(decodedDirname, 'public', 'wechat_cases.json');
const dataJsonPath = path.join(decodedDirname, 'public', 'data.json');

console.log('=== 公众号案例导入工具 ===');
console.log('工作目录:', decodedDirname);

let wechatCases;
try {
  const wechatData = fs.readFileSync(wechatCasesPath, 'utf8');
  wechatCases = JSON.parse(wechatData);
  console.log(`读取公众号案例文件成功，共 ${wechatCases.cases.length} 个案例`);
} catch (err) {
  console.error('读取公众号案例文件失败:', err.message);
  process.exit(1);
}

let existingCases = [];
try {
  const existingData = fs.readFileSync(dataJsonPath, 'utf8');
  const parsed = JSON.parse(existingData);
  existingCases = parsed.cases || [];
  console.log(`读取现有data.json成功，共 ${existingCases.length} 个案例`);
} catch (err) {
  console.log('data.json不存在或为空，将创建新文件');
}

const existingIds = new Set(existingCases.map(c => c.id));
const newCases = [];
const skippedCases = [];

wechatCases.cases.forEach(c => {
  if (!existingIds.has(c.id)) {
    newCases.push(c);
    existingIds.add(c.id);
  } else {
    skippedCases.push(c.id);
  }
});

console.log(`\n新增案例: ${newCases.length} 个`);
console.log(`跳过重复案例: ${skippedCases.length} 个`);

if (skippedCases.length > 0) {
  console.log('跳过的案例ID:', skippedCases);
}

const allCases = [...existingCases, ...newCases];

allCases.sort((a, b) => {
  return new Date(b.date || '1970-01-01').getTime() - new Date(a.date || '1970-01-01').getTime();
});

const outputData = {
  version: '1.0',
  exportDate: new Date().toISOString(),
  cases: allCases
};

try {
  fs.writeFileSync(dataJsonPath, JSON.stringify(outputData, null, 2), 'utf8');
  console.log(`\n✓ 成功写入data.json，共 ${allCases.length} 个案例`);
} catch (err) {
  console.error('写入data.json失败:', err.message);
  process.exit(1);
}

console.log('\n=== 导入完成 ===');
console.log(`原有案例: ${existingCases.length}`);
console.log(`新增案例: ${newCases.length}`);
console.log(`总计案例: ${allCases.length}`);
console.log('\n请刷新案例库页面查看导入结果。如果localStorage中有旧数据，请使用"覆盖导入"模式。');