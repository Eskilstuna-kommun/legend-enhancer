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
  // Keep track of which layers have had events attached to their options popup
  const layersEventAdded = {};

  // Add altered style to mapstate when sharing map
  function addToMapState(mapState) {
    // eslint-disable-next-line no-param-reassign
    mapState[pluginName] = alteredStyles;
  }

  const layerConditions = function layerConditions(layer) {
    return layer.get('group') !== 'background'
      && layer.get('group') !== 'txt'
      && layer.get('name') !== 'measure';
  };

  // Switches to correct icon in legend and sets new style in map
  const switchStyle = function switchStyle(layer, style, e, LURL) {
    alteredStyles[layer.get('name')] = style;

    const legendIconUrl = LURL[style] ? `${LURL[style]}&scale=401` : LURL;
    const styles = [[
      {
        icon: { src: legendIconUrl },
        wmsStyle: style,
        extendedLegend: Boolean(layer.get('theme')) // layers that have theme-like styles from point doesnt flip this boolean
      }]];

    viewer.addStyle(style, styles); // Adds only once, skips if duplicated
    layer.set('styleName', style); // updates icon onclick @ legend title
    layer.set('STYLES', style); // updates layer on map
    // eslint-disable-next-line no-underscore-dangle
    layer.get('source').params_.STYLES = style; // forces layer cashe refresh with clear()
    console.log(e.target);
    if (!e.target.name) { // Checks if switch style is onAdd or selector
      const layerTitle = layer.get('title');
      const targetDiv = [...document.getElementsByTagName('div')].find(a => a.textContent === layerTitle);
      if (targetDiv?.previousElementSibling?.firstChild?.nextElementSibling?.firstChild) {
        targetDiv.previousElementSibling.firstChild.nextElementSibling.firstChild.src = `${legendIconUrl}&legend_options=dpi:300`;
      }
      const elemtarget = e.target.parentNode.firstElementChild.firstElementChild.firstElementChild;
      // Different position in DOM for theme/point icon
      if (elemtarget.src) {
        elemtarget.src = legendIconUrl;
      } else {
        elemtarget.firstElementChild.src = `${legendIconUrl}&legend_options=dpi:300`;
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
                const LURL = style.getElementsByTagName('OnlineResource')[0].attributes[2].value;
                styleCollection.push([name, title, LURL]);
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
  function setAlteredStyles(e) {
    Object.keys(alteredStyles).forEach(layerName => {
      const layer = viewer.getLayer(layerName);
      if (layer) {
        switchStyle(layer, alteredStyles[layerName], e, getLegendGraphicUrl(layer, 'application/json', true));
      }
    });
  }

  // eslint-disable-next-line no-undef
  return Origo.ui.Component({
    // eslint-disable-next-line no-restricted-globals
    name,
    onAdd(e) {
      const layers = [];
      let layerStyles = {};
      Object.keys(layerOvs).forEach(key => {
        if (layerConditions(layerOvs[key].layer)) {
          layers.push(layerOvs[key].layer);
          if (layerOvs[key].layer.get('wmsStyle')) { // if style is given in index.json, switch it here during onAdd
            switchStyle(layerOvs[key].layer, layerOvs[key].layer.get('wmsStyle'), e, getLegendGraphicUrl(layerOvs[key].layer, 'application/json', true));
          }
        }
      });

      getStyles(layers).then(res => { layerStyles = res; });

      // Creates the dropdown element
      const createSelector = function createSelector(layer) {
        const layerName = layer.get('name');
        const selectElement = document.createElement('SELECT');
        const LURL = [];
        if (!layerStyles[layerName]) {
          return document.createElement('div');
        }
        layerStyles[layerName].forEach(style => {
          const optionElement = document.createElement('option');
          const textNode = document.createTextNode(style[1]);

          optionElement.setAttribute('value', style[0]);
          optionElement.appendChild(textNode);
          selectElement.appendChild(optionElement);
          LURL[style[0]] = style[2];
        });
        if (alteredStyles[layerName]) {
          selectElement.value = alteredStyles[layerName];
        }
        selectElement.onchange = (selectChangeEvent) => {
          switchStyle(layer, selectElement.value, selectChangeEvent, LURL);
        };
        return selectElement;
      };

      const onLayerInfoClick = (layer) => {
        const targetElement = document.querySelector('.secondary > div > div > div > ul');
        if (targetElement) {
          targetElement.parentNode.insertBefore(createSelector(layer), targetElement.nextSibling);
        }
      };

      layers.forEach(layer => {
        if (layer) {
          layerOvs[layer.get('name')].overlay.addEventListener('click', () => onLayerInfoClick(layer));
        }
      });

      // Add click event for the new popup
      const onOptionClick = (layer) => {
        if (layersEventAdded[layer.get('name')]) return;
        layersEventAdded[layer.get('name')] = true;
        const newPopupDiv = document.querySelector('.popup-menu:last-of-type');
        if (newPopupDiv?.firstChild?.firstChild) {
          newPopupDiv.firstChild.firstChild.addEventListener('click', () => onLayerInfoClick(layer));
        }
      };

      viewer.getMap().getLayers().on('add', async (event) => {
        const layer = event.element;
        if (!layer) return;

        // Because layers from layermanager get added through this method after urlParams are checked we call setAlteredStyles here as well
        setAlteredStyles(e);

        // Update styles list to get info for new layer
        layers.push(layer);
        layerStyles = await getStyles(layers);

        // Find the new layer in DOM
        const layerTitle = layer.get('title');
        const targetDiv = [...document.getElementsByTagName('div')].find(a => a.textContent === layerTitle);
        if (targetDiv?.parentElement?.lastChild) {
          // When a layer has multiple options a popup with choices is rendered
          // Here we wait for a click event so we can attach a listener to the button in the new popup
          targetDiv.parentElement.lastChild.addEventListener('click', () => onOptionClick(layer));
        }
      });

      viewer.getMap().getLayers().on('remove', async (event) => {
        const layer = event.element;
        if (!layer) return;
        layersEventAdded[layer.get('name')] = false;
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
