import 'Origo';
import GroupIndication from './legendenhancer/groupindication';
import StyleSetter from './legendenhancer/styleSetter';
import AlterLayerStyle from './legendenhancer/alterLayerStyle';
import AbstractSetter from './legendenhancer/abstractSetter';
import ChangeRemoveButtonStyle from './legendenhancer/changeRemoveButtonStyle';

const Legendenhancer = function Legendenhancer(options = {}) {
  const {
    groupIndication,
    abstractSetter,
    styleSetter,
    alterLayerStyle,
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
      const viewer = e.target;
      allDivTagElements = document.getElementsByTagName('div');
      const layerOvs = getLayerOverlays(e.target.getLayers());
      if (groupIndication) this.addComponent(GroupIndication({ viewer, layerOvs, ...groupIndication }));
      if (abstractSetter) this.addComponent(AbstractSetter({ viewer, layerOvs, ...abstractSetter }));
      if (styleSetter) this.addComponent(StyleSetter({ viewer, layerOvs, ...styleSetter }));
      if (alterLayerStyle) this.addComponent(AlterLayerStyle({ viewer, layerOvs, ...alterLayerStyle }));
      if (changeremovebuttonstyle) this.addComponent(ChangeRemoveButtonStyle({ viewer, layerOvs, allDivTagElements, ...changeremovebuttonstyle }));
    }
  });
};
export default Legendenhancer;