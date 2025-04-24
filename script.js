class RoutePlanner {
  constructor() {
    this.state = {
      isPointMode: false,
      isRouteMode: false,
      isBuildingRoute: false,
      selectedPointType: null,
      currentRoute: null,
      routes: [],
      points: [],
      svgData: null,
	  isAddingProperties: false,
      selectedProperty: null,
      selectedPointId: null,
    currentMode: null, // 'point' | 'route' | 'property'
    selectedProperty: null,
    selectedPointId: null
    };

    this.elements = {
      svgPlan: document.getElementById('svg-plan'),
      routesSvg: document.getElementById('routes-svg'),
      pointsPanel: document.getElementById('pointsPanel'),
      routeMenu: document.getElementById('route-menu'),
      addPointsBtn: document.getElementById('add-points-btn'),
      routePlanBtn: document.getElementById('route-plan-btn'),
      addRouteBtn: document.getElementById('add-route-btn'),
      removeRouteBtn: document.getElementById('remove-route-btn'),
      pointTypes: document.querySelectorAll('.point-type'),
      uploadBtn: document.getElementById('upload-btn'),
      fileUpload: document.getElementById('file-upload')	  
    };

    this.initEventListeners();
    this.hideRouteMenu();
    this.adjustSvgElements();
    console.log('RoutePlanner initialized');
	
    this.adjustWorkspace();
    this.elements.pointPropertiesMenu = document.getElementById('point-properties-menu');
    this.elements.addPropertiesBtn = document.getElementById('add-point-properties-btn');
    this.elements.finishPropertiesBtn = document.getElementById('finish-properties-btn');
    this.elements.removePropertyBtn = document.getElementById('remove-property-btn');	
	
  document.getElementById('save-data-btn').addEventListener('click', () => this.saveRoute());
  document.getElementById('save-as-btn').addEventListener('click', () => this.saveAs());
  document.getElementById('load-data-btn').addEventListener('click', () => this.loadRoute());
  document.getElementById('clear-data-btn').addEventListener('click', () => this.clearWorkspace());

	    
  this.initPropertyEventListeners();
  // Инициализация элементов меню свойств
  this.elements.pointPropertiesMenu = document.getElementById('point-properties-menu');
  this.elements.addPropertiesBtn = document.getElementById('add-point-properties-btn');
  
  // Привязка контекста для обработчиков
  this.handleAddPropertiesClick = this.handleAddPropertiesClick.bind(this);
  this.handlePropertySelect = this.handlePropertySelect.bind(this);
  this.handleFinishProperties = this.handleFinishProperties.bind(this);
  
  this.operationMode = {
  type: null, // 'add-point' | 'add-route' | 'add-property' | null
  subMode: null // Для уточнения типа операции
};
  
  this.initPropertyMenu();	 
  }
adjustWorkspace() {
  // Ждем пока DOM полностью загрузится
  setTimeout(() => {
    const workspace = document.querySelector('.workspace');
    const header = document.querySelector('.route-header');
    const controlPanel = document.querySelector('.control-panel');
    
    if (!workspace || !header || !controlPanel) {
      console.error('Не найдены необходимые элементы DOM');
      return;
    }

    // Вычисляем доступную высоту
    const headerHeight = header.offsetHeight;
    const panelHeight = controlPanel.offsetHeight;
    const availableHeight = window.innerHeight - headerHeight - panelHeight;
    
    // Устанавливаем размеры рабочей области
    workspace.style.height = `${availableHeight}px`;
    workspace.style.width = '100%';
    
    // Синхронизируем размеры SVG контейнеров
    this.syncSvgSizes();
    
    console.log('Workspace adjusted:', {
      windowHeight: window.innerHeight,
      headerHeight,
      panelHeight,
      workspaceHeight: availableHeight
    });
  }, 100);
}
loadRoute() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      console.log('Начало загрузки файла:', file.name);
      
      const fileContent = await file.text();
      const data = JSON.parse(fileContent);
      
      console.log('Структура загруженных данных:', {
        version: data.version || 'не указана',
        name: data.meta?.name || 'не указано',
        points: data.points?.length || 0,
        routes: data.routes?.length || 0,
        svg: data.svg ? 'присутствует' : 'отсутствует'
      });

      // Улучшенная валидация с поддержкой legacy-формата
      const validation = this.validateLoadedData(data);
      if (!validation.valid) {
        console.warn('Предупреждения валидации:', validation.warnings);
        
        // Если нет критических ошибок, продолжаем с предупреждениями
        if (validation.errors.length > 0) {
          console.error('Критические ошибки:', validation.errors);
          this.showNotification(`Ошибка загрузки: ${validation.errors.join(', ')}`);
          return;
        }
        
        this.showNotification(`Загружено с предупреждениями: ${validation.warnings.join(', ')}`, 'warning');
      }

      await this.restoreRoute(data);
      console.log('Маршрут успешно восстановлен');
      this.showNotification(`Маршрут "${data.meta?.name || file.name}" загружен`);

    } catch (error) {
      console.error('Ошибка загрузки:', error);
      this.showNotification('Ошибка при загрузке файла', 'error');
    }
  };
  
  input.click();
}

validateLoadedData(data) {
  const result = { 
    valid: true, 
    errors: [],
    warnings: [] 
  };
  
  // Критические проверки
  if (!data.points || !Array.isArray(data.points)) {
    result.errors.push('Некорректные данные точек');
  }
  
  if (!data.routes || !Array.isArray(data.routes)) {
    result.errors.push('Некорректные данные маршрутов');
  }
  
  // Предупреждения (не блокируют загрузку)
  if (!data.version) {
    result.warnings.push('Файл старого формата (нет версии)');
  }
  
  if (!data.meta?.name) {
    result.warnings.push('Не указано название маршрута');
  }
  
  if (result.errors.length > 0) {
    result.valid = false;
  }
  
  return result;
}

