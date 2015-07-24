(function(){
  "use strict";

  angular.module("HtmlMap")

  .controller('BodyCtrl', function($scope,  $rootScope){

    $rootScope.ui = {
      mainViewClass : 'black'
    }
  })


  .controller('StartCtrl', function($scope,  $rootScope, $timeout){

    $timeout(function(){
      $rootScope.ui.mainViewClass = 'mantle';
    })



  })

  .controller('LoadCtrl', function($scope,  $rootScope, $timeout){
    $rootScope.ui.mainViewClass = 'cherry';



  })






  .controller('MapCtrl', function($scope, $timeout, ConfigService, MapsControllerDelegate, ModalService, $location, $rootScope, $q, $modal){

    $scope.data = { config : null, configString : null, mapConfigError:false, geoStyleError:false };
    $scope.ui = { autoZoom : true };

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

    var s = $location.search();

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
      console.log(1,c)




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

    }

})




  .controller('ModalInstanceCtrl', function ($scope, $modalInstance, cfg) {

    $scope.cfg = cfg;

  
    $scope.ok = function () {
      $modalInstance.close($scope.cfg);
    };

    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };

});





})();
