const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, '../app/data/classified-resources.generated.ts'), 'utf8');
const blocks = content.split(/createResource\(\{/).slice(1);
const items = blocks.map(b => {
  const idM = b.match(/id: "([0-9]+)"/);
  const titleM = b.match(/title: '([\s\S]*?)',\s*\n\s*summary:/);
  const typeM = b.match(/type: "([a-z]+)"/);
  return {
    id: idM ? idM[1] : '',
    title: titleM ? titleM[1].slice(0, 120) : '',
    type: typeM ? typeM[1] : '',
  };
});
items.forEach((it, i) => console.log(`${i + 1}. ${it.id} | ${it.type} | ${it.title}`));