async restoreRoute(data) {
  console.log('Начало восстановления маршрута');
  this.clearWorkspace();

  // Восстановление SVG
  if (data.svg) {
    this.elements.svgPlan.innerHTML = data.svg;
    this.state.svgData = data.svg;
  }

  // Восстановление точек
  if (data.points?.length) {
    this.state.points = data.points;
    this.state.points.forEach(point => {
      this.renderPoint(point);
    });
  }

  // Восстановление маршрутов с улучшенной обработкой
  if (data.routes?.length) {
    this.state.routes = [];
    
    data.routes.forEach(route => {
      try {
        // Проверяем наличие стартовой точки
        const startPoint = this.state.points.find(p => p.id === route.startId);
        if (!startPoint) {
          console.warn(`Стартовая точка ${route.startId} не найдена`);
          return;
        }

        // Создаём путь с использованием универсального метода
        const path = this.createPermanentPath({
          startId: route.startId,
          points: route.points,
          type: route.type
        });
        
        if (!path) {
          console.error('Не удалось создать путь для маршрута', route);
          return;
        }
        
        this.elements.routesSvg.appendChild(path);
        
        this.state.routes.push({
          startId: route.startId,
          points: route.points,
          type: route.type,
          element: path
        });
        
      } catch (error) {
        console.error('Ошибка восстановления маршрута:', error);
      }
    });
  }

  // Восстановление имени
  if (data.meta?.name) {
    document.getElementById('route-name').value = data.meta.name;
  }

  this.adjustSvgElements();
  console.log('Восстановление завершено', {
    points: this.state.points.length,
    routes: this.state.routes.length
  });
}

validateLoadedData(data) {
  const result = { valid: true, errors: [] };
  
  if (!data.version) {
    result.errors.push('Отсутствует версия данных');
  }
  
  if (!data.points || !Array.isArray(data.points)) {
    result.errors.push('Некорректные данные точек');
  }
  
  if (!data.routes || !Array.isArray(data.routes)) {
    result.errors.push('Некорректные данные маршрутов');
  }
  
  if (result.errors.length > 0) {
    result.valid = false;
  }
  
  return result;
}

restoreRoute(data) {
  // Очищаем текущее состояние
  this.clearWorkspace();
  
  // Восстанавливаем SVG
  if (data.svg) {
    this.elements.svgPlan.innerHTML = data.svg;
    this.state.svgData = data.svg;
  }
  
  // Восстанавливаем точки
  this.state.points = data.points || [];
  this.state.points.forEach(point => {
    this.renderPoint(point);
  });
  
  // Восстанавливаем маршруты
  this.state.routes = data.routes || [];
  this.state.routes.forEach(route => {
    const path = this.createPermanentPath(route);
    this.elements.routesSvg.appendChild(path);
  });
  
  // Устанавливаем имя
  document.getElementById('route-name').value = data.name;
   // После загрузки обновляем визуальное состояние точек
  this.state.points.forEach(point => {
    const pointElement = document.querySelector(`[data-id="${point.id}"]`);
    if (pointElement && point.properties) {
      pointElement.setAttribute('data-has-properties', 
        Object.keys(point.properties).length > 0 ? 'true' : 'false');
    }
  }); 
}

async restoreRoute(data) {
  console.log('Начало восстановления маршрута');
  
  // Очистка перед загрузкой
  this.clearWorkspace();
  
  // Восстановление SVG
  if (data.svg) {
    console.log('Восстановление SVG');
    this.elements.svgPlan.innerHTML = data.svg;
    this.state.svgData = data.svg;
    
    // Применение сохраненного viewport
    if (data.viewport?.viewBox) {
      this.elements.svgPlan.setAttribute('viewBox', data.viewport.viewBox);
    }
  }

  // Восстановление точек
  if (data.points?.length) {
    console.log(`Восстановление ${data.points.length} точек`);
    this.state.points = data.points;
    data.points.forEach(point => {
      this.renderPoint(point);
    });
  }

  // Восстановление маршрутов (с улучшенной обработкой)
  if (data.routes?.length) {
    console.log(`Восстановление ${data.routes.length} маршрутов`);
    this.state.routes = [];
    
    data.routes.forEach(route => {
      try {
        // Проверка существования стартовой точки
        const startPoint = this.state.points.find(p => p.id === route.startId);
        if (!startPoint) {
          console.warn(`Стартовая точка ${route.startId} не найдена, маршрут пропущен`);
          return;
        }

        // Создание пути
        const path = this.createPermanentPath({
          points: route.points,
          type: route.type
        });
        
        this.elements.routesSvg.appendChild(path);
        
        // Сохранение в состоянии
        this.state.routes.push({
          startId: route.startId,
          points: route.points,
          type: route.type,
          element: path
        });
        
        console.log(`Маршрут от ${route.startId} восстановлен`);
        
      } catch (error) {
        console.error(`Ошибка восстановления маршрута:`, error);
      }
    });
  }

  // Восстановление имени
  if (data.meta?.name) {
    document.getElementById('route-name').value = data.meta.name;
  }

  // Принудительное обновление интерфейса
  this.adjustSvgElements();
  console.log('Восстановление завершено', {
    points: this.state.points.length,
    routes: this.state.routes.length
  });
}
clearWorkspace() {
  // Очищаем SVG
  this.elements.svgPlan.innerHTML = '';
  this.elements.routesSvg.innerHTML = '';
  
  // Сбрасываем состояние
  this.state.points = [];
  this.state.routes = [];
  this.state.svgData = null;
  document.getElementById('route-name').value = '';
  
  console.log('Рабочая область очищена');
}
  // Добавьте этот метод
  hideRouteMenu() {
    if (this.elements.routeMenu) {
      this.elements.routeMenu.style.display = 'none';
    }
  }

