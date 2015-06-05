function MorphRawJSONLoader()
{
    this.load = function(url, callback)
    {
        $.get(url, function(data)
        {
            var dummyNode = new THREE.Object3D();
            dummyNode.morphTarget = JSON.parse(data);
            callback(
            {
                scene: dummyNode
            });
        });
    }
}

function MorphBinaryLoader()
{
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function(url, callback)
    {
        var arrayBuffer = xhr.response;
        if (arrayBuffer)
        {
            var byteArray = new Float32Array(arrayBuffer);
            for (var i = 0; i < byteArray.byteLength; i++)
            {
                var dummyNode = new THREE.Object3D();
                dummyNode.morphTarget = JSON.parse(byteArray.byteLength[i]);
                callback(
                {
                    scene: dummyNode
                });
            }
        }
    };
}
function gltf2threejs(animation, root) {
   
    var hierarchy = THREE.AnimationHandler.parse( root );

    var threeanimation = {
        name: "animation",
        fps: 30,
        length: "",
        hierarchy: []
    };

    var index = -1;

    for (var i in animation) {
        index = index +1;

        threeanimation.hierarchy.push({
            parent: index,
            keys: []
        });

        for (var j = 0; j < animation[i].length; j++) {
            if (animation[i][j].path == "translation") {
                for (var l = 0; l < animation[i][j].values.length/3; l++) {
                    var keys = animation[i][j].values;
                    var position = new THREE.Vector3(keys[l*3+0], keys[l*3+1], keys[l*3+2]);
                    if (!threeanimation.hierarchy[index].keys[l])
                        threeanimation.hierarchy[index].keys[l] = {};
                    threeanimation.hierarchy[index].keys[l].time = l/threeanimation.fps;
                    threeanimation.hierarchy[index].keys[l].pos = [position.x,position.y,position.z];
                    threeanimation.hierarchy[index].node = animation[i][j].target;
                    threeanimation.length = Math.max(threeanimation.length,l);
                }
            } else if (animation[i][j].path == "scale") {
                for (var l = 0; l < animation[i][j].values.length/3; l++) {
                    var keys = animation[i][j].values;
                    var scale = new THREE.Vector3(keys[l*3+0], keys[l*3+1], keys[l*3+2]);
                    if (!threeanimation.hierarchy[index].keys[l])
                        threeanimation.hierarchy[index].keys[l] = {};
                    threeanimation.hierarchy[index].keys[l].scl =  [scale.x,scale.y,scale.z];;
                    threeanimation.length = Math.max(threeanimation.length,l);
                }
            } else if (animation[i][j].path == "rotation") {
                for (var l = 0; l < animation[i][j].values.length/4; l++) {
                    var keys = animation[i][j].values;
                    var rotation = new THREE.Quaternion(keys[l*4+0],keys[l*4+1],keys[l*4+2],keys[l*4+3]);
                    if (!threeanimation.hierarchy[index].keys[l])
                        threeanimation.hierarchy[index].keys[l] = {};
                    threeanimation.hierarchy[index].keys[l].rot = rotation;
                    threeanimation.length = Math.max(threeanimation.length,l);
                }
            }
        }
    }
    
    threeanimation.length /= threeanimation.fps;
    var oldHierarchy = threeanimation.hierarchy;
    threeanimation.hierarchy = [];
    for(var i =0; i < hierarchy.length; i++)
    {
        for(var j=0; j < oldHierarchy.length; j++)
        {
            if(hierarchy[i] == oldHierarchy[j].node)
            threeanimation.hierarchy[i] = oldHierarchy[j];
        }
    }
    for (var i = 0; i < threeanimation.hierarchy.length; i++)
    {
        var track = threeanimation.hierarchy[i];
        if (!track)
        {
            threeanimation.hierarchy[i] = {
                parent: -1,
                keys: [],
                node: hierarchy[i]
            }
            for(var j = 0; j < threeanimation.length; j ++)
            {
                threeanimation.hierarchy[i].keys[j] = 
                {
                    pos :[threeanimation.hierarchy[i].node.position.x,threeanimation.hierarchy[i].node.position.y,threeanimation.hierarchy[i].node.position.z],
                    rot : threeanimation.hierarchy[i].node.quaternion.clone(),
                    scl : [threeanimation.hierarchy[i].node.scale.x,threeanimation.hierarchy[i].node.scale.y,threeanimation.hierarchy[i].node.scale.z],
                    time: j/threeanimation.fps
                }
            }

            continue;
        }
        track.parent = -1;
        var parentNode = track.node.parent;
        for (var j = 0; j < threeanimation.hierarchy.length; j++)
        {
            if (threeanimation.hierarchy[j] && threeanimation.hierarchy[j].node == parentNode)
                track.parent = j;
        }
    }
    return(threeanimation)
};
//when animation tracks don't contain a pos,rot,or scl for each key, add that value with a linear interp
function cleanAnimation(animation,root)
{
   
    for (var h = 0, hl = animation.data.hierarchy.length; h < hl; h++) {
        var object = animation.hierarchy[h];
        var keys = animation.data.hierarchy[h].keys;
        for(var i =0; i < keys.length; i++)
        {
            var thispos = keys[i].pos || [0, 0, 0];
            var thisrot = keys[i].rot || new THREE.Quaternion();
            var thisscl = keys[i].scl || [1, 1, 1];

            var nextpos, nextposdist;
            var nextrot, nextrotdist;
            var nextscl, nextscldist;
            for (var k = i + 1; k < keys.length; k++) {
                if (keys[k].pos) {
                    nextpos = keys[k].pos;
                    nextposdist = k - i;
                    break;
                }
            }
            for (var k = i + 1; k < keys.length; k++) {
                if (keys[k].rot) {
                    nextrot = keys[k].rot;
                    nextrotdist = k - i;
                    break;
                }
            }
            for (var k = i + 1; k < keys.length; k++) {
                if (keys[k].scl) {
                    nextscl = keys[k].scl;
                    nextscldist = k - i;
                    break;
                }
            }
            if(!nextpos) nextpos = thispos;
            if(!nextrot) nextrot = thisrot;
            if(!nextscl) nextscl = thisscl;
            if(nextposdist > 1)
            {
                keys[i+1].pos = [ thispos[0] + (nextpos[0] - thispos[0])/nextposdist,
                 thispos[1] + (nextpos[1] - thispos[1])/nextposdist,
                  thispos[2] + (nextpos[2] - thispos[2])/nextposdist,
                ]
            }
            if(nextscldist > 1)
            {
                keys[i+1].scl = [ thisscl[0] + (nextscl[0] - thisscl[0])/nextscldist,
                 thisscl[1] + (nextscl[1] - thisscl[1])/nextscldist,
                  thisscl[2] + (nextscl[2] - thisscl[2])/nextscldist,
                ]
            }

            if(nextrotdist > 1)
            {
                
                keys[i+1].rot = new THREE.Quaternion(thisrot.x,thisrot.y,thisrot.z,thisrot.w);
                keys[i+1].rot.slerp(nextrot,1/nextrotdist)
            }
        }
    }    
   // createTracksForBones(animation);
    cacheParentSpaceKeys(animation);
}
function createTracksForBones(animation)
{
   
    var bones = animation.root.skeleton.bones;
    for(var i =0 ; i < bones.length; i++)
    {
        if(animation.hierarchy.indexOf(bones[i]))
        {
            var parentTrack = animation.hierarchy.indexOf(bones[i].parent);
            var newTrack = {
                node:bones[i],
                keys:[{time:0,pos:[0,0,0],rot:new THREE.Quaternion(),scl:[1,1,1]}]
            }
            var pos = new THREE.Vector3();
            var scl = new THREE.Vector3();
            bones[i].matrix.decompose(pos,newTrack.keys[0].rot,scl);
            newTrack.keys[0].pos = [pos.x,pos.y,pos.z]
            newTrack.keys[0].scl = [scl.x,scl.y,scl.z]
        }
    }
}
function findTrackParent(currentTrack,hierarchy)
{
            if(!currentTrack.node) return hierarchy[currentTrack.parent];
        var parentNode = currentTrack.node.parent;
        for(var i =0; i < hierarchy.length; i++)
        {
            if(hierarchy[i].node == parentNode)
                return hierarchy[i]
        }
        return null;
}
function cacheParentSpaceKeys(animation)
{
    
    for (var i = 0; i < animation.data.hierarchy.length; i++)
    {
        var track = animation.data.hierarchy[i];
        var keys = track.keys;
        var node = animation.hierarchy[i];
        
        

        for(var j =0; j < keys.length; j++)
        {
            var currentTrack = track;
            var mats = [];
            var parentMat = new THREE.Matrix4();
            while(currentTrack && currentTrack.keys)
            {

                var key = currentTrack.keys[j];
                if(!key)
                    key = currentTrack.keys[currentTrack.keys.length-1]
                if(!key)
                    mats.push(new THREE.Matrix4());
                if(key)
                {
                    var mat = new THREE.Matrix4();
                    mat.compose(new THREE.Vector3(key.pos[0],key.pos[1],key.pos[2]),key.rot,new THREE.Vector3(key.scl[0],key.scl[1],key.scl[2]))
                    mats.push(mat);
                }
                
                currentTrack = animation.data.hierarchy[currentTrack.parent];
            }
            for(var k = 0; k <mats.length; k++)
            {
                mats[k].multiplyMatrices(mats[k],mats[k-1] || new THREE.Matrix4());
            }
            parentMat = mats[mats.length-1];
            var key = track.keys[j];
            key.cachedRootMat = parentMat;
            key.parentspacePos = new THREE.Vector3();
            key.parentspaceScl = new THREE.Vector3();
            key.parentspaceRot = new THREE.Quaternion();
            key.cachedRootMat.decompose(key.parentspacePos,key.parentspaceRot,key.parentspaceScl);
            key.parentspacePos = [key.parentspacePos.x,key.parentspacePos.y,key.parentspacePos.z];
            key.parentspaceScl = [key.parentspaceScl.x,key.parentspaceScl.y,key.parentspaceScl.z];
        }
    }
}
 var NOT_STARTED = 0;
    var PENDING = 1;
    var FAILED = 2;
    var SUCCEDED = 3;
    var LOAD_FAIL_TIME = 20 * 1000;

