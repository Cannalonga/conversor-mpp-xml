/**
 * 🔧 GERADOR DE ARQUIVOS DE SAMPLE PARA TESTES
 * 
 * Cria arquivos mínimos válidos para testar todos os conversores.
 * 
 * USO: node scripts/generate-samples.js
 */

const fs = require('fs');
const path = require('path');

const sampleDir = path.join(__dirname, 'samples');

// Garantir que o diretório existe
fs.mkdirSync(sampleDir, { recursive: true });

console.log('🔧 Generating sample files for converter tests...\n');

// 1. PNG - 1x1 pixel vermelho
const pngData = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk length + type
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // width=1, height=1
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, // bit depth, color type, compression, filter, interlace, CRC
    0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
    0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, // compressed data
    0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb4, // CRC
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, // IEND chunk
    0xae, 0x42, 0x60, 0x82 // IEND CRC
]);
fs.writeFileSync(path.join(sampleDir, 'sample.png'), pngData);
console.log('✅ sample.png (1x1 pixel)');

// 2. JPG - mínimo válido (1x1 vermelho)
const jpgData = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d,
    0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
    0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
    0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
    0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
    0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45,
    0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
    0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
    0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
    0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3,
    0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
    0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
    0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
    0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4,
    0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
    0x00, 0x00, 0x3f, 0x00, 0xfb, 0xd5, 0xdb, 0x20, 0xa8, 0xf1, 0x7c, 0xa0,
    0xff, 0xd9
]);
fs.writeFileSync(path.join(sampleDir, 'sample.jpg'), jpgData);
console.log('✅ sample.jpg (1x1 pixel)');

// 3. TXT
const txtData = 'Hello World!\nThis is a sample text file for testing.\nLine 3 here.';
fs.writeFileSync(path.join(sampleDir, 'sample.txt'), txtData);
console.log('✅ sample.txt');

// 4. JSON
const jsonData = JSON.stringify({
    "name": "Test Data",
    "items": [
        { "id": 1, "name": "Item 1", "value": 100 },
        { "id": 2, "name": "Item 2", "value": 200 },
        { "id": 3, "name": "Item 3", "value": 300 }
    ],
    "metadata": {
        "created": "2024-01-01",
        "version": "1.0"
    }
}, null, 2);
fs.writeFileSync(path.join(sampleDir, 'sample.json'), jsonData);
console.log('✅ sample.json');

// 5. XML
const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
    <Name>Sample Project</Name>
    <Tasks>
        <Task>
            <UID>1</UID>
            <Name>Task 1</Name>
            <Start>2024-01-01T08:00:00</Start>
            <Finish>2024-01-02T17:00:00</Finish>
        </Task>
        <Task>
            <UID>2</UID>
            <Name>Task 2</Name>
            <Start>2024-01-03T08:00:00</Start>
            <Finish>2024-01-04T17:00:00</Finish>
        </Task>
    </Tasks>
    <Resources>
        <Resource>
            <UID>1</UID>
            <Name>Resource 1</Name>
        </Resource>
    </Resources>
</Project>`;
fs.writeFileSync(path.join(sampleDir, 'sample.xml'), xmlData);
console.log('✅ sample.xml');

// 6. PDF - Minimal válido
const pdfData = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 24 Tf 100 700 Td (Hello PDF!) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000359 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
434
%%EOF`;
fs.writeFileSync(path.join(sampleDir, 'sample.pdf'), pdfData);
console.log('✅ sample.pdf');

// 7. XLSX - Estrutura mínima OpenXML
let AdmZip;
try {
    AdmZip = require('adm-zip');
} catch (e) {
    console.log('⚠️  adm-zip not installed, skipping XLSX/DOCX/ZIP generation');
    AdmZip = null;
}

