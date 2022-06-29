/* Replaces styles in legend for layers
that has no style specified in index.json */
const StyleSetter = function StyleSetter(options = {}) {
  const {
    viewer,
    layerOvs,
    scale = 401,
    dpi = 600
  } = options;

  const name = 'stylesetter';
  const layerOverlays = {};
  let secondarySlideNavEl;
  let layers = [];
  let layerManagerLayers = [];

  //should be okay with ArcGIS WMS layers as is, provided useDpi is never true
  function getLegendGraphicUrl(layer, format, useDpi = false) {
    const source = layer.get('source');
    const url = source.getUrls()[0];
    let legendUrl = `${url}?layer=${layer.get('name')}&format=${format}&version=1.1.1&request=getLegendGraphic&scale=${scale}`;
    if (useDpi) { legendUrl += `&legend_options=dpi:${dpi}`; }
    if (layer.get('styleName') != "default") {
      legendUrl += `&style=${layer.get('styleName')}`;
    }
    if (legendUrl.charAt(0) === '/') { legendUrl = `${window.location.protocol}//${window.location.hostname}${legendUrl}`; }
    return legendUrl;
  }

  //should never handle ArcGIS WMS layers
  async function checkIfTheme(layer) {
    const url = getLegendGraphicUrl(layer, 'application/json');
    const response = await fetch(url);
    const json = await response.json();
    if (!json) return false;
    const value = json.Legend[0]?.rules[0]?.symbolizers[0]?.Raster?.colormap?.entries;
    if (json.Legend[0].rules.length > 1 || json.Legend.length > 1 || value) {
      return true;
    }
    return false;
  }

  // The html is different depending if extended is true, AKA isTheme
  function secondarySlideHtmlString(isTheme, legendUrl) {
    if (isTheme) {
      return `<li class="flex row align-center padding-y-smallest">
                <img class="extendedlegend pointer" src="${legendUrl}">
              </li>`;
    }
    return `<li class="flex row align-center padding-y-smallest">
                <div style="width: 24px; height: 24px;" class="icon-small round">
                <img class="cover" src="${legendUrl}" style="">
                </div>
              </li>`;
  }

  // Sets the icons on overlays and adds event to replace the secondary icon on click
  // if Arcgis then don't checkIfTheme
  // but merely check if "theme"
  function setLegendGraphicStyles() {
    Object.keys(layerOverlays).forEach(async key => {
      const layer = layerOverlays[key].layer;

      // A separate case is needed for ArcGIS WMS layers since there is no application/json legendGraphic
      if (layer.get('ArcGIS') == true) {
        const legendUrl = getLegendGraphicUrl(layer, 'image/png');

        if (!Boolean(layer.get('print_theme'))) { 
          const iconSpan = layerOverlays[key].overlay.firstElementChild.getElementsByClassName('icon')[0];
          const iconHtml = `<img class="cover" src="${legendUrl}" style="">`;
          iconSpan.innerHTML = iconHtml;
        }

        // Adds event to set the secondary image when clicking a layer in legend
        layerOverlays[key].overlay.addEventListener('click', () => {
          const secondarySlideNavImageEl = secondarySlideNavEl.getElementsByTagName('li')[0];
          if (secondarySlideNavImageEl) secondarySlideNavImageEl.parentElement.innerHTML = secondarySlideHtmlString(Boolean(layer.get('print_theme')), getLegendGraphicUrl(layer, 'image/png'));
        });

        /* Adds the style to the map and updates the layer's style.
        This might be necessary for future references, layermanager etc. */
        viewer.addStyle(legendUrl, {
          icon: { src: legendUrl },
          extendedLegend: Boolean(layer.get('theme'))
        });
        layer.set('style', legendUrl);

      } else {
        const isTrue = await checkIfTheme(layer);
        const legendUrl = getLegendGraphicUrl(layer, 'image/png', true);
        
        if (!isTrue) {
          const iconSpan = layerOverlays[key].overlay.firstElementChild.getElementsByClassName('icon')[0];
          const iconHtml = `<img class="cover" src="${legendUrl}" style="">`;
          iconSpan.innerHTML = iconHtml;
        }

        layerOverlays[key].overlay.addEventListener('click', async () => {
          const secondarySlideNavImageEl = secondarySlideNavEl.getElementsByTagName('li')[0];
          const isTheme = await checkIfTheme(layer);
          if (secondarySlideNavImageEl) secondarySlideNavImageEl.parentElement.innerHTML = secondarySlideHtmlString(isTheme, getLegendGraphicUrl(layer, 'image/png', !isTheme));
        });

        viewer.addStyle(legendUrl, {
          icon: { src: legendUrl },
          extendedLegend: isTrue
        });
        layer.set('style', legendUrl);
      }
    })
  }

  // Add click event for the new popup
  const onOptionClick = (layer, visibleLayers = false) => {
    const newPopupDiv = document.querySelector('.popup-menu:last-of-type');
    if (newPopupDiv?.firstChild?.firstChild) {
      newPopupDiv.firstChild.firstChild.addEventListener('click', async () => {
        let secondarySlideNavImageEl = secondarySlideNavEl.getElementsByTagName('li')[0];
        if (visibleLayers) {
          const elements = document.querySelectorAll('.secondary');
          if (elements) {
            const targetElement = elements[elements.length - 1];
            if (targetElement) {
              secondarySlideNavImageEl = targetElement.getElementsByTagName('li')[0];
            }
          }
        }
        const isTheme = layer.get('ArcGIS') == true ? Boolean(layer.get('print_theme')) : await checkIfTheme(layer);
        if (secondarySlideNavImageEl) secondarySlideNavImageEl.parentElement.innerHTML = secondarySlideHtmlString(isTheme, getLegendGraphicUrl(layer, 'image/png', !Boolean(layer.get('ArcGIS') == true) && !isTheme));
      });
    }
  };

  const toggleShowVisibleLayers = () => {
    const visibleLayers = document.querySelectorAll('.o-layerswitcher-overlays:nth-child(2):not(.hidden) li:not(.hidden)');
    if (!visibleLayers) return;
    visibleLayers.forEach(async visibleLayer => {
      const titleDiv = visibleLayer.querySelector('div');
      if (!titleDiv) return;

      const layerTitle = titleDiv.textContent;
      const layer = layers.find(l => l.get('title') === layerTitle);
      if (!layer) return;
      
      const isTheme = layer.get('ArcGIS') == true ? Boolean(layer.get('print_theme')) : await checkIfTheme(layer);
      if ((layer.get('ArcGIS') == true && !Boolean(layer.get('print_theme'))) || (!layer.get('ArcGIS') && !isTheme)) {
        const legendUrl = getLegendGraphicUrl(layer, 'image/png', !Boolean(layer.get('ArcGIS') == true));
        const iconSpan = visibleLayer.getElementsByClassName('icon')[0];
        if (iconSpan) {
          const iconHtml = `<img class="cover" src="${legendUrl}" style="">`;
          iconSpan.innerHTML = iconHtml;
        }
      }

      const infoButton = visibleLayer.querySelector('button:last-of-type');
      if (!infoButton) return;
      if (layerManagerLayers.some(l => l.get('name') === layer.get('name'))) {
        infoButton.addEventListener('click', () => onOptionClick(layer, true), { once: true });
        return;
      }

      infoButton.addEventListener('click', async () => {
        const elements = document.querySelectorAll('.secondary');
        if (!elements) return;

        const targetElement = elements[elements.length - 1];
        if (!targetElement) return;

        const secondarySlideNavImageEl = targetElement.getElementsByTagName('li')[0];
        if (secondarySlideNavImageEl) {
          const isThemeEvent = layer.get('ArcGIS') == true ? Boolean(layer.get('print_theme')) : await checkIfTheme(layer);
          secondarySlideNavImageEl.parentElement.innerHTML = secondarySlideHtmlString(isThemeEvent, getLegendGraphicUrl(layer, 'image/png', !Boolean(layer.get('ArcGIS') == true) && !isThemeEvent));
        }
      });
    });
  };

  viewer.on('active:togglevisibleLayers', toggleShowVisibleLayers);

  viewer.getMap().getLayers().on('add', async (event) => {
    const layer = event.element;
    if (!layer) return;
    layers.push(layer);
    layerManagerLayers.push(layer);
    // Find the new layer in DOM
    const layerTitle = layer.get('title');
    const targetDiv = [...document.getElementsByTagName('div')].find(a => a.textContent === layerTitle);
    if (targetDiv?.parentElement?.lastChild) {
      // When a layer has multiple options a popup with choices is rendered
      // Here we wait for a click event so we can attach a listener to the button in the new popup
      targetDiv.parentElement.lastChild.addEventListener('click', () => onOptionClick(layer), { once: true });
    }
  });

  function layerConditions(layer) {
    return layer.get('group') !== 'background'
      && layer.get('group') !== 'txt'
      && layer.get('name') !== 'measure'
      && layer.get('style') === 'default';
  }

  return Origo.ui.Component({
    name,
    onAdd() {
      layers = [];
      Object.keys(layerOvs).forEach(key => {
        if (layerConditions(layerOvs[key].layer)) {
          layerOverlays[key] = layerOvs[key];
          layers.push(layerOvs[key].layer);
        }
      });
      secondarySlideNavEl = document.getElementsByClassName('secondary')[0];
      if (!secondarySlideNavEl) { console.error(`StyleSetter: secondarySlideNavEl was ${secondarySlideNavEl}`); }
      setLegendGraphicStyles();
    }
  });
};

export default StyleSetter;