syncSvgSizes() {
  const layout = document.getElementById('layout');
  const svgPlan = this.elements.svgPlan;
  const routesSvg = this.elements.routesSvg;
  
  if (!layout || !svgPlan || !routesSvg) {
    console.error('SVG элементы не найдены');
    return;
  }

  // Получаем фактические размеры контейнера
  const width = layout.clientWidth;
  const height = layout.clientHeight;
  
  // Устанавливаем размеры
  svgPlan.setAttribute('width', width);
  svgPlan.setAttribute('height', height);
  routesSvg.setAttribute('width', width);
  routesSvg.setAttribute('height', height);
  
  // Центрируем содержимое
  this.centerSvgContent();
  
  console.log('SVG sizes synced:', {width, height});
  
}
centerSvgContent() {
  const svg = this.elements.svgPlan;
  
  if (!svg.children.length) {
    console.log('SVG пуст, центрирование не требуется');
    return;
  }

  try {
    const bbox = svg.getBBox();
    const viewBox = {
      x: bbox.x - 10,
      y: bbox.y - 10,
      width: bbox.width + 20,
      height: bbox.height + 20
    };
    
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
    svg.style.transform = 'translate(0, 0)';
    
    console.log('SVG content centered:', viewBox);
  } catch (error) {
    console.error('Ошибка центрирования SVG:', error);
  }
}
  adjustSvgElements() {
    // Синхронизация размеров SVG-элементов
    const width = this.elements.svgPlan.clientWidth;
    const height = this.elements.svgPlan.clientHeight;
    
    this.elements.routesSvg.setAttribute('width', width);
    this.elements.routesSvg.setAttribute('height', height);
    this.elements.routesSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    
    console.log('SVG elements adjusted:', {width, height});
  }

  initEventListeners() {
    // Загрузка планировки
    this.elements.uploadBtn.addEventListener('click', () => this.elements.fileUpload.click());
    this.elements.fileUpload.addEventListener('change', (e) => this.loadSvgPlan(e));

    // Режимы работы
    this.elements.addPointsBtn.addEventListener('click', () => this.togglePointMode());
    this.elements.routePlanBtn.addEventListener('click', () => this.toggleRouteMode());

    // Управление маршрутами
    this.elements.addRouteBtn.addEventListener('click', () => this.startRouteBuilding());
    this.elements.removeRouteBtn.addEventListener('click', () => this.removeLastRoute());

    // Выбор типа точки
    this.elements.pointTypes.forEach(type => {
      type.addEventListener('click', () => {
        this.state.selectedPointType = type.dataset.type;
        this.updatePointSelection();
        console.log('Selected point type:', this.state.selectedPointType);
      });
    });

    // Обработка кликов по планировке
    this.elements.svgPlan.addEventListener('click', (e) => this.handleSvgClick(e));

    // Ресайз окна
    window.addEventListener('resize', () => this.adjustSvgElements());
  }

  loadSvgPlan(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.elements.svgPlan.innerHTML = e.target.result;
      this.state.svgData = e.target.result;
      this.adjustSvgElements();
      console.log('SVG plan loaded');
      this.showNotification('Планировка загружена');
    };
    reader.readAsText(file);
  }

  togglePointMode() {
    this.state.isPointMode = !this.state.isPointMode;
    if (this.state.isPointMode && this.state.isRouteMode) {
      this.toggleRouteMode(false);
    }
    this.updateUI();
    console.log('Point mode:', this.state.isPointMode);
  }

  toggleRouteMode(forceState = null) {
    this.state.isRouteMode = forceState !== null ? forceState : !this.state.isRouteMode;
    if (this.state.isRouteMode && this.state.isPointMode) {
      this.togglePointMode(false);
    }
    this.updateUI();
    console.log('Route mode:', this.state.isRouteMode);
  }

  updateUI() {
    // Обновление кнопок
    this.elements.addPointsBtn.textContent = this.state.isPointMode 
      ? 'Завершить добавление' 
      : 'Добавить точки';
    
    this.elements.routePlanBtn.textContent = this.state.isRouteMode 
      ? 'Закрыть маршруты' 
      : 'Разработать маршрут';

    // Позиционирование меню маршрутов
    if (this.state.isRouteMode) {
      const rect = this.elements.routePlanBtn.getBoundingClientRect();
      this.elements.routeMenu.style.display = 'block';
      this.elements.routeMenu.style.top = `${rect.bottom}px`;
      this.elements.routeMenu.style.left = `${rect.left}px`;
    } else {
      this.elements.routeMenu.style.display = 'none';
    }

    this.updateCursor();
  }

  startRouteBuilding() {
    if (this.state.points.length < 2) {
      this.showNotification('Для построения маршрута нужно минимум 2 точки');
      return;
    }
    
    this.state.isBuildingRoute = true;
    this.showNotification('Режим построения маршрута: кликните по первой точке');
    console.log('Route building started');
    this.updateCursor();
  }

handleSvgClick(event) {
  if (!event) return;
  
  const svg = this.elements.svgPlan;
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const {x, y} = pt.matrixTransform(svg.getScreenCTM().inverse());
  const clickedElement = event.target;
  const isPoint = clickedElement.classList.contains('point');

  // 1. Режим добавления свойств (высший приоритет)
  if (this.state.isAddingProperties) {
    if (!isPoint) {
      this.showNotification('Кликните по существующей точке');
      return;
    }

    const pointId = clickedElement.dataset.id;
    if (this.state.selectedProperty === 'remove') {
      this.removePointProperties(pointId);
    } else if (this.state.selectedProperty) {
      this.addPointProperty(pointId, this.state.selectedProperty);
    } else {
      this.showPointProperties(pointId);
    }
    return;
  }

  // 2. Режим добавления точек
  if (this.state.isPointMode && this.state.selectedPointType) {
    this.addPoint(x, y);
    return;
  }

  // 3. Режим построения маршрутов
  if (this.state.isRouteMode && this.state.isBuildingRoute) {
    if (!this.state.currentRoute) {
      if (isPoint) this.startNewRoute(clickedElement);
    } else {
      if (isPoint && clickedElement.dataset.id !== this.state.currentRoute.startId) {
        this.finishRoute(clickedElement);
      } else if (!isPoint) {
        this.addRoutePoint(x, y);
      }
    }
    return;
  }

  // 4. Обычный режим (показ свойств точки)
  if (isPoint) {
    event.stopPropagation();
    this.showPointProperties(clickedElement.dataset.id);
  }
}

  startNewRoute(pointElement) {
    const {cx, cy} = pointElement.attributes;
    this.state.currentRoute = {
      startId: pointElement.dataset.id,
      points: [{x: parseFloat(cx.value), y: parseFloat(cy.value)}],
      type: Array.from(pointElement.classList).find(c => c.startsWith('point-')).split('-')[1]
    };
    
    this.state.tempLine = this.createTempLine();
    console.log('New route started from point:', this.state.currentRoute.startId);
    this.showNotification('Кликните по второй точке или добавляйте поворотные точки');
  }

