const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function processSql() {
  const inputFile = path.join(__dirname, '../backups/backup_2026-10-20_02-00-00.sql');
  const outputFile = path.join(__dirname, '../backups/backup_clean.sql');
  
  console.log(`Reading from: ${inputFile}`);
  const fileStream = fs.createReadStream(inputFile, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  const out = fs.createWriteStream(outputFile, { encoding: 'utf8' });

  let removedCount = 0;
  let prevLine = null;

  for await (const line of rl) {
    // Check if line is a duplicate unique key like UNIQUE KEY `xxx_2` (`xxx`),?
    if (/^\s*UNIQUE KEY `\w+_\d+` \(`\w+`\),?/.test(line)) {
      removedCount++;
      continue;
    }

    if (prevLine !== null) {
      if (/^\)\s*ENGINE=/.test(line)) {
        prevLine = prevLine.replace(/,\s*$/, '');
      }
      out.write(prevLine + '\n');
    }
    prevLine = line;
  }
  if (prevLine !== null) {
    out.write(prevLine + '\n');
  }
  out.end();
  console.log('Successfully removed duplicate index lines: ' + removedCount);
}

processSql();
