// Новый
class RoutePlanner {
  constructor() {
    // Проверяем готовность DOM
    if (!document.getElementById('layout')) {
      throw new Error('Элемент layout не найден. Проверьте структуру HTML');
    }

    // Инициализация состояния (один раз!)
    this.state = {
      points: [],
      selectedPointType: 'storage',
      isPointMode: false,
      isRouteMode: false,
	  isRouteMode: false,
      currentRoute: null,
      routes: []
    };

    // Получаем элементы (один раз!)
   this.elements = {
  layout: document.getElementById('layout'),
  svgPlan: document.getElementById('svg-plan') || this.createSvgElement('svg-plan'),
  routesSvg: document.getElementById('routes-svg') || this.createSvgElement('routes-svg'),
  pointsPanel: document.getElementById('pointsPanel'),
  fileUpload: document.getElementById('file-upload'),
  uploadBtn: document.getElementById('upload-btn'),
  addPointsBtn: document.getElementById('add-points-btn'),
  removePointsBtn: document.getElementById('remove-points-btn'), // <- Добавлена запятая
  routePlanBtn: document.getElementById('route-plan-btn'),
  routeMenu: document.getElementById('route-menu'),
  addRouteBtn: document.getElementById('add-route-btn'),
  removeRouteBtn: document.getElementById('remove-route-btn') // Здесь запятая не нужна (последнее свойство)
};

    

    // Проверка элементов
    if (!this.elements.fileUpload || !this.elements.uploadBtn) {
      console.error('Не найдены элементы загрузки файла');
    }
	this.elements.svgPlan.setAttribute('viewBox', '0 0 387.75 291');
    this.elements.routesSvg.setAttribute('viewBox', '0 0 387.75 291');
  // Привязка контекста для методов
  this.handleSvgClick = this.handleSvgClick.bind(this);
  this.handleUploadClick = this.handleUploadClick.bind(this);
  this.handleFileUpload = this.handleFileUpload.bind(this);
  this.handleRouteClick = this.handleRouteClick.bind(this);
  this.finishRoute = this.finishRoute.bind(this);
  this.pointRadius = 8; // Должно совпадать с r="8" у точек
  
  

    // Инициализация
    this.checkRequiredElements();
    this.setupEventListeners();
    this.setupFileUpload(); // После setupEventListeners
    this.init();
	this.initRouteMenu();
	this.elements.svgPlan.addEventListener('click', (e) => {
  const pointElement = e.target.closest('.point');
  
  // Если клик по точке в режиме маршрута
  if (pointElement && this.state.isRouteMode) {
    e.preventDefault();
    pointElement.style.transform = 'none';
    const pointId = pointElement.dataset.id;
    const point = this.state.points.find(p => p.id === pointId);
    this.processRoutePoint(point); // Ваш метод обработки точек маршрута
    return;
  }
  
  // Стандартная обработка (для добавления точек)
  if (this.state.isPointMode && !this.state.isRouteMode) {
    this.handleSvgClick(e); // Ваш существующий метод
  }
});
	
        // Настройка обработчиков
    this.setupRouteHandlers();

    // Дополнительная проверка
    this.checkRequiredElements();
    this.init();
	
	  // Создаем отладочную панель
  if (!document.getElementById('debug-panel')) {
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.className = 'debug-panel';
    debugPanel.innerHTML = 'Debug info will appear here';
    document.body.appendChild(debugPanel);
  }
 {
    // Гарантированно создаём SVG, если его нет
    this.elements.routesSvg = document.querySelector('svg#routes-svg') || 
                             this.createSvgElement('routes-svg');
    
    console.log('routesSvg после создания:', this.elements.routesSvg);
  } 
  
  // Программное создание тестового маршрута
  window.debugCreateRoute = (points) => {
    this.createTestRoute(points);
  };
  
}

createTestRoute(points) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  
  path.setAttribute('d', d);
  path.setAttribute('stroke', '#ff0000');
  path.setAttribute('stroke-width', '3');
  path.setAttribute('class', 'debug-route');
  