addRoutePoint(x, y) {
  if (!this.state.currentRoute || this.state.currentRoute.points.length === 0) {
    return;
  }

  const lastPoint = this.state.currentRoute.points[this.state.currentRoute.points.length - 1];
  
  // Создаем промежуточную точку для ортогонального пути
  const newPoints = [];
  
  // Сначала двигаемся по горизонтали (X), затем по вертикали (Y)
  if (Math.abs(x - lastPoint.x) > Math.abs(y - lastPoint.y)) {
    // Горизонтальное движение первое
    newPoints.push({ x: x, y: lastPoint.y });
    newPoints.push({ x: x, y: y });
  } else {
    // Вертикальное движение первое
    newPoints.push({ x: lastPoint.x, y: y });
    newPoints.push({ x: x, y: y });
  }

  // Добавляем все новые точки в маршрут
  newPoints.forEach(point => {
    this.state.currentRoute.points.push(point);
  });

  this.updateTempLine();
  console.log('Ортогональные точки маршрута добавлены:', newPoints);
}

finishRoute(pointElement) {
  if (!this.state.currentRoute || !pointElement) {
    console.error('Недостаточно данных для завершения маршрута');
    return;
  }

  const {cx, cy} = pointElement.attributes;
  const endPoint = {
    x: parseFloat(cx.value),
    y: parseFloat(cy.value)
  };

  // Добавляем конечную точку с ортогональными сегментами
  const lastPoint = this.state.currentRoute.points[this.state.currentRoute.points.length - 1];
  
  // Горизонтальный сегмент (если нужно)
  if (lastPoint.x !== endPoint.x) {
    this.state.currentRoute.points.push({ x: endPoint.x, y: lastPoint.y });
  }
  
  // Вертикальный сегмент (если нужно)
  if (lastPoint.y !== endPoint.y) {
    this.state.currentRoute.points.push(endPoint);
  }

  // Создаем постоянный путь
  const path = this.createPermanentPath({
    startId: this.state.currentRoute.startId,
    points: this.state.currentRoute.points,
    type: this.state.currentRoute.type
  });

  if (!path) {
    console.error('Не удалось создать постоянный путь');
    return;
  }

  this.elements.routesSvg.appendChild(path);
  
  // Сохраняем маршрут
  this.state.routes.push({
    ...this.state.currentRoute,
    element: path
  });
  
  console.log('Маршрут успешно завершен:', this.state.currentRoute);
  this.showNotification('Маршрут построен');
  this.cancelRouteBuilding();
}

  createTempLine() {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'temp-route');
    path.setAttribute('stroke', this.getColorByType(this.state.currentRoute.type));
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-dasharray', '5,5');
    path.setAttribute('fill', 'none');
    this.elements.svgPlan.appendChild(path);
    return path;
  }

updateTempLine() {
  if (!this.state.tempLine || !this.state.currentRoute) return;
  
  let d = `M ${this.state.currentRoute.points[0].x} ${this.state.currentRoute.points[0].y}`;
  
  // Строим только ортогональные сегменты
  for (let i = 1; i < this.state.currentRoute.points.length; i++) {
    const prev = this.state.currentRoute.points[i-1];
    const curr = this.state.currentRoute.points[i];
    
    if (prev.x === curr.x || prev.y === curr.y) {
      d += ` L ${curr.x} ${curr.y}`;
    }
  }
  
  this.state.tempLine.setAttribute('d', d);
}

// 1. Улучшенный метод createPermanentPath
createPermanentPath(routeData) {
  // Проверка данных
  if (!routeData || !routeData.points || routeData.points.length < 2) {
    console.error('Неверные данные маршрута:', routeData);
    return document.createElementNS('http://www.w3.org/2000/svg', 'path'); // Возвращаем пустой path вместо null
  }

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const color = this.getColorByType(routeData.type || 'assembly');
  
  let d = `M ${routeData.points[0].x} ${routeData.points[0].y}`;
  for (let i = 1; i < routeData.points.length; i++) {
    const prev = routeData.points[i-1];
    const curr = routeData.points[i];
    
    // Для загруженных маршрутов не проверяем ортогональность
    d += ` L ${curr.x} ${curr.y}`;
  }
  
  path.setAttribute('d', d);
  path.setAttribute('stroke', color);
  path.setAttribute('stroke-width', '4');
  path.setAttribute('fill', 'none');
  path.setAttribute('class', 'permanent-route');
  
  return path;
}

