(function(){
  "use strict";

  angular.module("HtmlMap", ['angularModalService', 'ui.ace', 'ui.router', 'ui.bootstrap', 
      'ui.sortable'])
  .config(function($locationProvider, $stateProvider, $urlRouterProvider){
    /*
    $locationProvider.html5Mode(
      { enabled: true
      }
    );
    */

    $urlRouterProvider.otherwise(function() {
        return '/' + location.search;
      });

    $stateProvider
    .state('start', {
      url: "/?repo&gist",
      templateUrl: "templates/start.html",
      controller : 'StartCtrl'
    })
    .state('map-editor', {
      url: "/map-editor?repo&gist",
      templateUrl: "templates/map-editor.html",
      controller : 'MapCtrl'
    })
    .state('map-viewer', {
      url: "/view?repo&gist",
      templateUrl: "templates/map-viewer.html",
      controller : 'MapCtrl'
    });

    
  })
  .run(function(){

  });


})();
