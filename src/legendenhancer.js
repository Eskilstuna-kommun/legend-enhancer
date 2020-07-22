import 'Origo';
import GroupIndication from './legendenhancer/groupindication'
import StyleSetter from './legendenhancer/styleSetter'
import AbstractSetter from './legendenhancer/abstractSetter'
import ChangeRemoveButtonStyle from './legendenhancer/changeRemoveButtonStyle'

const Legendenhancer = function Legendenhancer(options = {}) {
  let {
    groupIndication,
    abstractSetter,
    styleSetter,
    changeremovebuttonstyle
  } = options;
  let allDivTagElements;

  function getLayerOverlays(layers) {
    const layerOvs = {};
    for (let i = 0; i < allDivTagElements.length; i++) {
      const item = allDivTagElements[i];
      const foundLayer = layers.find((layer) => layer.get('title') === item.textContent);
      if (foundLayer) {
        layerOvs[foundLayer.get('name')] = {
          overlay: item.parentElement,
          layer: foundLayer
        };
      }
    }
    return layerOvs;
  }

  return Origo.ui.Component({
    name: 'legendenhancer',
    onAdd(e) {
      let viewer = e.target;
      allDivTagElements = document.getElementsByTagName('div');
      let layerOvs = getLayerOverlays(e.target.getLayers());
      if (groupIndication) this.addComponent(GroupIndication({ viewer, layerOvs, ...groupIndication }));
      if (abstractSetter) this.addComponent(AbstractSetter({ viewer, layerOvs, ...abstractSetter }));
      if (styleSetter) this.addComponent(StyleSetter({ viewer, layerOvs, ...styleSetter }));
      if (changeremovebuttonstyle) this.addComponent(ChangeRemoveButtonStyle({ viewer, layerOvs, allDivTagElements, ...changeremovebuttonstyle })); 
    }
  });
}
export default Legendenhancer;