var assetRegistry = function() {
    this.assets = {};
    this.initFromPreloader = function(childType, assetSource)
    {
        this.assets[assetSource] = {};
        this.assets[assetSource].refcount = 0;
        this.assets[assetSource].loaded = false;
        this.assets[assetSource].pending = false;
        this.assets[assetSource].callbacks = [];
        this.assets[assetSource].failcallbacks = [];
       
        //see if it was preloaded
        if (childType == 'subDriver/threejs/asset/vnd.raw-morphttarget' && _assetLoader.getMorphs(assetSource))
        {
           
            this.assets[assetSource].loaded = true;
            this.assets[assetSource].pending = false;
            this.assets[assetSource].node = _assetLoader.getMorphs(assetSource).scene;
        }
        if (childType == 'subDriver/threejs/asset/vnd.osgjs+json+compressed' && _assetLoader.getUtf8Json(assetSource))
        {
            this.assets[assetSource].loaded = true;
            this.assets[assetSource].pending = false;
            this.assets[assetSource].node = _assetLoader.getUtf8Json(assetSource).scene;
        }
        if (childType == 'subDriver/threejs/asset/vnd.osgjs+json+compressed+optimized' && _assetLoader.getUtf8JsonOptimized(assetSource))
        {
            this.assets[assetSource].loaded = true;
            this.assets[assetSource].pending = false;
            this.assets[assetSource].node = _assetLoader.getUtf8JsonOptimized(assetSource).scene;
        }
        if (childType == 'subDriver/threejs/asset/vnd.collada+xml' && _assetLoader.getCollada(assetSource))
        {
            this.assets[assetSource].loaded = true;
            this.assets[assetSource].pending = false;
            this.assets[assetSource].node = _assetLoader.getCollada(assetSource).scene;
        }

        
        if (childType == "subDriver/threejs/asset/vnd.rmx+json" && _assetLoader.getRMX(assetSource))
        {
            this.assets[assetSource].loaded = true;
            this.assets[assetSource].pending = false;
            this.assets[assetSource].node = _assetLoader.getRMX(assetSource).scene;
        }
        if (childType == "subDriver/threejs/asset/vnd.three.js+json" && _assetLoader.getTHREEjs(assetSource))
        {
            this.assets[assetSource].loaded = true;
            this.assets[assetSource].pending = false;
            this.assets[assetSource].node = _assetLoader.getTHREEjs(assetSource).scene;
        }
        if (childType == 'subDriver/threejs/asset/vnd.collada+xml+optimized' && _assetLoader.getColladaOptimized(assetSource))
        {
            this.assets[assetSource].loaded = true;
            this.assets[assetSource].pending = false;
            this.assets[assetSource].node = _assetLoader.getColladaOptimized(assetSource).scene;
        }
        if ((childType == 'subDriver/threejs/asset/vnd.gltf+json' || childType == 'subDriver/threejs/asset/vnd.raw-animation') && _assetLoader.getglTF(assetSource))
        {
            this.assets[assetSource].loaded = true;
            this.assets[assetSource].pending = false;
            this.assets[assetSource].node = _assetLoader.getglTF(assetSource).scene;
            this.assets[assetSource].animations = _assetLoader.getglTF(assetSource).animations;
            this.assets[assetSource].rawAnimationChannels = _assetLoader.getglTF(assetSource).rawAnimationChannels;
            var self = this;
            
            glTFCloner.clone(this.assets[assetSource].node, this.assets[assetSource].rawAnimationChannels, function(clone)
            {
                clone.traverse(function(o)
                {
                    if (o.animationHandle)
                    {
                        var ani = gltf2threejs(self.assets[assetSource].rawAnimationChannels,o);
                        var animation = new THREE.Animation(
                            o,
                            ani
                        );
                        animation.data = ani;
                        o.geometry.animation = ani;
                        o.animationHandle = animation;
                    }
                })
                self.assets[assetSource].node = clone;
            })
        }
        if (this.assets[assetSource] && this.assets[assetSource].loaded && this.assets[assetSource].node )
        {
            this.assets[assetSource].node.traverse(function(o)
                {
                    if (o.animationHandle)
                    {
                        cleanAnimation(o.animationHandle,o);
                    }
                });

        }
        
    }
    this.newLoad = function(childType, assetSource, success, failure)
    {
        //thus, it becomes pending
        var reg = this.assets[assetSource];
        reg.refcount++;
        reg.loadState = NOT_STARTED;
        reg.failTimeout = null;
        reg.loadSucceded = function()
        {
            console.log('load SUCCEDED');
            this.loadState = SUCCEDED;
            window.clearTimeout(this.failTimeout);
            this.failTimeout = null;
        }
        reg.loadStarted = function()
        {
            console.log('load started');
            this.loadState = PENDING;
            this.failTimeout = window.setTimeout(function()
                {
                    this.assetFailed();
                    this.loadState = FAILED;
                    console.log('load failed due to timeout');
                }.bind(this),
                LOAD_FAIL_TIME);
        }

        reg.pending = true;
        if(success)
            reg.callbacks.push(success);
        if(failure)
            reg.failcallbacks.push(failure);
        var assetLoaded = function(asset)
        {
            //if a loader does not return a three.mesh
            if (asset instanceof THREE.Geometry) {
                var shim;
                if (asset.skinIndices && asset.skinIndices.length > 0)
                {
                    shim = { scene: new THREE.SkinnedMesh(asset, new THREE.MeshPhongMaterial())} 

                }
                else
                    shim = {scene: new THREE.Mesh(asset, new THREE.MeshPhongMaterial())}

                if (asset.animation) {
                    shim.scene.animationHandle = new THREE.Animation(
                        shim.scene,
                        asset.animation
                    );
                }

                asset = shim;
            }
           
            if(asset.scene.animationHandle)
            {
                cleanAnimation(asset.scene.animationHandle,asset.scene);
            }
            //store this asset in the registry
            //get the entry from the asset registry
            reg = assetRegistry.assets[assetSource];
            if (reg.loadState !== PENDING) return; // in this case, the callback from the load either came too late, and we have decided it failed, or came twice, which really it never should
            //it's not pending, and it is loaded
            if(!asset)
            {
                _ProgressBar.hide();
                this.assetFailed();
                return;
            }
            reg.loadSucceded();
            reg.pending = false;
            reg.loaded = true;
            //actually, is this necessary? can we just store the raw loaded asset in the cache? 
            if (childType !== 'subDriver/threejs/asset/vnd.gltf+json' && childType !== 'subDriver/threejs/asset/vnd.raw-animation')
                reg.node = asset.scene; 
            else
            {
                glTFCloner.clone(asset.scene, asset.rawAnimationChannels, function(clone)
                {
                    reg.node = clone;
                    reg.rawAnimationChannels = asset.rawAnimationChannels
                    
            var rawAnimationChannels = asset.rawAnimationChannels;
                clone.traverse(function(o)
                    {
                        if (o.animationHandle)
                        {
                            
                            var ani = gltf2threejs(rawAnimationChannels,o);
                            var animation = new THREE.Animation(
                                o,
                                ani
                            );
                            animation.data = ani;
                            o.animationHandle = animation;
                        }
                    })

                });
            }
            for (var i = 0; i < reg.callbacks.length; i++)
                reg.callbacks[i](reg.node, reg.rawAnimationChannels);
            //nothing should be waiting on callbacks now.
            reg.callbacks = [];
            reg.failcallbacks = [];
            _ProgressBar.hide();
        }
        reg.assetLoaded = assetLoaded;
        var assetFailed = function(id)
        {
            //the collada loader uses the failed callback as progress. data means this is not really an error;
            if (!id)
            {
                if (window._Notifier)
                {
                    _Notifier.alert('error loading asset ' + this.assetSource);
                }
                //get the entry from the asset registry
                reg = assetRegistry.assets[assetSource];
                $(document).trigger('EndParse');
                //it's not pending, and it is loaded
                reg.pending = false;
                reg.loaded = false;
                reg.loadState = NOT_STARTED;
                //store this asset in the registry
                reg.node = null;
                //if any callbacks were waiting on the asset, call those callbacks
                for (var i = 0; i < reg.failcallbacks.length; i++)
                    reg.failcallbacks[i](null);
                //nothing should be waiting on callbacks now.
                reg.callbacks = [];
                reg.failcallbacks = [];
                _ProgressBar.hide();
                window.clearTimeout(reg.failTimeout);
               
            }
            else
            {
              
                //this is actuall a progress event!
                _ProgressBar.setProgress(id.loaded / (id.total || 1000000)); //total is usually 0 due to contentLength header never working
                _ProgressBar.setMessage(assetSource);
                _ProgressBar.show();
            }
        }
        reg.assetFailed = assetFailed;
        if (childType == 'subDriver/threejs/asset/vnd.collada+xml')
        {
            reg.loadStarted();
            var loader = new THREE.ColladaLoader();
            loader.load(assetSource, assetLoaded, assetFailed);
        }
        if (childType == 'subDriver/threejs/asset/vnd.collada+xml+optimized')
        {
            reg.loadStarted();
            var loader = new ColladaLoaderOptimized();
            loader.load(assetSource, assetLoaded, assetFailed);
        }
        if (childType == 'subDriver/threejs/asset/vnd.osgjs+json+compressed+optimized')
        {
            reg.loadStarted();
            var loader = new UTF8JsonLoader_Optimized(
            {
                source: assetSource
            }, assetLoaded, assetFailed);
        }
        if (childType == "subDriver/threejs/asset/vnd.rmx+json")
        {
            reg.loadStarted();
            var jsonmodel, binarymodel, asset;

            async.series([
                    function loadone(cb){
                        $.getJSON(assetSource,function(data)
                        {
                            jsonmodel = data;
                            cb();
                        });
                    },
                    function loadtwo(cb)
                    {
                        var src = assetSource.substr(0, assetSource.lastIndexOf(".")) + ".bin";

                        var xhr = new XMLHttpRequest();
                        xhr.onload = function(e)
                        {
                            binarymodel = xhr.response;
                            cb();
                        };
                        xhr.open("GET", src, true);
                        xhr.responseType = "arraybuffer";
                        xhr.send();
                    }],
                function done(){
                    var loader = new RMXModelLoader;
                    loader.load(jsonmodel, binarymodel, assetLoaded);
                })
        }
        if (childType == "subDriver/threejs/asset/vnd.three.js+json")
        {
            reg.loadStarted();
            var loader = new THREE.JSONLoader()
            loader.load(assetSource, assetLoaded);
        }
        if (childType == 'subDriver/threejs/asset/vnd.osgjs+json+compressed')
        {
            reg.loadStarted();
            var loader = new UTF8JsonLoader(
            {
                source: assetSource
            }, assetLoaded, assetFailed);
        }
        if (childType == 'subDriver/threejs/asset/vnd.gltf+json' || childType == 'subDriver/threejs/asset/vnd.raw-animation')
        {
            var loader = new THREE.glTFLoader()
            loader.useBufferGeometry = true;
            var source = assetSource;
            var animOnly = childType === 'subDriver/threejs/asset/vnd.raw-animation'
                //create a queue to hold requests to the loader, since the loader cannot be re-entered for parallel loads
            if (!THREE.glTFLoader.queue)
            {
                //task is an object that olds the info about what to load
                //nexttask is supplied by async to trigger the next in the queue;

                //note the timeout does not account for the fact that the load has not really started because of the queue
                

                THREE.glTFLoader.queue = new async.queue(function(task, nextTask)
                {
                    var node = task.node;
                    var cb = task.cb;
                    //call the actual load function
                    //signature of callback dictated by loader
                    node.loader.load(node.source, function(geometry, materials)
                    {
                        
                        //do whatever it was (asset loaded) that this load was going to do when complete
                        cb(geometry, materials);
                        //ok, this model loaded, we can start the next load
                        nextTask();
                    }, animOnly);
                }, 1);
            }
            reg.loadStarted();
            //we need to queue up our entry to this module, since it cannot handle re-entry. This means that while it 
            //is an async function, it cannot be entered again before it completes
            THREE.glTFLoader.queue.push(
            {
                node:
                {
                    source: source,
                    loader: loader
                },
                cb: assetLoaded
            })
        }
        //load as a normal gltf file TODO:add this to the preloader, since it should work normally
        if (childType == 'subDriver/threejs/asset/vnd.raw-morphttarget')
        {
            
            reg.loadStarted();
            var loader = new MorphRawJSONLoader();
            loader.load(assetSource, assetLoaded);
        }
    }
    this.get = function(childType, assetSource, success, failure)
    {   
      
        //try to load from the preloader
        if (!this.assets[assetSource])
        {
            this.initFromPreloader(childType, assetSource);
        }
        //grab the registry entry for this asset
        var reg = this.assets[assetSource];
        //if the asset entry is not loaded and not pending, you'll have to actaully go download and parse it
        if (reg.loaded == false && reg.pending == false)
        {
            this.newLoad(childType, assetSource, success, failure);
            reg.refcount++;
        }
        else if (reg.loaded == true && reg.pending == false)
        {

            reg.refcount++;
            //must return async
            async.nextTick(function(){
                success(reg.node, reg.rawAnimationChannels);    
            })
            
        }
        else if (reg.loaded == false && reg.pending == true)
        {
            reg.refcount++;
            _ProgressBar.show();
            if(success)
                reg.callbacks.push(success)
            if(failure)
                reg.failcallbacks.push(failure);
        }
    }
    this.cancel = function(assetSource, success, failure)
    {
        var reg = this.assets[assetSource];
        if(!reg) return;
        var successIndex = reg.callbacks.indexOf(success);
        var failureCallback = reg.failcallbacks.indexOf(failure);
        if(successIndex > -1)
        {
            reg.refcount--;
            reg.callbacks.splice(successIndex,1);
        }
        if(failureCallback > -1)
            reg.callbacks.splice(failure,1);
    }
};

window.assetRegistry = new assetRegistry();

define([],window.assetRegistry);