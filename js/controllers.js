(function(){
  "use strict";

  angular.module("HtmlMap")

  .controller('BodyCtrl', function($scope,  $rootScope, DropBoxService){

    $rootScope.ui = {
      mainViewClass : 'black'
    }

    $rootScope.loginDropbox = function(){
      DropBoxService.login();

    }
  })


  .controller('StartCtrl', function($scope,  $rootScope, $timeout, ConfigService, DropBoxService, $state, $modal){

    $timeout(function(){
      $rootScope.ui.mainViewClass = 'mantle';
    });


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
      
      var modalInstance = $modal.open({
        templateUrl: "templates/load-dropbox-folder.html",
        controller: 'ModalInstanceCtrl',
        resolve: {
          cfg: function () {
            return { configUrl:'', styleUrl:'' };
          }
        }
      });

      modalInstance.result.then(function (ocfg) {
        ocfg.configUrl = ocfg.folder+"/mapconfig.json";
        ocfg.styleUrl = ocfg.folder+"/geostyle.css";
        $scope.loadDropbox(ocfg);
      });
    };

    


    $scope.loadGithub = function(repo){
      ConfigService.getGitHubConfig(repo).then(function(data){
        $timeout(function(){
          $rootScope.config = {
              mapConfig : data[0],
              geoStyle : data[1]
          };
          $state.go("map-editor");
          
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
    $scope.ui = { autoZoom : true, panels : { layers:true} };

    if(!$rootScope.config){
      $state.go('start');
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

  
  

    /*
    if (s.repo){
      ConfigService.getGitHubConfig(s.repo).then(function(data){
        $timeout(function(){
          $scope.data.config = {
              mapConfig : data[0],
              geoStyle : data[1]
          };
          updateCfg();
        });
      });

    } else {

      ConfigService.getLocalConfig().then(function(data){
        $timeout(function(){
          $scope.data.config = {
              mapConfig : data[0],
              geoStyle : data[1]
          };
          updateCfg();

        });

      });

    };
    */

    var updateCfg = function(){
      var deferred = $q.defer();
      $timeout(function(){

        $scope.data.configString = {
            mapConfig : JSON.stringify($scope.data.config.mapConfig, null, 4),
            geoStyle : $scope.data.config.geoStyle
        };
        deferred.resolve(true);

      });

      return deferred.promise;


    }

    $scope.resetMap = function(){
      MapsControllerDelegate.applyMethod(function(){
        this.resetMap()
      });
    };


    $scope.setCenter = function(){
      var c;
      var cfg = $scope.data.config.mapConfig.map;
      MapsControllerDelegate.applyMethod(function(){
        var x = this.map.getView();
        console.log("c", x.getProjection())
        c = x.getCenter();
        if(cfg.centerProjection){
          c = this.fromInternalPoint(c, cfg.centerProjection || 'EPSG:3857')
        }

      });
      $scope.data.config.mapConfig.map.center = c;
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
        })

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
