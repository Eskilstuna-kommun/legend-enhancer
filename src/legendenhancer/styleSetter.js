/*Replaces styles in legend for layers 
that has no style specified in index.json*/
const StyleSetter = function StyleSetter(options = {}) {
  const {
    viewer,
    layerOvs,
    scale = 401,
    dpi = 600,
    layerOverlays = {}
  } = options;

  const name = 'stylesetter';
  let secondarySlideNavEl;

  function getLegendGraphicUrl(layer, format, useDpi) {
    let source = layer.get('source');
    let url = source.getUrls()[0];
    let legendUrl = `${url}?layer=${layer.get('name')}&format=${format}&version=1.1.1&request=getLegendGraphic&scale=${scale}`;
    if (useDpi)
      legendUrl += `&legend_options=dpi:${dpi}`
    if (legendUrl.charAt(0) === "/")
      legendUrl = window.location.protocol + "//" + window.location.hostname + legendUrl;
    return legendUrl;
  }

  function checkIfTheme(layer) {
    let url = getLegendGraphicUrl(layer, 'application/json');
    return fetch(url)
      .then(response => response.json())
      .then(json => {
        if (json.Legend[0].rules.length > 1 || json.Legend.length > 1)
          return true;
        return false;
      });
  }

  //The html is different depending if extended is true, AKA isTheme
  function secondarySlideHtmlString(isTheme, legendUrl) {
    if (isTheme)
      return `<li class="flex row align-center padding-y-smallest">
                <img class="extendedlegend pointer" src="${legendUrl}">
              </li>`
    else
      return `<li class="flex row align-center padding-y-smallest">
                <div style="width: 24px; height: 24px;" class="icon-small round">
                <img class="cover" src="${legendUrl}" style="">
                </div>
              </li>`
  }

  //Sets the icons on overlays and adds event to replace the secondary icon on click
  function setLegendGraphicStyles(filteredLayers) {
    filteredLayers.forEach((layer) => {
      checkIfTheme(layer).then(isTrue => {
        let legendUrl = isTrue ? getLegendGraphicUrl(layer, 'image/png') : getLegendGraphicUrl(layer, 'image/png', true);
        //Do not replace default icon when it is a theme layer
        if (!isTrue) {
          let iconSpan = layerOverlays[layer.get('title')].firstElementChild.getElementsByClassName('icon')[0];
          let iconHtml = `<img class="cover" src="${legendUrl}" style="">`;
          iconSpan.innerHTML = iconHtml;
        }

        //Adds event to set the secondary image when clicking a layer in legend
        layerOverlays[layer.get('title')].addEventListener('click', () => {
          let secondarySlideNavImageEl = secondarySlideNavEl.getElementsByTagName('li')[0];
          if (secondarySlideNavImageEl) secondarySlideNavImageEl.parentElement.innerHTML = secondarySlideHtmlString(isTrue, legendUrl);
        });

        /*Adds the style to the map and updates the layer's style.
        This might be necessary for future references, layermanager etc.*/
        viewer.addStyle(legendUrl, {
          icon: { src: legendUrl },
          extendedLegend: isTrue
        });
        layer.set('style', legendUrl);
      })
    });
  };

  function layerConditions(layer) {
    return layer.get('group') !== 'background'
      && layer.get('group') !== 'txt'
      && layer.get('name') !== 'measure'
      && layer.get('style') === 'default'
  }

  return Origo.ui.Component({
    name,
    onAdd(e) {

      let layers = viewer.getLayers();
      layers = layers.filter((layer) => layerConditions(layer));
      const allDivTagElements = document.getElementsByTagName('div');
      for (let i = 0; i < allDivTagElements.length; i += 1) {
        const item = allDivTagElements[i];
        if (layers.find((layer) => layer.get('title') === item.textContent)) {
          layerOverlays[item.textContent] = item.parentElement;
        }
      }
      secondarySlideNavEl = document.getElementsByClassName('secondary')[0];
      if (!secondarySlideNavEl)
        console.error(`StyleSetter: secondarySlideNavEl was ${secondarySlideNavEl}`);
      setLegendGraphicStyles(layers);
    }
  });
}

export default StyleSetter;