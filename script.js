// 1) Mapbox Access Token
mapboxgl.accessToken = 'pk.eyJ1IjoibGlubi1saW4iLCJhIjoiY201d2h6ejdjMDljejJsc2NvbnFuZDJyMiJ9.oUCcrxp81xCjEZcibZqONA';
const initialZoom = 6;

// 2) 三种主题 style URL
const natureStyle = 'mapbox://styles/linn-lin/cm774xaw201x201s2hhyygrwo';
const lightStyle  = 'mapbox://styles/linn-lin/cm792pv2000gh01s641eb0vrj';
const darkStyle   = 'mapbox://styles/linn-lin/cm792xe3z024101s24kco6516';

// 3) 创建地图实例（默认使用 Nature）
const map = new mapboxgl.Map({
  container: 'map',
  style: natureStyle, // 这里默认设为 Nature
  center: [-4.2518, 55.8642],
  zoom: initialZoom
});

// 添加导航控件
map.addControl(new mapboxgl.NavigationControl(), 'top-right');

// 全局筛选变量
let currentClassificationFilter = null;
let currentDiffFilter = null;
let currentLengthFilter = null;
let currentAscentFilter = null;
let currentTimeFilter = null;
let markerClicked = false;

// 这里使用你的 GeoJSON 文件的 raw URL（请确保链接正确）
const hikingPointsURL = 'https://raw.githubusercontent.com/Lyuling0827/Linn_project.github.io/refs/heads/main/hiking_points.geojson';
const hikingRoutesURL = 'https://raw.githubusercontent.com/Lyuling0827/Linn_project.github.io/refs/heads/main/hiking_route.geojson';

