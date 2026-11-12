// Prepares the CC-BY 4.0 Khronos "CarConcept" model for the site:
// removes third-party logos (license plate, rim/emissive logos, tire sidewall
// markings) and drops material variants. Output is then optimized with the
// gltf-transform CLI (see package.json "assets:car").
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const [, , input, output] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();

for (const m of root.listMaterials()) {
  const tex = m.getEmissiveTexture();
  if (tex && tex.getSize()?.[0] === 512 && tex.getSize()?.[1] === 128) {
    m.setEmissiveTexture(null).setEmissiveFactor([0, 0, 0]);
  }
  if (m.getName() === 'License') {
    m.setBaseColorTexture(null).setBaseColorFactor([0.8, 0.8, 0.78, 1]).setRoughnessFactor(0.4).setMetallicFactor(0.2);
  }
  if (m.getName() === 'Tireside') {
    m.setBaseColorTexture(null).setNormalTexture(null).setBaseColorFactor([0.014, 0.014, 0.014, 1]);
  }
}
for (const ext of root.listExtensionsUsed()) {
  if (ext.extensionName === 'KHR_materials_variants') ext.dispose();
}
for (const t of root.listTextures()) if (t.listParents().length <= 1) t.dispose();
await io.write(output, doc);
console.log('wrote', output);
