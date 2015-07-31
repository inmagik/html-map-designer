(function(){
  "use strict";

  angular.module("HtmlMap")

  .controller('BodyCtrl', function($scope,  $rootScope, DropBoxService, ConfigService, $timeout, $state){

    $rootScope.ui = {
      mainViewClass : 'black'
    }

    $scope.loadGithub = function(repo, path, options){
      ConfigService.getGitHubConfig(repo).then(function(data){
        $timeout(function(){
          $rootScope.config = {
              mapConfig : data[0],
              geoStyle : data[1]
          };
          $state.go(path || "map-editor", { repo:repo });
        });
      });
    };

    $scope.loadGist = function(gist, path, options){
      ConfigService.getGistConfig(gist).then(function(data){
        $timeout(function(){
          $rootScope.config = {
              mapConfig : JSON.parse(data[0]),
              geoStyle : data[1]
          };
          $state.go(path || "map-editor", { gist:gist});
        });
      });
    };

    

    $scope.loadUrls = function(cfg, path, options){
      ConfigService.getUrlsConfig(cfg).then(function(data){
        $timeout(function(){
          $rootScope.config = {
              mapConfig : data[0],
              geoStyle : data[1]
          };
          $state.go(path || "map-editor", cfg);
        });
      });
    };

    $scope.loadDropbox = function(cfg){
      //ConfigService.getDropboxConfig(cfg).then(function(data){
      DropBoxService.loadFiles([cfg.configUrl, cfg.styleUrl]).then(function(data){
        $timeout(function(){
          $rootScope.config = {
              mapConfig : JSON.parse(data[0]),
              geoStyle : data[1]
          };
          $state.go("map-editor");
        });
      });
    };
  })


  .controller('StartCtrl', function($scope,  $rootScope, $timeout, ConfigService, DropBoxService, $state, $modal, $location){

    $timeout(function(){
      $rootScope.ui.mainViewClass = 'mantle';
    });

    var s = $location.search();
    if(s.repo){
      return $scope.loadGithub(s.repo, 'map-viewer');
    };

    if(s.configUrl && s.styleUrl){
      return $scope.loadUrls(s, 'map-viewer');
    };

    if(s.gist){
      return $scope.loadGist(s.gist, 'map-viewer');
    };

    $scope.openLoadGitHubModal = function () {
      var modalInstance = $modal.open({
        templateUrl: "templates/load-github.html",
        controller: 'ModalInstanceCtrl',
        resolve: {
          cfg: function () {
            return {repo:'', user:''};
          }
        }
      });
      modalInstance.result.then(function (ocfg) {
        var repo = ocfg.user + ":" + ocfg.repo;
        $scope.loadGithub(repo);
      });
    };

    $scope.openLoadGistModal = function () {
      var modalInstance = $modal.open({
        templateUrl: "templates/load-gist.html",
        controller: 'ModalInstanceCtrl',
        resolve: {
          cfg: function () {
            return {gist:''};
          }
        }
      });
      modalInstance.result.then(function (ocfg) {
        $scope.loadGist(ocfg.gist);
      });
    };

    $scope.openLoadDropboxModal = function () {
      var modalInstance = $modal.open({
        templateUrl: "templates/load-dropbox.html",
        controller: 'ModalInstanceCtrl',
        resolve: {
          cfg: function () {
            return { configUrl:'', styleUrl:'' };
          }
        }
      });
      modalInstance.result.then(function (ocfg) {
        //var url = ocfg.user + ":" + ocfg.repo;
        $scope.loadDropbox(ocfg);
      });
    };

    $scope.openLoadDropboxFolderModal = function () {

      DropBoxService.chooseWithModal("folder")
      .then(function(folder){
        var ocfg = {};
        ocfg.configUrl = folder+"/mapconfig.json";
        ocfg.styleUrl = folder+"/geostyle.css";
        $scope.loadDropbox(ocfg);
      });
    };


    $scope.createMap = function(){
      ConfigService.getLocalConfig().then(function(data){
        $timeout(function(){
          $rootScope.config = {
              mapConfig : data[0],
              geoStyle : data[1]
          };
          $state.go("map-editor");
        });
      });
    };
  })


  .controller('LoadCtrl', function($scope,  $rootScope, $timeout){
    $rootScope.ui.mainViewClass = 'cherry';
  })


  .controller('MapCtrl', function($scope, $timeout, ConfigService, MapsControllerDelegate, ModalService, DropBoxService, $location, $rootScope, $q, $modal, $state){

    $scope.data = { config : null, configString : null, mapConfigError:false, geoStyleError:false };
    $scope.ui = { autoZoom : true, panels : { layers:true } };
    
    if(!$rootScope.config){
      $state.go('start', $location.search() );
    }
    $timeout(function(){
        $scope.data.config = $rootScope.config
        updateCfg();
    });

    function fixWidthHelper(e, ui) {
      ui.children().each(function() {
          $(this).width($(this).width());
      });
      return ui;
    }
    $scope.sortableOptions = {
      helper: fixWidthHelper,
      update: function(e, ui) {
        console.log(e, ui);
        updateCfg().then($scope.updateMap)
      }
    };

    $scope.spliceLayer = function(l, pos){
      $scope.data.config.mapConfig.layers.splice(pos, 1);
      updateCfg().then($scope.updateMap)
    }

    $scope.toggleLayer = function(l, pos){
      var l = $scope.data.config.mapConfig.layers[pos];
      if(l.layerOptions.visible === undefined){
        l.layerOptions.visible  = false;
      } else {
        l.layerOptions.visible = !!!l.layerOptions.visible;  
      }

      MapsControllerDelegate.applyMethod(function(){
        var layers = this.map.getLayers();
        var l = layers.item(pos);
        var v = l.get('visible')
        l.set('visible', !v);
      });
    };

    var updateCfg = $scope.updateCfg = function(){
      var deferred = $q.defer();
      if(!$scope.data || !$scope.data.config){
        deferred.reject(null);

      } else {
        $timeout(function(){

          $scope.data.configString = {
              mapConfig : JSON.stringify($scope.data.config.mapConfig, null, 4),
              geoStyle : $scope.data.config.geoStyle
          };
          deferred.resolve(true);
        });
      }
      return deferred.promise;
    };

    $scope.resetMap = function(){
      MapsControllerDelegate.applyMethod(function(){
        this.resetMap()
      });
    };

    $scope.setCenter = function(){
      //we also set center projection, using wgs
      var c;
      var cfg = $scope.data.config.mapConfig.map;
      MapsControllerDelegate.applyMethod(function(){
        var x = this.map.getView();
        c = x.getCenter();
        c = ol.proj.transform(c, x.getProjection(), 'EPSG:4326')
        cfg.centerProjection = 'EPSG:4326';
      });
      $scope.data.config.mapConfig.map.center = c;
      $scope.data.config.mapConfig.map.centerProjection = 'EPSG:4326';
      updateCfg();
    };

    /*
    This updates map config from string config (the one in editors)
    */
    $scope.updateMap = function(){
      var x,z,c;
      MapsControllerDelegate.applyMethod(function(){
        x = this.map.getView();
        z = x.getZoom();
        c = x.getCenter();
      });

      var parsedConfig;
      try{
        parsedConfig = JSON.parse($scope.data.configString.mapConfig);
      } catch(err){
        $timeout(function(){
            $scope.data.mapConfigError = true;
        });
        return;
      }

      //setting config
      $timeout(function(){
        $scope.data.mapConfigError = false;
        $scope.data.config = {
            mapConfig : parsedConfig,
            geoStyle : $scope.data.configString.geoStyle
        };

        //going back to previous zoom and center
        if(!$scope.ui.autoZoom){
          return
        }
        var xx =  $rootScope.$on('map-config-loaded-main-map', function(){
            MapsControllerDelegate.applyMethod(function(){
              if(z){
                  this.setZoom(z);
              }
              if(c){
                  this.setCenter(c);
              }

            });
            xx();
          });
      });
    };

    $scope.openLayerModal = function (layerType, cfg) {
      cfg = cfg || { newLayer:true};
      cfg.layerType = layerType;
      cfg.layerOptions = cfg.layerOptions || { opacity : 1};
      cfg.name = cfg.name || "layer " + ($scope.data.config.mapConfig.layers.length+1).toString();

      var modalInstance = $modal.open({
        templateUrl: "templates/layer-modal-"+layerType+".html",
        controller: 'ModalInstanceCtrl',
        resolve: {
          cfg: function () {
            return cfg;
          }
        }
      });

      modalInstance.result.then(function (ocfg) {
        if(cfg.newLayer){
          delete cfg.newLayer;
          $scope.data.config.mapConfig.layers.push(cfg);  
        }
        updateCfg().then($scope.updateMap);
      
      });

    };

    $scope.saveToDropbox = function(){
      var modalInstance = $modal.open({
        templateUrl: "templates/save-dropbox.html",
        controller: 'SaveDropboxModalInstanceCtrl',
        resolve: {
          cfg: function () {
            return { mapFilename : 'mapconfig.json', styleFilename:'geostyle.css'};
          }
        }
      });

      modalInstance.result.then(function (ocfg) {
        var folder = ocfg.folder;
        var files = [
          { path : folder + "/" + ocfg.mapFilename, content : $scope.data.configString.mapConfig },
          { path : folder + "/" + ocfg.styleFilename, content : $scope.data.configString.geoStyle }
        ]
        DropBoxService.saveFiles(files)
        .then(function(data){
          alert("Files saved!")
        })
      });

    };

  })


  .controller('ModalInstanceCtrl', function ($scope, $modalInstance, cfg) {

      $scope.cfg = cfg;
      $scope.ok = function (outcfg) {
        $modalInstance.close(outcfg || $scope.cfg);
      };
      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };

  })

  

  .controller('SaveDropboxModalInstanceCtrl', function ($scope, $modalInstance, cfg) {

      $scope.cfg = cfg;
      $scope.ok = function (outcfg) {
        $modalInstance.close(outcfg || $scope.cfg);
      };
      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };

  });


})();