// ========== 6) 地图加载后 ==========
map.on('load', () => {
  console.log('Map loaded!');

 // ---------- 主题切换 ----------
  document.querySelectorAll('#theme-controls input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const val = document.querySelector('#theme-controls input[name="theme"]:checked').value;
      if (val === 'light') {
        map.setStyle(lightStyle);
      } else if (val === 'dark') {
        map.setStyle(darkStyle);
      } else {
        map.setStyle(natureStyle);
      }
    });
  });

  // ---------- Help 按钮 ----------
  const helpButton = document.getElementById('help-button');
  const helpPopup  = document.getElementById('help-popup');
  const helpClose  = document.getElementById('help-close');
  helpButton.addEventListener('click', () => {
    if (!helpPopup.style.display || helpPopup.style.display === 'none') {
      helpPopup.style.display = 'block';
    } else {
      helpPopup.style.display = 'none';
    }
  });
  helpClose.addEventListener('click', () => {
    helpPopup.style.display = 'none';
  });

  // ---------- style.load: 重新添加自定义图层/源 与绑定 marker 事件 ----------
  map.on('style.load', () => {
    // 重新添加 hiking-points 图层
    if (!map.getSource('hiking-points-5jbpyy')) {
      map.addSource('hiking-points-5jbpyy', {
        type: 'geojson',
        data: hikingPointsURL
      });
      map.addLayer({
        id: 'hiking-points-5jbpyy',
        type: 'circle',
        source: 'hiking-points-5jbpyy',
        paint: {
          'circle-radius': 6,
          'circle-color': '#ff0000',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2
        }
      });
    }
    
   // 重新添加 hiking-route 图层
    if (!map.getSource('hiking-route-5jsjeg')) {
      map.addSource('hiking-route-5jsjeg', {
        type: 'geojson',
        data: hikingRoutesURL
      });
      map.addLayer({
        id: 'hiking-route-5jsjeg',
        type: 'line',
        source: 'hiking-route-5jsjeg',
        paint: {
          'line-color': '#0000ff',
          'line-width': 3
        }
      });
    }
    
       // 重新添加高亮图层
    if (!map.getSource('highlight-marker')) {
      map.addSource('highlight-marker', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.addLayer({
        id: 'highlight-marker-layer',
        type: 'circle',
        source: 'highlight-marker',
        paint: {
          'circle-radius': 8,
          'circle-color': '#0000FF',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2
        }
      });
    }
    if (!map.getSource('highlight-route')) {
      map.addSource('highlight-route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.addLayer({
        id: 'highlight-route-layer',
        type: 'line',
        source: 'highlight-route',
        paint: {
          'line-color': '#0000FF',
          'line-width': 4
        }
      });
    }
    
    // 重新应用筛选条件
    updateCombinedFilter();
  });
  
     // 重新绑定 marker 的鼠标事件（先解绑以防重复绑定）
    map.off('mouseenter', 'hiking-points-5jbpyy');
    map.off('mouseleave', 'hiking-points-5jbpyy');
    map.off('click', 'hiking-points-5jbpyy');

    const markerPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });
    map.on('mouseenter', 'hiking-points-5jbpyy', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const coords = e.features[0].geometry.coordinates.slice();
      const props = e.features[0].properties || {};
      const { name, Location, Distance_km, description, note } = props;
      const popupHTML = `
        <div>
          <h3>${name || 'No name'}</h3>
          <p><strong>Location:</strong> ${Location || 'N/A'}</p>
          <p><strong>Distance (km):</strong> ${Distance_km || 'N/A'}</p>
          <p><strong>Description:</strong> ${description || 'N/A'}</p>
          <p><strong>Note:</strong> ${note || 'N/A'}</p>
        </div>
      `;
      markerPopup.setLngLat(coords).setHTML(popupHTML).addTo(map);
    });
    map.on('mouseleave', 'hiking-points-5jbpyy', () => {
      map.getCanvas().style.cursor = '';
      markerPopup.remove();
    });
    map.on('click', 'hiking-points-5jbpyy', (e) => {
      markerClicked = true;
      e.originalEvent.stopPropagation();
      const props = e.features[0].properties || {};
      const markerID = props.id || props.name;
      const website = props.website;
      const sidebar = document.getElementById('sidebar');
      sidebar.style.display = 'block';
      if (website) {
        sidebar.innerHTML = `
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <h2 class="cartoon-title" style="margin:0;">Find the trail</h2>
            <button class="cartoon-button" onclick="window.open('${website}','_blank')">Open website</button>
          </div>
          <div>
            <iframe src="${website}" class="cartoon-iframe"></iframe>
          </div>
        `;
      } else {
        sidebar.innerHTML = `
          <h2 class="cartoon-title">Find the trail</h2>
          <p class="cartoon-label">No website info available</p>
        `;
      }
      const coords = e.features[0].geometry.coordinates.slice();
      map.flyTo({
        center: coords,
        zoom: 10,
        speed: 1.2,
        curve: 1.5,
        essential: true
      });
      // 更新高亮图层前先检查是否存在
      if (map.getSource('highlight-marker')) {
        map.getSource('highlight-marker').setData({
          type: 'FeatureCollection',
          features: [e.features[0]]
        });
      }
      const routeFeatures = map.queryRenderedFeatures({ layers: ['hiking-route-5jsjeg'] })
        .filter(f => (f.properties.id || f.properties.name) === markerID);
      if (map.getSource('highlight-route')) {
        if (routeFeatures.length > 0) {
          map.getSource('highlight-route').setData({
            type: 'FeatureCollection',
            features: [routeFeatures[0]]
          });
        } else {
          map.getSource('highlight-route').setData({
            type: 'FeatureCollection',
            features: []
          });
        }
      }
    });
  }); // end style.load

  // ---------- 比例尺 (左下) ----------
  map.addControl(new mapboxgl.ScaleControl({
    maxWidth: 80,
    unit: 'metric'
  }), 'bottom-left');

  // ---------- 绑定 Classification 下拉 ----------
  document.querySelectorAll('#classification-dropdown input[name="classi"]').forEach(radio => {
    radio.addEventListener('change', e => {
      const val = e.target.value;
      if (val === 'All') {
        currentClassificationFilter = null;
      } else {
        currentClassificationFilter = ["==", ["get", "Classification"], val];
      }
      updateCombinedFilter();
    });
  });

  // ---------- 绑定 Difficulty 筛选 ----------
  document.querySelectorAll('input[name="diff"]').forEach(radio => {
    radio.addEventListener('change', updateCombinedFilter);
  });

  // ---------- 绑定 Length 筛选 ----------
  document.querySelectorAll('input[name="length"]').forEach(radio => {
    radio.addEventListener('change', updateCombinedFilter);
  });

  // ---------- 绑定 Ascent 筛选 (Range) ----------
  const ascentSlider = document.getElementById('ascent-range');
  const ascentLabel  = document.getElementById('ascent-label');
  const ascentBins   = [
    null,
    { min: 0, max: 50 },
    { min: 50, max: 100 },
    { min: 100, max: 200 },
    { min: 200, max: 300 },
    { min: 300, max: 400 },
    { min: 400, max: 500 },
    { min: 500, max: 600 },
    { min: 600, max: 700 },
    { min: 700, max: 800 },
    { min: 800, max: 900 },
    { min: 900, max: 1000 },
    { min: 1000, max: 1500 },
    { min: 1500, max: 2000 },
    { min: 2000, max: 2500 },
    { min: 2500, max: 3000 },
    { min: 3000, max: Infinity }
  ];
  const ascentLabels = [
    "All",
    "<50",
    "50-100",
    "100-200",
    "200-300",
    "300-400",
    "400-500",
    "500-600",
    "600-700",
    "700-800",
    "800-900",
    "900-1000",
    "1000-1500",
    "1500-2000",
    "2000-2500",
    "2500-3000",
    ">3000"
  ];
  ascentSlider.addEventListener('input', () => {
    const idx = parseInt(ascentSlider.value, 10);
    ascentLabel.textContent = ascentLabels[idx];
    updateCombinedFilter();
  });

  // ---------- 绑定 Time 筛选 (Range) ----------
  const timeSlider = document.getElementById('time-range');
  const timeLabel  = document.getElementById('time-label');
  const timeBins   = [
    null,
    { min: 0, max: 1 },
    { min: 1, max: 2 },
    { min: 2, max: 3 },
    { min: 3, max: 4 },
    { min: 4, max: 5 },
    "5h+"
  ];
  const timeLabels = [
    "All",
    "0-1h",
    "1-2h",
    "2-3h",
    "3-4h",
    "4-5h",
    "5h+"
  ];
  timeSlider.addEventListener('input', () => {
    const idx = parseInt(timeSlider.value, 10);
    timeLabel.textContent = timeLabels[idx];
    updateCombinedFilter();
  });

  // 初始调用综合过滤
  updateCombinedFilter();