// 2. Переработанный метод restoreRoute
async restoreRoute(data) {
  console.log('Начало восстановления маршрута');
  this.clearWorkspace();

  // Восстановление SVG
  if (data.svg) {
    this.elements.svgPlan.innerHTML = data.svg;
    this.state.svgData = data.svg;
  }

  // Восстановление точек с защитой от ошибок
  if (data.points?.length) {
    this.state.points = data.points.map(p => ({
      id: p.id || `point_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      x: Number(p.x) || 0,
      y: Number(p.y) || 0,
      type: p.type || 'assembly',
      properties: p.properties || {}
    }));
    
    this.state.points.forEach(point => {
      this.renderPoint(point);
    });
  }

  // Восстановление маршрутов с полной обработкой ошибок
  if (data.routes?.length) {
    this.state.routes = [];
    
    data.routes.forEach(route => {
      try {
        // Нормализация данных маршрута
        const normalizedRoute = {
          startId: route.startId,
          points: (route.points || []).map(p => ({
            x: Number(p.x) || 0,
            y: Number(p.y) || 0
          })),
          type: route.type || 'assembly'
        };

        // Проверка минимальных требований
        if (normalizedRoute.points.length < 2) {
          console.warn('Маршрут пропущен - недостаточно точек:', normalizedRoute);
          return;
        }

        // Проверка существования стартовой точки
        if (!this.state.points.some(p => p.id === normalizedRoute.startId)) {
          console.warn('Стартовая точка не найдена:', normalizedRoute.startId);
          return;
        }

        // Создание пути
        const path = this.createPermanentPath(normalizedRoute);
        if (!path) {
          console.error('Не удалось создать путь для маршрута:', normalizedRoute);
          return;
        }

        this.elements.routesSvg.appendChild(path);
        
        // Сохранение в состоянии
        this.state.routes.push({
          ...normalizedRoute,
          element: path
        });
        
      } catch (error) {
        console.error('Ошибка восстановления маршрута:', error);
      }
    });
  }

  // Восстановление имени
  if (data.meta?.name) {
    document.getElementById('route-name').value = data.meta.name;
  }

  this.adjustSvgElements();
  console.log('Восстановление завершено', {
    points: this.state.points.length,
    routes: this.state.routes.length
  });
}

// 3. Дополнительный метод для проверки данных перед загрузкой
validateRouteData(route) {
  if (!route.points || route.points.length < 2) {
    console.error('Маршрут должен содержать минимум 2 точки');
    return false;
  }
  
  if (!route.startId) {
    console.error('Отсутствует startId у маршрута');
    return false;
  }
  
  return true;
}

addPoint(x, y) {
  const routeName = this.getCurrentRouteName(); // Метод для получения имени из шапки
  const pointType = this.state.selectedPointType;
  const pointNumber = this.state.points.filter(p => p.type === pointType).length + 1;
  
  const pointId = `point_${this.sanitize(routeName)}_${pointType}_${pointNumber}`;
  
  const newPoint = {
    id: pointId,
    x, y,
    type: pointType,
    properties: {} // Здесь будут храниться свойства
  };
  
  this.state.points.push(newPoint);
  this.renderPoint(newPoint);
}

sanitize(str) {
  return str.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}

getCurrentRouteName() {
  const input = document.getElementById('route-name');
  return input.value || 'unnamed_route';
}

renderPoint(point) {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', point.x);
  circle.setAttribute('cy', point.y);
  circle.setAttribute('r', '8');
  circle.setAttribute('class', `point point-${point.type}`);
  circle.setAttribute('data-id', point.id);
  
  // Добавляем иконку свойств (не нарушая основной функционал)
  if (point.properties && Object.keys(point.properties).length > 0) {
    circle.setAttribute('data-has-properties', 'true');
  }
  
  this.elements.svgPlan.appendChild(circle);
}

  removeLastRoute() {
    if (this.state.routes.length === 0) {
      this.showNotification('Нет маршрутов для удаления');
      return;
    }
    
    const lastRoute = this.state.routes.pop();
    lastRoute.element.remove();
    console.log('Route removed:', lastRoute);
    this.showNotification('Последний маршрут удален');
  }

  cancelRouteBuilding() {
    this.state.isBuildingRoute = false;
    this.state.currentRoute = null;
    
    const tempLine = document.querySelector('.temp-route');
    if (tempLine) tempLine.remove();
    
    this.updateCursor();
  }

  updatePointSelection() {
    this.elements.pointTypes.forEach(type => {
      type.classList.toggle('selected', type.dataset.type === this.state.selectedPointType);
    });
  }

  updateCursor() {
    if (this.state.isPointMode && this.state.selectedPointType) {
      document.body.style.cursor = 'crosshair';
    } else if (this.state.isBuildingRoute) {
      document.body.style.cursor = 'pointer';
    } else {
      document.body.style.cursor = 'default';
    }
  }

  showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(() => notification.style.display = 'none', 3000);
  }

  getColorByType(type) {
    const colors = {
      storage: '#4CAF50',
      production: '#FF9800',
      manufacturing: '#2196F3',
      assembly: '#9C27B0',
      product: '#F44336',
      quality: '#009688',
      packaging: '#795548'
    };
    return colors[type] || '#000';
  }
/*   async loadRoute() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.style.display = 'none'; // Скрываем инпут
  
  // Создаем контейнер для UI
  const createLoaderUI = () => {
    const loader = document.createElement('div');
    loader.id = 'route-loader';
    loader.style = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      color: white;
    `;
    
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.style = `
      border: 5px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top: 5px solid #3498db;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    `;
    
    const text = document.createElement('p');
    text.textContent = 'Загрузка маршрута...';
    
    loader.appendChild(spinner);
    loader.appendChild(text);
    document.body.appendChild(loader);
    
    // Добавляем анимацию в DOM
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    return loader;
  };

  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const loader = createLoaderUI();
    
    try {
      // Добавляем прогресс-бар (дополнительно)
      const progressBar = document.createElement('div');
      progressBar.style = `
        width: 80%;
        height: 10px;
        background: #555;
        border-radius: 5px;
        margin-top: 20px;
      `;
      
      const progressFill = document.createElement('div');
      progressFill.style = `
        height: 100%;
        width: 0%;
        background: #4CAF50;
        border-radius: 5px;
        transition: width 0.3s;
      `;
      
      progressBar.appendChild(progressFill);
      loader.appendChild(progressBar);
      
      // Имитация прогресса (можно заменить на реальное отслеживание)
      const updateProgress = (percent) => {
        progressFill.style.width = `${percent}%`;
      };
      
      // Чтение файла с "анимацией" прогресса
      updateProgress(20);
      const fileContent = await file.text();
      updateProgress(60);
      
      const data = JSON.parse(fileContent);
      updateProgress(80);
      
      await this.restoreRoute(data);
      updateProgress(100);
      
      this.showNotification(`Маршрут "${data.name}" успешно загружен!`);
      
      // Плавное исчезновение
      loader.style.opacity = '1';
      setTimeout(() => {
        loader.style.transition = 'opacity 0.5s ease';
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
      }, 500);
      
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      
      // Анимация ошибки
      loader.querySelector('p').textContent = 'Ошибка загрузки!';
      loader.querySelector('.spinner').style.borderTopColor = '#e74c3c';
      
      setTimeout(() => {
        loader.style.background = 'rgba(231, 76, 60, 0.8)';
        setTimeout(() => loader.remove(), 1000);
      }, 500);
      
      this.showNotification('Неверный формат файла', 'error');
    }
  };
  
  fileInput.click();
} */
showPointProperties(pointId) {
  const point = this.state.points.find(p => p.id === pointId);
  if (!point) return;

  // Удаляем старое меню, если есть
  const oldMenu = document.querySelector('.point-properties-popup');
  if (oldMenu) oldMenu.remove();

  // Создаем новое меню
  const menu = document.createElement('div');
  menu.className = 'point-properties-popup';
  
  // Заголовок с именем точки
  menu.innerHTML = `<h4>${this.getPointTitle(point)}</h4>`;

  // Добавляем свойства, если они есть
  if (point.properties && Object.keys(point.properties).length > 0) {
    menu.innerHTML += '<ul class="properties-list">';
    for (const [key, value] of Object.entries(point.properties)) {
      if (value) {
        menu.innerHTML += `<li>${this.getPropertyName(key)}</li>`;
      }
    }
    menu.innerHTML += '</ul>';
  } else {
    menu.innerHTML += '<p>Нет добавленных свойств</p>';
  }

  // Позиционируем меню рядом с точкой
  const pointElement = document.querySelector(`[data-id="${pointId}"]`);
  if (pointElement) {
    const rect = pointElement.getBoundingClientRect();
    menu.style.position = 'absolute';
    menu.style.left = `${rect.right + 10}px`;
    menu.style.top = `${rect.top}px`;
    menu.style.zIndex = '1000';
    document.body.appendChild(menu);
  }

  // Автоматическое закрытие при клике вне меню
  setTimeout(() => {
    const clickHandler = (e) => {
      if (!menu.contains(e.target)) {  // Здесь была пропущена закрывающая скобка
        menu.remove();
        document.removeEventListener('click', clickHandler);
      }
    };
    document.addEventListener('click', clickHandler);
  }, 100);
}
getPointTitle(point) {
  const typeNames = {
    storage: 'Склад',
    production: 'Изготовление заготовок',
	manufacturing: 'Изготовление деталей',
    assembly: 'Изготовление сборок',
	product: 'Сборка изделия',
	quality: 'Контроль качества',
	packaging: 'Упаковка'
  };
  return `Точка: ${typeNames[point.type] || point.type}`;
}

setPointProperty(pointId, property, value) {
  const point = this.state.points.find(p => p.id === pointId);
  if (point) {
    point.properties[property] = value;
    console.log(`Свойство ${property} установлено для точки ${pointId}`);
  }
}
saveRoute() {
  // Валидация данных перед сохранением
  if (!this.validateDataBeforeSave()) {
    this.showNotification('Ошибка: некорректные данные для сохранения');
    return;
  }

  const routeName = this.getCurrentRouteName();
  const timestamp = new Date().toISOString();
  
  // Собираем полные данные для сохранения
  const saveData = {
    version: '2.0',
    meta: {
      name: routeName,
      createdAt: timestamp,
      lastModified: timestamp,
      pointCount: this.state.points.length,
      routeCount: this.state.routes.length
    },
    points: this.state.points.map(p => ({ 
      id: p.id, 
      x: parseFloat(p.x.toFixed(3)), 
      y: parseFloat(p.y.toFixed(3)),
      type: p.type,
      properties: p.properties || {}
    })),
    routes: this.state.routes.map(r => ({
      startId: r.startId,
      points: r.points.map(p => ({
        x: parseFloat(p.x.toFixed(3)),
        y: parseFloat(p.y.toFixed(3))
      })),
      type: r.type,
      createdAt: timestamp
    })),
    svg: this.state.svgData,
    viewport: {
      width: this.elements.svgPlan.clientWidth,
      height: this.elements.svgPlan.clientHeight,
      viewBox: this.elements.svgPlan.getAttribute('viewBox')
    }
  };

  console.log('Данные для сохранения:', saveData);

  // Проверка целостности маршрутов
  const routeErrors = this.validateRoutes(saveData.routes, saveData.points);
  if (routeErrors.length > 0) {
    console.error('Ошибки в маршрутах:', routeErrors);
    this.showNotification(`Ошибка: ${routeErrors.join(', ')}`);
    return;
  }

  try {
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { 
      type: 'application/json;charset=utf-8' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${routeName}_${timestamp.slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    console.log('Маршрут успешно сохранен');
    this.showNotification('Маршрут сохранен');
    
  } catch (error) {
    console.error('Ошибка сохранения:', error);
    this.showNotification('Ошибка при сохранении');
  }
}

validateDataBeforeSave() {
  if (!this.state.points || !Array.isArray(this.state.points)) {
    console.error('Некорректные данные точек');
    return false;
  }
  
  if (!this.state.routes || !Array.isArray(this.state.routes)) {
    console.error('Некорректные данные маршрутов');
    return false;
  }
  
  return true;
}

validateRoutes(routes, points) {
  const errors = [];
  
  routes.forEach((route, index) => {
    // Проверка начальной точки
    if (!points.some(p => p.id === route.startId)) {
      errors.push(`Маршрут ${index}: стартовая точка ${route.startId} не найдена`);
    }
    
    // Проверка координат
    if (!route.points || route.points.length < 2) {
      errors.push(`Маршрут ${index}: недостаточно точек (${route.points?.length || 0})`);
    }
    
    route.points.forEach((point, i) => {
      if (isNaN(point.x)) errors.push(`Маршрут ${index}: точка ${i} имеет нечисловую координату X`);
      if (isNaN(point.y)) errors.push(`Маршрут ${index}: точка ${i} имеет нечисловую координату Y`);
    });
  });
  
  return errors;
}
  initPropertyEventListeners() {
    // Кнопка "Добавить свойства точки"
    this.elements.addPropertiesBtn.addEventListener('click', () => {
      this.togglePropertyMode(true);
      this.showPointPropertiesMenu(this.elements.addPropertiesBtn);
    });

    // Кнопки свойств
    document.querySelectorAll('#point-properties-menu [data-property]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.state.selectedProperty = e.target.dataset.property;
        this.showNotification(`Выбрано: ${e.target.textContent}`);
      });
    });

    // Кнопка "Удалить свойство"
    this.elements.removePropertyBtn.addEventListener('click', () => {
      this.state.selectedProperty = 'remove';
      this.showNotification('Режим удаления свойств');
    });

    // Кнопка "Завершить добавление"
    this.elements.finishPropertiesBtn.addEventListener('click', () => {
      this.togglePropertyMode(false);
      this.hidePointPropertiesMenu();
    });

    // Закрытие меню
    this.elements.pointPropertiesMenu.querySelector('.close-btn').addEventListener('click', () => {
      this.hidePointPropertiesMenu();
    });
  }
   togglePropertyMode(enable) {
    this.state.isAddingProperties = enable;
    if (enable) {
      this.toggleRouteMode(false);
      this.togglePointMode(false);
    }
    this.updateCursor();
  }
 handlePropertyClick(pointElement) {
  const pointId = pointElement.dataset.id;
  const propertyType = this.operationMode.subMode;
  
  if (propertyType === 'remove') {
    this.removePointProperties(pointId);
  } else {
    this.togglePointProperty(pointId, propertyType);
  }
  
  this.updatePointVisual(pointId);
}
  handlePropertyModeClick(clickedElement) {
  if (!this.state.selectedProperty) {
    this.showNotification('Сначала выберите свойство из меню');
    return;
  }

  const pointElement = clickedElement.closest('.point');
  if (!pointElement) {
    this.showNotification('Кликните по существующей точке');
    return;
  }

  const pointId = pointElement.dataset.id;
  this.addPointProperty(pointId, this.state.selectedProperty);
}
addPointProperty(pointId, property) {
  const point = this.state.points.find(p => p.id === pointId);
  if (!point) {
    console.error('Точка не найдена:', pointId);
    return;
  }

  // Инициализируем свойства, если их нет
  if (!point.properties) {
    point.properties = {};
  }

  // Добавляем/переключаем свойство
  point.properties[property] = !point.properties[property];
  
  // Обновляем отображение точки
  this.updatePointVisual(point);
  
  console.log(`Свойство ${property} ${point.properties[property] ? 'добавлено' : 'удалено'} у точки ${pointId}`);
  this.showNotification(`${this.getPropertyName(property)} ${point.properties[property] ? 'добавлено' : 'удалено'}`);
}

  removePointProperty(pointId) {
    const point = this.state.points.find(p => p.id === pointId);
    if (point && point.properties && this.state.selectedProperty) {
      delete point.properties[this.state.selectedProperty];
      console.log(`Свойство удалено из точки ${pointId}`);
    }
  }
showPointProperties(pointId) {
  // Закрываем предыдущее меню
  this.hidePointProperties();
  
  const point = this.state.points.find(p => p.id === pointId);
  if (!point) return;

  // Создаем и показываем меню
  const menu = document.createElement('div');
  menu.className = 'point-properties-popup';
  menu.innerHTML = this.renderPointPropertiesMenu(point);
  
  document.body.appendChild(menu);
  this.positionPropertiesMenu(menu, pointId);
  
  // Обработчик закрытия
  menu.querySelector('.close-btn').addEventListener('click', () => {
    this.hidePointProperties();
  });
  
  // Закрытие при клике вне меню
  setTimeout(() => {
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target)) {
        this.hidePointProperties();
      }
    });
  }, 100);
}
  getPropertyName(propertyKey) {
    const names = {
      blueprint: 'Карта эскизов',
      kit_list: 'Комплектовочная карта',
      material_list: 'Ведомость материалов',
      operation_card: 'Операционная карта'
    };
    return names[propertyKey] || propertyKey;
  } 
  initPropertyMenu() {
  // Кнопка "Добавить свойства точки"
  if (this.elements.addPropertiesBtn) {
    this.elements.addPropertiesBtn.addEventListener('click', this.handleAddPropertiesClick);
  }

  // Обработчики для кнопок свойств
  document.querySelectorAll('[data-property]').forEach(btn => {
    btn.addEventListener('click', this.handlePropertySelect);
  });

  // Кнопка "Завершить добавление"
  const finishBtn = document.getElementById('finish-properties-btn');
  if (finishBtn) {
    finishBtn.addEventListener('click', this.handleFinishProperties);
  }
}
handleAddPropertiesClick() {
  this.state.isAddingProperties = true;
  this.showPointPropertiesMenu(this.elements.addPropertiesBtn);
  this.showNotification('Выберите свойство, затем кликните по точке');
}

