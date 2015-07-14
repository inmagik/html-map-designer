(function(){
  "use strict";

  angular.module("HtmlMap")
  .controller('BodyCtrl', function($scope, $timeout, ConfigService, MapsControllerDelegate, ModalService, $location, $rootScope){

    $scope.data = { config : null, configString : null, mapConfigError:false, geoStyleError:false };
    $scope.ui = { autoZoom : true };

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
      $timeout(function(){

        $scope.data.configString = {
            mapConfig : JSON.stringify($scope.data.config.mapConfig, null, 4),
            geoStyle : $scope.data.config.geoStyle
        };

      });


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


    }

  });

})();
