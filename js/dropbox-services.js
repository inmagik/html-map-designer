(function(){
  "use strict";

  

  angular.module("HtmlMap")
  .factory('DropBoxService', function($http, $q){

    var svc = {  };
    svc.client = new Dropbox.Client({key: 'y8utdrl8ghj6hvi'})
    svc.client.authDriver(new Dropbox.AuthDriver.Popup({
    receiverUrl: "http://localhost:8000/oauth_receiver.html"}));

    svc.login = function(){
      svc.client.authenticate({interactive: true}, function(error, client){
        if(error){
          console.error(error);
        }
        if(client){
          console.log(client)
        }
      })
      
    }

    return svc;


  })

  .directive('dropboxChoose', ['$timeout', function($timeout){
    // Runs during compile
    return {
      // name: '',
      // priority: 1,
      // terminal: true,
      scope: {}, // {} = isolate, true = child, false/undefined = no change
      // controller: function($scope, $element, $attrs, $transclude) {},
      require: 'ngModel', // Array = multiple requires, ? = optional, ^ = check parent elements
      // restrict: 'A', // E = Element, A = Attribute, C = Class, M = Comment
      // template: '',
      // templateUrl: '',
      // replace: true,
      // transclude: true,
      // compile: function(tElement, tAttrs, function transclude(function(scope, cloneLinkingFn){ return function linking(scope, elm, attrs){}})),
      link: function($scope, iElm, iAttrs, ngModelController) {


          var options = {
            linkType: "direct", 
            success : function(files){
              $timeout(function(){
                ngModelController.$setViewValue(files[0].link);
              });

            }
          }
          var button = Dropbox.createChooseButton(options);
          $(iElm).append(button);
      }
    };
  }]);


  








})();