handlePropertySelect(e) {
  this.state.selectedProperty = e.target.dataset.property;
  this.showNotification(`Выбрано: ${e.target.textContent}`);
}

handleFinishProperties() {
  this.state.isAddingProperties = false;
  this.state.selectedProperty = null;
  this.hidePointPropertiesMenu();
  this.showNotification('Режим добавления свойств завершен');
}
showPointPropertiesMenu() {
  if (!this.elements.pointPropertiesMenu) return;
  
  // Позиционируем меню рядом с кнопкой
  const rect = this.elements.addPropertiesBtn.getBoundingClientRect();
  this.elements.pointPropertiesMenu.style.display = 'block';
  this.elements.pointPropertiesMenu.style.top = `${rect.bottom}px`;
  this.elements.pointPropertiesMenu.style.left = `${rect.left}px`;
}

hidePointPropertiesMenu() {
  if (this.elements.pointPropertiesMenu) {
    this.elements.pointPropertiesMenu.style.display = 'none';
  }
}

hidePointPropertiesMenu() {
  if (this.elements.pointPropertiesMenu) {
    this.elements.pointPropertiesMenu.style.display = 'none';
  }
}
handlePropertyAssignment(e) {
  if (!this.state.selectedProperty) {
    this.showNotification('Сначала выберите свойство из меню');
    return;
  }

  const pointElement = e.target.closest('.point');
  if (!pointElement) return;

  const pointId = pointElement.dataset.id;
  this.addPointProperty(pointId, this.state.selectedProperty);
  this.showPointProperties(pointId);
}
addPointProperty(pointId, property) {
  const point = this.state.points.find(p => p.id === pointId);
  if (point) {
    point.properties = point.properties || {};
    point.properties[property] = true;
    
    // Обновляем отображение точки
    this.updatePointVisual(point);
    this.showNotification(`Свойство добавлено к точке ${pointId}`);
  }
}

