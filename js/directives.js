(function(){
  "use strict";



  /* custom geolocation control */
  /**
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object=} opt_options Control options.
 */
 window.customControls = {};
 customControls.ToggleGeolocationControl = function(opt_options) {

  var options = opt_options || {};

  var button = document.createElement('button');
  button.innerHTML = '<i class="glyphicon glyphicon-record"><i>';

  var this_ = this;

  var element = document.createElement('div');
  element.appendChild(button);

  this.toggleState = function(state){
    this_.toggled = state;
    if(state){
      element.className = 'geolocation-control ol-unselectable ol-control toggled';
    } else {
      element.className = 'geolocation-control ol-unselectable ol-control';
    }
  }

  this.toggleState(options.toggled || false);

  var handleClick = function(e) {
    if(options.toggleFunction){
      options.toggleFunction.call();
    }
    this_.toggleState(!this_.toggled);
  };

  button.addEventListener('click', handleClick, false);
  button.addEventListener('touchstart', handleClick, false);



  ol.control.Control.call(this, {
    element: element,
    target: options.target
  });

};
ol.inherits(customControls.ToggleGeolocationControl, ol.control.Control);






















  angular.module("HtmlMap")
  .directive('theMap', function(MapsControllerDelegate, $http, $compile, $timeout, OLFactory, $rootScope){
    return {
        restrict: 'EA',
        template: '<div></div>',
        scope: true,
        //link: linkFunc,
        controller: function($scope, $element, $attrs){

          var that = this;
          var handle = MapsControllerDelegate.registerMap(this, $attrs.mapHandle);
          this.handle = handle;

          $attrs.$set('mapHandle', handle);

          this.initMap = function(){

            this.map = new ol.Map({
              layers: [],
              projection: 'EPSG:3857',
              //interactions : [new ol.interaction.Select()],
              target: $element[0],
              view: new ol.View({

              })
            });

            this.map.set('mapHandle', handle);

            this.map.addInteraction(new ol.interaction.Select());

            this.createLayerSwitcher = function(){
              this.layerSwitcher = new ol.control.LayerSwitcher({
                //tipLabel: 'Légende' // Optional label for button
              });
              this.map.addControl(this.layerSwitcher);
            };


            this.geolocationInit = function(){

              var geolocation = new ol.Geolocation({
                projection: that.map.getView().getProjection()
              });

              //var track = new ol.dom.Input(document.getElementById('track'));
              //track.bindTo('checked', geolocation, 'tracking');

              // update the HTML page when the position changes.
              geolocation.on('change', function() {
                return;
                $('#accuracy').text(geolocation.getAccuracy() + ' [m]');
                $('#altitude').text(geolocation.getAltitude() + ' [m]');
                $('#altitudeAccuracy').text(geolocation.getAltitudeAccuracy() + ' [m]');
                $('#heading').text(geolocation.getHeading() + ' [rad]');
                $('#speed').text(geolocation.getSpeed() + ' [m/s]');
              });

              var accuracyFeature = new ol.Feature();
              geolocation.on('change:accuracyGeometry', function() {
                accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
              });

              var positionFeature = new ol.Feature();
              positionFeature.setStyle(new ol.style.Style({
                image: new ol.style.Circle({
                  radius: 6,
                  fill: new ol.style.Fill({
                    color: '#3399CC'
                  }),
                  stroke: new ol.style.Stroke({
                    color: '#fff',
                    width: 2
                  })
                })
              }));
              //optionally we could set a template on feature ..
              //positionFeature.set('templatePopup', 'templates/example.html')

              geolocation.on('change:position', function() {
                var coordinates = geolocation.getPosition();
                positionFeature.setGeometry(coordinates ?
                    new ol.geom.Point(coordinates) : null);
              });

              var featuresOverlay = new ol.FeatureOverlay({
                //map: that.map,
                features: [accuracyFeature, positionFeature]
              });
              //
              //geolocation.setTracking(true);

              var toggle = function(){
                if(geolocation.getTracking()){
                  geolocation.setTracking(false);
                  featuresOverlay.setMap(null);
                } else {
                  geolocation.setTracking(true);
                  featuresOverlay.setMap(that.map);
                }
              };

              var geoLocationControl = new customControls.ToggleGeolocationControl({
                toggleFunction : toggle,
                toggled : false
              });
              that.map.addControl(geoLocationControl);

              // handle geolocation error.
              geolocation.on('error', function(error) {
                console.error(error);
                geoLocationControl.toggleState(false);
              });

            };


            this.popupInit = function(){
              // Create a popup overlay which will be used to display feature info
              this.popup = new ol.Overlay.Popup();
              this.map.addOverlay(this.popup);

              // Add an event handler for the map "singleclick" event
              this.map.on('click', function(evt) {
                  // Hide existing popup and reset it's offset
                  that.popup.hide();
                  that.popup.setOffset([0, 0]);

                  // Attempt to find a feature in one of the visible vector layers
                  var featureAndLayer = that.map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
                      if(!layer){
                        var ftemplate = feature.get('templatePopup');
                        if(ftemplate){
                          return [feature, ftemplate];
                        }
                        return;
                      }
                      var template = layer.get('templatePopup');
                      if(template){
                          return [feature, template];
                      }
                      return [null, null]
                  });

                  if (featureAndLayer) {
                      var feature = featureAndLayer[0];
                      var tpl = featureAndLayer[1];
                      var coord = evt.coordinate;
                      var props = feature.getProperties();

                      $http.get(tpl)
                      .then(function(resp){
                        var s = $scope.$new(true);
                        s.data = { coord :coord, props:props};
                        $timeout(function(){
                          var info = resp.data;
                          // Offset the popup so it points at the middle of the marker not the tip
                          that.popup.setOffset([0, 0]);
                          that.popup.show(coord, info);
                          var cmpl = $compile(that.popup.container);
                          cmpl(s);
                        })
                      });
                  }

              });
            };

            this.popupInit();

            //we could disable geolocation 
            this.geolocationInit();

          }

          //shortcut methods
          this.setCenter = function(center){ return this.map.getView().setCenter(center)};
          this.setZoom = function(zoom){ return this.map.getView().setZoom(zoom)};

          this.setViewOptions = function(options){
            var v = this.map.getView();
            var viewOpts = {
              extent : options.extent,
              minZoom : options.minZoom || v.getZoom(),
              maxZoom : options.maxZoom || v.getZoom(),
              center : options.center || v.getCenter(),
              zoom : options.zoom || v.getZoom(),
            };
            var newView = new ol.View(viewOpts);
            this.map.setView(newView);
          };


          this.rebuildMap = function(){
            if(this.map){
              console.log("d")
              this.map.setTarget(null);
              this.map = null;
            }
            this.initMap();
          };


          var transformExtent = function(extent, fromP, toP){
            var transformer = ol.proj.getTransform(fromP, toP);
            var e = ol.extent.applyTransform(extent, transformer);
            return e;
          };

          this.toInternalExtent = function(extent, extentProj){
              var toP = this.map.getView().getProjection();
              return transformExtent(extent, extentProj, toP);
          };

          this.fromInternalExtent = function(extent, extentProj){
              var fromP = this.map.getView().getProjection();
              return transformExtent(extent, fromP, extentProj);
          };


          var transformPoint = function(coords, fromP, toP){
            var transformer = ol.proj.getTransform(fromP, toP);
            var p = new ol.geom.Point(coords);
            console.log("a", p.getCoordinates)
            console.log(fromP, toP, p.applyTransform(transformer))
            p.applyTransform(transformer);
            return p.getCoordinates()
          };

          this.toInternalPoint = function(point, extentProj){
              var toP = this.map.getView().getProjection();
              return transformPoint(point, extentProj, toP);
          };

          this.fromInternalPoint = function(point, extentProj){
              var fromP = this.map.getView().getProjection();
              return transformPoint(point, fromP, extentProj);
          };




          this.addLayerFromConfig = function(l){
            var layer = OLFactory.createLayer(l, that.map);
            if(l.templatePopup){
              layer.set('templatePopup', l.templatePopup)
            }
            if(layer){
              this.map.addLayer(layer);
            }
          };

          this.startMap = function(config){
            var that = this;
            var c, z, e;
            if(config.map.centerProjection){
              c = ol.proj.transform(config.map.center, config.map.centerProjection, 'EPSG:3857');
            } else {
              c = config.map.center
            }
            if(config.map.extent && config.map.extentProjection){
              var transformer = ol.proj.getTransform(config.map.extentProjection, 'EPSG:3857');
              e = ol.extent.applyTransform(config.map.extent, transformer);
            } else if (config.extent) {
              e = config.map.extent;
            }

            z = config.map.zoom;

            this.setViewOptions({
              center : c,
              zoom : z,
              minZoom : config.minZoom,
              maxZoom : config.maxZoom,
              extent : e
            });

            this.resetMap = function(){
              that.setZoom(z);
              that.setCenter(c);
            };

            if(config.layerSwitcher !== false){
              this.createLayerSwitcher(c);
            }

            angular.forEach(config.layers, function(l){
              that.addLayerFromConfig(l);
            });

            $rootScope.$broadcast('map-config-loaded-'+handle);
          };

          $scope.$emit('map-ready-'+handle);

        },

        link: function(scope, element, attrs, ctrl) {
          scope.$on('$destroy', function() {
            MapsControllerDelegate.unregisterMap(this, attrs.mapHandle);
          });

          scope.$watch(function(){
              return scope.$eval(attrs.configuration)
          }, function(nv){
              if(!nv || !nv.mapConfig){
                return;
              }
              console.log("config changed")
              //register style
              OLFactory.registerStyle(nv.geoStyle, ctrl.handle);
              //startup map
              ctrl.rebuildMap();
              ctrl.startMap(nv.mapConfig)
          });

        }
        //controllerAs: 'vm',
        //bindToController: true // because the scope is isolated
    };

  });

})();
