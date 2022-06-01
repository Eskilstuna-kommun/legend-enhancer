/* Makes it possible for the user to change the layers style in
legend for that layer.
*/
const AlterLayerStyle = function AlterLayerStyle(options = {}) {
  const {
    viewer,
    layerOvs,
    scale = 401,
    dpi = 600,
    url
  } = options;

  const pluginName = 'alterlayerstyleplugin';
  // Keep track of chosen styles
  let alteredStyles = {};

  // Add altered style to mapstate when sharing map
  function addToMapState(mapState) {
    // eslint-disable-next-line no-param-reassign
    mapState[pluginName] = alteredStyles;
  }

  const getLegendGraphicJSON = async (url) => {
    try {
      if (!url) {
        return null;
      }
      const response = await fetch(url);
      const json = await response.json();
      return json;
    } catch (e) {
      console.warn(e);
      return null;
    }
  };

  const getJSONContent = async (layer) => {
    const json = await getLegendGraphicJSON(getLegendGraphicUrl(layer, 'application/json'));
    if (json?.Legend[0]?.rules.length > 1) {
      return json.Legend[0].rules;
    }
    return [];
  };

  const layerConditions = function layerConditions(layer) {
    return layer.get('group') !== 'background'
      && layer.get('group') !== 'txt'
      && layer.get('name') !== 'measure';
  };

  const checkIfTheme = async (layer) => {
    const json = await getLegendGraphicJSON(getLegendGraphicUrl(layer, 'application/json'));
    const value = json.Legend[0]?.rules[0]?.symbolizers[0]?.Raster?.colormap?.entries;
    if (json.Legend[0].rules.length > 1 || json.Legend.length > 1 || value) {
      return true;
    }
    return false;
  }

  // Switches to correct icon in legend and sets new style in map
  const switchStyle = async (layer, style, e, visibleLayers = false) => {
    alteredStyles[layer.get('name')] = style;
    layer.set('styleName', style); // updates icon onclick @ legend title
    const legendIconUrl = getLegendGraphicUrl(layer, 'image/png', true);
    const extraStyles = await getJSONContent(layer);
    const isTheme = await checkIfTheme(layer);

    let styles = [[
      {
        icon: { src: legendIconUrl },
        wmsStyle: style,
        extendedLegend: isTheme // layers that have theme-like styles from point doesnt flip this boolean
      }]];

    if (extraStyles.length) {
      let styleRules = [];
      extraStyles.forEach((extraStyle) => {
        styleRules.push([
          {
            icon: { src: legendIconUrl + '&rule=' + extraStyle.name },
            label: extraStyle.title,
            wmsStyle: style,
            extendedLegend: false
          }]);
      })
      styles = styleRules;
    }

    viewer.addStyle(style, styles); // Adds only once, skips if duplicated
    layer.set('STYLES', style); // updates layer on map
    // eslint-disable-next-line no-underscore-dangle
    layer.get('source').params_.STYLES = style; // forces layer cashe refresh with clear()
    const layerTitle = layer.get('title');
    if (visibleLayers) {
      const visibleTabDiv = [...document.querySelectorAll('.o-layerswitcher-overlays:nth-child(2):not(.hidden) li:not(.hidden) div')].find(a => a.textContent === layerTitle);
      if (visibleTabDiv?.previousSibling?.firstChild?.nextSibling) {
        if (isTheme) {
          visibleTabDiv.previousSibling.classList.add('grey-lightest');
          visibleTabDiv.previousSibling.firstChild.nextSibling.innerHTML = '<svg class="" style=""><use xlink:href="#o_list_24px"></use></svg>';
        } else {
          visibleTabDiv.previousSibling.classList.remove('grey-lightest');
          visibleTabDiv.previousSibling.firstChild.nextSibling.innerHTML = `<img class="cover" src="${legendIconUrl}" style="" alt="Lager ikon" title="">`;
        }
      }
    }
    const targetDiv = [...document.querySelectorAll('.o-layerswitcher-overlays:first-child div')].find(a => a.textContent === layerTitle);
    if (targetDiv?.previousSibling?.firstChild?.nextSibling) {
      if (isTheme) {
        targetDiv.previousSibling.classList.add('grey-lightest');
        targetDiv.previousSibling.firstChild.nextSibling.innerHTML = '<svg class="" style=""><use xlink:href="#o_list_24px"></use></svg>';
      } else {
        targetDiv.previousSibling.classList.remove('grey-lightest');
        targetDiv.previousSibling.firstChild.nextSibling.innerHTML = `<img class="cover" src="${legendIconUrl}" style="" alt="Lager ikon" title="">`;
      }
    }
    
    if (!e.target.name && e.target?.parentNode?.firstElementChild?.firstElementChild) { // Checks if switch style is onAdd or selector
      const elemtarget = e.target.parentNode.firstElementChild.firstElementChild;
      if (isTheme) {
        elemtarget.innerHTML = `<img class="extendedlegend pointer" src="${legendIconUrl}" title="" style="">`;
      } else {
        elemtarget.innerHTML = `<div class="icon-small round"><img class="cover" src="${legendIconUrl}" style="" alt="Lager ikon" title=""></div>`;
      }
    }
    layer.get('source').clear();
  };

  // Gets the style, title and Legend URL with GetCapabilities
  const getStyles = function getStyles(localLayers) {
    const URL = `${url}?version=1.1.1&request=GetCapabilities&service=WMS`;
    const matchingLayer = {};
    return fetch(URL)
      .then(rsp => rsp.text())
      .then((rsptext) => {
        const xml = new DOMParser().parseFromString(rsptext, 'text/xml');
        const xmlLayers = xml.getElementsByTagName('Layer');

        Array.from(xmlLayers).forEach(entry => {
          const layer = localLayers.find(x => x.get('name') === entry.getElementsByTagName('Name')[0].innerHTML);
          if (layer) {
            if (entry.getElementsByTagName('Style').length > 1) { // Show dropdown option only if there is two or more styles
              const styles = entry.getElementsByTagName('Style');
              const styleCollection = [];

              Array.from(styles).forEach(style => {
                const name = style.getElementsByTagName('Name')[0].innerHTML;
                const title = style.getElementsByTagName('Title')[0].innerHTML;
                styleCollection.push([name, title]);
              });

              matchingLayer[layer.get('name')] = styleCollection;
            }
          }
        });
        return matchingLayer;
      // eslint-disable-next-line no-undef
      }).catch(err => { swal('Något gick fel', err, 'warning'); });
  };
  // This is for onLoad switching of style, otherwise URL comes from GetCapabilities
  function getLegendGraphicUrl(layer, format, useDpi) {
    const source = layer.get('source');
    const URL = source.getUrls()[0];
    let legendUrl = `${URL}?layer=${layer.get('name')}&format=${format}&version=1.1.1&request=getLegendGraphic&scale=${scale}`;
    if (useDpi) { legendUrl += `&legend_options=dpi:${dpi}`; }
    if (layer.get('styleName') !== 'default') {
      legendUrl += `&style=${layer.get('styleName')}`;
    }
    if (legendUrl.charAt(0) === '/') { legendUrl = `${window.location.protocol}//${window.location.hostname}${legendUrl}`; }
    return legendUrl;
  }

  // Set altered styles when reading from mapstate
  async function setAlteredStyles(e) {
    Object.keys(alteredStyles).forEach(async (layerName) => {
      const layer = viewer.getLayer(layerName);
      if (layer) {
        await switchStyle(layer, alteredStyles[layerName], e);
      }
    });
  }

  // eslint-disable-next-line no-undef
  return Origo.ui.Component({
    // eslint-disable-next-line no-restricted-globals
    name,
    onAdd(e) {
      const layers = [];
      const layerManagerLayers = [];
      let layerStyles = {};
      Object.keys(layerOvs).forEach(async key => {
        if (layerConditions(layerOvs[key].layer)) {
          layers.push(layerOvs[key].layer);
          if (layerOvs[key].layer.get('wmsStyle')) { // if style is given in index.json, switch it here during onAdd
            await switchStyle(layerOvs[key].layer, layerOvs[key].layer.get('wmsStyle'), e);
          }
        }
      });

      getStyles(layers).then(res => { layerStyles = res; });

      // Creates the dropdown element
      const createSelector = function createSelector(layer, visibleLayers = false) {
        const layerName = layer.get('name');
        const selectElement = document.createElement('SELECT');
        if (!layerStyles[layerName]) {
          return document.createElement('div');
        }
        layerStyles[layerName].forEach(style => {
          const optionElement = document.createElement('option');
          const textNode = document.createTextNode(style[1]);

          optionElement.setAttribute('value', style[0]);
          optionElement.appendChild(textNode);
          selectElement.appendChild(optionElement);
        });
        if (alteredStyles[layerName]) {
          selectElement.value = alteredStyles[layerName];
        }
        selectElement.onchange = async (selectChangeEvent) => {
          await switchStyle(layer, selectElement.value, selectChangeEvent, visibleLayers);
        };
        return selectElement;
      };

      const onLayerInfoClick = (layer, visibleLayers = false) => {
        let targetElement = document.querySelector('.secondary > div > div > div > ul');
        if (visibleLayers) {
          const elements = document.querySelectorAll('.secondary > div > div > div > ul');
          if (elements) {
            targetElement = elements[elements.length - 1];
          }
        }
        if (targetElement) {
          targetElement.parentNode.insertBefore(createSelector(layer, visibleLayers), targetElement.nextSibling);
        }
      };

      layers.forEach(layer => {
        if (layer) {
          layerOvs[layer.get('name')].overlay.addEventListener('click', () => onLayerInfoClick(layer));
        }
      });

      // Add click event for the new popup
      const onOptionClick = (layer, visibleLayers = false) => {
        const newPopupDiv = document.querySelector('.popup-menu:last-of-type');
        if (newPopupDiv?.firstChild?.firstChild) {
          newPopupDiv.firstChild.firstChild.addEventListener('click', () => onLayerInfoClick(layer, visibleLayers));
        }
      };

      // To set layerswitch dropdown for the 'OnlyShowVisibleLayers' box
      const toggleShowVisibleLayers = () => {
        const visibleLayers = document.querySelectorAll('.o-layerswitcher-overlays:nth-child(2):not(.hidden) li:not(.hidden)');
        if (!visibleLayers) return;
        visibleLayers.forEach(visibleLayer => {
          const titleDiv = visibleLayer.querySelector('div');
          if (!titleDiv) return;
          const layerTitle = titleDiv.textContent;
          const layer = layers.find(l => l.get('title') === layerTitle);
          if (!layer) return;
          const infoButton = visibleLayer.querySelector('button:last-of-type');
          if (!infoButton) return;
          if (layerManagerLayers.some(l => l.get('name') === layer.get('name'))) {
            infoButton.addEventListener('click', () => onOptionClick(layer, true), { once: true });
            return;
          }
          infoButton.addEventListener('click', () => onLayerInfoClick(layer, true));
        });
      };

      viewer.on('active:togglevisibleLayers', toggleShowVisibleLayers);

      viewer.getMap().getLayers().on('add', async (event) => {
        const layer = event.element;
        if (!layer) return;

        // Because layers from layermanager get added through this method after urlParams are checked we call setAlteredStyles here as well
        setAlteredStyles(e);

        // Update styles list to get info for new layer
        layers.push(layer);
        layerManagerLayers.push(layer);
        layerStyles = await getStyles(layers);

        // Find the new layer in DOM
        const layerTitle = layer.get('title');
        const targetDiv = [...document.getElementsByTagName('div')].find(a => a.textContent === layerTitle);
        if (targetDiv?.parentElement?.lastChild) {
          // When a layer has multiple options a popup with choices is rendered
          // Here we wait for a click event so we can attach a listener to the button in the new popup
          targetDiv.parentElement.lastChild.addEventListener('click', () => onOptionClick(layer), { once: true });
        }
      });

      const sharemap = viewer.getControlByName('sharemap');
      if (sharemap && sharemap.options.storeMethod === 'saveStateToServer') {
        sharemap.addParamsToGetMapState(pluginName, addToMapState);
      }

      const urlParams = viewer.getUrlParams();
      if (urlParams[pluginName]) {
        alteredStyles = urlParams[pluginName];
        setAlteredStyles(e);
      }
    }
  });
};

export default AlterLayerStyle;
