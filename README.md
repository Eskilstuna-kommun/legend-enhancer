# legend-enhancer
legend-enhancer is a legend modifier for Origo, the modifications are  fragment-plugins that the legend-enhancer handles. 

#### Example usage of legend-enhancer as plugin
Create a subfolder in the Origo-map directory named plugins/ where you can put the built version of legend-enhancer. The fragment-plugins are activated by including them in the options for Legendenhancer as shown in the index.html below.

The plugin can be loaded like this in an html-file:
```
        <link href="plugins/legendenhancer.css" rel="stylesheet">
        ...
        <script src="js/origo.min.js"></script>
        <script src="plugins/el.min.js"></script>
        <script type="text/javascript">
            var origo = Origo('config file.json');
            origo.on('load', function(viewer) {
                var legendenhancer = Legendenhancer({
                    // fragment-plugins are activated by including these objects, corresponding to their names.
                    groupIndication: { 
                    },
                    alterLayerStyle: {
			url : 'URL',
			scale: 401,
			dpi: 300
		    },
                    styleSetter : {
                        scale: 401,
                        dpi: 600
                    },
                    abstractSetter : {
                        url : 'URL'
                    },
                    changeremovebuttonstyle : {
                    }
                });
                viewer.addComponent(legendenhancer);
            });
        </script>
```

