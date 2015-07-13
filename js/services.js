(function(){
  "use strict";

  angular.module("HtmlMap")
  .factory('ConfigService', function($http, $q, repoConfig){

    var svc = { config : null, cssConfig : null};
    var parsedRules = [];

    var loadConfig = function(){
      var deferred = $q.defer();
      $http.get('config/mapconfig.json')
      .then(function (resp) {
        svc.config = resp.data;
        deferred.resolve(resp.data);
      }).catch(function(err){
        deferred.reject(err);
      });

      return deferred.promise;
    }

    svc.setConfig = function(cfg){
      svc.config = cfg;
    }

    var loadCssConfig = function(){
      var deferred = $q.defer();
      $http.get('config/geostyle.css')
      .then(function (resp) {
        svc.cssConfig = resp.data;
        deferred.resolve(resp.data);
      }).catch(function(err){
        deferred.reject(err);
      });

      return deferred.promise;
    };


    svc.getLocalConfig = function(){
      return $q.all([loadConfig(), loadCssConfig()]);
    };

    svc.getGitHubConfig = function(repo){
      var deferred = $q.defer();
      var pieces = repo.split(":");
      repoConfig.getConfigs(pieces[0], pieces[1], ["mapconfig.json", "geostyle.css"])
      .then(function(data){
        console.log(data)
          deferred.resolve([data[0].data, data[1].data]);
      });
      return deferred.promise;
    };

    return svc;


  })


  .factory('OLFactory', function($http, $q){

    var svc = { };
    svc.registeredStyles = {};


    var createOlStyle = function(opts){
      var fill = new ol.style.Fill({
        color: opts['marker-fill'] || 'rgba(255,255,255,0.4)'
      });
      var stroke = new ol.style.Stroke({
        color: '#3399CC',
        width: opts['stroke-width'] || 1.25
      });

      var pfill;
      if(opts['polygon-fill']){
        pfill = new ol.style.Fill({
          color: opts['polygon-fill']
        });
      }

      var lstroke;
      if(opts['line-width'] || opts['line-color']){
        lstroke = new ol.style.Stroke({
          color: opts['line-color'] || '#222',
          width: opts['line-width'] || 1
        });
      }

      var options = {
        image: new ol.style.Circle({
          fill: fill,
          stroke: stroke,
          radius: opts['marker-width'] || 5
        }),
        fill: pfill || fill,
        stroke: lstroke || stroke
      };

      if(opts['text-name']){

        var textStroke = new ol.style.Stroke({
          color: opts['text-stroke']|| 'black',
          width: opts['text-stroke-width'] || 1
        });

        var textFill = new ol.style.Fill({
          color: opts['text-fill'] || '#000'
        });


        options.text = new ol.style.Text({
          font: opts['text-size'] || '12px' + ' '+ opts['text-face-name'] || 'Calibri,sans-serif',
          text: opts['text-name'],
          fill: textFill,
          stroke: textStroke,
          offsetX : opts['text-dx'],
          offsetY : opts['text-dy'],
          rotation : opts['text-rotation']
        })
      };

      if(opts['z-index']){
        options.zIndex = opts['z-index'];
      }

      var style  = new ol.style.Style(options);

      var styles = [
        style
      ];


     return styles;

    };

    svc.getStyleFor = function(name, map){
      var handle = map.get('mapHandle');
      var shader = svc.registeredStyles[handle];
      var layer = shader.findLayer({ name: "#"+name });
      if(!layer){
        return undefined;
      }
      return function(feature, resolution){
        var props = feature.getProperties();
        var zoom = map.getView().getZoom();
        var style = layer.getStyle(props, { resolution: resolution, zoom:zoom});
        return createOlStyle(style);
      }
    }


    var xyzLayer= function(obj){
      return new ol.layer.Tile({
        title : obj.title || 'XYZ Layer',
        type : "base",
        source: new ol.source.XYZ(obj.layerOptions)
      })
    };

    var getBaseTileOptions = function(obj, map){
      var out = {};
      if(!obj.layerOptions){
        return out;
      }
      out = _.pick(obj.layerOptions, ['opacity', 'hue', 'contrast', 'brightness']);
      if(obj.minZoom || obj.maxZoom){
          var v = map.getView();
          var z = 1;
          var factor = v.zoomFactor_ || 2.0;
          var r = v.maxResolution_;
          var zooms = [r];
          var maxZoom =28;
          var minZoom = 0;
          while(z < maxZoom){
            r = r / factor;
            zooms.push(r)
            z+=1;
          }
          var x = v.minZoom_||0;
          if (obj.minZoom){
            out.maxResolution = zooms[obj.minZoom-x] + zooms[obj.minZoom-x]/1000.0;
          }
          if (obj.maxZoom){
            out.minResolution = zooms[obj.maxZoom-x] - zooms[obj.maxZoom-x]/1000.0;
          }

        }
      return out;

    }

    svc.registerStyle = function(styleString, handle){
      svc.registeredStyles[handle] = new carto.RendererJS().render(styleString);

    };

    svc.createLayer= function(obj, map){

      var baseTileOptions =getBaseTileOptions(obj, map);

      if(obj.layerType == 'stamen'){
        var opts = _.extend(
            baseTileOptions,
            {
              title : obj.title || 'Stamen '+obj.layerOptions.layer,
              type : "base",
              source: new ol.source.Stamen(obj.layerOptions)
            }
          );
        return new ol.layer.Tile(opts)
      }

      if(obj.layerType == 'mapquest'){

        return new ol.layer.Tile({
          title : obj.title || 'MapQuest '+obj.layerOptions.layer,
          type : "base",
          source: new ol.source.MapQuest(obj.layerOptions)
        })
      }

      if(obj.layerType == 'opencyclemap'){
        return new ol.layer.Tile({
          title : obj.title || 'OSM opencyclemap',
          type : "base",
          source: new ol.source.OSM({
            attributions: [
              new ol.Attribution({
                html: 'All maps &copy; ' +
                    '<a href="http://www.opencyclemap.org/">OpenCycleMap</a>'
              }),
              ol.source.OSM.ATTRIBUTION
            ],
            url: 'http://{a-c}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png'
          })
        });
      }

      if(obj.layerType == 'osm'){
        return new ol.layer.Tile({
          title : obj.title || 'OpenStreetMap',
          type : "base",
          source: new ol.source.OSM(obj.layerOptions)
        })
      }


      var cartoDBNames = {
        'positron' : 'light_all',
        'positron-no-labels' : 'light_nolabels',
        'dark-matter' : 'dark_all',
        'dark-matter-no-labels' : 'dark_nolabels',
      }
      if(obj.layerType == 'cartodb'){
        var l = cartoDBNames[obj.layerOptions.layer];
        var opts = _.extend(
            baseTileOptions,
            {
              title : obj.title || 'CartoDB ' + obj.layerOptions.layer,
              type : "base",
              source: new ol.source.XYZ({
                urls : [
                    'http://a.basemaps.cartocdn.com/'+l+'/{z}/{x}/{y}.png',
                    'http://a.basemaps.cartocdn.com/'+l+'/{z}/{x}/{y}.png',
                    'http://a.basemaps.cartocdn.com/'+l+'/{z}/{x}/{y}.png',
                    'http://a.basemaps.cartocdn.com/'+l+'/{z}/{x}/{y}.png'
                ],
                attributions : [new ol.Attribution({html:'&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'})]
              }
            )
          });
          return new ol.layer.Tile(opts)

      }

      if(obj.layerType == 'geojson'){

        var opts = _.extend(
            baseTileOptions, {
          title : obj.title || obj.name,
          source: new ol.source.Vector({
            url: obj.layerOptions.url,
            format: new ol.format.GeoJSON(),

          }),
          style : svc.getStyleFor(obj.name, map)

        });

        return new ol.layer.Vector(opts);
      }


      /* todo: experimental bbox : not working */
      if(obj.layerType == 'bbox-geojson'){
        var l;
        var src = new ol.source.Vector({
          loader: function(extent, resolution, projection) {
            var t = this;
            var transformer = ol.proj.getTransform('EPSG:3857', 'EPSG:4326');
            var e  = ol.extent.applyTransform(extent, transformer);
            var url = obj.layerOptions.url +'?bbox=' + e.join(',');
            var parser = new ol.format.GeoJSON();
            $http.get(url).then(function(data){
              var features = parser.readFeatures(data.data, { dataProjection:"EPSG:4326", featureProjection:"EPSG:3857"});
              src.addFeatures(features)
            })
          },
          strategy : ol.loadingstrategy.bbox,
          format : new ol.format.GeoJSON()
        });

        var opts = _.extend(
            baseTileOptions,
        {
          title : obj.title || obj.name,
          source: src,
          style : svc.getStyleFor(obj.name, map)

        });

        l = new ol.layer.Vector(opts);
        return l;
      }
      /*  end experimental bbox */


      return null;
    }

    return svc;


  })







  .factory('MapsControllerDelegate', function($http, $q){

    var svc = { };
    svc.maps = {};
    var waiters = {};

    svc.applyMethod = function(func){
      angular.forEach(svc.maps, function(ctrl, name){
        func.apply(ctrl);
      });
    };

    svc.registerMap = function(mapController, name){
      if(!name){
        name = "map_" + Math.random()*10000;
      }
      svc.maps[name] = mapController;
      var w = waiters[name] || [];
      if(w.length){
        angular.forEach(w, function(i){
          i.resolve(true);
        })
      }
      return name;
    };

    svc.unregisterMap = function(name){
      delete svc.maps[name];
    };

    svc.waitForMap = function(mapName){
      var deferred = $q.defer();
      if(svc.maps[mapName]){
        deferred.resolve(true);
      } else {
        waiters[mapName] = waiters[mapName] || [];
        waiters[mapName].push(deferred);
      }
      return deferred.promise;
    };

    return svc



  });


})();
