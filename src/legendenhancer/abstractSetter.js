/*Adds abstract to layers thats is initially in legend
*/
const AbstractSetter = function AbstractSetter(options = {}) {
  const {
    viewer,
    layerOvs,
    url,
    layerList = []
  } = options;

  function buildFilter() {
    let filter = '<ogc:Filter>';
    let blobRequest = (layerList.length > 1);
    if (blobRequest) filter += '<ogc:Or>'
    layerList.forEach(layerTitle => {
      filter += `<ogc:PropertyIsEqualTo matchCase="false">
                  <ogc:PropertyName>any</ogc:PropertyName>
                  <ogc:Literal>${layerTitle}</ogc:Literal>
                </ogc:PropertyIsEqualTo>`
    });
    if (blobRequest) filter += '</ogc:Or>';
    filter += '</ogc:Filter>'
    return filter
  }

  function body() {
    return `
    <csw:GetRecords 
      xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" 
      xmlns:ogc="http://www.opengis.net/ogc" 
      service="CSW" 
      version="2.0.2" 
      resultType="results" 
      startPosition="1" 
      maxRecords="1000" 
      outputFormat="application/xml" 
      outputSchema="http://www.opengis.net/cat/csw/2.0.2" 
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
      xsi:schemaLocation="http://www.opengis.net/cat/csw/2.0.2 http://schemas.opengis.net/csw/2.0.2/CSW-discovery.xsd" 
      xmlns:gmd="http://www.isotc211.org/2005/gmd" 
      xmlns:apiso="http://www.opengis.net/cat/csw/apiso/1.0">
      <csw:Query typeNames="csw:Record">
      <csw:ElementSetName>full</csw:ElementSetName>
        <csw:Constraint version="1.1.0">
          ${buildFilter()}
        </csw:Constraint>
      </csw:Query>
    </csw:GetRecords> 
    `
  }

  function layerConditions(layer) {//filter conditions, removes layers that should not have any abstract
    return layer.get('group') !== 'background'
      && layer.get('group') !== 'txt'
      && layer.get('name') !== 'measure'
      && !layer.get('abstract')
  }

  return Origo.ui.Component({
    name,
    onAdd(e) {
      let abstracts = {}
      let layers = viewer.getLayers();
      layers = layers.filter((layer) => layerConditions(layer));
      layers.forEach(layer => {
        layerList.push(layer.get('name'));
      });

      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: body()
      })
        .then((rsp) => rsp.text())
        .then((rsptext) => {
          let xml = new DOMParser().parseFromString(rsptext, "text/xml");
          let records = xml.getElementsByTagName("csw:Record");

          //retrieve abstract from each matching record 
          Array.from(records).forEach(record => {
            let uris = record.getElementsByTagName("dc:URI");
            if (uris) {
              Array.from(uris).forEach(uri => {
                let layer = layers.find(x => x.get('name') == uri.getAttribute('name'));
                if (layer) {
                  let abstract = record.getElementsByTagName('dct:abstract')[0].textContent;
                  abstracts[layer.get('title')] = abstract;
                }
              })
            }
          })

          let allDivTagElements = document.getElementsByTagName(`div`);
          let El;
          for (let i = 0; i < allDivTagElements.length; i++) {
            const item = allDivTagElements[i];
            if (Object.keys(abstracts).find((key) => key == item.textContent)) {
              El = item.parentElement;
              El.addEventListener('click', () => {
                let secondarySlideNavEl = document.getElementsByClassName('secondary')[0];
                if (secondarySlideNavEl != null) {
                  let targetElement = secondarySlideNavEl.firstElementChild.lastElementChild.lastElementChild;
                  if (targetElement) targetElement.innerHTML = abstracts[item.textContent];
                }
              })
            }
          }
        });
    }
  });
}
export default AbstractSetter;
