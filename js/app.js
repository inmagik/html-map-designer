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

    $urlRouterProvider.otherwise("/start");
    $stateProvider
    .state('start', {
      url: "/start",
      templateUrl: "templates/start.html",
      controller : 'StartCtrl'
    })
    .state('map-editor', {
      url: "/map-editor",
      templateUrl: "templates/map-editor.html",
      controller : 'MapCtrl'
    });

    
  })
  .run(function(){

  });


})();
