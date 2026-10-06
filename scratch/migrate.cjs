const fs = require('fs');
const path = require('path');

const layoutDir = path.join(process.cwd(), 'src/components/interface/layout');
const dirs = fs.readdirSync(layoutDir).filter(f => fs.statSync(path.join(layoutDir, f)).isDirectory());

for (const componentName of dirs) {
  const storyPath = path.join(layoutDir, componentName, `${componentName}.stories.tsx`);
  if (fs.existsSync(storyPath)) {
    let content = fs.readFileSync(storyPath, 'utf8');
    content = content.replace(/title:\s*['"`][^'"`]+['"`]/, "title: 'INTERFACE/Layout'");
    content = content.replace(/export const Default\b/, `export const ${componentName}`);
    fs.writeFileSync(storyPath, content, 'utf8');
    console.log(`Updated ${componentName}.stories.tsx`);
  }
}