updatePointVisual(point) {
  const pointElement = document.querySelector(`[data-id="${point.id}"]`);
  if (!pointElement) return;

  // Добавляем/удаляем класс для точек со свойствами
  if (point.properties && Object.keys(point.properties).length > 0) {
    pointElement.classList.add('has-properties');
  } else {
    pointElement.classList.remove('has-properties');
  }
}
setMode(mode) {
  // Сбрасываем предыдущий режим
  this.state.currentMode = null;
  this.state.isPointMode = false;
  this.state.isRouteMode = false;
  this.state.isBuildingRoute = false;
  this.state.isAddingProperties = false;

  // Устанавливаем новый режим
  switch(mode) {
    case 'point':
      this.state.currentMode = 'point';
      this.state.isPointMode = true;
      break;
    case 'route':
      this.state.currentMode = 'route';
      this.state.isRouteMode = true;
      break;
    case 'property':
      this.state.currentMode = 'property';
      this.state.isAddingProperties = true;
      break;
    default:
      this.state.currentMode = null;
  }

  this.updateUI();
}
updatePointVisual(point) {
  const pointElement = document.querySelector(`[data-id="${point.id}"]`);
  if (!pointElement) return;

  // Добавляем/удаляем класс для точек со свойствами
  if (point.properties && Object.keys(point.properties).length > 0) {
    pointElement.classList.add('has-properties');
  } else {
    pointElement.classList.remove('has-properties');
  }
}
addPointProperty(pointId, property) {
  const point = this.state.points.find(p => p.id === pointId);
  if (!point) return;

  point.properties = point.properties || {};
  point.properties[property] = true;
  
  // Обновляем отображение точки
  const pointElement = document.querySelector(`[data-id="${pointId}"]`);
  if (pointElement) {
    pointElement.classList.add('has-property');
  }
  
  console.log(`Свойство "${property}" добавлено к точке ${pointId}`);
}

