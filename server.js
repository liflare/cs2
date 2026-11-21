const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '200mb' }));

// 1. Сохранение раскидки из конструктора
app.post('/api/save-lineup', (req, res) => {
  const { mapId, x, y, posId, posName, lineupId, type, title, desc, images } = req.body;
  const jsonPath = path.join(__dirname, 'data', 'maps', `${mapId}.json`);

  if (!fs.existsSync(jsonPath)) return res.status(404).json({ error: `Файл ${mapId}.json не найден` });

  try {
    let fileData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    if (!fileData.positions.some(p => p.id === posId)) {
      fileData.positions.unshift({ id: posId, name: posName });
    }
    fileData.positionCoords[posId] = { x: parseInt(x), y: parseInt(y) };

    const targetDir = path.join(__dirname, 'images', 'lineups');
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    let lineupBlock = {
      id: lineupId,
      positionId: posId,
      type: type || 'smoke',
      title: title,
      description: desc,
      video: ""
    };

    images.forEach((base64Data, index) => {
      if (!base64Data) return;
      const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
      const fileName = index === 0 ? `${mapId}_${lineupId}.png` : `${mapId}_${lineupId}_${index + 1}.png`;
      fs.writeFileSync(path.join(targetDir, fileName), base64Image, 'base64');
      
      const key = index === 0 ? 'image' : `image${index + 1}`;
      lineupBlock[key] = `images/lineups/${fileName}`;
    });

    const existingIndex = fileData.lineups.findIndex(l => l.id === lineupId);
    if (existingIndex !== -1) {
      fileData.lineups[existingIndex] = { ...fileData.lineups[existingIndex], ...lineupBlock };
    } else {
      fileData.lineups.unshift(lineupBlock);
    }

    fs.writeFileSync(jsonPath, JSON.stringify(fileData, null, 2), 'utf8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Массовая загрузка в "Неотсортированные"
app.post('/api/save-unsorted', (req, res) => {
  const { mapId, images } = req.body;
  const jsonPath = path.join(__dirname, 'data', 'maps', `${mapId}.json`);

  if (!fs.existsSync(jsonPath)) return res.status(404).json({ error: `Файл ${mapId}.json не найден` });

  try {
    let fileData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (!fileData.unsorted) fileData.unsorted = [];

    const targetDir = path.join(__dirname, 'images', 'lineups');
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    images.forEach((base64Data, index) => {
      if (!base64Data) return;
      const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
      const uniqueName = `${mapId}_unsorted_${Date.now()}_${index}.png`;
      fs.writeFileSync(path.join(targetDir, uniqueName), base64Image, 'base64');
      
      fileData.unsorted.unshift(`images/lineups/${uniqueName}`);
    });

    fs.writeFileSync(jsonPath, JSON.stringify(fileData, null, 2), 'utf8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. НОВОЕ: Удаление фото из "Неотсортированных" (и с диска, и из JSON)
app.post('/api/delete-unsorted', (req, res) => {
  const { mapId, imgSrc } = req.body;
  const jsonPath = path.join(__dirname, 'data', 'maps', `${mapId}.json`);

  if (!fs.existsSync(jsonPath)) return res.status(404).json({ error: `Файл ${mapId}.json не найден` });

  try {
    let fileData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (fileData.unsorted) {
      fileData.unsorted = fileData.unsorted.filter(item => item !== imgSrc);
    }

    // Если файл еще лежит на диске — удаляем и его
    const fullImgPath = path.join(__dirname, imgSrc);
    if (fs.existsSync(fullImgPath)) {
      fs.unlinkSync(fullImgPath);
    }

    fs.writeFileSync(jsonPath, JSON.stringify(fileData, null, 2), 'utf8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`\n🚀 Робот-помощник (с удалением фото) запущен на http://localhost:${PORT}`));
