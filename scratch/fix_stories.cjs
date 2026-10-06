const fs = require('fs');
const path = require('path');

const layoutDir = path.join(process.cwd(), 'src/components/interface/layout');
const dirs = fs.readdirSync(layoutDir).filter(f => fs.statSync(path.join(layoutDir, f)).isDirectory());

for (const componentName of dirs) {
  const storyPath = path.join(layoutDir, componentName, `${componentName}.stories.tsx`);
  if (fs.existsSync(storyPath)) {
    let content = fs.readFileSync(storyPath, 'utf8');
    
    // Fix the collision:
    // 1. Revert export const ComponentName back to export const Default
    content = content.replace(new RegExp(`export const ${componentName}: Story =`), `export const Default: Story =`);
    
    // 2. Add name property.
    content = content.replace(/export const Default: Story = \{/, `export const Default: Story = {\n  name: '${componentName}',`);
    
    fs.writeFileSync(storyPath, content, 'utf8');
    console.log(`Fixed ${componentName}.stories.tsx`);
  }
}
