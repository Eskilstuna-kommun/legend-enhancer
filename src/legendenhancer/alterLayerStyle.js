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

  const layerConditions = function layerConditions(layer) {
    return layer.get('group') !== 'background'
      && layer.get('group') !== 'txt'
      && layer.get('name') !== 'measure';
  };

  // Switches to correct icon in legend and sets new style in map
  const switchStyle = function switchStyle(layer, style, e, LURL) {
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

    if (!e.target.name) { // Checks if switch style is onAdd or selector
      document.querySelector(`li[title="${layer.get('title')}"]`).firstChild.firstChild.nextElementSibling.firstChild.src = `${legendIconUrl}&legend_options=dpi:300`;
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
        const sel = document.createElement('SELECT');
        const LURL = [];
        if (layerStyles[layer.get('name')]) {
          layerStyles[layer.get('name')].forEach(style => {
            const opt = document.createElement('option');
            opt.setAttribute('value', style[0]);
            const nod = document.createTextNode(style[1]);
            opt.appendChild(nod);
            sel.appendChild(opt);
            LURL[style[0]] = style[2];
          });
        } else {
          return document.createElement('div');
        }
        sel.onchange = (e) => {
          let temp = []; // keeps dropdown list updated to current active style
          layerStyles[layer.get('name')] = layerStyles[layer.get('name')].filter(item => {
            if (item[0] === sel.value) {
              temp = item;
              return false;
            }
            return true;
          });
          layerStyles[layer.get('name')].unshift(temp);

          switchStyle(layer, sel.value, e, LURL);
        };
        return sel;
      };

      layers.forEach(layer => {
        if (layer) {
          layerOvs[layer.get('name')].overlay.addEventListener('click', () => {
            const secondarySlideNavEl = document.getElementsByClassName('secondary')[0];
            if (secondarySlideNavEl != null) {
              const targetElement = secondarySlideNavEl// This mess is to navigate to the right DOM element
                .firstElementChild
                .lastElementChild
                .firstElementChild
                .firstElementChild;
              if (targetElement) {
                targetElement.parentNode.insertBefore(createSelector(layer), targetElement.nextSibling);
              }
            }
          });
        }
      });
    }
  });
};

export default AlterLayerStyle;
