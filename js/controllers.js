(function(){
  "use strict";

  angular.module("HtmlMap")
  .controller('BodyCtrl', function($scope, $timeout, ConfigService, MapsControllerDelegate, ModalService, $location, $rootScope){

    $scope.data = { config : null, configString : null, mapConfigError:false, geoStyleError:false };

    var s = $location.search();

    if (s.repo){
      ConfigService.getGitHubConfig(s.repo).then(function(data){
        $timeout(function(){
          $scope.data.config = {
              mapConfig : data[0],
              geoStyle : data[1]
          };
          $scope.data.configString = {
              mapConfig : JSON.stringify(data[0], null, 4),
              geoStyle : data[1]
          };
        });
      });

    } else {

      ConfigService.getLocalConfig().then(function(data){
        $timeout(function(){
          $scope.data.config = {
              mapConfig : data[0],
              geoStyle : data[1]
          };
          $scope.data.configString = {
              mapConfig : JSON.stringify(data[0], null, 4),
              geoStyle : data[1]
          };

        });

      });

    };

    $scope.resetMap = function(){
      MapsControllerDelegate.applyMethod(function(){
        this.resetMap()
      });
    };

    $scope.updateMap = function(){
      //var currentZoom =
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

      $timeout(function(){
        $scope.data.mapConfigError = false;
        $scope.data.config = {
            mapConfig : parsedConfig,
            geoStyle : $scope.data.configString.geoStyle
        };

        $rootScope.$on('map-config-loaded-main-map', function(){
          MapsControllerDelegate.applyMethod(function(){
            console.log("zz", z, c)
            this.setZoom(z);
            this.setCenter(c);
          });
        })

      });


    }

  });

})();