if (AdmZip) {
try {
    const zip = new AdmZip();
    
    // [Content_Types].xml
    zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`));

    // _rels/.rels
    zip.addFile('_rels/.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`));

    // xl/workbook.xml
    zip.addFile('xl/workbook.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>`));

    // xl/_rels/workbook.xml.rels
    zip.addFile('xl/_rels/workbook.xml.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`));

    // xl/worksheets/sheet1.xml
    zip.addFile('xl/worksheets/sheet1.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>
<row r="1"><c r="A1" t="inlineStr"><is><t>Name</t></is></c><c r="B1" t="inlineStr"><is><t>Value</t></is></c></row>
<row r="2"><c r="A2" t="inlineStr"><is><t>Item1</t></is></c><c r="B2"><v>100</v></c></row>
<row r="3"><c r="A3" t="inlineStr"><is><t>Item2</t></is></c><c r="B3"><v>200</v></c></row>
</sheetData>
</worksheet>`));

    zip.writeZip(path.join(sampleDir, 'sample.xlsx'));
    console.log('✅ sample.xlsx');
} catch (e) {
    console.log('⚠️  sample.xlsx - adm-zip not available, skipping');
}

// 8. DOCX - Estrutura mínima OpenXML
try {
    const zip = new AdmZip();
    
    zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`));

    zip.addFile('_rels/.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`));

    zip.addFile('word/document.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:p><w:r><w:t>Hello World! This is a sample document for testing.</w:t></w:r></w:p>
<w:p><w:r><w:t>Second paragraph with more text.</w:t></w:r></w:p>
</w:body>
</w:document>`));

    zip.writeZip(path.join(sampleDir, 'sample.docx'));
    console.log('✅ sample.docx');
} catch (e) {
    console.log('⚠️  sample.docx - adm-zip not available, skipping');
}

// 9. ZIP com XML dentro
try {
    const zip = new AdmZip();
    zip.addFile('data.xml', Buffer.from(xmlData));
    zip.addFile('info.txt', Buffer.from('This is a test zip file'));
    zip.writeZip(path.join(sampleDir, 'sample.zip'));
    console.log('✅ sample.zip');
} catch (e) {
    console.log('⚠️  sample.zip - adm-zip not available, skipping');
}
} // End if (AdmZip)

// 10. MPP - placeholder (arquivo binário fake)
// MPP é um formato proprietário complexo, criamos um placeholder
const mppPlaceholder = Buffer.concat([
    Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]), // OLE header
    Buffer.alloc(512, 0) // padding
]);
fs.writeFileSync(path.join(sampleDir, 'sample.mpp'), mppPlaceholder);
console.log('✅ sample.mpp (placeholder - may not work with real converter)');

// 11. MP4 - criar vídeo real usando FFmpeg se disponível
const { execSync } = require('child_process');
const mp4Path = path.join(sampleDir, 'sample.mp4');

function createRealMp4() {
    try {
        // Tentar criar um vídeo de 1 segundo com FFmpeg (padrão de teste)
        // Usa lavfi para gerar um padrão de cores sem precisar de input
        const ffmpegCmd = `ffmpeg -y -f lavfi -i "color=c=blue:s=320x240:d=1" -f lavfi -i "anullsrc=r=44100:cl=mono" -t 1 -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -shortest "${mp4Path}"`;
        
        execSync(ffmpegCmd, { 
            stdio: 'pipe',
            timeout: 30000 
        });
        
        console.log('✅ sample.mp4 (real video via FFmpeg, 1 second)');
        return true;
    } catch (e) {
        // FFmpeg não disponível, tentar alternativa
        return false;
    }
}

function createMinimalMp4() {
    // Criar um MP4 com estrutura válida mas mínima
    // Este é um MP4 tecnicamente válido com moov atom
    const ftyp = Buffer.from([
        0x00, 0x00, 0x00, 0x18, // size (24 bytes)
        0x66, 0x74, 0x79, 0x70, // 'ftyp'
        0x69, 0x73, 0x6f, 0x6d, // 'isom' (major brand)
        0x00, 0x00, 0x00, 0x01, // minor version
        0x69, 0x73, 0x6f, 0x6d, // compatible brand: 'isom'
        0x61, 0x76, 0x63, 0x31  // compatible brand: 'avc1'
    ]);
    
    // moov atom vazio mas válido
    const moov = Buffer.from([
        0x00, 0x00, 0x00, 0x6c, // size (108 bytes)
        0x6d, 0x6f, 0x6f, 0x76, // 'moov'
        // mvhd (movie header)
        0x00, 0x00, 0x00, 0x6c, // size
        0x6d, 0x76, 0x68, 0x64, // 'mvhd'
        0x00, 0x00, 0x00, 0x00, // version + flags
        0x00, 0x00, 0x00, 0x00, // creation time
        0x00, 0x00, 0x00, 0x00, // modification time
        0x00, 0x00, 0x03, 0xe8, // timescale (1000)
        0x00, 0x00, 0x00, 0x00, // duration
        0x00, 0x01, 0x00, 0x00, // rate (1.0)
        0x01, 0x00,             // volume (1.0)
        0x00, 0x00,             // reserved
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // reserved
        // matrix (36 bytes)
        0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00,
        // pre-defined (24 bytes)
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x02  // next_track_id
    ]);
    
    const mdat = Buffer.from([
        0x00, 0x00, 0x00, 0x08, // size (8 bytes, empty)
        0x6d, 0x64, 0x61, 0x74  // 'mdat'
    ]);
    
    fs.writeFileSync(mp4Path, Buffer.concat([ftyp, moov, mdat]));
    console.log('⚠️  sample.mp4 (minimal valid MP4 - no actual video data)');
}

// Tentar criar vídeo real, senão criar minimal
if (!createRealMp4()) {
    createMinimalMp4();
}

console.log('\n📁 Samples created in:', sampleDir);
console.log('\n⚠️  NOTE: For full testing, replace with real files:');
console.log('   - sample.mp4: real video (1-5 seconds)');
console.log('   - sample.mpp: real MS Project file');
console.log('   - sample.docx/xlsx: real Office files for best results');