  this.elements.routesSvg.appendChild(path);
  console.log('Тестовый маршрут создан:', points);
	
  }
  
  // Метод для настройки обработчиков событий
  setupEventListeners() {
    // Выбор типа точки
    if (this.elements.pointsPanel) {
      this.elements.pointsPanel.querySelectorAll('.point-type').forEach(btn => {
        btn.addEventListener('click', () => {
          this.selectPointType(btn.dataset.type);
        });
      });
    }

    // Кнопка "Добавить точки"
    if (this.elements.addPointsBtn) {
      this.elements.addPointsBtn.addEventListener('click', () => this.togglePointMode());
    }

    // Кнопка "Удалить последнюю точку"
    if (this.elements.removePointsBtn) {
      this.elements.removePointsBtn.addEventListener('click', () => this.removeLastPoint());
    }
  // Обработчик для кнопки удаления
document.getElementById('route-plan-btn')?.addEventListener('click', (e) => {
  const menu = document.getElementById('route-menu');
  if (!menu) {
    console.error('Элемент меню не найден. Проверьте HTML-структуру.');
    return;
  }
  
  this.state.isRouteMode = !this.state.isRouteMode;
  menu.classList.toggle('show');
  console.log('Режим маршрута:', this.state.isRouteMode ? 'ВКЛ' : 'ВЫКЛ');
});
    // Клик по SVG
    if (this.elements.svgPlan) {
      this.elements.svgPlan.addEventListener('click', this.handleSvgClick);
    }
	  // Обработчик для построения маршрутов
  this.elements.svgPlan.addEventListener('click', this.handleRouteClick);
  
  // Обработчик для кнопки "Добавить путь"
  if (this.elements.addRouteBtn) {
    this.elements.addRouteBtn.addEventListener('click', () => {
      this.startRouteCreation();
      this.toggleRouteMenu(false);
    });
  }
  }
    initRouteMenu() {
    const routeBtn = document.getElementById('route-plan-btn');
    const routeMenu = document.getElementById('route-menu');
    
    // Рассчитываем позицию меню
    const updateMenuPosition = () => {
      const btnRect = routeBtn.getBoundingClientRect();
      routeMenu.style.left = `${btnRect.left}px`;
      routeMenu.style.top = `${btnRect.bottom + window.scrollY}px`;
    };
    
    // Обработчик клика по кнопке
    routeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      updateMenuPosition();
      routeMenu.classList.toggle('show');
    });
    
    // Закрытие при клике вне меню
    document.addEventListener('click', () => {
      routeMenu.classList.remove('show');
    });
    
    // Предотвращаем закрытие при клике внутри меню
    routeMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Обработчики пунктов меню
    document.getElementById('add-route-btn').addEventListener('click', () => {
      this.startRouteCreation();
      routeMenu.classList.remove('show');
    });
    
    document.getElementById('remove-route-btn').addEventListener('click', () => {
      this.removeLastRoute();
      routeMenu.classList.remove('show');
    });
  }
   // Получение реальных координат с учетом всех трансформаций
  getActualPosition(point) {
    const pointElem = document.querySelector(`[data-id="${point.id}"]`);
    if (!pointElem) {
      console.error('Элемент точки не найден', point.id);
      return point;
    }

    const bbox = pointElem.getBBox();
    return {
      x: bbox.x + bbox.width/2,
      y: bbox.y + bbox.height/2
    };
  }
  
  startRouteCreation() {
  this.state.isRouteMode = true;
  document.body.classList.add('route-mode');
  console.log('Режим создания маршрута активирован');
  document.body.style.cursor = 'crosshair';;
}
  removeLastPoint() {
  if (this.state.points.length === 0) {
    this.showNotification('Нет точек для удаления', 'warning');
    return;
    // Ваш код для удаления маршрута
    console.log('Последний маршрут удалён');	
  }
  
  
  const lastPoint = this.state.points.pop();
  const pointElement = this.elements.svgPlan.querySelector(`[data-id="${lastPoint.id}"]`);
  if (pointElement) {
    pointElement.remove();
  }
  
  this.showNotification('Точка удалена', 'success');
  console.log('Удалена точка:', lastPoint);
}
// Новый метод для управления маршрутами
setupRouteControls() {
  if (!this.elements.routePlanBtn) {
    console.error('Кнопка построения маршрута не найдена');
    return;
  }

  this.elements.routePlanBtn.addEventListener('click', () => {
    this.toggleRouteMenu();
  });

  if (this.elements.addRouteBtn) {
    this.elements.addRouteBtn.addEventListener('click', () => {
      this.startRouteCreation();
      this.toggleRouteMenu(false);
    });
  }

  if (this.elements.removeRouteBtn) {
    this.elements.removeRouteBtn.addEventListener('click', () => {
      this.removeLastRoute();
      this.toggleRouteMenu(false);
    });
  }
}
// Метод для показа/скрытия меню
toggleRouteMenu(show = null) {
  if (!this.elements.routeMenu) return;
  
  this.elements.routeMenu.style.display = 
    show === null 
      ? (this.elements.routeMenu.style.display === 'flex' ? 'none' : 'flex')
      : (show ? 'flex' : 'none');
}
// Новая функция для настройки обработчиков маршрутов
  setupRouteHandlers() {
    // Обработчик кнопки "Разработать маршрут"
    document.getElementById('route-plan-btn').addEventListener('click', () => {
      this.state.isPointMode = false; // Отключаем режим точек
      this.elements.routeMenu.style.display = 'flex';
	  this.state.isPointMode = false; // Отключаем режим точек
  document.querySelector('.route-menu').classList.toggle('show');
  document.body.style.cursor = 'crosshair'; // Курсор-крест
    });

    // Добавление маршрута
    this.elements.addRouteBtn.addEventListener('click', () => {
      this.startRouteCreation();
      this.elements.routeMenu.style.display = 'none';
    });

    // Удаление маршрута
    this.elements.removeRouteBtn.addEventListener('click', () => {
      this.removeLastRoute();
      this.elements.routeMenu.style.display = 'none';
    });
	
  }
   startRouteCreation() {
    this.state.isRouteMode = true;
    this.state.currentRoute = {
      points: [],
      path: null,
      startType: null
    };
    
    // Устанавливаем курсор-крест
    document.body.style.cursor = 'crosshair';
    
    // Обработчики для создания маршрута
    this.elements.svgPlan.addEventListener('click', this.handleRouteClick);
 
  } 
    // Новый метод вместо handleCanvasClick
  handleCanvasInteraction(svgPoint) {
    if (!this.state.isRouteMode || !this.state.currentRoute) return;

    this.state.currentRoute.points.push({
      x: svgPoint.x,
      y: svgPoint.y
    });
    
    // Визуализация временного маршрута
    this.updateTempRoute();
    console.log('Промежуточная точка добавлена:', svgPoint);
  }
 // Обновленный обработчик кликов
  handleRouteClick(e) {
    if (!this.state.isRouteMode) return;
    const target = e.target;
    const svg = this.elements.svgPlan;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());

    // Клик по точке
	
    if (target.classList.contains('point')) {
      if (!this.state.currentRoute) {
        // Начало маршрута
        this.state.currentRoute = {
          points: [{
            x: target.getAttribute('cx'),
            y: target.getAttribute('cy')
          }],
          startType: target.classList.value.match(/point-(\w+)/)[1],
          tempPath: null
        };
        console.log('Начало маршрута от точки:', this.state.currentRoute.startType);
      } else {
        // Завершение маршрута
        this.state.currentRoute.points.push({
          x: target.getAttribute('cx'),
          y: target.getAttribute('cy')
        });
        this.finishRoute();
      }
    }
    // Клик по пустой области
    else if (target === svg) {
      this.handleCanvasInteraction(svgPoint);
    }
  }
  // Обновление временного маршрута
  updateTempRoute() {
    if (!this.state.currentRoute || this.state.currentRoute.points.length < 2) return;

    // Удаляем предыдущий временный маршрут
    if (this.state.currentRoute.tempPath) {
      this.elements.routesSvg.removeChild(this.state.currentRoute.tempPath);
    }

// Создаем новый временный маршрут с точным центрированием
// Логирование исходных данных
console.log("Raw points data:", JSON.parse(JSON.stringify(points)));

// Получаем реальные координаты элементов
const logData = [];
for (const point of points) {
  const elem = document.querySelector(`[data-id="${point.id}"]`);
  if (!elem) {
    console.error(`Element not found for point ${point.id}`);
    continue;
  }
  
  const bbox = elem.getBBox();
  const computedCenter = {
    x: bbox.x + bbox.width/2,
    y: bbox.y + bbox.height/2
  };
  
  // Координаты из state
  const stateCenter = {
    x: point.x + 6, // Ваше ручное смещение
    y: point.y + 6
  };
  
  logData.push({
    id: point.id,
    stateX: point.x,
    stateY: point.y,
    bboxX: bbox.x,
    bboxY: bbox.y,
    bboxWidth: bbox.width,
    bboxHeight: bbox.height,
    computedCenter,
    stateCenter
  });
}

console.table(logData);

// Построение пути с логированием
let d = '';
logData.forEach((point, index) => {
  const x = point.computedCenter.x;
  const y = point.computedCenter.y;
  
  if (index === 0) {
    d = `M ${x} ${y}`;
  } else {
    d += ` L ${x} ${y}`;
  }
  
  console.log(`Point ${index} (${point.id}): 
    Canvas: [${x}, ${y}]
    State: [${point.stateX}, ${point.stateY}]
    BBox: [${point.bboxX}, ${point.bboxY}] [${point.bboxWidth}x${point.bboxHeight}]`);
});

path.setAttribute('d', d);
console.log("Final path data:", d);
function logRouteData(points) {
  if (!points || !points.length) {
    console.error("Нет точек для логирования");
    return;
  }

  const tableData = points.map(point => {
    const elem = document.querySelector(`[data-id="${point.id}"]`);
    if (!elem) {
      console.warn(`Элемент не найден для точки ${point.id}`);
      return null;
    }

    const bbox = elem.getBBox();
    return {
      "ID точки": point.id,
      "Тип": point.type,
      "State X": point.x,
      "State Y": point.y,
      "BBox X": bbox.x.toFixed(1),
      "BBox Y": bbox.y.toFixed(1),
      "Ширина": bbox.width.toFixed(1),
      "Высота": bbox.height.toFixed(1),
      "Центр X": (bbox.x + bbox.width/2).toFixed(1),
      "Центр Y": (bbox.y + bbox.height/2).toFixed(1)
    };
  }).filter(Boolean);

  if (tableData.length > 0) {
    console.table(tableData);
  } else {
    console.error("Нет валидных данных для отображения");
  }
}


  }
   processRoutePoint(point) {
    if (!this.state.currentRoute) {
      this.state.currentRoute = {
        points: [],
        startType: point.type,
        tempPath: null
      };
    }
    
    this.state.currentRoute.points.push(point);
    console.log('Точка маршрута добавлена:', point.id, point.type);
    
    if (this.state.currentRoute.points.length === 1) {
      this.createTempPath(point);
    } else {
      this.finishRoute();
    }
  } 
  
  
