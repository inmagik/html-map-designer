(function(){
  "use strict";

  

  angular.module("HtmlMap")
  .factory('DropBoxService', function($http, $q, $modal, $rootScope){

    var svc = {  };
    svc.authenticated = false;
    svc.account = null;

    var receiverUrl = window.location.origin + window.location.pathname + "oauth_receiver.html";
    svc.client = new Dropbox.Client({key: '7jgs6m9jfn508k9'})
    svc.client.authDriver(new Dropbox.AuthDriver.Popup({
    receiverUrl: receiverUrl}));


    svc.getAccountInfo = function(){
      svc.client.getAccountInfo(function(err, info){
        if(err){
          svc.account = null;
          return
        };
        if(info){
          svc.account = info;
          $rootScope.$broadcast('loginDropbox', info);
        }
      });
    };

    svc.client.authenticate({interactive: false}, function(error, client){
      if(error){
        svc.authenticated = false;
        svc.client.reset();
        return;
      }
      if(client.isAuthenticated()){
        svc.authenticated = true;
        svc.getAccountInfo();
      } else {
        svc.client.reset();
      }
    });


    svc.login = function(cb, errorcb){
      svc.client.authenticate({interactive: true}, function(error, client){
        if(error){
          svc.authenticated = false;
          svc.client.reset();
          if(errorcb){
            errorcb();
          }
          return;
        }
        if(client.isAuthenticated()){
          svc.authenticated = true;
          svc.getAccountInfo();
          if(cb){
            cb(client);  
          }
        }
      })
    };

    

    svc.logout = function(cb){
      svc.client.signOut(function(){
        svc.authenticated=false;
        svc.account = null;
        svc.client.reset();
        if(cb){
          cb();  
        }
      })
    }



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
          out.reject(error);
        }
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
    };

    svc.chooseWithModal = function(mode){
      var out = $q.defer();
      var tpl = mode == 'file' ? 'templates/get-dropbox-file.html' : 'templates/get-dropbox-folder.html';
      var modalInstance = $modal.open({
          templateUrl: tpl,
          controller: 'ModalInstanceCtrl',
          resolve: {
            cfg: function () {
              return { };
            }
          }
        });
        modalInstance.result.then(function (ocfg){
          var value = mode == 'file' ? ocfg.file : ocfg.folder;
          out.resolve(value)
        })
      return out.promise;
    };

    svc.chooseFolderWithModal = function(){
      var out = $q.defer();
      return out.promise;
    };

    return svc;


  })

  .directive('dropboxTree', ['DropBoxService', '$timeout','$rootScope', function (DropBoxService, $timeout, $rootScope) {
    return {
      restrict: 'A',
      require : 'ngModel',
      templateUrl : 'templates/dropbox-file-list.html',
      link: function (scope, iElement, iAttrs, ngModelController) {

        scope.authenticated = false;
        scope.ui = {loading: false}
        
        //THIS LISTENER IS NEEDED AS THE WATCH OF "account" is not triggered on interactive login
        scope.$on('loginDropbox', function(evt, data){
          $timeout(function(){
            scope.account = data;  
          });
        })

        scope.logoutDropbox = function(){
          scope.ui.loading = true;
          DropBoxService.logout(function(){
            $timeout(function(){
              scope.ui.loading = false;
            })
            
          });
        };

        scope.loginDropbox = function(){
          DropBoxService.login(function(){
            scope.stat();
          });
        }


        scope.currentFiles = [];
        scope.currentPath = '/';
        var el = $(iElement);

        scope.mode = 'any';
        if(iAttrs.mode=="folder" || iAttrs.mode == 'file'){
          scope.mode = iAttrs.mode;
        }

        scope.client = null;
        scope.stat = function(client){
          scope.ui.loading = true;
          scope.client = client;
          client.stat(scope.currentPath, {readDir:true}, function(err, file, files){
            scope.ui.loading = false;
          
            $timeout(function(){
              scope.currentFiles = files;  
              el.scrollTop();
            })
          })
        }

        scope.$watch(function(){
          return DropBoxService.account;
        }, function(nv){
          $timeout(function(){
            scope.account = nv;  
            if(nv){
              scope.stat(DropBoxService.client);
            }
          });
        }, true);


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
        };

        scope.select = function(p){
          if(scope.selectable(p))
          ngModelController.$setViewValue(p.path);
        };

        scope.selectPath = function(path){
         ngModelController.$setViewValue(path); 
        };

        scope.selectable = function(p){
          return (scope.mode=='any' || (p.isFolder==true&&scope.mode=='folder') || p.isFolder==false&&scope.mode=='file' );
        };


        
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

.directive('dropboxChooseButton', ['$timeout', 'DropBoxService',function($timeout, DropBoxService){
    // Runs during compile
    return {
      scope: {}, // {} = isolate, true = child, false/undefined = no change
      require: 'ngModel', // Array = multiple requires, ? = optional, ^ = check parent elements
      //template: '<button class="btn btn-primary" ng-click="choose()">Choose</button>',
      link: function($scope, iElm, iAttrs, ngModelController) {

        var tpl = iAttrs.mode == 'file' ? 'templates/get-dropbox-file.html' : 'templates/get-dropbox-folder.html';

        $scope.choose = function(){
          return DropBoxService.chooseWithModal(iAttrs.mode)
            .then(function(value){
              ngModelController.$setViewValue(value);  
            })
        } 
        iElm.on('click', $scope.choose);
      }
    };
  }])


  








})();
