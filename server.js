const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

// Настройка middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));

// Папка для сохранения маршрутов
const SAVED_ROUTES_DIR = path.join(__dirname, 'saved_routes');
if (!fs.existsSync(SAVED_ROUTES_DIR)) {
    fs.mkdirSync(SAVED_ROUTES_DIR);
}

// Утилита для нормализации имен файлов
const normalizeFilename = (name) => {
    return name
        .replace(/\s+/g, '_')
        .replace(/[хХ]/g, 'x')
        .replace(/[^a-zA-Z0-9_\-.]/g, '')
        .toLowerCase();
};

// Функция для поиска файла
const findMatchingFile = (query, files) => {
    return files.find(f => {
        const baseName = f.split('_').slice(0, -1).join('_');
        return normalizeFilename(baseName) === query;
    });
};

// Сохранение маршрута
app.post('/save_route', (req, res) => {
  try {
    const { name, points, lines, layoutSize } = req.body; // Получаем размер планировки

    // Конвертируем абсолютные координаты в относительные (0-1)
    const relativePoints = points.map(p => ({
      x: p.x / layoutSize.width,  // Нормализуем X
      y: p.y / layoutSize.height  // Нормализуем Y
    }));

    const routeData = {
      originalName: name,
      data: {
        layoutSize,  // Сохраняем исходный размер планировки
        points: relativePoints,  // Точки в относительных координатах
        lines       // Связи между точками
      },
      savedAt: new Date().toISOString()
    };

    const filename = `${normalizeFilename(name)}_${Date.now()}.json`;
    const filePath = path.join(SAVED_ROUTES_DIR, filename);

    fs.writeFileSync(filePath, JSON.stringify(routeData, null, 2));
    res.json({ success: true, filename });
  } catch (error) {
    console.error('Ошибка сохранения:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение списка маршрутов
app.get('/get_saved_routes', (req, res) => {
    try {
        const files = fs.readdirSync(SAVED_ROUTES_DIR)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const content = fs.readFileSync(path.join(SAVED_ROUTES_DIR, file), 'utf8');
                const { originalName, savedAt } = JSON.parse(content);
                return { originalName, filename: file, savedAt };
            });

        res.json(files);
    } catch (error) {
        console.error('Ошибка чтения маршрутов:', error);
        res.status(500).json({ error: 'Ошибка сервера при чтении маршрутов' });
    }
});

// Загрузка конкретного маршрута
app.get('/load_route', (req, res) => {
    try {
        const { name } = req.query;
        if (!name) {
            return res.status(400).json({ error: 'Не указано имя маршрута' });
        }

        const decodedName = decodeURIComponent(name);
        const normalizedQuery = normalizeFilename(decodedName);
        const files = fs.readdirSync(SAVED_ROUTES_DIR);
        const file = findMatchingFile(normalizedQuery, files);

        if (!file) {
            console.log('Файл не найден. Доступные файлы:', files);
            return res.status(404).json({ error: 'Маршрут не найден' });
        }

        const filePath = path.join(SAVED_ROUTES_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const { originalName, data, savedAt } = JSON.parse(content);
        
        res.json({ 
            originalName,
            filename: file,
            data,
            savedAt
        });
    } catch (error) {
        console.error('Ошибка загрузки маршрута:', error);
        res.status(500).json({ error: 'Ошибка сервера при загрузке маршрута' });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Маршруты сохраняются в: ${SAVED_ROUTES_DIR}`);
});