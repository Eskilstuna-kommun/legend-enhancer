import 'Origo';

/* Replaces styles in legend for layers
that has no style specified in index.json */
const ChangeRemoveButtonStyle = function ChangeRemoveButtonStyle(options = {}) {
  const {
    viewer,
    layerOvs,
    allDivTagElements,
    fill = '#c33932'
  } = options;
  const name = 'changeremovebuttonstyle';
  const layerOverlays = {};

  function removeButtonStyle(button) {
    button.style.marginRight = '0.5rem';
    const svg = button.getElementsByTagName('svg')[0];
    svg.style.fill = fill;
  }

  function changeStyles() {
    Object.keys(layerOverlays).forEach(key => {
      const overlay = layerOverlays[key].overlay;
      const buttons = overlay.getElementsByTagName('button');
      if (layerOverlays[key].layer.get('removable')) {
        removeButtonStyle(buttons[1]);
      }
    });
  }

  function layerConditions(layer) {
    return layer.get('group') !== 'background'
      && layer.get('group') !== 'txt'
      && layer.get('name') !== 'measure'
      && layer.get('group') !== 'none';
  }

  return Origo.ui.Component({
    name,
    onAdd() {
      Object.keys(layerOvs).forEach(key => {
        if (layerConditions(layerOvs[key].layer)) layerOverlays[key] = layerOvs[key];
      });
      changeStyles();
      viewer.on('addlayer', layerProp => {
        const layername = layerProp.layerName;
        const layer = viewer.getLayer(layername);
        if (layer.get('removable')) {
          const overlay = Array.from(allDivTagElements).find(tag => tag.textContent === layer.get('title')).parentElement;
          const buttons = overlay.getElementsByTagName('button');
          removeButtonStyle(buttons[1]);
        }
      });
    }
  });
};

export default ChangeRemoveButtonStyle;