getSVGPoint(e) {
  const pt = this.elements.svgPlan.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  return pt.matrixTransform(this.elements.svgPlan.getScreenCTM().inverse());
}

showDebugInfo(e) {
  const debugPanel = document.getElementById('debug-panel');
  if (debugPanel) {
    const svgPoint = this.getSVGPoint(e);
    debugPanel.innerHTML = `
      Screen: (${e.clientX}, ${e.clientY})<br>
      SVG: (${svgPoint.x.toFixed(1)}, ${svgPoint.y.toFixed(1)})<br>
      Target: ${e.target.id || e.target.className}
    `;
  }
}

showClickPoint(x, y) {
  let debugPoint = document.getElementById('debug-point');
  if (!debugPoint) {
    debugPoint = document.createElement('div');
    debugPoint.id = 'debug-point';
    debugPoint.className = 'debug-point';
    document.body.appendChild(debugPoint);
  }
  debugPoint.style.left = `${x}px`;
  debugPoint.style.top = `${y}px`;
} 
  // Завершение маршрута
finishRoute() {
  if (!this.state.currentRoute?.points?.length) return;

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const points = this.state.currentRoute.points;
  
  // Преобразование координат в строку пути
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }

  path.setAttribute('d', d);
  path.setAttribute('stroke', this.getColorByType(this.state.currentRoute.startType));
  path.setAttribute('stroke-width', '4');
  path.setAttribute('fill', 'none');
  path.setAttribute('class', 'permanent-route');
  path.setAttribute('vector-effect', 'non-scaling-stroke');

  this.elements.routesSvg.appendChild(path);
}
removeLastRoute() {
    if (!this.state.routes.length) {
      console.log('Нет маршрутов для удаления');
      return;
    }
    
    const lastRoute = this.state.routes.pop();
    lastRoute.element.remove();
    console.log('Последний маршрут удален');
  }
   getColorByType(type) {
    const colors = {
      storage: '#4CAF50',
      production: '#FF9800',
      assembly: '#9C27B0',
      // ... другие типы ...
    };
    return colors[type] || '#000';
  } 
  handleSvgClick(event) {
  if (!this.state.isPointMode) return;

  // Получаем координаты относительно SVG
  const svg = this.elements.svgPlan;
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());

  // Добавляем точку
  this.addPoint(svgPoint.x, svgPoint.y);
  
  console.log(`Добавлена точка (${svgPoint.x.toFixed(1)}, ${svgPoint.y.toFixed(1)})`);
}
    togglePointMode() {
    this.state.isPointMode = !this.state.isPointMode;
    // ... обновление курсора и кнопки ...
  }

  addPoint(x, y) {
    if (!this.state.isPointMode) return;

    const newPoint = {
      id: `point-${Date.now()}`,
      x, y,
      type: this.state.selectedPointType
    };

    this.state.points.push(newPoint);
    this.renderPoint(newPoint);
  }


  renderPoint(point) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', point.x);
    circle.setAttribute('cy', point.y);
    circle.setAttribute('r', '8');
    circle.setAttribute('class', `point point-${point.type}`);
    circle.setAttribute('data-id', point.id);
    this.elements.svgPlan.appendChild(circle);
  }

  createSvgElement(id) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = id;
    document.getElementById('layout').appendChild(svg);
    return svg;
  }

  checkRequiredElements() {
    const required = ['layout', 'pointsPanel'];
    const missing = required.filter(id => !document.getElementById(id));
    
    if (missing.length) {
      throw new Error(`Отсутствуют обязательные элементы: ${missing.join(', ')}`);
    }
  }
   // Метод для настройки загрузки файлов
  setupFileUpload() {
    if (!this.elements.fileUpload || !this.elements.uploadBtn) {
      console.error('Элементы загрузки не найдены');
      return;
    }
    console.log('Настройка обработчиков для file-upload и upload-btn');

    // Создаем новые обработчики с привязкой контекста
    this.handleUploadClick = this.handleUploadClick.bind(this);
    this.handleFileUpload = this.handleFileUpload.bind(this);

    this.elements.uploadBtn.addEventListener('click', this.handleUploadClick);
    this.elements.fileUpload.addEventListener('change', this.handleFileUpload);
  }
  // Метод обработки загрузки файла
async handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  
  reader.onload = (e) => {
    // Парсим загруженный SVG
    const parser = new DOMParser();
    const doc = parser.parseFromString(e.target.result, "image/svg+xml");
    const svg = doc.querySelector('svg');
    
    if (!svg) {
      console.error('Файл не содержит SVG');
      return;
    }
  // После загрузки SVG обновляем ссылку на routesSvg
  planner.elements.routesSvg = document.querySelector('svg#routes-svg');
  
  if (!planner.elements.routesSvg) {
    console.error('routesSvg не найден после загрузки!');
    planner.elements.routesSvg = planner.createSvgElement('routes-svg');
  }
    // Копируем содержимое в наш контейнер
    this.elements.svgPlan.innerHTML = svg.innerHTML;
    
    // Устанавливаем атрибуты масштабирования
    const bBox = this.elements.svgPlan.getBBox();
    this.elements.svgPlan.setAttribute('viewBox', `${bBox.x} ${bBox.y} ${bBox.width} ${bBox.height}`);
    this.elements.svgPlan.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    
    console.log('SVG загружен с параметрами:', {
      width: bBox.width,
      height: bBox.height,
      viewBox: this.elements.svgPlan.getAttribute('viewBox')
    });
  };
  
  reader.readAsText(file);
}
    handleUploadClick() {
    console.log('Клик по upload-btn');
    this.elements.fileUpload.click();
  }
  selectPointType(type) {
  this.state.selectedPointType = type;
  console.log('Выбран тип точки:', type);
    }
	
    // Вспомогательный метод для уведомлений (опционально)
  showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
      notification.style.display = 'none';
    }, 3000);
  }
  init() {
    console.log('RoutePlanner инициализирован');
	
    // Ваша логика инициализации
	// 1. Проверить ключевые элементы
console.table({
  'layout': !!document.getElementById('layout'),
  'svg-plan': !!document.getElementById('svg-plan'),
  'routes-svg': !!document.getElementById('routes-svg'),
  'pointsPanel': !!document.getElementById('pointsPanel'),
  'file-upload': !!document.getElementById('file-upload'),
  'upload-btn': !!document.getElementById('upload-btn')
});
 console.log("Проверка координатной системы:");
  console.log("SVG Plan viewBox:", this.elements.svgPlan.getAttribute('viewBox'));
  console.log("Routes SVG viewBox:", this.elements.routesSvg.getAttribute('viewBox'));
  
  // Проверка трансформаций
  const matrix = this.elements.svgPlan.getScreenCTM();
  console.log("Матрица трансформации:", {
    a: matrix.a, // Масштаб по X
    b: matrix.b,
    c: matrix.c,
    d: matrix.d, // Масштаб по Y
    e: matrix.e, // Сдвиг по X
    f: matrix.f  // Сдвиг по Y
  });
  }
    getActualCoordinates(x, y) {
    const pt = this.elements.svgPlan.createSVGPoint();
    pt.x = x;
    pt.y = y;
    return pt.matrixTransform(this.elements.svgPlan.getScreenCTM().inverse());
  }

  createTempPath(startPoint) {
    const actualCoords = this.getActualCoordinates(startPoint.x, startPoint.y);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    const d = `M ${actualCoords.x} ${actualCoords.y}`;
    path.setAttribute('d', d);
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    
    console.log('Фактические координаты:', actualCoords);
    // ... остальной код
  }
  _logRouteData(points) {
  const matrix = this.elements.svgPlan.getScreenCTM();
  const tableData = points.map(point => {
    const elem = document.querySelector(`[data-id="${point.id}"]`);
    if (!elem) return null;

    const bbox = elem.getBBox();
    const screenCoords = {
      x: (bbox.x + bbox.width/2) * matrix.a + matrix.e,
      y: (bbox.y + bbox.height/2) * matrix.d + matrix.f
    };

    return {
      "ID точки": point.id,
      "SVG X": (bbox.x + bbox.width/2).toFixed(1),
      "SVG Y": (bbox.y + bbox.height/2).toFixed(1),
      "Экран X": screenCoords.x.toFixed(1),
      "Экран Y": screenCoords.y.toFixed(1)
    };
  }).filter(Boolean);

  console.table(tableData);
}
}


// Упрощенная инициализация с обработкой ошибок
function initApp() {
  try {
    if (!window.planner) {
      window.planner = new RoutePlanner();
    }
  } catch (error) {
    console.error('Ошибка инициализации:', error);
    // Показ пользователю сообщения об ошибке
    alert('Не удалось загрузить приложение. Проверьте консоль для деталей.');
  }
  
}

// Запуск после полной загрузки DOM
if (document.readyState === 'complete') {
  initApp();
} else {
  document.addEventListener('DOMContentLoaded', initApp);
}
