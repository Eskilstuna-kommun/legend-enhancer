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

  //should be okay with ArcGIS WMS layers as is, provided useDpi is never true
  function getLegendGraphicUrl(layer, format, useDpi) {
    const source = layer.get('source');
    const url = source.getUrls()[0];
    let legendUrl = `${url}?layer=${layer.get('name')}&format=${format}&version=1.1.1&request=getLegendGraphic&scale=${scale}`;
    if (useDpi) { legendUrl += `&legend_options=dpi:${dpi}`; }
    if (legendUrl.charAt(0) === '/') { legendUrl = `${window.location.protocol}//${window.location.hostname}${legendUrl}`; }
    return legendUrl;
  }

  //should never handle ArcGIS WMS layers
  function checkIfTheme(layer) {
    const url = getLegendGraphicUrl(layer, 'application/json');
    return fetch(url)
      .then(response => response.json())
      .then(json => {
        if (json.Legend[0].rules.length > 1 || json.Legend.length > 1) { return true; }
        return false;
      });
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
    Object.keys(layerOverlays).forEach(key => {
      const layer = layerOverlays[key].layer;

      // A separate case is needed for ArcGIS WMS layers since there is no application/json legendGraphic
      if (layer.get('ArcGIS') == true) {
        const legendUrl = getLegendGraphicUrl(layer, 'image/png');

        if (!layer.get('theme')) { 
          const iconSpan = layerOverlays[key].overlay.firstElementChild.getElementsByClassName('icon')[0];
          const iconHtml = `<img class="cover" src="${legendUrl}" style="">`;
          iconSpan.innerHTML = iconHtml;
        }

        // Adds event to set the secondary image when clicking a layer in legend
        layerOverlays[key].overlay.addEventListener('click', () => {
          const secondarySlideNavImageEl = secondarySlideNavEl.getElementsByTagName('li')[0];
          if (secondarySlideNavImageEl) secondarySlideNavImageEl.parentElement.innerHTML = secondarySlideHtmlString(Boolean(layer.get('theme')), legendUrl);
        });

        /* Adds the style to the map and updates the layer's style.
        This might be necessary for future references, layermanager etc. */
        viewer.addStyle(legendUrl, {
          icon: { src: legendUrl },
          extendedLegend: Boolean(layer.get('theme'))
        });
        layer.set('style', legendUrl);

      } else {
        checkIfTheme(layer).then(isTrue => {
        const legendUrl = isTrue ? getLegendGraphicUrl(layer, 'image/png') : getLegendGraphicUrl(layer, 'image/png', true);

        if (!isTrue) {
          const iconSpan = layerOverlays[key].overlay.firstElementChild.getElementsByClassName('icon')[0];
          const iconHtml = `<img class="cover" src="${legendUrl}" style="">`;
          iconSpan.innerHTML = iconHtml;
        }

        layerOverlays[key].overlay.addEventListener('click', () => {
          const secondarySlideNavImageEl = secondarySlideNavEl.getElementsByTagName('li')[0];
          if (secondarySlideNavImageEl) secondarySlideNavImageEl.parentElement.innerHTML = secondarySlideHtmlString(isTrue, legendUrl);
        });

        viewer.addStyle(legendUrl, {
          icon: { src: legendUrl },
          extendedLegend: isTrue
        });
        layer.set('style', legendUrl);
      })
    }
  })
  }

  function layerConditions(layer) {
    return layer.get('group') !== 'background'
      && layer.get('group') !== 'txt'
      && layer.get('name') !== 'measure'
      && layer.get('style') === 'default';
  }

  return Origo.ui.Component({
    name,
    onAdd() {
      Object.keys(layerOvs).forEach(key => {
        if (layerConditions(layerOvs[key].layer)) layerOverlays[key] = layerOvs[key];
      });
      secondarySlideNavEl = document.getElementsByClassName('secondary')[0];
      if (!secondarySlideNavEl) { console.error(`StyleSetter: secondarySlideNavEl was ${secondarySlideNavEl}`); }
      setLegendGraphicStyles();
    }
  });
};

export default StyleSetter;
