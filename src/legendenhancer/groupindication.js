/* Gives a visual indication on group level
to indicate that a layer is active in the group*/
const GroupIndication = function GroupIndication(options = {}) {
  const {
    viewer,
    layerOvs
  } = options;

  let activegroups = {} //local set to keep track on active layers/group
  const initSet = function initSet(viewer, objgroup) {
    let groupnames = viewer.getGroups();
    let allDivTagElements = document.getElementsByTagName(`span`);
    let title = objgroup.title;
    if (objgroup.parent)
      title = groupnames.find(x => x.name == objgroup.parent).title;
    let El;
    for (let i = 0; i < allDivTagElements.length; i++) {
      const item = allDivTagElements[i];
      if (item.textContent == (`${title}`)) {
        El = item.nextElementSibling.firstElementChild.firstElementChild;
        break;
      }
    }

    activegroups[objgroup.name] = {
      element: El,
      status: false,
      layers: {}
    }
  }

  const updateGraphics = function updateGraphics(e, grpName, layerName) {
    activegroups[grpName].layers[layerName] = !e.oldValue;
    if (Object.keys(activegroups[grpName].layers).find((key) => activegroups[grpName].layers[key] == true)) {
      activegroups[grpName].status = true;
      activegroups[grpName].element.style.border = "double #008ff5";
    } else {
      activegroups[grpName].status = false;
      activegroups[grpName].element.style.border = ""; //turn off
    }
  }
  return Origo.ui.Component({
    name,
    onAdd(e) {
      let groupnames = viewer.getGroups();

      groupnames.forEach(objgroup => {
        initSet(viewer, objgroup);
      });

      viewer.getMap().getLayers().forEach(layer => {
        let grpName = layer.get('group');
        let layerName = layer.get('name');
        //filter out groupless layers
        if (!groupnames.find(grp => grp.name == grpName) || grpName == 'background') return;

        activegroups[grpName].layers[layerName] = layer.get('visible');
        if (layer.get('visible')) {
          activegroups[grpName].element.style.border = "double #008ff5";
        }

        layer.on('change:visible', (e) => {
          updateGraphics(e, grpName, layerName);
        });
      });

      //support for LayerManager
      viewer.on("addlayer", (layer) => {
        let addedLayer = viewer.getLayer(layer.layerName);
        let objgroup = viewer.getGroup(addedLayer.get('group'));
        let layerName = addedLayer.get('name');
        if (!activegroups[objgroup.name]) initSet(viewer, objgroup);

        activegroups[objgroup.name].layers[layerName] = addedLayer.get('visible');
        if (addedLayer.get('visible')) {
          activegroups[objgroup.name].element.style.border = "double #008ff5";
        }

        addedLayer.on('change:visible', (e) => {
          updateGraphics(e, objgroup.name, layerName);
        });
      });
    }
  });
}

export default GroupIndication;