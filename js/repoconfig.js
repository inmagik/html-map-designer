angular.module('HtmlMap')
.factory('repoConfig', ['$q', '$http',function ($q, $http) {

    var svc = {};
    svc.getConfigForRepo = function(username, repo){
        var deferred = $q.defer();
        var u = new Gh3.User(username);
        var repo = new Gh3.Repository(repo, u);
        var master = new Gh3.Branch(repo, "master");


        repo.fetch(function (err, res) {
            if(err) { deferred.reject(err); }

            repo.fetchBranches(function (err, res) {
                if(err) { deferred.reject(err); }



                master.fetchContents(function (err, res) {
                    if(err) { deferred.reject(err); }

                    master.eachContent(function (content) {
                        console.log(content.path, content.type, content);
                    });
                });

            })
        });

        return deferred.promise;

    }


    svc._getConfig = function(u, r, f){
        var deferred = $q.defer();
        var github = new Github({});
        var repo = github.getRepo(u, r);
        repo.read('master', f, function(err, data) {
            if(err){
                deferred.reject(err);
            }
            try {
                deferred.resolve(data);
            } catch(err){
                deferred.reject(err);
            }
        });

        return deferred.promise;

    }

    svc.getConfig = function(u, r, f){
        var url = "https://cdn.rawgit.com/"+u+"/"+r+"/master/"+f;
        return $http.get(url)

    }


    svc.getConfigs = function(u,r,fs ){
        var p = [];
        angular.forEach(fs, function(f){
            p.push(svc.getConfig(u,r,f))
        })
        return $q.all(p)
    }


    return svc;
}])