// ---------- 全局点击事件：点击非 marker 区域时取消高亮、隐藏 sidebar、恢复 zoom ----------
  map.on('click', () => {
    setTimeout(() => {
      if (!markerClicked) {
        if (map.getSource('highlight-marker')) {
          map.getSource('highlight-marker').setData({ type: 'FeatureCollection', features: [] });
        }
        if (map.getSource('highlight-route')) {
          map.getSource('highlight-route').setData({ type: 'FeatureCollection', features: [] });
        }
        document.getElementById('sidebar').style.display = 'none';
        map.flyTo({
          zoom: initialZoom,
          speed: 1.2,
          curve: 1.5,
          essential: true
        });
      }
      markerClicked = false;
    }, 200);
  });

  // ---------- 定义 updateCombinedFilter 函数 ----------
  function updateCombinedFilter() {
    // 1) Difficulty
    const diffValue = document.querySelector('input[name="diff"]:checked')?.value;
    if (!diffValue || diffValue === 'all') {
      currentDiffFilter = null;
    } else {
      currentDiffFilter = ["==", ["get", "Difficulty"], diffValue];
    }

    // 2) Length
    const lengthValue = document.querySelector('input[name="length"]:checked')?.value;
    if (!lengthValue || lengthValue === 'all') {
      currentLengthFilter = null;
    } else {
      currentLengthFilter = ["==", ["get", "Length_category"], lengthValue];
    }

    // 3) Ascent
    const ascIdx = parseInt(ascentSlider.value, 10) || 0;
    const ascBin = ascentBins[ascIdx];
    if (ascBin === null) {
      currentAscentFilter = null;
    } else if (ascBin.min === 0 && ascBin.max === Infinity) {
      currentAscentFilter = null;
    } else if (typeof ascBin === 'object') {
      currentAscentFilter = ["all",
        [">=", ["to-number", ["get", "ascent"]], ascBin.min],
        ["<", ["to-number", ["get", "ascent"]], ascBin.max]
      ];
    }

    // 4) Time
    const timeIdx = parseInt(timeSlider.value, 10) || 0;
    const timeBin = timeBins[timeIdx];
    if (timeBin === null) {
      currentTimeFilter = null;
    } else if (typeof timeBin === 'object') {
      currentTimeFilter = ["all",
        [">=", ["to-number", ["get", "Time"]], timeBin.min],
        ["<", ["to-number", ["get", "Time"]], timeBin.max]
      ];
    } else if (timeBin === "5h+") {
      currentTimeFilter = ["==", ["get", "Time"], "5h+"];
    }

    // 5) Classification (已在 global 变量 currentClassificationFilter 中设置)

    // 组合所有筛选条件
    const filters = [];
    if (currentDiffFilter) filters.push(currentDiffFilter);
    if (currentLengthFilter) filters.push(currentLengthFilter);
    if (currentAscentFilter) filters.push(currentAscentFilter);
    if (currentTimeFilter) filters.push(currentTimeFilter);
    if (currentClassificationFilter) filters.push(currentClassificationFilter);

    const combinedFilter = filters.length > 0 ? ["all", ...filters] : null;
    if (map.getLayer('hiking-points-5jbpyy')) {
      map.setFilter('hiking-points-5jbpyy', combinedFilter);
    }
    if (map.getLayer('hiking-route-5jsjeg')) {
      map.setFilter('hiking-route-5jsjeg', combinedFilter);
    }
    console.log("Combined Filter:", combinedFilter);
};