removePointProperties(pointId) {
  const point = this.state.points.find(p => p.id === pointId);
  if (!point || !point.properties) return;

  delete point.properties;
  
  // Обновляем отображение точки
  const pointElement = document.querySelector(`[data-id="${pointId}"]`);
  if (pointElement) {
    pointElement.classList.remove('has-property');
  }
  
  console.log(`Свойства удалены у точки ${pointId}`);
}
showPointProperties(pointId) {
  // Закрываем предыдущее меню
  this.hidePointProperties();
  
  const point = this.state.points.find(p => p.id === pointId);
  if (!point) return;

  // Создаем меню
  const menu = document.createElement('div');
  menu.className = 'point-properties-popup';
  menu.dataset.pointId = pointId; // Сохраняем ID точки
  
  // Заполняем содержимое
  menu.innerHTML = `
    <div class="menu-header">
      <h4>${this.getPointTitle(point)}</h4>
      <button class="close-btn">&times;</button>
    </div>
    <div class="menu-content">
      ${this.renderPropertiesList(point)}
    </div>
  `;

  // Позиционируем и добавляем в DOM
  this.positionPropertiesMenu(menu, pointId);
  document.body.appendChild(menu);
  
  // Обработчики событий
  menu.querySelector('.close-btn').addEventListener('click', () => this.hidePointProperties());
}

renderPropertiesList(point) {
  if (!point.properties || Object.keys(point.properties).length === 0) {
    return '<p>Нет добавленных свойств</p>';
  }

  return `
    <ul class="properties-list">
      ${Object.entries(point.properties)
        .filter(([_, value]) => value)
        .map(([key]) => `<li>${this.getPropertyName(key)}</li>`)
        .join('')}
    </ul>
  `;
}

positionPropertiesMenu(menu, pointId) {
  const pointElement = document.querySelector(`[data-id="${pointId}"]`);
  if (!pointElement) return;

  const rect = pointElement.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.left = `${rect.right + 10}px`;
  menu.style.top = `${rect.top}px`;
  menu.style.zIndex = '10000';
}

hidePointProperties() {
  const menu = document.querySelector('.point-properties-popup');
  if (menu) menu.remove();
}
setOperationMode(type, subMode = null) {
  // Сбрасываем предыдущий режим
  this.operationMode = { type: null, subMode: null };
  
  // Устанавливаем новый режим
  this.operationMode = { type, subMode };
  
  // Обновляем UI
  this.updateUI();
  
  console.log(`Режим изменен: ${type}${subMode ? ` (${subMode})` : ''}`);
}
  
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    window.planner = new RoutePlanner();
});