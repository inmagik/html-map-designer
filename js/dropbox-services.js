(function(){
  "use strict";

  

  angular.module("HtmlMap")
  .factory('DropBoxService', function($http, $q){

    var svc = {  };
    svc.client = new Dropbox.Client({key: '7jgs6m9jfn508k9'})
    svc.client.authDriver(new Dropbox.AuthDriver.Popup({
    receiverUrl: "https://inmagik.github.io/html-map-designer/oauth_receiver.html"}));

    svc.login = function(cb){
      svc.client.authenticate({interactive: true}, function(error, client){
        if(error){
          console.error(error);
        }
        if(client){
          console.log(client)
          if(cb){
            cb(client);  
          }
          
        }
      })
    };

    svc.saveFile = function(path, content){
      var out = $q.defer();
      svc.client.writeFile(path, content, function(error, stat) {
        if (error) {
          out.reject(err);
        }
        out.resolve(stat);        
      });

      return out.promise;
    }

    svc.saveFiles = function(files){
      var p = [];
      angular.forEach(files, function(f){
        p.push(svc.saveFile(f.path, f.content));
      })
      return $q.all(p);
    }


    svc.loadFile = function(path){
      var out = $q.defer();
      svc.client.readFile(path, function(error, data) {
        if (error) {
          out.reject(err);
        }
        console.log("load", data)
        out.resolve(data);        
      });

      return out.promise;
    }

    svc.loadFiles = function(files){
      var p = [];
      angular.forEach(files, function(f){
        p.push(svc.loadFile(f));
      })
      return $q.all(p);
    }

    return svc;


  })

  .directive('dropboxTree', ['DropBoxService', '$timeout', function (DropBoxService, $timeout) {
    return {
      restrict: 'A',
      require : 'ngModel',
      templateUrl : 'templates/dropbox-file-list.html',
      link: function (scope, iElement, iAttrs, ngModelController) {
        scope.currentFiles = [];
        scope.currentPath = '/';
        var el = $(iElement);

        scope.mode = 'any';
        if(iAttrs.mode=="folder" || iAttrs.mode == 'file'){
          scope.mode = iAttrs.mode;
        }

        scope.client = null;
        scope.stat = function(client){
          console.log("uuu", client)
          scope.client = client;
          client.stat(scope.currentPath, {readDir:true}, function(err, file, files){
            console.log(err, files)
            $timeout(function(){
              scope.currentFiles = files;  
              el.scrollTop();
            })
          })
        }

        if(DropBoxService.client.isAuthenticated()){
          scope.stat(DropBoxService.client)
        } else {
          DropBoxService.login(scope.stat)
        }

        scope.statPath = function(f){
          if(!f.isFolder){
            return;
          }
          scope.currentPath = f.path;
          if(scope.mode == 'folder'){
            scope.select(f);            
          }
          scope.stat(scope.client);
        };

        scope.statParentPath = function(path){
          var pieces = path.split("/")
          pieces.splice(-1,1)
          var p = pieces.join("/");
          scope.currentPath = p;
          if(scope.mode == 'folder'){
            scope.selectPath(p);            
          }
          scope.stat(scope.client);
        }

        scope.select = function(p){
          if(scope.selectable(p))
          ngModelController.$setViewValue(p.path);
        }

        scope.selectPath = function(path){
         ngModelController.$setViewValue(path); 
        }

        scope.selectable = function(p){
          return (scope.mode=='any' || (p.isFolder==true&&scope.mode=='folder') || p.isFolder==false&&scope.mode=='file' );
        }


        
      }
    };
  }])
  
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
  }])

.directive('dropboxChooseButton', ['$timeout', '$modal',function($timeout, $modal){
    // Runs during compile
    return {
      // name: '',
      // priority: 1,
      // terminal: true,
      scope: {}, // {} = isolate, true = child, false/undefined = no change
      // controller: function($scope, $element, $attrs, $transclude) {},
      require: 'ngModel', // Array = multiple requires, ? = optional, ^ = check parent elements
      // restrict: 'A', // E = Element, A = Attribute, C = Class, M = Comment
      template: '<button class="btn btn-primary" ng-click="choose()">Choose</button>',
      link: function($scope, iElm, iAttrs, ngModelController) {

      $scope.choose = function(){
        var modalInstance = $modal.open({
        templateUrl: "templates/get-dropbox-file.html",
        controller: 'ModalInstanceCtrl',
        resolve: {
          cfg: function () {
            return { file : ''};
          }
        }
      });

        modalInstance.result.then(function (ocfg){
          ngModelController.$setViewValue(ocfg.file);
        })

      }  


          
      }
    };
  }]);


  








})();
