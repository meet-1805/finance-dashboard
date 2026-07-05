const fs = require('fs');
const path = require('path');

const projectRoot = 'c:/Users/vsmee/OneDrive/Desktop/Main Project 1';
const directoriesToSearch = ['client/src', 'server'];

const searchStrings = [
  'console.',
  'DEBUG',
  'TODO',
  'FIXME',
  'instanceId',
  'trace(',
  'time(',
  'timeEnd(',
  'detectChanges(',
  'markForCheck(',
  ' any',
  ': any',
  '<any>'
];

function searchDir(dir, results) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git') && !fullPath.includes('dist')) {
        searchDir(fullPath, results);
      }
    } else {
      if (fullPath.endsWith('.ts') || fullPath.endsWith('.js') || fullPath.endsWith('.html') || fullPath.endsWith('.css')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          searchStrings.forEach(searchString => {
            if (line.includes(searchString)) {
              results.push({
                file: fullPath.replace(projectRoot, ''),
                line: index + 1,
                match: searchString,
                content: line.trim()
              });
            }
          });
        });
      }
    }
  }
}

const results = [];
directoriesToSearch.forEach(dir => searchDir(path.join(projectRoot, dir), results));

fs.writeFileSync(path.join(projectRoot, 'audit_results.json'), JSON.stringify(results, null, 2));
console.log(`Found ${results.length} matches. Results written to audit_results.json`);
