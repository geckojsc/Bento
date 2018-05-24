/**
 * A very simple require system
 */
(function () {
    'use strict';
    var modules = {},
        defines = {},
        waiting = {},
        getModule = function (name, history, onSuccess, parent) {
            if (modules[name] !== void(0)) {
                // module exists! return immediately
                // note: a module may be null if a circular dependency exists
                onSuccess(modules[name]);
                return;
            }
            // does not exist yet, put on waiting list
            waiting[name] = waiting[name] || [];
            waiting[name].push({
                parent: parent,
                onSuccess: onSuccess
            });
            // not loaded yet, but in defines
            if (defines[name]) {
                loadModule(name, defines[name].dep, defines[name].fn, history);
            } else {
                console.log("FATAL: module " + name + " was never declared before.");
            }
        },
        loadModule = function (name, dep, fn, history) {
            var i, l,
                historyNode,
                params = [],
                loaded = 0,
                ready,
                end = function () {
                    var params = [],
                        myModule;

                    // build param list and call function
                    for (i = 0, l = dep.length; i < l; ++i) {
                        getModule(dep[i], historyNode, function (module) {
                            params.push(module);
                        });
                    }
                    myModule = fn.apply(window, params);
                    // add to modules list
                    defineAndFlush(name, myModule);
                };

            // check for circular dependencies
            if (history.indexOf(name) >= 0) {
                // circular dependency!
                console.log('Circular dependency by ' + name + ': ', JSON.stringify(history));

                // continue by nulling the module
                defineAndFlush(name, null);
                return;
            }
            // none found
            historyNode = history.concat([name]);

            if (dep.length === 0) {
                // load immediately
                end();
            }

            // loop through dependencies and try to load it (the module may not be defined yet)
            for (i = 0, l = dep.length; i < l; ++i) {
                getModule(dep[i], historyNode, function (module) {
                    loaded += 1;
                    if (loaded === dep.length) {
                        // all modules are loaded
                        end();
                    }
                }, name);
            }
        },
        defineAndFlush = function (name, module) {
            var i, l,
                callbacksWaiting = waiting[name],
                onSuccess;

            // add to modules
            modules[name] = module;
            // remove from define list
            if (module !== null) {
                delete defines[name];
            }
            // flush waiting
            if (!callbacksWaiting) {
                return;
            }
            for (i = 0, l = callbacksWaiting.length; i < l; ++i) {
                onSuccess = callbacksWaiting[i].onSuccess;
                onSuccess(module);
            }
            waiting[name] = [];
        },
        require = function (dep, fn) {
            var i, l,
                loaded = 0,
                ready,
                end = function () {
                    var params = [];

                    // build param list and call function
                    for (i = 0, l = dep.length; i < l; ++i) {
                        getModule(dep[i], [], function (module) {
                            params.push(module);
                        });
                    }
                    fn.apply(window, params);
                };
            if (dep.length === 0) {
                // load immediately
                end();
            }

            // loop through dependencies and try to load it (the module may not be defined yet)
            for (i = 0, l = dep.length; i < l; ++i) {
                getModule(dep[i], [], function (module) {
                    loaded += 1;
                    if (loaded === l) {
                        // all modules are loaded
                        end();
                    }
                });
            }
        },
        define = function (name, dep, fn) {
            // put it in the defines list
            defines[name] = {
                dep: dep,
                fn: fn
            };
        };

    // export
    window.require = require;
    window.define = define;
})();
/**
 * Main entry point for Bento engine
 * Defines global bento namespace, use bento.require and define.
 * Require/define uses RequireJS.
 * @name bento
 */
(function () {
    'use strict';
    var startWatching = false,
        modules = [],
        rjs = window.requirejs, // cache requirejs
        req = window.require, // cache requirejs
        def = window.define, // cache requirejs
        bento = {
            /**
             * Loads modules asynchronously
             * @function
             * @instance
             * @param {Array} dependencyModuleNames - Array of module names
             * @param {Function} callback - Called when dependencies are loaded.
             * Function parameters is a list of corresponding module objects
             * @name bento require
             */
            require: req,
            /**
             * Defines a new module
             * @function
             * @instance
             * @param {String} name - Name of the module
             * @param {Array} dependencyModuleNames - Array of module names
             * @param {Function} callback - Called when dependencies are loaded.
             * Function parameters is a list of corresponding module objects
             * @name bento define
             */
            define: function () {
                var name = arguments[0];
                if (startWatching) {
                    modules.push(name);
                }
                def.apply(this, arguments);
            },
            /*
             * Deletes all loaded modules. See {@link http://requirejs.org/docs/api.html#undef}
             * Modules loaded after bento.watch started are affected
             * @function
             * @instance
             * @name bento.refresh
             */
            refresh: function () {
                var i = 0;
                // undefines every module loaded since watch started
                for (i = 0; i < modules.length; ++i) {
                    rjs.undef(modules[i]);
                }
            },
            /*
             * Start collecting modules for deletion
             * @function
             * @instance
             * @name bento.watch
             */
            watch: function () {
                startWatching = true;
            }
        };

    // add global name
    window.bento = window.bento || bento;

    // undefine global define and require, in case it clashes with other require systems
    window.require = undefined;
    window.define = undefined;
}());
if (!bento) {
    // if bento still isn't defined at this point, then window isn't the global object
    var bento = window.bento;
}
/**
 * Bento module, main entry point to game modules and managers. Start the game by using Bento.setup().
 * After this you have access to all Bento managers:<br>
 * • Bento.assets<br>
 * • Bento.audio<br>
 * • Bento.input<br>
 * • Bento.object<br>
 * • Bento.savestate<br>
 * • Bento.screen<br>
 * <br>Exports: Object
 * @module bento
 * @moduleName Bento
 *
 *
 * @snippet Bento.assets|assets
Bento.assets
 * @snippet Bento.objects|objects
Bento.objects
 * @snippet Bento.saveState|saveState
Bento.saveState
 * @snippet Bento.screens|screens
Bento.screens
 * @snippet Bento.audio|audio
Bento.audio
 *
 * @snippet Bento.assets.getJson|Object
Bento.assets.getJson('${1}');
 *
 * @snippet Bento.objects.attach|snippet
Bento.objects.attach(${1:entity});
 * @snippet Bento.objects.remove|snippet
Bento.objects.remove(${1:entity});
 * @snippet Bento.objects.get|Entity/Object
Bento.objects.get('${1}', function (${1:entity}) {
    $2
});
 * @snippet Bento.objects.getByFamily|Entity/Object
Bento.objects.getByFamily('${1}', function (array) {$2});
 *
 * @snippet Bento.audio.playSound|snippet
Bento.audio.playSound('sfx_${1}');
 * @snippet Bento.audio.stopSound|snippet
Bento.audio.stopSound('sfx_${1}');
 * @snippet Bento.audio.playMusic|snippet
Bento.audio.playMusic('bgm_${1}');
 * @snippet Bento.audio.stopAllMusic|snippet
Bento.audio.stopAllMusic();
 * @snippet Bento.audio.setVolume|snippet
Bento.audio.setVolume: function (${1:1}, '${2:name}');
 * @snippet Bento.audio.isPlayingMusic|Boolean
Bento.audio.isPlayingMusic: function ('${1:name}');
 *
 * @snippet Bento.saveState.save|snippet
Bento.saveState.save('${1}', ${2:value});
 * @snippet Bento.saveState.load|Value
Bento.saveState.load('${1}', ${2:defaultValue});
 * @snippet Bento.saveState.add|snippet
Bento.saveState.add('${1}', ${2:value});
 *
 * @snippet Bento.screens.show|snippet
Bento.screens.show('screens/${1:name}');
 * @snippet Bento.screens.getCurrentScreen|Screen
Bento.screens.getCurrentScreen();
 *
 */
bento.define('bento', [
    'bento/utils',
    'bento/lib/domready',
    'bento/eventsystem',
    'bento/managers/asset',
    'bento/managers/input',
    'bento/managers/object',
    'bento/managers/audio',
    'bento/managers/screen',
    'bento/managers/savestate',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/renderer'
], function (
    Utils,
    DomReady,
    EventSystem,
    AssetManager,
    InputManager,
    ObjectManager,
    AudioManager,
    ScreenManager,
    SaveState,
    Vector2,
    Rectangle,
    Renderer
) {
    'use strict';
    //var Bento;

    var canvas = window.canvas;
    var context = canvas.getContext('2d');
    var renderer;
    var dev = false;
    var viewport = new Rectangle(0, 0, 640, 480);

    var setupCanvas = function (settings) {};
    var setupRenderer = function (settings, onComplete) {
        var rendererName;
        settings.renderer = settings.renderer ? settings.renderer.toLowerCase() : 'canvas2d';

        // canvas2d and pixi are reserved names
        if (settings.renderer === 'canvas2d') {
            rendererName = 'bento/renderers/canvas2d';
        } else if (settings.renderer === 'pixi') {
            rendererName = 'bento/renderers/pixi';
        } else if (settings.renderer === 'auto') {
            // auto renderer is deprecated! use canvas2d or pixi
            console.log('WARNING: auto renderer is deprecated. Please use canvas2d or pixi as renderers.');
            rendererName = 'bento/renderers/canvas2d';
        }

        // setup renderer
        new Renderer(rendererName, canvas, settings, function (rend) {
            console.log('Init ' + rend.name + ' as renderer');
            Bento.renderer = rend;
            Ejecta.setRenderer(Bento.renderer);
            gameData = Bento.getGameData();
            onComplete();
        });

        // cocoon only: set antiAlias with smoothing parameter
        if (Utils.isDefined(settings.smoothing) && Utils.isCocoonJs() && window.Cocoon && window.Cocoon.Utils) {
            window.Cocoon.Utils.setAntialias(settings.smoothing);
        }
    };

    Bento.setup = function (settings, callback) {
        // pull apart settings before calling JSSetup
        callback = callback || settings.onComplete || settings.onLoad;
        Bento.settings = settings;
        var runGame = function () {
            // Bento.objects.run();
            if (callback) {
                callback();
            }
        };
        if (Utils.isUndefined(settings.canvasDimension)) {
            settings.canvasDimension.width = 1280;
            settings.canvasDimension.height = 720;
            Bento.setViewportDimension(settings.canvasDimension);
        } else {
            Bento.setViewportDimension(settings.canvasDimension);
        }
        settings.sortMode = settings.sortMode || 0;
        setupCanvas(settings);
        setupRenderer(settings, function () {
            dev = settings.dev || false;

            Bento.input = new InputManager(gameData, settings);
            Bento.objects = new ObjectManager(Bento.getGameData, settings);
            Bento.assets = new AssetManager();
            Bento.audio = new AudioManager(Bento);
            Bento.screens = new ScreenManager();

            // mix functions
            Utils.extend(Bento, Bento.objects);

            if (settings.assetGroups) {
                Bento.assets.loadAssetGroups(settings.assetGroups, runGame);
            } else {
                // try loadings assets.json from the root folder
                Bento.assets.loadAssetsJson(function (error) {
                    runGame();
                });
            }
            // start watching for new modules
            bento.watch();
        });
    };

    Bento.getRenderer = function () {
        return Bento.renderer;
    };

    Bento.getCanvas = function () {
        return window.canvas;
    };

    Bento.getSettings = function () {
        return Bento.settings;
    };

    Bento.isDev = function () {
        return dev;
    };

    Bento.saveState = SaveState;
    return Bento;
});
/**
 * A base object to hold components. Has dimension, position, scale and rotation properties (though these don't have much
 meaning until you attach a Sprite component). Entities can be added to the game by calling Bento.objects.attach().
 Entities can be visualized by using the Sprite component, or you can attach your own component and add a draw function.
 * <br>Exports: Constructor
 * @module {Entity} bento/entity
 * @moduleName Entity
 * @param {Object} settings - settings (all properties are optional)
 * @param {Function} settings.init - Called when entity is initialized
 * @param {Array} settings.components - Array of component module functions
 * @param {Array} settings.family - Array of family names. See {@link module:bento/managers/object#getByFamily}
 * @param {Vector2} settings.position - Vector2 of position to set
 * @param {Rectangle} settings.dimension - Size of the entity
 * @param {Rectangle} settings.boundingBox - Rectangle used for collision checking (if this does not exist, dimension is used as bounding box)
 * @param {Number} settings.z - z-index to set (note: higher values go on top)
 * @param {Number} settings.alpha - Opacity of the entity (1 = fully visible)
 * @param {Number} settings.rotation - Rotation of the entity in radians
 * @param {Vector2} settings.scale - Scale of the entity
 * @param {Boolean} settings.updateWhenPaused - Should entity keep updating when game is paused
 * @param {Boolean} settings.global - Should entity remain after hiding a screen
 * @param {Boolean} settings.float - Should entity move with the screen
 * @example
var entity = new Entity({
    z: 0,
    name: 'myEntity',
    position: new Vector2(32, 32),
    components: [new Sprite({
        imageName: 'myImage',
        originRelative: new Vector2(0.5, 1)    // bottom center origin
    })] // see Sprite module
 });
 * // attach entity to Bento Objects
 * Bento.objects.attach(entity);
 * @returns {Entity} Returns a new entity object
 * @snippet Entity|constructor
Entity({
    z: ${1:0},
    name: '$2',
    family: [''],
    position: new Vector2(${3:0}, ${4:0}),
    components: [
        $5
    ]
});
 */
bento.define('bento/entity', [
    'bento',
    'bento/utils',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/math/transformmatrix',
    'bento/transform'
], function (
    Bento,
    Utils,
    Vector2,
    Rectangle,
    Matrix,
    Transform
) {
    'use strict';
    return function (settings) {
        var i, l;
        var entity = new EJEntity();
        entity.family = [];
        entity.components = [];

        entity.collidesWith = function (settings) {
            // dissect the settings and then send them to the cpp side
            var thisEntity = this;
            var checkForCollision;
            var colType;
            if (settings.entity) {
                // single entity
                if (!settings.entity.isEntity) {
                    console.log("WARNING: settings.entity is not an entity");
                    return null;
                }
                checkForCollision = settings.entity;
                colType = 0;
            } else if (settings.entities) {
                if (!Utils.isArray(settings.entities)) {
                    console.log("WARNING: settings.entities is not an array");
                    return null;
                }
                checkForCollision = settings.entities;
                if (!checkForCollision.length) {
                    return null;
                }
                checkForCollision = checkForCollision.concat(settings.entities);
            } else if (settings.name) {
                checkForCollision = Bento.objects.getByName(settings.name);
                colType = 2;
            } else if (settings.family) {
                checkForCollision = [];
                var pool;
                Utils.forEach(settings.family, function (family, i, l, breakLoop) {
                    // code here
                    pool = Bento.objects.getByFamily(family);
                    if (pool) {
                        checkForCollision = checkForCollision.concat(pool);
                    }
                });
            } else if (settings.rectangle) {
                checkForCollision = settings.rectangle;
                colType = 1;
            }
            var offset;
            if (settings.offset) {
                offset = settings.offset;
            } else {
                offset = new Vector2();
            }

            var firstOnly = true;
            if (settings.firstOnly !== void(0)) {
                firstOnly = settings.firstOnly;
            }

            // onCollide used to be null but crashes on rare occasions, so define an empty function instead
            var onCollide = function () {};
            if (settings.onCollide !== void(0)) {
                onCollide = settings.onCollide;
            }

            if (Utils.isArray(checkForCollision)) {
                if (!checkForCollision.length) {
                    return null;
                }
                var colObj;
                var retArray = [];
                Utils.forEach(checkForCollision, function (item, i, l, breakLoop) {
                    if (firstOnly) {
                        colObj = thisEntity.jsCollidesWith(0, item, offset, onCollide, firstOnly);
                        if (colObj) {
                            breakLoop();
                        }
                    } else {
                        colObj = thisEntity.jsCollidesWith(0, item, offset, onCollide, firstOnly);
                        if (colObj) {
                            retArray.push(colObj);
                        }
                    }
                });
                if (!firstOnly) {
                    return retArray;
                }
                return colObj;
            }
            // check normally
            return thisEntity.jsCollidesWith(colType, checkForCollision, offset, onCollide, firstOnly);
        };

        entity.attach = function (child, force) {
            if (!child) {
                Utils.log("ERROR: trying to attach " + child);
                return;
            }
            if (!force && (child.isAdded || child.parent)) {
                Utils.log("ERROR: Child " + child.name + " was already attached.");
                return;
            }
            this.components.push(child);
            return this.jsAttach(child, force);
        };

        entity.remove = function (child) {
            if (!child) {
                return;
            }
            var index = this.components.indexOf(child);
            if (index >= 0) {
                this.components[index] = null;
            }
            return this.jsRemove(child);
        };

        entity.removeByName = function (name) {
            var entity = this;
            entity.getComponent(name, function (component) {
                return entity.remove(component);
            });
        };

        entity.extend = function (object) {
            return Utils.extend(this, object);
        };

        if (settings) {
            if (settings.position) {
                entity.position = settings.position; // should this be cloned?
            }
            if (settings.dimension) {
                entity.dimension = settings.dimension;
            }
            if (settings.boundingBox) {
                entity.boundingBox = settings.boundingBox;
            }
            if (settings.scale) {
                entity.scale = settings.scale;
            }
            if (settings.name) {
                entity.name = settings.name;
            }
            if (settings.family) {
                if (!Utils.isArray(settings.family)) {
                    settings.family = [settings.family];
                }
                for (i = 0, l = settings.family.length; i < l; ++i) {
                    // do not use this in game code unless you know what you are doing
                    entity.pushToFamily(settings.family[i]);
                    entity.family.push(settings.family[i]);
                }
            }
            if (settings.alpha !== void(0)) {
                entity.alpha = settings.alpha;
            }
            if (settings.rotation !== void(0)) {
                entity.rotation = settings.rotation;
            }
            if (settings.visible !== void(0)) {
                entity.visible = settings.visible;
            }

            entity.z = settings.z || 0;
            entity.updateWhenPaused = settings.updateWhenPaused || 0;
            entity.global = settings.global || false;
            entity.float = settings.float || false;

            // attach components after initializing other variables
            if (settings.components) {
                if (!Utils.isArray(settings.components)) {
                    settings.components = [settings.components];
                }
                for (i = 0, l = settings.components.length; i < l; ++i) {
                    entity.jsAttach(settings.components[i]);
                    entity.components.push(settings.components[i]);
                }
            }
            // you might want to do things before the entity returns
            if (settings.init) {
                settings.init.apply(entity);
            }

            if (settings.addNow) {
                Bento.objects.add(entity);
            }
        }

        return entity;
    };
});
/**
 * Transform module
 * @moduleName Transform
 */
bento.define('bento/transform', [], function () {
    'use strict';
    // var twoPi = Math.PI * 2;

    // var Transform = function (entity) {
    //     if (!(this instanceof Transform)) {
    //         return new Transform(entity);
    //     }
    //     this.matrix = new Matrix();
    //     this.entity = entity;

    //     // cache values
    //     this.sin = 0;
    //     this.cos = 1;
    //     this.rotationCache = 0;
    //     this.oldAlpha = 1;

    //     // additional transforms
    //     this.x = 0;
    //     this.y = 0;
    //     this.visible = true; // only checked by entity
    // };

    // Transform.prototype.draw = function (data) {
    //     var entity = this.entity;
    //     var matrix = this.matrix;
    //     var alpha = entity.alpha;
    //     var rotation = entity.rotation;
    //     var sin = this.sin;
    //     var cos = this.cos;
    //     var renderer = data.renderer;
    //     var viewport = data.viewport;

    //     // cache sin and cos
    //     if (rotation !== this.rotationCache) {
    //         this.rotationCache = rotation;
    //         this.sin = Math.sin(rotation);
    //         this.cos = Math.cos(rotation);
    //         sin = this.sin;
    //         cos = this.cos;
    //     }

    //     // save
    //     renderer.save();

    //     // translate
    //     if (Transform.subPixel) {
    //         renderer.translate(entity.position.x + this.x, entity.position.y + this.y);
    //     } else {
    //         renderer.translate(Math.round(entity.position.x + this.x), Math.round(entity.position.y + this.y));
    //     }
    //     // scroll (only applies to parent objects)
    //     if (!entity.parent && !entity.float) {
    //         renderer.translate(-viewport.x, -viewport.y);
    //     }

    //     if (entity.rotation % twoPi) {
    //         // rotated?
    //         renderer.rotate(rotation, sin, cos);
    //     }
    //     // scale
    //     renderer.scale(entity.scale.x, entity.scale.y);
    //     // alpha
    //     this.oldAlpha = data.renderer.getOpacity();
    //     renderer.setOpacity(this.oldAlpha * alpha);
    // };

    // Transform.prototype.postDraw = function (data) {
    //     var renderer = data.renderer;

    //     // restore
    //     renderer.setOpacity(this.oldAlpha);
    //     renderer.restore();
    // };

    // Transform.prototype.getWorldPosition = function () {
    //     return this.toWorldPosition(this.entity.position);
    // };

    // Transform.prototype.toWorldPosition = function (localPosition) {
    //     var positionVector,
    //         matrix,
    //         entity = this.entity,
    //         position,
    //         parent,
    //         parents = [],
    //         i,
    //         isFloating = false;

    //     // no parents: is already a world position
    //     if (!entity.parent) {
    //         if (entity.float) {
    //             return localPosition.add(Bento.getViewport().getCorner());
    //         } else {
    //             return localPosition.clone();
    //         }
    //     }

    //     // get all parents
    //     parent = entity;
    //     while (parent.parent) {
    //         parent = parent.parent;
    //         parents.push(parent);
    //     }
    //     // is top parent floating?
    //     if (parents.length && parents[parents.length - 1].float) {
    //         isFloating = true;
    //     }

    //     // make a copy
    //     if (entity.float || isFloating) {
    //         positionVector = localPosition.add(Bento.getViewport().getCorner());
    //     } else {
    //         positionVector = localPosition.clone();
    //     }

    //     /**
    //      * transform the position vector with each component
    //      */
    //     for (i = parents.length - 1; i >= 0; --i) {
    //         parent = parents[i];

    //         // construct a scaling matrix and apply to position vector
    //         matrix = new Matrix().scale(parent.scale.x, parent.scale.y);
    //         matrix.multiplyWithVector(positionVector);
    //         // construct a rotation matrix and apply to position vector
    //         if (parent.rotation % twoPi) {
    //             matrix = new Matrix().rotate(parent.rotation);
    //             matrix.multiplyWithVector(positionVector);
    //         }
    //         // construct a translation matrix and apply to position vector
    //         matrix = new Matrix().translate(parent.position.x, parent.position.y);
    //         matrix.multiplyWithVector(positionVector);
    //     }

    //     return positionVector;
    // };

    // Transform.prototype.toLocalPosition = function (worldPosition) {
    //     // get the comparable position and reverse transform once more to get into the local space
    //     var positionVector = this.toComparablePosition(worldPosition);

    //     // construct a translation matrix and apply to position vector
    //     var entity = this.entity;
    //     var position = entity.position;
    //     var matrix = new Matrix().translate(-position.x, -position.y);
    //     matrix.multiplyWithVector(positionVector);
    //     // construct a rotation matrix and apply to position vector
    //     if (entity.rotation % twoPi) {
    //         matrix = new Matrix().rotate(-entity.rotation);
    //         matrix.multiplyWithVector(positionVector);
    //     }
    //     // construct a scaling matrix and apply to position vector
    //     matrix = new Matrix().scale(1 / entity.scale.x, 1 / entity.scale.y);
    //     matrix.multiplyWithVector(positionVector);

    //     return positionVector;
    // };

    // Transform.prototype.toComparablePosition = function (worldPosition) {
    //     var positionVector,
    //         matrix,
    //         entity = this.entity,
    //         position,
    //         parent,
    //         parents = [],
    //         i,
    //         isFloating = false;

    //     // no parents
    //     if (!entity.parent) {
    //         if (entity.float) {
    //             return worldPosition.subtract(Bento.getViewport().getCorner());
    //         } else {
    //             return worldPosition;
    //         }
    //     }

    //     // get all parents
    //     parent = entity;
    //     while (parent.parent) {
    //         parent = parent.parent;
    //         parents.push(parent);
    //     }
    //     // is top parent floating?
    //     if (parents.length && parents[parents.length - 1].float) {
    //         isFloating = true;
    //     }

    //     // make a copy
    //     if (entity.float || isFloating) {
    //         positionVector = worldPosition.subtract(Bento.getViewport().getCorner());
    //     } else {
    //         positionVector = worldPosition.clone();
    //     }

    //     /**
    //      * Reverse transform the position vector with each component
    //      */
    //     for (i = parents.length - 1; i >= 0; --i) {
    //         parent = parents[i];

    //         // construct a translation matrix and apply to position vector
    //         position = parent.position;
    //         matrix = new Matrix().translate(-position.x, -position.y);
    //         matrix.multiplyWithVector(positionVector);
    //         // construct a rotation matrix and apply to position vector
    //         if (parent.rotation % twoPi) {
    //             matrix = new Matrix().rotate(-parent.rotation);
    //             matrix.multiplyWithVector(positionVector);
    //         }
    //         // construct a scaling matrix and apply to position vector
    //         matrix = new Matrix().scale(1 / parent.scale.x, 1 / parent.scale.y);
    //         matrix.multiplyWithVector(positionVector);
    //     }

    //     return positionVector;
    // };

    // Transform.subPixel = true;

    return Transform;
});
/**
 * Manager that controls mainloop and all objects. Attach entities to the object manager
 * to add them to the game. The object manager loops through every object's update and
 * draw functions. The settings object passed here is passed through Bento.setup().
 * <br>Exports: Constructor, can be accessed through objectManager namespace.
 * @module bento/managers/object
 * @moduleName ObjectManager
 * @param {Function} getGameData - Function that returns gameData object
 * @param {Object} settings - Settings object
 * @param {Object} settings.defaultSort - Use javascript default sorting with Array.sort (not recommended)
 * @param {Object} settings.useDeltaT - Use delta time (note: untested)
 * @returns ObjectManager
 */
// define cpp components and classes
bento.define('bento/managers/object', [], function () {
    'use strict';
    return function () {
    	var objectManager = new EJObjectManager();
	    objectManager.objectPool = [];
	    objectManager.quickAccess = {};
	    objectManager.attach = function (object) {
	        objects.jsAttach(object);

	        var i, l, family;

	        if (!object) {
	            Utils.log("ERROR: trying to attach " + object);
	            return;
	        }

	        if (object.isAdded || object.parent) {
	            Utils.log("ERROR: Entity " + object.name + " was already added.");
	            return;
	        }

	        objectManager.objectPool.push(object);

	        // add object to access pools
	        if (object.family) {
	            family = object.family;
	            for (i = 0, l = family.length; i < l; ++i) {
	                //addObjectToFamily(object, family[i]);
	                if (!objectManager.quickAccess[family[i]]) {
	                    objectManager.quickAccess[family[i]] = [];
	                }
	                if (objectManager.quickAccess[family[i]].indexOf(object) === -1) {
	                    objectManager.quickAccess[family[i]].push(object);
	                }
	            }
	        }
	    };
	    objectManager.add = objectManager.attach;
	    objectManager.remove = function (object) {
	        var i, l,
	            index,
	            family;
	        if (!object) {
	            return;
	        }
	        // remove from access pools
	        if(object.isAdded) {
	            if (object.family) {
	                family = object.family;
	                for (i = 0, l = family.length; i < l; ++i) {
	                    var pool = quickAccess[family[i]];
	                    if (pool) {
	                        Utils.removeFromArray(pool, object);
	                    }
	                }
	            }
	        }
	        objectManager.jsRemove(object);
	        index = objectManager.objectPool.indexOf(object);
	        if (index >= 0) {
	            objectManager.objectPool[index] = null;
	        }
	    };
	    objectManager.removeAll = function (removeGlobal) {
	        var i, l,
	            object;
	        for (i = 0, l = objectManager.objectPool.length; i < l; ++i) {
	            object = objectManager.objectPool[i];
	            if (!object) {
	                continue;
	            }
	            if (!object.global || removeGlobal) {

	                if(object.isAdded) {
	                    if (object.family) {
	                        family = object.family;
	                        for (i = 0, l = family.length; i < l; ++i) {
	                            var pool = quickAccess[family[i]];
	                            if (pool) {
	                                Utils.removeFromArray(pool, object);
	                            }
	                        }
	                    }
	                }
	                objectManager.objectPool[i] = null;
	            }
	        }

	        // loop objects array from end to start and remove null elements
	        for (i = objectManager.objectPool.length - 1; i >= 0; --i) {
	            if (objectManager.objectPool[i] === null) {
	                objectManager.objectPool.splice(i, 1);
	            }
	        }

	        // re-add all global objects
	        for (i = 0, l = objectManager.objectPool.length; i < l; ++i) {
	            object = objectManager.objectPool[i];
	        }

	        objectManager.jsRemoveAll();
	    };
	    objectManager.getByName = function (objectName, callback) {
	        // have to keep objects array
	        var i, l,
	            object,
	            array = [];

	        for (i = 0, l = objectManager.objectPool.length; i < l; ++i) {
	            object = objectManager.objectPool[i];
	            if (!object) {
	                continue;
	            }
	            if (!object.name) {
	                continue;
	            }
	            if (object.name === objectName) {
	                array.push(object);
	            }
	        }
	        if (callback && array.length) {
	            callback(array);
	        }
	        return array;
	    };
	    objectManager.getByFamily = function (type, callback) {
	        var array = objectManager.quickAccess[type];
	        if (!array) {
	            // initialize it
	            array = [];
	            objectManager.quickAccess[type] = array;
	            // Utils.log('Warning: family called ' + type + ' does not exist', true);
	        }
	        if (callback && array.length) {
	            callback(array);
	        }
	        return array;
	    };
	};
});
/**
 * Rectangle
 * <br>Exports: Constructor
 * @module bento/math/rectangle
 * @moduleName Rectangle
 * @param {Number} x - Top left x position
 * @param {Number} y - Top left y position
 * @param {Number} width - Width of the rectangle
 * @param {Number} height - Height of the rectangle
 * @returns {Rectangle} Returns a rectangle.
 * @snippet Rectangle|constructor
Rectangle(${1:0}, ${2:0}, ${3:1}, ${4:0})
 */
bento.define('bento/math/rectangle', [], function () {
    'use strict';
    return Rectangle;
});
/**
 * 2 dimensional vector
 * (Note: to perform matrix multiplications, one must use toMatrix)
 * <br>Exports: Constructor
 * @module bento/math/vector2
 * @moduleName Vector2
 * @param {Number} x - x position
 * @param {Number} y - y position
 * @returns {Vector2} Returns a 2d vector.
 * @snippet Vector2|constructor
Vector2(${1:0}, ${2:0})
 * @snippet #Vector2.x|Number
    x
 * @snippet #Vector2.y|Number
    y
 *
 */
bento.define('bento/math/vector2', [], function () {
    'use strict';
    return Vector2;
});
/*
    Audia: <audio> implemented using the Web Audio API
    by Matt Hackett of Lost Decade Games
    AMD port by sprky0
    https://github.com/richtaur/audia
    https://github.com/sprky0/audia

    Adapted for Bento game engine by Lucky Kat Studios
*/
bento.define("audia", [
    'bento/utils'
], function (
    Utils
) {

    // Got Web Audio API?
    var audioContext = null;
    if (typeof AudioContext == "function") {
        audioContext = new AudioContext();
    } else if (window.webkitAudioContext) {
        audioContext = new webkitAudioContext();
    }

    // Setup
    var AudiaConstructor;
    var hasWebAudio = Boolean(audioContext);

    // Audia object creation
    var audioId = 0;
    var audiaObjectsCache = {};
    var addAudiaObject = function (object) {
        var id = ++audioId;
        audiaObjectsCache[id] = object;

        return id;
    };
    // Math helper
    var clamp = function (value, min, max) {
        return Math.min(Math.max(Number(value), min), max);
    };
    var setupWebAudio = function () {
        // Reimplement Audio using Web Audio API…

        // Load audio helper
        var buffersCache = {};
        var loadAudioFile = function (object, url) {
            var onLoad = function (buffer) {
                // Duration
                if (buffer.duration !== object._duration) {
                    object._duration = buffer.duration;
                    object.dispatchEvent("durationchange" /*, TODO*/ );
                }

                object.dispatchEvent("canplay" /*, TODO*/ );
                object.dispatchEvent("canplaythrough" /*, TODO*/ );
                object.dispatchEvent("load" /*, TODO*/ );

                object._autoplay && object.play();
                object._onload && object.onload();
            };

            // Got a cached buffer or should we fetch it?
            if (url in buffersCache) {
                onLoad(buffersCache[url]);
            } else {
                var xhr = new XMLHttpRequest();
                xhr.open("GET", url, true);
                xhr.responseType = "arraybuffer";
                xhr.onload = function () {
                    audioContext.decodeAudioData(xhr.response, function (buffer) {
                        buffersCache[url] = buffer;
                        onLoad(buffer);
                    });
                };
                xhr.send();
            }
        };

        var refreshBufferSource = function (object) {
            // Create (or replace) buffer source
            object.bufferSource = audioContext.createBufferSource();

            // Attach buffer to buffer source
            object.bufferSource.buffer = buffersCache[object.src];

            // Connect to gain node
            object.bufferSource.connect(object.gainNode);

            // Update settings
            object.bufferSource.loop = object._loop;
            object.bufferSource.onended = object._onended;
        };

        // Setup a master gain node
        var gainNode = audioContext.createGain();
        gainNode.gain.value = 1;
        gainNode.connect(audioContext.destination);

        // Constructor
        var Audia = function (src) {
            this.id = addAudiaObject(this);

            // Setup
            this._listenerId = 0;
            this._listeners = {};

            // Audio properties
            this._autoplay = false;
            this._buffered = []; // TimeRanges
            this._currentSrc = "";
            this._currentTime = 0;
            this._defaultPlaybackRate = 1;
            this._duration = NaN;
            this._loop = false;
            this._muted = false;
            this._paused = true;
            this._playbackRate = 1;
            this._played = []; // TimeRanges
            this._preload = "auto";
            this._seekable = []; // TimeRanges
            this._seeking = false;
            this._src = "";
            this._volume = 1;
            this._onended = null;
            this._onload = null;

            // Create gain node
            this.gainNode = audioContext.createGain();
            this.gainNode.gain.value = this._volume;

            // Connect to master gain node
            this.gainNode.connect(gainNode);

            // Support for new Audia(src)
            if (src !== undefined) {
                this.src = src;
            }
        };

        // Methods…

        // load
        Audia.prototype.load = function () {
            // TODO: find out what it takes for this to fire
            // proably just needs src set right?
            this._src && loadAudioFile(this, this._src);
        };

        // play()
        Audia.prototype.play = function () {
            // TODO: restart from this.currentTime
            this._paused = false;

            refreshBufferSource(this);
            if (this.bufferSource.start)
                this.bufferSource.start(0);
            else
                this.bufferSource.noteOn(0);
        };

        // pause()
        Audia.prototype.pause = function () {
            if (this._paused) {
                return;
            }
            this._paused = true;

            if (this.bufferSource.stop)
                this.bufferSource.stop(0);
            else
                this.bufferSource.noteOff(0);
        };

        // stop()
        Audia.prototype.stop = function () {
            if (this._paused) {
                return;
            }

            this.pause();
            this.currentTime = 0;
        };

        // addEventListener()
        Audia.prototype.addEventListener = function (eventName, callback /*, capture*/ ) {
            this._listeners[++this._listenerKey] = {
                eventName: eventName,
                callback: callback
            };
        };

        // dispatchEvent()
        Audia.prototype.dispatchEvent = function (eventName, args) {
            for (var id in this._listeners) {
                var listener = this._listeners[id];
                if (listener.eventName == eventName) {
                    listener.callback && listener.callback.apply(listener.callback, args);
                }
            }
        };

        // removeEventListener()
        Audia.prototype.removeEventListener = function (eventName, callback /*, capture*/ ) {
            // Get the id of the listener to remove
            var listenerId = null;
            for (var id in this._listeners) {
                var listener = this._listeners[id];
                if (listener.eventName === eventName) {
                    if (listener.callback === callback) {
                        listenerId = id;
                        break;
                    }
                }
            }

            // Delete the listener
            if (listenerId !== null) {
                delete this._listeners[listenerId];
            }
        };

        // Properties…

        // autoplay (Boolean)
        Object.defineProperty(Audia.prototype, "autoplay", {
            get: function () {
                return this._autoplay;
            },
            set: function (value) {
                this._autoplay = value;
            }
        });

        // buffered (TimeRanges)
        Object.defineProperty(Audia.prototype, "buffered", {
            get: function () {
                return this._buffered;
            }
        });

        // currentSrc (String)
        Object.defineProperty(Audia.prototype, "currentSrc", {
            get: function () {
                return this._currentSrc;
            }
        });

        // currentTime (Number)
        Object.defineProperty(Audia.prototype, "currentTime", {
            get: function () {
                return this._currentTime;
            },
            set: function (value) {
                this._currentTime = value;
                // TODO
                // TODO: throw errors appropriately (eg DOM error)
            }
        });

        // defaultPlaybackRate (Number) (default: 1)
        Object.defineProperty(Audia.prototype, "defaultPlaybackRate", {
            get: function () {
                return Number(this._defaultPlaybackRate);
            },
            set: function (value) {
                this._defaultPlaybackRate = value;
                // todo
            }
        });

        // duration (Number)
        Object.defineProperty(Audia.prototype, "duration", {
            get: function () {
                return this._duration;
            }
        });

        // loop (Boolean)
        Object.defineProperty(Audia.prototype, "loop", {
            get: function () {
                return this._loop;
            },
            set: function (value) {
                // TODO: buggy, needs revisit
                if (this._loop === value) {
                    return;
                }
                this._loop = value;

                if (!this.bufferSource) {
                    return;
                }

                if (this._paused) {
                    refreshBufferSource(this);
                    this.bufferSource.loop = value;
                } else {
                    this.pause();
                    refreshBufferSource(this);
                    this.bufferSource.loop = value;
                    this.play();
                }
            }
        });

        // muted (Boolean)
        Object.defineProperty(Audia.prototype, "muted", {
            get: function () {
                return this._muted;
            },
            set: function (value) {
                this._muted = value;
                this.gainNode.gain.value = value ? 0 : this._volume;
            }
        });

        // paused (Boolean)
        Object.defineProperty(Audia.prototype, "paused", {
            get: function () {
                return this._paused;
            }
        });

        // playbackRate (Number) (default: 1)
        Object.defineProperty(Audia.prototype, "playbackRate", {
            get: function () {
                return this._playbackRate;
            },
            set: function (value) {
                this._playbackRate = value;
                // todo
            }
        });

        // played (Boolean)
        Object.defineProperty(Audia.prototype, "played", {
            get: function () {
                return this._played;
            }
        });

        // preload (String)
        Object.defineProperty(Audia.prototype, "preload", {
            get: function () {
                return this._preload;
            },
            set: function (value) {
                this._preload = value;
                // TODO
            }
        });

        // seekable (Boolean)
        Object.defineProperty(Audia.prototype, "seekable", {
            get: function () {
                return this._seekable;
            }
        });

        // seeking (Boolean)
        Object.defineProperty(Audia.prototype, "seeking", {
            get: function () {
                return this._seeking;
            }
        });

        // src (String)
        Object.defineProperty(Audia.prototype, "src", {
            get: function () {
                return this._src;
            },
            set: function (value) {
                this._src = value;
                loadAudioFile(this, value);
            }
        });

        // volume (Number) (range: 0-1) (default: 1)
        Object.defineProperty(Audia.prototype, "volume", {
            get: function () {
                return this._volume;
            },
            set: function (value) {
                // Emulate Audio by throwing an error if volume is out of bounds
                if (!Audia.preventErrors) {
                    if (clamp(value, 0, 1) !== value) {
                        // TODO: throw DOM error
                    }
                }

                if (value < 0) {
                    value = 0;
                }
                this._volume = value;

                // Don't bother if we're muted!
                if (this._muted) {
                    return;
                }

                this.gainNode.gain.value = value;

                this.dispatchEvent("volumechange" /*, TODO*/ );
            }
        });

        Object.defineProperty(Audia.prototype, "onended", {
            get: function () {
                return this._onended;
            },
            set: function (value) {
                this._onended = value;
            }
        });
        Object.defineProperty(Audia.prototype, "onload", {
            get: function () {
                return this._onload;
            },
            set: function (value) {
                this._onload = value;
            }
        });
        addProperties(Audia);
        return Audia;
    };
    var setupHtml5Audio = function () {

        // Create a thin wrapper around the Audio object…

        // Constructor
        var Audia = function (src) {
            this.id = addAudiaObject(this);
            this._audioNode = new Audio();

            // Support for new Audia(src)
            if (src !== undefined) {
                this.src = src;
            }
        };

        // Methods…

        // load
        Audia.prototype.load = function (type) {
            this._audioNode.load();
        };

        // play()
        Audia.prototype.play = function (currentTime) {
            if (currentTime !== undefined) {
                this._audioNode.currentTime = currentTime;
            }
            this._audioNode.play();
        };

        // pause()
        Audia.prototype.pause = function () {
            this._audioNode.pause();
        };

        // stop()
        Audia.prototype.stop = function () {
            this._audioNode.pause();
            this._audioNode.currentTime = 0;
        };

        // addEventListener()
        Audia.prototype.addEventListener = function (eventName, callback, capture) {
            this._audioNode.addEventListener(eventName, callback, capture);
        };

        // removeEventListener()
        Audia.prototype.removeEventListener = function (eventName, callback, capture) {
            this._audioNode.removeEventListener(eventName, callback, capture);
        };

        // Properties…

        // autoplay (Boolean)
        Object.defineProperty(Audia.prototype, "autoplay", {
            get: function () {
                return this._audioNode.autoplay;
            },
            set: function (value) {
                this._audioNode.autoplay = value;
            }
        });

        // buffered (TimeRanges)
        Object.defineProperty(Audia.prototype, "buffered", {
            get: function () {
                return this._audioNode.buffered;
            }
        });

        // currentSrc (String)
        Object.defineProperty(Audia.prototype, "currentSrc", {
            get: function () {
                return this._audioNode.src;
            }
        });

        // currentTime (Number)
        Object.defineProperty(Audia.prototype, "currentTime", {
            get: function () {
                return this._audioNode.currentTime;
            },
            set: function (value) {
                this._audioNode.currentTime = value;
            }
        });

        // defaultPlaybackRate (Number) (default: 1)
        Object.defineProperty(Audia.prototype, "defaultPlaybackRate", {
            get: function () {
                return this._audioNode.defaultPlaybackRate;
            },
            set: function (value) {
                // TODO: not being used ATM
                this._audioNode.defaultPlaybackRate = value;
            }
        });

        // duration (Number)
        Object.defineProperty(Audia.prototype, "duration", {
            get: function () {
                return this._audioNode.duration;
            }
        });

        // loop (Boolean)
        Object.defineProperty(Audia.prototype, "loop", {
            get: function () {
                return this._audioNode.loop;
            },
            set: function (value) {
                // Fixes a bug in Chrome where audio will not play if currentTime
                // is at the end of the song
                if (this._audioNode.currentTime >= this._audioNode.duration) {
                    this._audioNode.currentTime = 0;
                }

                this._audioNode.loop = value;
            }
        });

        // muted (Boolean)
        Object.defineProperty(Audia.prototype, "muted", {
            get: function () {
                return this._audioNode.muted;
            },
            set: function (value) {
                this._audioNode.muted = value;
            }
        });

        // paused (Boolean)
        Object.defineProperty(Audia.prototype, "paused", {
            get: function () {
                return this._audioNode.paused;
            }
        });

        // playbackRate (Number) (default: 1)
        Object.defineProperty(Audia.prototype, "playbackRate", {
            get: function () {
                return this._audioNode.playbackRate;
            },
            set: function (value) {
                this._audioNode.playbackRate = value;
            }
        });

        // played (Boolean)
        Object.defineProperty(Audia.prototype, "played", {
            get: function () {
                return this._audioNode.played;
            }
        });

        // preload (String)
        Object.defineProperty(Audia.prototype, "preload", {
            get: function () {
                return this._audioNode.preload;
            },
            set: function (value) {
                this._audioNode.preload = value;
            }
        });

        // seekable (Boolean)
        Object.defineProperty(Audia.prototype, "seekable", {
            get: function () {
                return this._audioNode.seekable;
            }
        });

        // seeking (Boolean)
        Object.defineProperty(Audia.prototype, "seeking", {
            get: function () {
                return this._audioNode.seeking;
            }
        });

        // src (String)
        Object.defineProperty(Audia.prototype, "src", {
            get: function () {
                return this._audioNode.src;
            },
            set: function (value) {
                var self = this,
                    listener = function () {
                        if (self.onload) {
                            self.onload();
                        }
                        // clear the event listener
                        self._audioNode.removeEventListener('canplaythrough', listener, false);
                    };
                this._audioNode.src = value;
                this._audioNode.preload = "auto";
                this._audioNode.addEventListener('canplaythrough', listener, false);
                this._audioNode.addEventListener('error', function (e) {
                    console.log('audio load error', self._audioNode.error);
                }, false);
                this._audioNode.load();
            }
        });

        // volume (Number) (range: 0-1) (default: 1)
        Object.defineProperty(Audia.prototype, "volume", {
            get: function () {
                return this._audioNode.volume;
            },
            set: function (value) {
                if (Audia.preventErrors) {
                    var value = clamp(value, 0, 1);
                }
                this._audioNode.volume = value;
            }
        });
        Object.defineProperty(Audia.prototype, "onended", {
            get: function () {
                return this._audioNode.onended;
            },
            set: function (value) {
                this._audioNode.onended = value;
            }
        });

        Object.defineProperty(Audia.prototype, "onload", {
            get: function () {
                return this._audioNode.onload;
            },
            set: function (value) {
                this._audioNode.onload = value;
            }
        });

        addProperties(Audia);

        return Audia;
    };
    var addProperties = function (Audia) {
        // Prevent errors?
        Audia.preventErrors = true;

        // Public helper
        Object.defineProperty(Audia, "hasWebAudio", {
            get: function () {
                return hasWebAudio;
            }
        });

        // Audio context
        Object.defineProperty(Audia, "audioContext", {
            get: function () {
                return audioContext;
            }
        });

        // Gain node
        Object.defineProperty(Audia, "gainNode", {
            get: function () {
                return gainNode;
            }
        });

        // Version
        Object.defineProperty(Audia, "version", {
            get: function () {
                return "0.3.0";
            }
        });

        // canPlayType helper
        // Can be called with shortcuts, e.g. "mp3" instead of "audio/mp3"
        var audioNode;
        Audia.canPlayType = function (type) {
            if (hasWebAudio && Utils.isApple()) {
                // bug in iOS Safari: will not respect the mute if an audionode is instantiated
                // manual type checking: ogg not supported
                if (type.indexOf('ogg') >= 0) {
                    return false;
                } else if (type.indexOf('mp3') >= 0) {
                    return true;
                }
                return true;
            } else {
                if (audioNode === undefined) {
                    audioNode = new Audio();
                }
                type = (type.match("/") === null ? "audio/" : "") + type;
                return audioNode.canPlayType(type);
            }

        };

        // canPlayType
        Audia.prototype.canPlayType = function (type) {
            return Audia.canPlayType(type);
        };

        // Lastly, wrap all "on" properties up into the events
        var eventNames = [
            "abort",
            "canplay",
            "canplaythrough",
            "durationchange",
            "emptied",
            //"ended",
            "error",
            "loadeddata",
            "loadedmetadata",
            "loadstart",
            "pause",
            "play",
            "playing",
            "progress",
            "ratechange",
            "seeked",
            "seeking",
            "stalled",
            "suspend",
            "timeupdate",
            "volumechange"
        ];

        for (var i = 0, j = eventNames.length; i < j; ++i) {
            (function (eventName) {
                var fauxPrivateName = "_on" + eventName;
                Audia.prototype[fauxPrivateName] = null;
                Object.defineProperty(Audia.prototype, "on" + eventName, {
                    get: function () {
                        return this[fauxPrivateName];
                    },
                    set: function (value) {
                        // Remove the old listener
                        if (this[fauxPrivateName]) {
                            this.removeEventListener(eventName, this[fauxPrivateName], false);
                        }

                        // Only set functions
                        if (typeof value == "function") {
                            this[fauxPrivateName] = value;
                            this.addEventListener(eventName, value, false);
                        } else {
                            this[fauxPrivateName] = null;
                        }
                    }
                });
            })(eventNames[i]);
        }

        // get alternative constructors
        Audia.getWebAudia = setupWebAudio;
        Audia.getHtmlAudia = setupHtml5Audio;
    };

    // Which approach are we taking?…
    if (hasWebAudio) {
        AudiaConstructor = setupWebAudio();
    } else {
        AudiaConstructor = setupHtml5Audio();
    }

    return AudiaConstructor;
});

/*
BSD License, yo: http://en.wikipedia.org/wiki/BSD_licenses

Copyright yada yada 2011 Matt Hackett (http://www.richtaur.com/). All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are
permitted provided that the following conditions are met:

   1. Redistributions of source code must retain the above copyright notice, this list of
      conditions and the following disclaimer.

   2. Redistributions in binary form must reproduce the above copyright notice, this list
      of conditions and the following disclaimer in the documentation and/or other materials
      provided with the distribution.

THIS SOFTWARE IS PROVIDED "AS IS" AND ANY EXPRESS OR IMPLIED
WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE AUTHOR OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

The views and conclusions contained in the software and documentation are those of the
author(s) and should not be interpreted as representing official policies, either expressed
or implied, of the author(s).
*/
/**
 * https://github.com/pieroxy/lz-string/
 * Modifications: wrapped in Bento define
 *
 * Copyright (c) 2013 Pieroxy <pieroxy@pieroxy.net>
 * This work is free. You can redistribute it and/or modify it
 * under the terms of the WTFPL, Version 2
 * For more information see LICENSE.txt or http://www.wtfpl.net/
 *
 * For more information, the home page:
 * http://pieroxy.net/blog/pages/lz-string/testing.html
 *
 * LZ-based compression algorithm, version 1.4.4
 *
 * @module lzstring
 * @moduleName LZString
 * @returns LZString
 */
bento.define('lzstring', [], function () {
    // private property
    var f = String.fromCharCode;
    var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
    var baseReverseDic = {};

    function getBaseValue(alphabet, character) {
        if (!baseReverseDic[alphabet]) {
            baseReverseDic[alphabet] = {};
            for (var i = 0, l = alphabet.length; i < l; i++) {
                baseReverseDic[alphabet][alphabet.charAt(i)] = i;
            }
        }
        return baseReverseDic[alphabet][character];
    }

    var LZString = {
        compressToBase64: function (input) {
            if (input == null) return "";
            var res = LZString._compress(input, 6, function (a) {
                return keyStrBase64.charAt(a);
            });
            switch (res.length % 4) { // To produce valid Base64
                default: // When could this happen ?
            case 0:
                return res;
            case 1:
                return res + "===";
            case 2:
                return res + "==";
            case 3:
                return res + "=";
            }
        },

        decompressFromBase64: function (input) {
            if (input == null) return "";
            if (input == "") return null;
            return LZString._decompress(input.length, 32, function (index) {
                return getBaseValue(keyStrBase64, input.charAt(index));
            });
        },

        compressToUTF16: function (input) {
            if (input == null) return "";
            return LZString._compress(input, 15, function (a) {
                return f(a + 32);
            }) + " ";
        },

        decompressFromUTF16: function (compressed) {
            if (compressed == null) return "";
            if (compressed == "") return null;
            return LZString._decompress(compressed.length, 16384, function (index) {
                return compressed.charCodeAt(index) - 32;
            });
        },

        //compress into uint8array (UCS-2 big endian format)
        compressToUint8Array: function (uncompressed) {
            var compressed = LZString.compress(uncompressed);
            var buf = new Uint8Array(compressed.length * 2); // 2 bytes per character

            for (var i = 0, TotalLen = compressed.length; i < TotalLen; i++) {
                var current_value = compressed.charCodeAt(i);
                buf[i * 2] = current_value >>> 8;
                buf[i * 2 + 1] = current_value % 256;
            }
            return buf;
        },

        //decompress from uint8array (UCS-2 big endian format)
        decompressFromUint8Array: function (compressed) {
            if (compressed === null || compressed === undefined) {
                return LZString.decompress(compressed);
            } else {
                var buf = new Array(compressed.length / 2); // 2 bytes per character
                for (var i = 0, TotalLen = buf.length; i < TotalLen; i++) {
                    buf[i] = compressed[i * 2] * 256 + compressed[i * 2 + 1];
                }

                var result = [];
                buf.forEach(function (c) {
                    result.push(f(c));
                });
                return LZString.decompress(result.join(''));

            }

        },


        //compress into a string that is already URI encoded
        compressToEncodedURIComponent: function (input) {
            if (input == null) return "";
            return LZString._compress(input, 6, function (a) {
                return keyStrUriSafe.charAt(a);
            });
        },

        //decompress from an output of compressToEncodedURIComponent
        decompressFromEncodedURIComponent: function (input) {
            if (input == null) return "";
            if (input == "") return null;
            input = input.replace(/ /g, "+");
            return LZString._decompress(input.length, 32, function (index) {
                return getBaseValue(keyStrUriSafe, input.charAt(index));
            });
        },

        compress: function (uncompressed) {
            return LZString._compress(uncompressed, 16, function (a) {
                return f(a);
            });
        },
        _compress: function (uncompressed, bitsPerChar, getCharFromInt) {
            if (uncompressed == null) return "";
            var i, value,
                context_dictionary = {},
                context_dictionaryToCreate = {},
                context_c = "",
                context_wc = "",
                context_w = "",
                context_enlargeIn = 2, // Compensate for the first entry which should not count
                context_dictSize = 3,
                context_numBits = 2,
                context_data = [],
                context_data_val = 0,
                context_data_position = 0,
                ii, l;

            for (ii = 0, l = uncompressed.length; ii < l; ii += 1) {
                context_c = uncompressed.charAt(ii);
                if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
                    context_dictionary[context_c] = context_dictSize++;
                    context_dictionaryToCreate[context_c] = true;
                }

                context_wc = context_w + context_c;
                if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
                    context_w = context_wc;
                } else {
                    if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                        if (context_w.charCodeAt(0) < 256) {
                            for (i = 0; i < context_numBits; i++) {
                                context_data_val = (context_data_val << 1);
                                if (context_data_position == bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                            }
                            value = context_w.charCodeAt(0);
                            for (i = 0; i < 8; i++) {
                                context_data_val = (context_data_val << 1) | (value & 1);
                                if (context_data_position == bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = value >> 1;
                            }
                        } else {
                            value = 1;
                            for (i = 0; i < context_numBits; i++) {
                                context_data_val = (context_data_val << 1) | value;
                                if (context_data_position == bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = 0;
                            }
                            value = context_w.charCodeAt(0);
                            for (i = 0; i < 16; i++) {
                                context_data_val = (context_data_val << 1) | (value & 1);
                                if (context_data_position == bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = value >> 1;
                            }
                        }
                        context_enlargeIn--;
                        if (context_enlargeIn == 0) {
                            context_enlargeIn = Math.pow(2, context_numBits);
                            context_numBits++;
                        }
                        delete context_dictionaryToCreate[context_w];
                    } else {
                        value = context_dictionary[context_w];
                        for (i = 0; i < context_numBits; i++) {
                            context_data_val = (context_data_val << 1) | (value & 1);
                            if (context_data_position == bitsPerChar - 1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = value >> 1;
                        }


                    }
                    context_enlargeIn--;
                    if (context_enlargeIn == 0) {
                        context_enlargeIn = Math.pow(2, context_numBits);
                        context_numBits++;
                    }
                    // Add wc to the dictionary.
                    context_dictionary[context_wc] = context_dictSize++;
                    context_w = String(context_c);
                }
            }

            // Output the code for w.
            if (context_w !== "") {
                if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                    if (context_w.charCodeAt(0) < 256) {
                        for (i = 0; i < context_numBits; i++) {
                            context_data_val = (context_data_val << 1);
                            if (context_data_position == bitsPerChar - 1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                        }
                        value = context_w.charCodeAt(0);
                        for (i = 0; i < 8; i++) {
                            context_data_val = (context_data_val << 1) | (value & 1);
                            if (context_data_position == bitsPerChar - 1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = value >> 1;
                        }
                    } else {
                        value = 1;
                        for (i = 0; i < context_numBits; i++) {
                            context_data_val = (context_data_val << 1) | value;
                            if (context_data_position == bitsPerChar - 1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = 0;
                        }
                        value = context_w.charCodeAt(0);
                        for (i = 0; i < 16; i++) {
                            context_data_val = (context_data_val << 1) | (value & 1);
                            if (context_data_position == bitsPerChar - 1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = value >> 1;
                        }
                    }
                    context_enlargeIn--;
                    if (context_enlargeIn == 0) {
                        context_enlargeIn = Math.pow(2, context_numBits);
                        context_numBits++;
                    }
                    delete context_dictionaryToCreate[context_w];
                } else {
                    value = context_dictionary[context_w];
                    for (i = 0; i < context_numBits; i++) {
                        context_data_val = (context_data_val << 1) | (value & 1);
                        if (context_data_position == bitsPerChar - 1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position++;
                        }
                        value = value >> 1;
                    }


                }
                context_enlargeIn--;
                if (context_enlargeIn == 0) {
                    context_enlargeIn = Math.pow(2, context_numBits);
                    context_numBits++;
                }
            }

            // Mark the end of the stream
            value = 2;
            for (i = 0; i < context_numBits; i++) {
                context_data_val = (context_data_val << 1) | (value & 1);
                if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                } else {
                    context_data_position++;
                }
                value = value >> 1;
            }

            // Flush the last char
            while (true) {
                context_data_val = (context_data_val << 1);
                if (context_data_position == bitsPerChar - 1) {
                    context_data.push(getCharFromInt(context_data_val));
                    break;
                } else context_data_position++;
            }
            return context_data.join('');
        },

        decompress: function (compressed) {
            if (compressed == null) return "";
            if (compressed == "") return null;
            return LZString._decompress(compressed.length, 32768, function (index) {
                return compressed.charCodeAt(index);
            });
        },

        _decompress: function (length, resetValue, getNextValue) {
            var dictionary = [],
                next,
                enlargeIn = 4,
                dictSize = 4,
                numBits = 3,
                entry = "",
                result = [],
                i,
                w,
                bits, resb, maxpower, power,
                c,
                data = {
                    val: getNextValue(0),
                    position: resetValue,
                    index: 1
                };

            for (i = 0; i < 3; i += 1) {
                dictionary[i] = i;
            }

            bits = 0;
            maxpower = Math.pow(2, 2);
            power = 1;
            while (power != maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
            }

            switch (next = bits) {
            case 0:
                bits = 0;
                maxpower = Math.pow(2, 8);
                power = 1;
                while (power != maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position == 0) {
                        data.position = resetValue;
                        data.val = getNextValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }
                c = f(bits);
                break;
            case 1:
                bits = 0;
                maxpower = Math.pow(2, 16);
                power = 1;
                while (power != maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position == 0) {
                        data.position = resetValue;
                        data.val = getNextValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }
                c = f(bits);
                break;
            case 2:
                return "";
            }
            dictionary[3] = c;
            w = c;
            result.push(c);
            while (true) {
                if (data.index > length) {
                    return "";
                }

                bits = 0;
                maxpower = Math.pow(2, numBits);
                power = 1;
                while (power != maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position == 0) {
                        data.position = resetValue;
                        data.val = getNextValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }

                switch (c = bits) {
                case 0:
                    bits = 0;
                    maxpower = Math.pow(2, 8);
                    power = 1;
                    while (power != maxpower) {
                        resb = data.val & data.position;
                        data.position >>= 1;
                        if (data.position == 0) {
                            data.position = resetValue;
                            data.val = getNextValue(data.index++);
                        }
                        bits |= (resb > 0 ? 1 : 0) * power;
                        power <<= 1;
                    }

                    dictionary[dictSize++] = f(bits);
                    c = dictSize - 1;
                    enlargeIn--;
                    break;
                case 1:
                    bits = 0;
                    maxpower = Math.pow(2, 16);
                    power = 1;
                    while (power != maxpower) {
                        resb = data.val & data.position;
                        data.position >>= 1;
                        if (data.position == 0) {
                            data.position = resetValue;
                            data.val = getNextValue(data.index++);
                        }
                        bits |= (resb > 0 ? 1 : 0) * power;
                        power <<= 1;
                    }
                    dictionary[dictSize++] = f(bits);
                    c = dictSize - 1;
                    enlargeIn--;
                    break;
                case 2:
                    return result.join('');
                }

                if (enlargeIn == 0) {
                    enlargeIn = Math.pow(2, numBits);
                    numBits++;
                }

                if (dictionary[c]) {
                    entry = dictionary[c];
                } else {
                    if (c === dictSize) {
                        entry = w + w.charAt(0);
                    } else {
                        return null;
                    }
                }
                result.push(entry);

                // Add w+entry[0] to the dictionary.
                dictionary[dictSize++] = w + entry.charAt(0);
                enlargeIn--;

                w = entry;

                if (enlargeIn == 0) {
                    enlargeIn = Math.pow(2, numBits);
                    numBits++;
                }

            }
        }
    };
    return LZString;
});
/**
 * Component that helps with detecting clicks on an entity. The component does not detect clicks when the game is paused
 * unless entity.updateWhenPaused is turned on.
 * <br>Exports: Constructor
 * @module bento/components/clickable
 * @moduleName Clickable
 * @snippet Clickable|constructor
Clickable({
    pointerDown: function (data) {},
    pointerUp: function (data) {},
    pointerMove: function (data) {},
    // when clicking on the object
    onClick: function (data) {},
    onClickUp: function (data) {},
    onClickMiss: function (data) {},
    onHold: function (data) {},
    onHoldLeave: function (data) {},
    onHoldEnter: function (data) {},
    onHoldEnd: function (data) {},
    // desktop only
    onHoverLeave: function (data) {},
    onHoverEnter: function (data) {}
})
 * @param {Object} settings - Settings
 * @param {InputCallback} settings.pointerDown - Called when pointer (touch or mouse) is down anywhere on the screen
 * @param {InputCallback} settings.pointerUp - Called when pointer is released anywhere on the screen
 * @param {InputCallback} settings.pointerMove - Called when pointer moves anywhere on the screen
 * @param {InputCallback} settings.onClick - Called when pointer taps on the parent entity
 * @param {InputCallback} settings.onClickUp - The pointer was released above the parent entity
 * @param {InputCallback} settings.onClickMiss - Pointer down but does not touches the parent entity
 * @param {Function} settings.onHold - Called every update tick when the pointer is down on the entity
 * @param {InputCallback} settings.onHoldLeave - Called when pointer leaves the entity
 * @param {InputCallback} settings.onHoldEnter - Called when pointer enters the entity
 * @param {InputCallback} settings.onHoverEnter - Called when mouse hovers over the entity (does not work with touch)
 * @param {InputCallback} settings.onHoverLeave - Called when mouse stops hovering over the entity (does not work with touch)
 * @param {Boolean} settings.sort - Clickable callbacks are executed first if the component/entity is visually on top.
 Other clickables must also have "sort" to true. Otherwise, clickables are executed on creation order.
 * @returns Returns a component object to be attached to an entity.
 */
/**
 * Callback when input changed. The event data is an object that is passed by a source (usually the browser). 
 * The input manager injects some extra info useful for the game.
 *
 * @callback InputCallback
 * @param {Object} evt - Event data object coming from the source
 * @param {Number} evt.id - Touch id (-1 for mouse). Note that touch id can be different for each browser!
 * @param {Vector2} evt.position - position as reported by the source
 * @param {Vector2} evt.worldPosition - position in the world (includes any scrolling)
 * @param {Vector2} evt.localPosition - position relative to the parent entity
 * @param {Vector2} evt.diffPosition - Only when touch ends. Difference position between where the touch started.
 * @param {Vector2} evt.diffWorldPosition - Only when touch ends. Difference position between where the touch started.
 * @param {Vector2} evt.diffLocalPosition - Only when touch ends. Difference position between where the touch started.
 */
bento.define('bento/components/clickable', [
    'bento',
    'bento/utils',
    'bento/math/vector2',
    'bento/math/transformmatrix',
    'bento/eventsystem',
    'bento/sortedeventsystem'
], function (
    Bento,
    Utils,
    Vector2,
    Matrix,
    EventSystem,
    SortedEventSystem
) {
    'use strict';

    var clickables = [];
    var isPaused = function (entity) {
        var rootPause = 0;
        if (!Bento.objects || !entity) {
            return false;
        }
        rootPause = entity.updateWhenPaused;
        // find root parent
        while (entity.parent) {
            entity = entity.parent;
            rootPause = entity.updateWhenPaused;
        }

        return rootPause < Bento.objects.isPaused();
    };

    var isPausedComponent = function (component) {
        return component.updateWhenPaused < Bento.objects.isPaused();
    };

    var Clickable = function (settings) {
        if (!(this instanceof Clickable)) {
            return new Clickable(settings);
        }
        var nothing = null;
        this.entity = null;
        this.parent = null;
        this.rootIndex = -1;
        /**
         * Name of the component
         * @instance
         * @default 'clickable'
         * @name name
         */
        this.name = 'clickable';
        /**
         * Whether the pointer is over the entity
         * @instance
         * @default false
         * @name isHovering
         */
        this.isHovering = false;
        /**
         * Ignore the pause during pointerUp event. If false, the pointerUp event will not be called if the parent entity is paused.
         * This can have a negative side effect in some cases: the pointerUp is never called and your code might be waiting for that.
         * Just make sure you know what you are doing!
         * @instance
         * @default true
         * @name ignorePauseDuringPointerUpEvent
         */
        this.ignorePauseDuringPointerUpEvent = (settings && Utils.isDefined(settings.ignorePauseDuringPointerUpEvent)) ?
            settings.ignorePauseDuringPointerUpEvent : true;
        /**
         * Id number of the pointer holding entity
         * @instance
         * @default null
         * @name holdId
         */
        this.holdId = null;
        this.isPointerDown = false;
        this.initialized = false;
        /**
         * Should the clickable care about (z)order of objects?
         * @instance
         * @default false
         * @name sort
         */
        this.sort = settings.sort || false;
        /**
         * Clickable's updateWhenPaused check.
         * Has higher priority than the entity's updateWhenPaused if non-zero
         * @instance
         * @default false
         * @name updateWhenPaused
         */
        this.updateWhenPaused = settings.updateWhenPaused;

        this.callbacks = {
            pointerDown: settings.pointerDown || nothing,
            pointerUp: settings.pointerUp || nothing,
            pointerMove: settings.pointerMove || nothing,
            // when clicking on the object
            onClick: settings.onClick || nothing,
            onClickUp: settings.onClickUp || nothing,
            onClickMiss: settings.onClickMiss || nothing,
            onHold: settings.onHold || nothing,
            onHoldLeave: settings.onHoldLeave || nothing,
            onHoldEnter: settings.onHoldEnter || nothing,
            onHoldEnd: settings.onHoldEnd || nothing,
            onHoverLeave: settings.onHoverLeave || nothing,
            onHoverEnter: settings.onHoverEnter || nothing
        };
        /**
         * Static array that holds a reference to all currently active Clickables
         * @type {Array}
         */
        this.clickables = clickables;
    };

    Clickable.prototype.destroy = function () {
        var index = clickables.indexOf(this),
            i = 0,
            len = 0;

        if (index > -1)
            clickables[index] = null;
        // clear the array if it consists of only null's
        for (i = 0, len = clickables.length; i < len; ++i) {
            if (clickables[i])
                break;
            if (i === len - 1)
                clickables.length = 0;
        }

        if (this.sort) {
            SortedEventSystem.off('pointerDown', this.pointerDown, this);
            SortedEventSystem.off('pointerUp', this.pointerUp, this);
            SortedEventSystem.off('pointerMove', this.pointerMove, this);
        } else {
            EventSystem.off('pointerDown', this.pointerDown, this);
            EventSystem.off('pointerUp', this.pointerUp, this);
            EventSystem.off('pointerMove', this.pointerMove, this);
        }
        this.initialized = false;
    };
    Clickable.prototype.start = function () {
        if (this.initialized) {
            return;
        }

        clickables.push(this);

        if (this.sort) {
            SortedEventSystem.on(this, 'pointerDown', this.pointerDown, this);
            SortedEventSystem.on(this, 'pointerUp', this.pointerUp, this);
            SortedEventSystem.on(this, 'pointerMove', this.pointerMove, this);
        } else {
            EventSystem.on('pointerDown', this.pointerDown, this);
            EventSystem.on('pointerUp', this.pointerUp, this);
            EventSystem.on('pointerMove', this.pointerMove, this);
        }
        this.initialized = true;
    };
    Clickable.prototype.update = function () {
        if (this.isHovering && this.isPointerDown && this.callbacks.onHold) {
            this.callbacks.onHold();
        }
    };
    Clickable.prototype.cloneEvent = function (evt) {
        return {
            id: evt.id,
            position: evt.position.clone(),
            eventType: evt.eventType,
            localPosition: evt.localPosition.clone(),
            worldPosition: evt.worldPosition.clone(),
            diffPosition: evt.diffPosition ? evt.diffPosition.clone() : undefined
        };
    };
    Clickable.prototype.pointerDown = function (evt) {
        var e;
        var isInActive = this.updateWhenPaused ? isPausedComponent(this) : isPaused(this.entity);
        if (isInActive) {
            return;
        }
        e = this.transformEvent(evt);
        this.isPointerDown = true;
        if (this.callbacks.pointerDown) {
            this.callbacks.pointerDown.call(this, e);
        }
        if (this.entity.getBoundingBox) {
            this.checkHovering.call(this, e, true);
        }
    };
    Clickable.prototype.pointerUp = function (evt) {
        var e;
        var mousePosition;
        var callbacks = this.callbacks;

        // a pointer up could get missed during a pause
        var isInActive = this.updateWhenPaused ? isPausedComponent(this) : isPaused(this.entity);
        if (!this.ignorePauseDuringPointerUpEvent && isInActive) {
            return;
        }
        e = this.transformEvent(evt);
        mousePosition = e.localPosition;
        this.isPointerDown = false;
        if (callbacks.pointerUp) {
            callbacks.pointerUp.call(this, e);
        }
        // onClickUp respects isPaused
        if (this.entity.getBoundingBox().hasPosition(mousePosition) && !isInActive) {
            if (callbacks.onClickUp) {
                callbacks.onClickUp.call(this, e);
            }
            if (this.holdId === e.id) {
                if (callbacks.onHoldEnd) {
                    callbacks.onHoldEnd.call(this, e);
                }
            }
        }
        this.holdId = null;
    };
    Clickable.prototype.pointerMove = function (evt) {
        var e; // don't calculate transformed event until last moment to save cpu
        var callbacks = this.callbacks;
        var isInActive = this.updateWhenPaused ? isPausedComponent(this) : isPaused(this.entity);
        if (isInActive) {
            return;
        }
        if (callbacks.pointerMove) {
            if (!e) {
                e = this.transformEvent(evt);
            }
            callbacks.pointerMove.call(this, e);
        }
        // hovering?
        if (
            this.entity.getBoundingBox &&
            // only relevant if hover callbacks are implmented
            (callbacks.onHoldEnter || callbacks.onHoldLeave || callbacks.onHoverLeave)
        ) {
            if (!e) {
                e = this.transformEvent(evt);
            }
            this.checkHovering.call(this, e);
        }
    };
    Clickable.prototype.checkHovering = function (evt, clicked) {
        var mousePosition = evt.localPosition;
        var callbacks = this.callbacks;
        if (this.entity.getBoundingBox().hasPosition(mousePosition)) {
            if (!this.isHovering && this.holdId === evt.id) {
                if (callbacks.onHoldEnter) {
                    callbacks.onHoldEnter.call(this, evt);
                }
            }
            if (!this.isHovering && callbacks.onHoverEnter) {
                callbacks.onHoverEnter.call(this, evt);
            }
            this.isHovering = true;
            if (clicked) {
                this.holdId = evt.id;
                if (callbacks.onClick) {
                    callbacks.onClick.call(this, evt);
                }
            }
        } else {
            if (this.isHovering && this.holdId === evt.id) {
                if (callbacks.onHoldLeave) {
                    callbacks.onHoldLeave.call(this, evt);
                }
            }
            if (this.isHovering && callbacks.onHoverLeave) {
                callbacks.onHoverLeave.call(this, evt);
            }
            this.isHovering = false;
            if (clicked && callbacks.onClickMiss) {
                callbacks.onClickMiss.call(this, evt);
            }
        }
    };
    /**
     * Whether the clickable is receiving events currently. If the parent entity is paused, the clickable
     * is not active.
     * @function
     * @instance
     * @returns {Boolean} Active state
     * @name isPaused
     */
    Clickable.prototype.isPaused = function () {
        return this.updateWhenPaused ? isPausedComponent(this) : isPaused(this.entity);
    };

    Clickable.prototype.transformEvent = function (evt) {
        evt.localPosition = this.entity.toComparablePosition(evt.worldPosition);
        return evt;
    };
    Clickable.prototype.attached = function (data) {
        this.entity = data.entity;
    };
    Clickable.prototype.toString = function () {
        return '[object Clickable]';
    };

    return Clickable;
});
/**
 * Component that listens to an event fired by the EventSystem.
 * Automatically stops listening if the entity is destroyed or if the component is removed
 * <br>Exports: Constructor
 * @module bento/components/eventlistener
 * @moduleName EventListener
 * @snippet EventListener.snippet
EventListener({
    name: '${1:eventListener}',
    eventName: '${2:eventName}',
    ignorePause: ${3:false},
    onEvent: function (data) {
        $4
    }
})
 * @param {Object} settings - Settings
 * @param {String} settings.name - Component name, defaults to 'eventListener'
 * @param {String} settings.eventName - Event name to listen to
 * @param {Boolean} settings.ignorePause - Listen to events even if entity is paused
 * @param {Function} settings.onEvent - Event callback
 */
bento.define('bento/components/eventlistener', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/eventsystem',
    'bento/utils',
    'bento/tween'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    EventSystem,
    Utils,
    Tween
) {
    'use strict';
    var isPaused = function (entity) {
        var rootPause = 0;
        if (!Bento.objects || !entity) {
            return false;
        }
        rootPause = entity.updateWhenPaused;
        // find root parent
        while (entity.parent) {
            entity = entity.parent;
            rootPause = entity.updateWhenPaused;
        }

        return rootPause < Bento.objects.isPaused();
    };
    return function (settings) {
        var viewport = Bento.getViewport();
        var componentName = settings.name || 'eventListener';
        var eventName = settings.eventName;
        var ignorePause = settings.ignorePause || false;
        var onEvent = settings.callback || settings.onEvent || function () {};
        var entity;
        var component = {
            name: componentName,
            start: function (data) {
                if (!eventName) {
                    Utils.log('WARNING: eventName is not defined! Using component name as event name');
                    eventName = componentName;
                }
                EventSystem.on(eventName, ignorePause ? onEvent : wrapperCallback);
            },
            destroy: function (data) {
                EventSystem.off(eventName, ignorePause ? onEvent : wrapperCallback);
            },
            attached: function (data) {
                entity = data.entity;
            }
        };
        // this callback is used when event listener can pause
        var wrapperCallback = function (data) {
            if (!isPaused(entity)) {
                onEvent(data);
            }
        };
        return component;
    };
});
/**
 * Component that fills a square.
 * <br>Exports: Constructor
 * @module bento/components/fill
 * @moduleName Fill
 * @param {Object} settings - Settings
 * @param {Array} settings.color - Color ([1, 1, 1, 1] is pure white). Alternatively use the Color module.
 * @param {Rectangle} settings.dimension - Size to fill up (defaults to viewport size)
 * @param {Rectangle} settings.origin - Origin point
 * @param {Rectangle} settings.originRelative - Set origin with relative to the dimension
 * @returns Returns a component object to be attached to an entity.
 */
bento.define('bento/components/fill', [
    'bento/utils',
    'bento',
    'bento/math/vector2'
], function (
    Utils,
    Bento,
    Vector2
) {
    'use strict';
    var Fill = function (settings) {
        if (!(this instanceof Fill)) {
            return new Fill(settings);
        }
        var viewport = Bento.getViewport();
        settings = settings || {};
        this.parent = null;
        this.rootIndex = -1;
        this.name = 'fill';
        this.color = settings.color || [0, 0, 0, 1];
        this.dimension = settings.dimension || settings.size || settings.rectangle || viewport.getSize();
        this.origin = settings.origin || new Vector2(0, 0);
        if (settings.originRelative) {
            this.origin.x = this.dimension.width * settings.originRelative.x;
            this.origin.y = this.dimension.height * settings.originRelative.y;
        }
    };
    Fill.prototype.draw = function (data) {
        var dimension = this.dimension;
        var origin = this.origin;
        data.renderer.fillRect(
            this.color,
            dimension.x - origin.x,
            dimension.y - origin.y,
            dimension.width,
            dimension.height
        );
    };
    Fill.prototype.setOriginRelative = function (originRelative) {
        this.origin.x = this.dimension.width * originRelative.x;
        this.origin.y = this.dimension.height * originRelative.y;
    };
    Fill.prototype.toString = function () {
        return '[object Fill]';
    };

    return Fill;
});
/**
 * Component for modal popups - pauses the game on start and resets on destroy.
 * The parent entity will not be paused. Pauselevels will stack when more entities with the
 * modal component are attached to the game.
 * <br>Exports: Constructor
 * @module bento/components/modal
 * @moduleName Modal
 * @snippet Modal|constructor
Modal({})
 * @snippet Modal|target
Modal({
    pauseLevel: ${1:1}
})
 * @param {Object} settings - Settings
 * @param {String} [settings.pauseLevel] - Target pause level, recommended to ignore this parameter and
 * let the component set the automatic pause level automatically.
 */
bento.define('components/modal', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/eventsystem',
    'bento/utils',
    'bento/tween'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    EventSystem,
    Utils,
    Tween
) {
    'use strict';
    return function (settings) {
        var entity;
        var pauseLevel = settings.pauseLevel; // target pauseLevel
        var oldPauseLevel;
        var component = {
            name: 'modal',
            /*
             * Current pauseLevel
             */
            pauseLevel: 0,
            start: function (data) {
                // set pauselevel to target or current + 1
                oldPauseLevel = Bento.objects.isPaused();

                if (pauseLevel < oldPauseLevel) {
                    pauseLevel = oldPauseLevel + 1;
                    if (!settings.surpressWarnings) {
                        Utils.log('Warning: target pauseLevel (' + settings.pauseLevel +') is lower than current pause (' + oldPauseLevel + ')');
                    }
                }

                component.pauseLevel = pauseLevel || (oldPauseLevel + 1);
                Bento.objects.pause(component.pauseLevel);

                // entity ignores the pause
                entity.updateWhenPaused = component.pauseLevel;
            },
            destroy: function (data) {
                // revert pause
                if (Bento.objects.isPaused() !== component.pauseLevel) {
                    // Utils.log('WARNING: pauseLevel changed while a modal is active. Unexpected behavior might occurr');
                    return;
                }
                Bento.objects.pause(oldPauseLevel);
            },
            attached: function (data) {
                entity = data.entity;
            }
        };
        return component;
    };
});
/**
 * NineSlice component, takes an image and slices it in 9 equal parts. This image can then be stretched as a box
 * where the corners don't get deformed.
 * <br>Exports: Constructor
 * @module bento/components/nineslice
 * @moduleName NineSlice
 * @snippet NineSlice|constructor
NineSlice({
    imageName: '${1}',
    originRelative: new Vector2(${2:0.5}, ${3:0.5}),
    width: ${4:32},
    height: ${5:32}
})
 * @param {Object} settings - Settings
 * @param {String} settings.imageName - (Using image assets) Asset name for the image.
 * @param {Vector2} settings.origin - Vector2 of origin
 * @param {Vector2} settings.originRelative - Vector2 of relative origin (relative to dimension size)
 * @param {Vector2} settings.width - Width of the desired box
 * @param {Vector2} settings.height - Height of the desired box
 * @param {Number} settings.frameCountX - Number of animation frames horizontally (defaults to 1)
 * @param {Number} settings.frameCountY - Number of animation frames vertically (defaults to 1)
 * @param {Number} settings.frameWidth - Alternative for frameCountX, sets the width manually
 * @param {Number} settings.frameHeight - Alternative for frameCountY, sets the height manually
 * @param {Number} settings.paddding - Pixelsize between slices
 * @param {Number} settings.framePaddding - Pixelsize between frames
 * @param {Object} settings.animations - Only needed if an image asset) Object literal defining animations, the object literal keys are the animation names.
 * @param {Boolean} settings.animations[...].loop - Whether the animation should loop (defaults to true)
 * @param {Number} settings.animations[...].backTo - Loop back the animation to a certain frame (defaults to 0)
 * @param {Number} settings.animations[...].speed - Speed at which the animation is played. 1 is max speed (changes frame every tick). (defaults to 1)
 * @param {Array} settings.animations[...].frames - The frames that define the animation. The frames are counted starting from 0 (the top left)
 */
bento.define('bento/components/nineslice', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/eventsystem',
    'bento/utils',
    'bento/tween'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    EventSystem,
    Utils,
    Tween
) {
    'use strict';
    /**
     * Describe your settings object parameters
     * @param {Object} settings
     */
    var NineSlice = function (settings) {
        if (!(this instanceof NineSlice)) {
            return new NineSlice(settings);
        }
        this.entity = null;
        this.parent = null;
        this.rootIndex = -1;
        this.name = 'nineslice';
        this.visible = true;
        this.origin = new Vector2(0, 0);

        // component settings
        this._width = 0;
        this._height = 0;
        this._recalculateFlag = false;
        this.frameX = 0;
        this.frameY = 0;

        // sprite settings
        this.spriteImage = null;
        this.padding = 0;
        this.frameWidth = 0;
        this.frameHeight = 0;
        this.frameCountX = 1;
        this.frameCountY = 1;
        this.framePadding = 0;

        // drawing internals
        this.sliceWidth = 0;
        this.sliceHeight = 0;

        //animation setttings
        this.animations = {};
        this.currentAnimation = null;
        this.currentAnimationLength = 0;
        this.currentFrame = 0;

        this.onCompleteCallback = function () {};

        this.settings = settings;
        this.setup(settings);
    };

    NineSlice.prototype.setup = function (settings) {
        var self = this;

        if (settings.image) {
            this.spriteImage = settings.image;
        } else if (settings.imageName) {
            // load from string
            if (Bento.assets) {
                this.spriteImage = Bento.assets.getImage(settings.imageName);
            } else {
                throw 'Bento asset manager not loaded';
            }
        } else if (settings.imageFromUrl) {
            // load from url
            if (!this.spriteImage && Bento.assets) {
                Bento.assets.loadImageFromUrl(settings.imageFromUrl, settings.imageFromUrl, function (err, asset) {
                    self.spriteImage = Bento.assets.getImage(settings.imageFromUrl);
                    self.setup(settings);

                    if (settings.onLoad) {
                        settings.onLoad();
                    }
                });
                // wait until asset is loaded and then retry
                return;
            }
        } else {
            // no image specified
            return;
        }
        if (!this.spriteImage) {
            Utils.log("ERROR: something went wrong with loading the sprite.");
            return;
        }

        this.padding = settings.padding || 0;
        this.framePadding = settings.framePadding || 0;


        this.frameWidth = this.spriteImage.width;
        this.frameHeight = this.spriteImage.height;

        if (settings.frameWidth) {
            this.frameWidth = settings.frameWidth;
            this.frameCountX = Math.floor(this.spriteImage.width / settings.frameWidth);
        } else if (settings.frameCountX) {
            this.frameCountX = settings.frameCountX;
            this.frameWidth = (this.spriteImage.width - this.framePadding * (this.frameCountX - 1)) / this.frameCountX;
        }
        if (settings.frameHeight) {
            this.frameHeight = settings.frameHeight;
            this.frameCountY = Math.floor(this.spriteImage.width / settings.frameHeight);
        } else if (settings.frameCountY) {
            this.frameCountY = settings.frameCountY;
            this.frameHeight = (this.spriteImage.height - this.framePadding * (this.frameCountY - 1)) / this.frameCountY;
        }

        if (this.spriteImage) {
            this.sliceWidth = Math.floor((this.frameWidth - this.padding * 2) / 3);
            this.sliceHeight = Math.floor((this.frameHeight - this.padding * 2) / 3);
        }

        if (settings.width) {
            this._width = Math.max(settings.width || 0, 0);
        } else if (settings.innerWidth) {
            this._width = this.sliceWidth * 2 + Math.max(settings.innerWidth || 0, 0);
        }

        if (settings.height) {
            this._height = Math.max(settings.height || 0, 0);
        } else if (settings.innerHeight) {
            this._height = this.sliceHeight * 2 + Math.max(settings.innerHeight || 0, 0);
        }

        if (this.settings.origin) {
            this.origin.x = this.settings.origin.x;
            this.origin.y = this.settings.origin.y;
        } else if (this.settings.originRelative) {
            this.setOriginRelative(this.settings.originRelative);
        }

        this.animations = settings.animations || {};
        // add default animation
        if (!this.animations['default']) {
            this.animations['default'] = {
                frames: [0]
            };
        }

        if (this.entity) {
            // set dimension of entity object
            this.entity.dimension.x = -this.origin.x;
            this.entity.dimension.y = -this.origin.y;
            this.entity.dimension.width = this._width;
            this.entity.dimension.height = this._height;
        }
        this.recalculateDimensions();

        this.setAnimation('default');
    };

    NineSlice.prototype.updateEntity = function () {
        if (!this.entity) return;
        // set dimension of entity object
        this.entity.dimension.x = -this.origin.x;
        this.entity.dimension.y = -this.origin.y;
        this.entity.dimension.width = this._width;
        this.entity.dimension.height = this._height;
    };

    NineSlice.prototype.attached = function (data) {
        this.entity = data.entity;

        this.updateEntity();
    };

    NineSlice.prototype.setAnimation = function (name, callback, keepCurrentFrame) {
        var anim = this.animations[name];
        if (!anim) {
            console.log('Warning: animation ' + name + ' does not exist.');
            return;
        }

        if (anim && (this.currentAnimation !== anim || (this.onCompleteCallback !== null && Utils.isDefined(callback)))) {
            if (!Utils.isDefined(anim.loop)) {
                anim.loop = true;
            }
            if (!Utils.isDefined(anim.backTo)) {
                anim.backTo = 0;
            }
            // set even if there is no callback
            this.onCompleteCallback = callback;
            this.currentAnimation = anim;
            this.currentAnimation.name = name;
            this.currentAnimationLength = this.currentAnimation.frames.length;
            if (!keepCurrentFrame) {
                this.currentFrame = 0;
            }
            if (this.currentAnimation.backTo > this.currentAnimationLength) {
                console.log('Warning: animation ' + name + ' has a faulty backTo parameter');
                this.currentAnimation.backTo = this.currentAnimationLength;
            }
        }
    };

    NineSlice.prototype.getAnimationName = function () {
        return this.currentAnimation.name;
    };

    NineSlice.prototype.setFrame = function (frameNumber) {
        this.currentFrame = frameNumber;
    };

    NineSlice.prototype.getCurrentSpeed = function () {
        return this.currentAnimation.speed;
    };

    NineSlice.prototype.setCurrentSpeed = function (value) {
        this.currentAnimation.speed = value;
    };

    NineSlice.prototype.getCurrentFrame = function () {
        return this.currentFrame;
    };

    Object.defineProperty(NineSlice.prototype, 'width', {
        get: function () {
            return this._width;
        },
        set: function (value) {
            this._width = Math.max(value, 0);
            this._recalculateFlag = true;
        }
    });

    Object.defineProperty(NineSlice.prototype, 'height', {
        get: function () {
            return this._height;
        },
        set: function (value) {
            this._height = Math.max(value, 0);
            this._recalculateFlag = true;
        }
    });

    Object.defineProperty(NineSlice.prototype, 'innerWidth', {
        get: function () {
            return Math.max(this._width - this.sliceWidth * 2, 0);
        },
        set: function (value) {
            value -= this.sliceWidth * 2;
            this._width = this.sliceWidth * 2 + Math.max(value, 0);
            this._recalculateFlag = true;
        }
    });

    Object.defineProperty(NineSlice.prototype, 'innerHeight', {
        get: function () {
            return Math.max(this._height - this.sliceHeight * 2, 0);
        },
        set: function (value) {
            value -= this.sliceHeight * 2;
            this._height = this.sliceHeight * 2 + Math.max(value, 0);
            this._recalculateFlag = true;
        }
    });

    /**
     * Sets the origin relatively (0...1), relative to the size of the frame.
     * @function
     * @param {Vector2} origin - Position of the origin (relative to upper left corner)
     * @instance
     * @name setOriginRelative
     */
    NineSlice.prototype.setOriginRelative = function (originRelative) {
        this.origin.x = originRelative.x * this._width;
        this.origin.y = originRelative.y * this._height;
        this.settings.originRelative = originRelative.clone();
    };

    NineSlice.prototype.update = function (data) {
        var reachedEnd;

        if (this._recalculateFlag) {
            this.recalculateDimensions();
        }

        if (!this.currentAnimation) {
            return;
        }

        // no need for update
        if (this.currentAnimationLength <= 1 || this.currentAnimation.speed === 0) {
            return;
        }

        var frameSpeed = this.currentAnimation.speed || 1;
        if (this.currentAnimation.frameSpeeds && this.currentAnimation.frameSpeeds.length - 1 >= this.currentFrame) {
            frameSpeed *= this.currentAnimation.frameSpeeds[Math.floor(this.currentFrame)];
        }

        reachedEnd = false;
        this.currentFrame += (frameSpeed) * data.speed;
        if (this.currentAnimation.loop) {
            while (this.currentFrame >= this.currentAnimation.frames.length) {
                this.currentFrame -= this.currentAnimation.frames.length - this.currentAnimation.backTo;
                reachedEnd = true;
            }
        } else {
            if (this.currentFrame >= this.currentAnimation.frames.length) {
                reachedEnd = true;
            }
        }
        if (reachedEnd && this.onCompleteCallback) {
            this.onCompleteCallback();
            //don't repeat callback on non-looping animations
            if (!this.currentAnimation.loop) {
                this.onCompleteCallback = null;
            }
        }
    };

    NineSlice.prototype.recalculateDimensions = function () {
        this._innerWidth = Math.round(Math.max(0, this._width - this.sliceWidth * 2));
        this._innerHeight = Math.round(Math.max(0, this._height - this.sliceHeight * 2));

        this._leftWidth = Math.min(this.sliceWidth, this._width / 2);
        this.rightWidth = Math.min(this.sliceWidth, this._width - this._leftWidth);

        this._topHeight = Math.min(this.sliceHeight, this._height / 2);
        this._bottomHeight = Math.min(this.sliceHeight, this._height - this._topHeight);

        if (this.settings.originRelative) {
            // recalculate relative origin
            this.origin.x = this.settings.originRelative.x * this._width;
            this.origin.y = this.settings.originRelative.y * this._height;
        }

        if (this.entity) {
            this.updateEntity();
        }

        this._recalculateFlag = false;
    };

    NineSlice.prototype.fillArea = function (renderer, slice, x, y, width, height) {
        var sx = (this.sliceWidth + this.padding) * (slice % 3) + this.frameX;
        var sy = (this.sliceHeight + this.padding) * Math.floor(slice / 3) + this.frameY;

        if (width === 0 || height === 0) {
            return;
        }

        if (!width) {
            width = this.sliceWidth;
        }
        if (!height) {
            height = this.sliceHeight;
        }

        renderer.drawImage(
            this.spriteImage,
            sx,
            sy,
            this.sliceWidth,
            this.sliceHeight,
            x | 0,
            y | 0,
            width,
            height
        );
    };

    NineSlice.prototype.updateFrame = function () {
        var frameIndex = Math.min(Math.floor(this.currentFrame), this.currentAnimation.frames.length - 1);
        var sourceFrame = this.currentAnimation.frames[frameIndex];
        this.frameX = (sourceFrame % this.frameCountX) * (this.frameWidth + this.padding);
        this.frameY = Math.floor(sourceFrame / this.frameCountX) * (this.frameHeight + this.padding);
    };

    NineSlice.prototype.draw = function (data) {
        var entity = data.entity;
        var origin = this.origin;

        if (this._width === 0 || this._height === 0) {
            return;
        }

        this.updateFrame();

        data.renderer.translate(-Math.round(origin.x), -Math.round(origin.y));

        //top left corner
        this.fillArea(data.renderer, 0, 0, 0, this._leftWidth, this._topHeight);
        //top stretch
        this.fillArea(data.renderer, 1, this._leftWidth, 0, this._innerWidth, this._topHeight);
        //top right corner
        this.fillArea(data.renderer, 2, this._width - this.rightWidth, 0, this.rightWidth, this._topHeight);

        //left stretch
        this.fillArea(data.renderer, 3, 0, this._topHeight, this._leftWidth, this._innerHeight);
        //center stretch
        this.fillArea(data.renderer, 4, this._leftWidth, this._topHeight, this._innerWidth, this._innerHeight);
        //right stretch
        this.fillArea(data.renderer, 5, this._width - this.rightWidth, this._topHeight, this.rightWidth, this._innerHeight);

        //bottom left corner
        this.fillArea(data.renderer, 6, 0, this._height - this._bottomHeight, this._leftWidth, this._bottomHeight);
        //bottom stretch
        this.fillArea(data.renderer, 7, this._leftWidth, this._height - this._bottomHeight, this._innerWidth, this._bottomHeight);
        //bottom right corner
        this.fillArea(data.renderer, 8, this._width - this.rightWidth, this._height - this._bottomHeight, this.rightWidth, this._bottomHeight);

        data.renderer.translate(Math.round(origin.x), Math.round(origin.y));
    };

    // Deprecated functions, added for compatibility
    NineSlice.prototype.setWidth = function (value) {
        this.width = value;
    };
    NineSlice.prototype.setHeight = function (value) {
        this.height = value;
    };

    return NineSlice;
});
/**
 * Component that draws a Spine animation. A Spine asset must consist of a json, atlas and png with the same name. Developer must add
 [spine-canvas.js]{@link https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/3.6/spine-ts/build/spine-canvas.js} manually.
 * Note: made with canvas2d renderer in mind.
 * Note about skins: Lazy loading can be turned on with Bento.assets.lazyLoadSpine = true before the assets are loaded. This is useful if the spine
 * animations contains many skins and you want to prevent all of the skins to be preloaded. The asset manager will no longer manage the spine images.
 * Instead can call Spine.cleanLazyLoadedImages() to remove all images.
 * <br>Exports: Constructor
 * @module bento/components/spine
 * @moduleName Spine
* @snippet Spine.snippet
Spine({
    spine: '${1}',
    animation: '${2:idle}',
    scale: ${3:1},
    triangleRendering: false
})
 * @param {Object} settings - Settings
 * @param {String} settings.spine - Name of the spine asset
 * @param {String} settings.animation - Initial animation to play, defaults to 'default'
 * @param {Function} settings.onEvent - Animation state callback
 * @param {Function} settings.onComplete - Animation state callback
 * @param {Function} settings.onStart - Animation state callback
 * @param {Function} settings.onEnd - Animation state callback
 * @returns Returns a component object to be attached to an entity.
 */
bento.define('bento/components/spine', [
    'bento/utils',
    'bento',
    'bento/math/vector2'
], function (
    Utils,
    Bento,
    Vector2
) {
    'use strict';
    /**
     * Fake texture in case of lazy loading
     */
    var fakeTexture;
    var getFakeTexture = function () {
        var image;
        if (!fakeTexture) {
            image = new Image();
            fakeTexture = new window.spine.FakeTexture(image);
        }
        return fakeTexture;
    };
    var lazyLoadedImages = {};
    /**
     * Get/load the asset for the spine sprite
     */
    var loadSkeletonData = function (name, initialAnimation, listeners, skin) {
        var skeletonDataOut;
        var spineData = Bento.assets.getSpine(name);
        var skinsPerImage = spineData.skinImages;
        var spineAssetLoader = Bento.assets.getSpineLoader();
        // returns the textures for an atlas
        var textureLoader = function (path) {
            var output = spineAssetLoader.get(spineData.path + path);
            if (!output) {
                // image may not be loaded (lazyloading spine), return a fake texture for now
                output = getFakeTexture();

                // do we need the image for this skin?
                // Spine will otherwise attempt to load every image related to a TextureAtlas,
                // we made the link between skins and images during the asset loading (see managers/asset.js)
                if (skin === skinsPerImage[path]) {
                    // load correct image asap
                    lazyLoad(path);
                }
            }
            return output;
        };
        var lazyLoad = function (path) {
            // load the real texture now
            spineAssetLoader.loadTexture(
                spineData.path + path,
                function (p, img) {
                    // reload everything
                    var newData = loadSkeletonData(name, initialAnimation, listeners, skin);
                    // pass back to original data
                    skeletonDataOut.skeleton = newData.skeleton;
                    skeletonDataOut.state = newData.state;
                    skeletonDataOut.bounds = bounds.skeleton;
                    // alert the spine component that skeleton data is updated
                    if (skeletonDataOut.onReload) {
                        skeletonDataOut.onReload();
                    }

                    // save path
                    lazyLoadedImages[p] = img;
                },
                function () {
                    // error
                }
            );
        };
        // Load the texture atlas using name.atlas and name.png from the AssetManager.
        // The function passed to TextureAtlas is used to resolve relative paths.
        var atlas = new window.spine.TextureAtlas(spineData.atlas, textureLoader);

        // Create a AtlasAttachmentLoader, which is specific to the WebGL backend.
        var atlasLoader = new window.spine.AtlasAttachmentLoader(atlas);

        // Create a SkeletonJson instance for parsing the .json file.
        var skeletonJson = new window.spine.SkeletonJson(atlasLoader);

        // Set the scale to apply during parsing, parse the file, and create a new skeleton.
        var skeletonData = skeletonJson.readSkeletonData(spineData.skeleton);
        var skeleton = new window.spine.Skeleton(skeletonData);
        skeleton.flipY = true;
        var bounds = calculateBounds(skeleton);
        skeleton.setSkinByName(skin);

        // Create an AnimationState, and set the initial animation in looping mode.
        var animationState = new window.spine.AnimationState(new window.spine.AnimationStateData(skeleton.data));
        animationState.setAnimation(0, initialAnimation, true);
        animationState.addListener({
            event: listeners.onEvent || function (trackIndex, event) {
                // console.log("Event on track " + trackIndex + ": " + JSON.stringify(event));
            },
            complete: listeners.onComplete || function (trackIndex, loopCount) {
                // console.log("Animation on track " + trackIndex + " completed, loop count: " + loopCount);
            },
            start: listeners.onStart || function (trackIndex) {
                // console.log("Animation on track " + trackIndex + " started");
            },
            end: listeners.onEnd || function (trackIndex) {
                // console.log("Animation on track " + trackIndex + " ended");
            }
        });

        // Pack everything up and return to caller.
        skeletonDataOut = {
            skeleton: skeleton,
            state: animationState,
            bounds: bounds,
            onReload: null
        };
        return skeletonDataOut;
    };
    var calculateBounds = function (skeleton) {
        var data = skeleton.data;
        skeleton.setToSetupPose();
        skeleton.updateWorldTransform();
        var offset = new window.spine.Vector2();
        var size = new window.spine.Vector2();
        skeleton.getBounds(offset, size, []);
        return {
            offset: offset,
            size: size
        };
    };
    var skeletonRenderer;
    var debugRendering = false;

    var Spine = function (settings) {
        var name = settings.name || 'spine';
        var spineName = settings.spineName || settings.spine;
        var skin = settings.skin || 'default';
        var currentAnimation = settings.animation || 'default';
        var isLooping = true;
        // animation state listeners
        var onEvent = settings.onEvent;
        var onComplete = settings.onComplete;
        var onStart = settings.onStart;
        var onEnd = settings.onEnd;
        // enable the triangle renderer, supports meshes, but may produce artifacts in some browsers
        var useTriangleRendering = settings.triangleRendering || false;
        var skeletonData;
        var skeleton, state, bounds;
        var currentAnimationSpeed = 1;
        var entity;
        // todo: investigate internal scaling
        var scale = settings.scale || 1;
        var component = {
            name: name,
            start: function (data) {
                // load the skeleton data if that's not been done yet
                if (!skeletonData) {
                    skeletonData = loadSkeletonData(spineName, currentAnimation, {
                        onEvent: onEvent,
                        onComplete: function (trackIndex, loopCount) {
                            if (onComplete) {
                                onComplete(trackIndex, loopCount);
                            }
                        },
                        onStart: onStart,
                        onEnd: onEnd
                    }, skin);
                    skeleton = skeletonData.skeleton;
                    state = skeletonData.state;
                    bounds = skeletonData.bounds;

                    // anticipate lazy load
                    skeletonData.onReload = function () {
                        // rebind data
                        skeleton = skeletonData.skeleton;
                        state = skeletonData.state;
                        bounds = skeletonData.bounds;
                        // apply previous state
                        state.setAnimation(0, currentAnimation, isLooping);
                        state.apply(skeleton);
                    };
                }
                // initialize skeleton renderer
                if (!skeletonRenderer) {
                    skeletonRenderer = new window.spine.canvas.SkeletonRenderer(data.renderer.getContext());
                    skeletonRenderer.debugRendering = debugRendering;
                }
                updateEntity();

                if (!Utils.isNumber(scale)) {
                    Utils.log('ERROR: scale must be a number');
                    scale = 1;
                }
            },
            destroy: function (data) {},
            update: function (data) {
                state.update(data.deltaT / 1000 * data.speed * currentAnimationSpeed);
                state.apply(skeleton);
            },
            draw: function (data) {
                // todo: investigate scaling
                data.renderer.scale(scale, scale);
                skeleton.updateWorldTransform();
                skeletonRenderer.triangleRendering = useTriangleRendering;
                skeletonRenderer.draw(skeleton);
                data.renderer.scale(1 / scale, 1 / scale);
            },
            attached: function (data) {
                entity = data.entity;
            },
            /**
             * Set animation
             * @function
             * @instance
             * @param {String} name - Name of animation
             * @param {Function} [callback] - Callback on complete, will overwrite onEnd if set
             * @param {Boolean} [loop] - Loop animation
             * @name setAnimation
             * @snippet #Spine.setAnimation|snippet
                setAnimation('$1');
             * @snippet #Spine.setAnimation|callback
                setAnimation('$1', function () {
                    $2
                });
             */
            setAnimation: function (name, callback, loop) {
                if (currentAnimation === name) {
                    // already playing
                    return;
                }
                // update current animation
                currentAnimation = name;
                // reset speed
                currentAnimationSpeed = 1;
                isLooping = Utils.getDefault(loop, true);
                // apply animation
                state.setAnimation(0, name, isLooping);
                // set callback, even if undefined
                onComplete = callback;
                // apply the skeleton to avoid visual delay
                state.apply(skeleton);
            },
            /**
             * Get current animation name
             * @function
             * @instance
             * @name getAnimation
             * @snippet #Spine.getAnimation|String
                getAnimation();
             * @returns {String} Returns name of current animation.
             */
            getAnimationName: function () {
                return currentAnimation;
            },
            /**
             * Get speed of the current animation, relative to Spine's speed
             * @function
             * @instance
             * @returns {Number} Speed of the current animation
             * @name getCurrentSpeed
             * @snippet #Spine.getCurrentSpeed|Number
                getCurrentSpeed();
             */
            getCurrentSpeed: function () {
                return currentAnimationSpeed;
            },
            /**
             * Set speed of the current animation.
             * @function
             * @instance
             * @param {Number} speed - Speed at which the animation plays.
             * @name setCurrentSpeed
             * @snippet #Spine.setCurrentSpeed|snippet
                setCurrentSpeed(${1:number});
             */
            setCurrentSpeed: function (value) {
                currentAnimationSpeed = value;
            },
            /**
             * Exposes Spine skeleton data and animation state variables for manual manipulation
             * @function
             * @instance
             * @name getSpineData
             * @snippet #Spine.getSpineData|snippet
                getSpineData();
             */
            getSpineData: function () {
                return {
                    skeletonData: skeleton,
                    animationState: state
                };
            }
        };
        var updateEntity = function () {
            if (!entity) {
                return;
            }

            entity.dimension.x = bounds.offset.x * scale;
            entity.dimension.y = bounds.offset.y * scale;
            entity.dimension.width = bounds.size.x * scale;
            entity.dimension.height = bounds.size.y * scale;
        };
        return component;
    };

    Spine.setDebugRendering = function (bool) {
        if (skeletonRenderer) {
            skeletonRenderer.debugRendering = bool;
        }
    };

    Spine.cleanLazyLoadedImages = function () {
        // clearing up memory
        // don't call this during update loops! 
        // no spine components should be alive when this is called, because all references will be invalid
        var spineAssetLoader = Bento.assets.getSpineLoader();
        Utils.forEach(lazyLoadedImages, function (image, imagePath, l, breakLoop) {
            try {
                spineAssetLoader.remove(imagePath);
            } catch (e) {
                Utils.log(e);
            }

            if (image.dispose) {
                // alternatively we could not call dispose and let the garbage collector do its work
                image.dispose();
            }
        });
        lazyLoadedImages = [];
    };

    return Spine;
});
/**
 * Sprite component. Draws an animated sprite on screen at the entity's transform.
 * <br>Exports: Constructor
 * @module bento/components/sprite
 * @moduleName Sprite
 * @snippet Sprite|spriteSheet
Sprite({
    spriteSheet: '${1}'
})
 * @snippet Sprite|imageName
Sprite({
    imageName: '${1}',
    originRelative: new Vector2(${2:0.5}, ${3:0.5}),
    frameCountX: ${4:1},
    frameCountY: ${5:1},
    animations: {
        default: {
            speed: 0,
            frames: [0]
        }
    }
})
 * @param {Object} settings - Settings
 * @param {String} settings.name - Overwites the component name (default is "sprite")
 * @param {String} settings.spriteSheet - (Using spritesheet assets) Asset name for the spriteSheet asset. If one uses spritesheet assets, this is the only parameter that is needed.
 * @param {String} settings.imageName - (Using image assets) Asset name for the image.
 * @param {Number} settings.frameCountX - Number of animation frames horizontally (defaults to 1)
 * @param {Number} settings.frameCountY - Number of animation frames vertically (defaults to 1)
 * @param {Number} settings.frameWidth - Alternative for frameCountX, sets the width manually
 * @param {Number} settings.frameHeight - Alternative for frameCountY, sets the height manually
 * @param {Number} settings.paddding - Pixelsize between frames
 * @param {Vector2} settings.origin - Vector2 of origin
 * @param {Vector2} settings.originRelative - Vector2 of relative origin (relative to dimension size)
 * @param {Object} settings.animations - Only needed if an image asset) Object literal defining animations, the object literal keys are the animation names.
 * @param {Boolean} settings.animations[...].loop - Whether the animation should loop (defaults to true)
 * @param {Number} settings.animations[...].backTo - Loop back the animation to a certain frame (defaults to 0)
 * @param {Number} settings.animations[...].speed - Speed at which the animation is played. 1 is max speed (changes frame every tick). (defaults to 1)
 * @param {Array} settings.animations[...].frames - The frames that define the animation. The frames are counted starting from 0 (the top left)
 * @example
// Defines a 3 x 3 spritesheet with several animations
// Note: The default is automatically defined if no animations object is passed
var sprite = new Sprite({
        imageName: "mySpriteSheet",
        frameCountX: 3,
        frameCountY: 3,
        animations: {
            "default": {
                frames: [0]
            },
            "walk": {
                speed: 0.2,
                frames: [1, 2, 3, 4, 5, 6]
            },
            "jump": {
                speed: 0.2,
                frames: [7, 8]
            }
        }
     }),
    entity = new Entity({
        components: [sprite] // attach sprite to entity
                             // alternative to passing a components array is by calling entity.attach(sprite);
    });

// attach entity to game
Bento.objects.attach(entity);
 * @returns Returns a component object to be attached to an entity.
 */
bento.define('bento/components/sprite', [
    'bento',
    'bento/utils',
    'bento/math/vector2'
], function (
    Bento,
    Utils,
    Vector2
) {
    'use strict';
    var Sprite = function (settings) {
        if (!(this instanceof Sprite)) {
            return new Sprite(settings);
        }
        this.entity = null;
        this.name = settings.name || 'sprite';
        this.visible = true;
        this.parent = null;
        this.rootIndex = -1;

        this.animationSettings = settings || {
            frameCountX: 1,
            frameCountY: 1
        };

        // sprite settings
        this.spriteImage = null;
        this.frameCountX = 1;
        this.frameCountY = 1;
        this.frameWidth = 0;
        this.frameHeight = 0;
        this.padding = 0;
        this.origin = new Vector2(0, 0);

        // keep a reference to the spritesheet name
        this.currentSpriteSheet = '';

        // drawing internals
        this.sourceX = 0;
        this.sourceY = 0;

        // set to default
        this.animations = {};
        this.currentAnimation = null;
        this.currentAnimationLength = 0;
        this.currentFrame = 0;

        this.onCompleteCallback = function () {};
        this.setup(settings);
    };
    /**
     * Sets up Sprite. This can be used to overwrite the settings object passed to the constructor.
     * @function
     * @instance
     * @param {Object} settings - Settings object
     * @name setup
     * @snippet #Sprite.setup|spriteSheet
setup({
    spriteSheet: '${1}'
});
     * @snippet #Sprite.setup|imageName
setup({
    imageName: '${1}',
    originRelative: new Vector2(${2:0.5}, ${3:0.5}),
    frameCountX: ${4:1},
    frameCountY: ${5:1},
    animations: {
        default: {
            speed: 0,
            frames: [0]
        }
    }
});
     */
    Sprite.prototype.setup = function (settings) {
        var self = this,
            padding = 0,
            spriteSheet;

        if (settings && settings.spriteSheet) {
            //load settings from animation JSON, and set the correct image
            spriteSheet = Bento.assets.getSpriteSheet(settings.spriteSheet);

            // remember the spritesheet name
            this.currentSpriteSheet = settings.spriteSheet;

            // settings is overwritten
            settings = Utils.copyObject(spriteSheet.animation);
            settings.image = spriteSheet.image;
            if (settings.animation) {
                settings.animations = {
                    default: settings.animation
                };
            }
        }

        this.animationSettings = settings || this.animationSettings;
        padding = this.animationSettings.padding || 0;

        // add default animation
        if (!this.animations['default']) {
            if (!this.animationSettings.animations) {
                this.animationSettings.animations = {};
            }
            if (!this.animationSettings.animations['default']) {
                this.animationSettings.animations['default'] = {
                    frames: [0]
                };
            }
        }

        // get image
        if (settings.image) {
            this.spriteImage = settings.image;
        } else if (settings.imageName) {
            // load from string
            if (Bento.assets) {
                this.spriteImage = Bento.assets.getImage(settings.imageName);
            } else {
                throw 'Bento asset manager not loaded';
            }
        } else if (settings.imageFromUrl) {
            // load from url
            if (!this.spriteImage && Bento.assets) {
                Bento.assets.loadImageFromUrl(settings.imageFromUrl, settings.imageFromUrl, function (err, asset) {
                    self.spriteImage = Bento.assets.getImage(settings.imageFromUrl);
                    self.setup(settings);

                    if (settings.onLoad) {
                        settings.onLoad();
                    }
                });
                // wait until asset is loaded and then retry
                return;
            }
        } else {
            // no image specified
            return;
        }
        if (!this.spriteImage) {
            Utils.log("ERROR: something went wrong with loading the sprite.");
            return;
        }
        // use frameWidth if specified (overrides frameCountX and frameCountY)
        if (this.animationSettings.frameWidth) {
            this.frameWidth = this.animationSettings.frameWidth;
            this.frameCountX = Math.floor(this.spriteImage.width / this.frameWidth);
        } else {
            this.frameCountX = this.animationSettings.frameCountX || 1;
            this.frameWidth = (this.spriteImage.width - padding * (this.frameCountX - 1)) / this.frameCountX;
        }
        if (this.animationSettings.frameHeight) {
            this.frameHeight = this.animationSettings.frameHeight;
            this.frameCountY = Math.floor(this.spriteImage.height / this.frameHeight);
        } else {
            this.frameCountY = this.animationSettings.frameCountY || 1;
            this.frameHeight = (this.spriteImage.height - padding * (this.frameCountY - 1)) / this.frameCountY;
        }

        this.padding = this.animationSettings.padding || 0;

        if (this.animationSettings.origin) {
            this.origin.x = this.animationSettings.origin.x;
            this.origin.y = this.animationSettings.origin.y;
        } else if (this.animationSettings.originRelative) {
            this.setOriginRelative(this.animationSettings.originRelative);
        }

        // set default
        Utils.extend(this.animations, this.animationSettings.animations, true);
        this.setAnimation('default');

        this.updateEntity();
    };

    Sprite.prototype.updateEntity = function () {
        if (!this.entity) {
            return;
        }

        this.entity.dimension.x = -this.origin.x;
        this.entity.dimension.y = -this.origin.y;
        this.entity.dimension.width = this.frameWidth;
        this.entity.dimension.height = this.frameHeight;
    };

    Sprite.prototype.attached = function (data) {
        var animation,
            animations = this.animationSettings.animations,
            i = 0,
            len = 0,
            highestFrame = 0;

        this.entity = data.entity;
        // set dimension of entity object
        this.updateEntity();

        // check if the frames of animation go out of bounds
        for (animation in animations) {
            for (i = 0, len = animations[animation].frames.length; i < len; ++i) {
                if (animations[animation].frames[i] > highestFrame) {
                    highestFrame = animations[animation].frames[i];
                }
            }
            if (!Sprite.suppressWarnings && highestFrame > this.frameCountX * this.frameCountY - 1) {
                console.log("Warning: the frames in animation " + animation + " of " + (this.entity.name || this.entity.settings.name) + " are out of bounds. Can't use frame " + highestFrame + ".");
            }

        }
    };
    /**
     * Set component to a different animation. The animation won't change if it's already playing.
     * @function
     * @instance
     * @param {String} name - Name of the animation.
     * @param {Function} callback - Called when animation ends.
     * @param {Boolean} keepCurrentFrame - Prevents animation to jump back to frame 0
     * @name setAnimation
     * @snippet #Sprite.setAnimation|snippet
setAnimation('${1:name}');
     * @snippet #Sprite.setAnimation|callback
setAnimation('${1:name}', function () {
    $2
});
     */
    Sprite.prototype.setAnimation = function (name, callback, keepCurrentFrame) {
        var anim = this.animations[name];
        if (!Sprite.suppressWarnings && !anim) {
            console.log('Warning: animation ' + name + ' does not exist.');
            return;
        }
        if (anim && (this.currentAnimation !== anim || (this.onCompleteCallback !== null && Utils.isDefined(callback)))) {
            if (!Utils.isDefined(anim.loop)) {
                anim.loop = true;
            }
            if (!Utils.isDefined(anim.backTo)) {
                anim.backTo = 0;
            }
            // set even if there is no callback
            this.onCompleteCallback = callback;
            this.currentAnimation = anim;
            this.currentAnimation.name = name;
            this.currentAnimationLength = this.currentAnimation.frames.length;
            if (!keepCurrentFrame) {
                this.currentFrame = 0;
            }
            if (!Sprite.suppressWarnings && this.currentAnimation.backTo > this.currentAnimationLength) {
                console.log('Warning: animation ' + name + ' has a faulty backTo parameter');
                this.currentAnimation.backTo = this.currentAnimationLength;
            }
        }
    };
    /**
     * Bind another spritesheet to this sprite. The spritesheet won't change if it's already playing
     * @function
     * @instance
     * @param {String} name - Name of the spritesheet.
     * @param {Function} callback - Called when animation ends.
     * @name setAnimation
     * @snippet #Sprite.setSpriteSheet|snippet
setSpriteSheet('${1:name}');
     * @snippet #Sprite.setSpriteSheet|callback
setSpriteSheet('${1:name}', function () {
    $2
});
     */
    Sprite.prototype.setSpriteSheet = function (name, callback) {
        if (this.currentSpriteSheet === name) {
            // already playing
            return;
        }
        this.setup({
            spriteSheet: name
        });

        this.onCompleteCallback = callback;
    };
    /**
     * Returns the name of current animation playing
     * @function
     * @instance
     * @returns {String} Name of the animation playing, null if not playing anything
     * @name getAnimationName
     * @snippet #Sprite.getAnimationName|String
getAnimationName();
     */
    Sprite.prototype.getAnimationName = function () {
        return this.currentAnimation.name;
    };
    /**
     * Set current animation to a certain frame
     * @function
     * @instance
     * @param {Number} frameNumber - Frame number.
     * @name setFrame
     * @snippet #Sprite.getAnimationName|snippet
setFrame(${1:number});
     */
    Sprite.prototype.setFrame = function (frameNumber) {
        this.currentFrame = frameNumber;
    };
    /**
     * Get speed of the current animation.
     * @function
     * @instance
     * @returns {Number} Speed of the current animation
     * @name getCurrentSpeed
     * @snippet #Sprite.getCurrentSpeed|Number
getCurrentSpeed();
     */
    Sprite.prototype.getCurrentSpeed = function () {
        return this.currentAnimation.speed;
    };
    /**
     * Set speed of the current animation.
     * @function
     * @instance
     * @param {Number} speed - Speed at which the animation plays.
     * @name setCurrentSpeed
     * @snippet #Sprite.setCurrentSpeed|snippet
setCurrentSpeed(${1:number});
     */
    Sprite.prototype.setCurrentSpeed = function (value) {
        this.currentAnimation.speed = value;
    };
    /**
     * Returns the current frame number
     * @function
     * @instance
     * @returns {Number} frameNumber - Not necessarily a round number.
     * @name getCurrentFrame
     * @snippet #Sprite.getCurrentFrame|Number
getCurrentFrame();
     */
    Sprite.prototype.getCurrentFrame = function () {
        return this.currentFrame;
    };
    /**
     * Returns the frame width
     * @function
     * @instance
     * @returns {Number} width - Width of the image frame.
     * @name getFrameWidth
     * @snippet #Sprite.getFrameWidth|Number
getFrameWidth();
     */
    Sprite.prototype.getFrameWidth = function () {
        return this.frameWidth;
    };
    /**
     * Returns the frame height
     * @function
     * @instance
     * @returns {Number} height - Height of the image frame.
     * @name getFrameHeight
     * @snippet #Sprite.getFrameHeight|Number
getFrameHeight();
     */
    Sprite.prototype.getFrameHeight = function () {
        return this.frameHeight;
    };
    /**
     * Sets the origin relatively (0...1), relative to the size of the frame.
     * @function
     * @param {Vector2} origin - Position of the origin (relative to upper left corner)
     * @instance
     * @name setOriginRelative
     * @snippet #Sprite.setOriginRelative|snippet
setOriginRelative(new Vector2(${1:0}, ${2:0}));
     */
    Sprite.prototype.setOriginRelative = function (originRelative) {
        this.origin.x = originRelative.x * this.frameWidth;
        this.origin.y = originRelative.y * this.frameHeight;
    };
    Sprite.prototype.update = function (data) {
        var reachedEnd;
        if (!this.currentAnimation) {
            return;
        }

        // no need for update
        if (this.currentAnimationLength <= 1 || this.currentAnimation.speed === 0) {
            return;
        }

        var frameSpeed = this.currentAnimation.speed || 1;
        if (this.currentAnimation.frameSpeeds && this.currentAnimation.frameSpeeds.length >= this.currentFrame) {
            frameSpeed *= this.currentAnimation.frameSpeeds[Math.floor(this.currentFrame)];
        }

        reachedEnd = false;
        this.currentFrame += (frameSpeed) * data.speed;
        if (this.currentAnimation.loop) {
            while (this.currentFrame >= this.currentAnimation.frames.length) {
                this.currentFrame -= this.currentAnimation.frames.length - this.currentAnimation.backTo;
                reachedEnd = true;
            }
        } else {
            if (this.currentFrame >= this.currentAnimation.frames.length) {
                reachedEnd = true;
            }
        }
        if (reachedEnd && this.onCompleteCallback) {
            this.onCompleteCallback();
            //don't repeat callback on non-looping animations
            if (!this.currentAnimation.loop) {
                this.onCompleteCallback = null;
            }
        }
    };

    Sprite.prototype.updateFrame = function () {
        var frameIndex = Math.min(Math.floor(this.currentFrame), this.currentAnimation.frames.length - 1);
        var sourceFrame = this.currentAnimation.frames[frameIndex];
        this.sourceX = (sourceFrame % this.frameCountX) * (this.frameWidth + this.padding);
        this.sourceY = Math.floor(sourceFrame / this.frameCountX) * (this.frameHeight + this.padding);
    };

    Sprite.prototype.draw = function (data) {
        var entity = data.entity;

        if (!this.currentAnimation || !this.visible) {
            return;
        }

        this.updateFrame();

        data.renderer.drawImage(
            this.spriteImage,
            this.sourceX,
            this.sourceY,
            this.frameWidth,
            this.frameHeight,
            (-this.origin.x) | 0,
            (-this.origin.y) | 0,
            this.frameWidth,
            this.frameHeight
        );
    };
    Sprite.prototype.toString = function () {
        return '[object Sprite]';
    };

    /**
     * Ignore warnings about invalid animation frames
     * @instance
     * @static
     * @name suppressWarnings
     */
    Sprite.suppressWarnings = false;

    return Sprite;
});
/**
 * @license RequireJS domReady 2.0.1 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/domReady for details
 */
/*jslint*/
/*global require: false, define: false, requirejs: false,
  window: false, clearInterval: false, document: false,
  self: false, setInterval: false */


bento.define('bento/lib/domready', [], function () {
    'use strict';

    var isTop, testDiv, scrollIntervalId,
        isBrowser = typeof window !== "undefined" && window.document,
        isPageLoaded = !isBrowser,
        doc = isBrowser ? document : null,
        readyCalls = [];

    function runCallbacks(callbacks) {
        var i;
        for (i = 0; i < callbacks.length; i += 1) {
            callbacks[i](doc);
        }
    }

    function callReady() {
        var callbacks = readyCalls;

        if (isPageLoaded) {
            //Call the DOM ready callbacks
            if (callbacks.length) {
                readyCalls = [];
                runCallbacks(callbacks);
            }
        }
    }

    /**
     * Sets the page as loaded.
     */
    function pageLoaded() {
        if (!isPageLoaded) {
            isPageLoaded = true;
            if (scrollIntervalId) {
                clearInterval(scrollIntervalId);
            }

            callReady();
        }
    }

    if (isBrowser) {
        if (document.addEventListener) {
            //Standards. Hooray! Assumption here that if standards based,
            //it knows about DOMContentLoaded.
            document.addEventListener("DOMContentLoaded", pageLoaded, false);
            window.addEventListener("load", pageLoaded, false);
        } else if (window.attachEvent) {
            window.attachEvent("onload", pageLoaded);

            testDiv = document.createElement('div');
            try {
                isTop = window.frameElement === null;
            } catch (e) {}

            //DOMContentLoaded approximation that uses a doScroll, as found by
            //Diego Perini: http://javascript.nwbox.com/IEContentLoaded/,
            //but modified by other contributors, including jdalton
            if (testDiv.doScroll && isTop && window.external) {
                scrollIntervalId = setInterval(function () {
                    try {
                        testDiv.doScroll();
                        pageLoaded();
                    } catch (e) {}
                }, 30);
            }
        }

        //Check if document already complete, and if so, just trigger page load
        //listeners. Latest webkit browsers also use "interactive", and
        //will fire the onDOMContentLoaded before "interactive" but not after
        //entering "interactive" or "complete". More details:
        //http://dev.w3.org/html5/spec/the-end.html#the-end
        //http://stackoverflow.com/questions/3665561/document-readystate-of-interactive-vs-ondomcontentloaded
        //Hmm, this is more complicated on further use, see "firing too early"
        //bug: https://github.com/requirejs/domReady/issues/1
        //so removing the || document.readyState === "interactive" test.
        //There is still a window.onload binding that should get fired if
        //DOMContentLoaded is missed.
        if (document.readyState === "complete") {
            pageLoaded();
        }
    }

    /** START OF PUBLIC API **/

    /**
     * Registers a callback for DOM ready. If DOM is already ready, the
     * callback is called immediately.
     * @param {Function} callback
     */
    function domReady(callback) {
        if (isPageLoaded) {
            callback(doc);
        } else {
            readyCalls.push(callback);
        }
        return domReady;
    }

    domReady.version = '2.0.1';

    /**
     * Loader Plugin API method
     */
    domReady.load = function (name, req, onLoad, config) {
        if (config.isBuild) {
            onLoad(null);
        } else {
            domReady(onLoad);
        }
    };

    /** END OF PUBLIC API **/

    return domReady;
});

// http://www.makeitgo.ws/articles/animationframe/
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
bento.define('bento/lib/requestanimationframe', [], function () {
    'use strict';

    var lastTime = 0,
        vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function (callback, element) {
            var currTime = new Date().getTime(),
                timeToCall = Math.max(0, 16 - (currTime - lastTime)),
                id = window.setTimeout(function () {
                    callback(currTime + timeToCall);
                }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
    return window.requestAnimationFrame;
});
/**
 * Manager that loads and controls assets. Can be accessed through Bento.assets namespace.
 * Assets MUST be loaded through assetGroups (for now). An assetgroup is a json file that indicates which
 * assets to load, and where to find them.
 * <br>Exports: Constructor, can be accessed through Bento.assets namespace
 * @module bento/managers/asset
 * @moduleName AssetManager
 * @returns AssetManager
 */
bento.define('bento/managers/asset', [
    'bento/packedimage',
    'bento/utils',
    'audia',
    'lzstring'
], function (
    PackedImage,
    Utils,
    Audia,
    LZString
) {
    'use strict';
    return function () {
        var assetGroups = {};
        var loadedGroups = {};
        var path = '';
        var assets = {
            audio: {},
            json: {},
            images: {},
            binary: {},
            fonts: {},
            spritesheets: {},
            texturePacker: {},
            spine: {},

            // packed
            'packed-images': {},
            'packed-spritesheets': {},
            'packed-json': {}
        };
        var spineAssetLoader;
        var tempSpineImage;
        /**
         * (Down)Load asset types
         */
        var loadAudio = function (name, source, callback) {
            var i, l;
            var failed = true;
            var loadAudioFile = function (index, src) {
                var audio = new Audia();
                var canPlay = audio.canPlayType('audio/' + source[index].slice(-3));
                if (!!canPlay || window.ejecta) {
                    // success!
                    if (!manager.skipAudioCallback) {
                        audio.onload = function () {
                            callback(null, name, audio);
                        };
                    } else {
                        // callback immediately
                        window.setTimeout(function () {
                            callback(null, name, audio);
                        }, 0);
                    }
                    audio.src = src;
                    failed = false;
                    return true;
                }
                return false;
            };
            if (!Utils.isArray(source)) {
                // source = [path + 'audio/' + source];
                source = [source];
            }
            // try every type
            for (i = 0, l = source.length; i < l; ++i) {
                if (loadAudioFile(i, path + 'audio/' + source[i])) {
                    break;
                }
            }
            if (failed) {
                callback('This audio type is not supported:', name, source);
            }
        };
        var loadJSON = function (name, source, callback, isCompressed) {
            var xhr = new window.XMLHttpRequest();
            if (xhr.overrideMimeType) {
                xhr.overrideMimeType('application/json');
            }

            xhr.open('GET', source, true);
            xhr.onerror = function () {
                callback('Error: loading JSON ' + source);
            };
            xhr.ontimeout = function () {
                callback('Timeout: loading JSON ' + source);
            };
            xhr.onreadystatechange = function () {
                var jsonData;
                var response;
                if (xhr.readyState === 4) {
                    if ((xhr.status === 304) || (xhr.status === 200) || ((xhr.status === 0) && xhr.responseText)) {
                        try {
                            response = xhr.responseText;
                            // read header
                            if (response[0] === 'L' && response[1] === 'Z' && response[2] === 'S') {
                                isCompressed = true;
                                // trim header
                                response = response.substring(3);
                            }

                            if (isCompressed) {
                                // decompress if needed
                                jsonData = JSON.parse(LZString.decompressFromBase64(response));
                            } else {
                                jsonData = JSON.parse(response);
                            }
                        } catch (e) {
                            console.log('WARNING: Could not parse JSON ' + name + ' at ' + source + ': ' + e);
                            console.log('Trying to parse', response);
                            jsonData = xhr.responseText;
                        }
                        callback(null, name, jsonData);
                    } else {
                        callback('Error: State ' + xhr.readyState + ' ' + source);
                    }
                }
            };
            xhr.send(null);
        };
        var loadJsonCompressed = function (name, source, callback) {
            return loadJSON(name, source, callback, true);
        };
        var loadBinary = function (name, source, success, failure) {
            var xhr = new window.XMLHttpRequest();
            var arrayBuffer;
            var byteArray;
            var buffer;
            var i = 0;

            xhr.open('GET', source, true);
            xhr.onerror = function () {
                failure('ERROR: loading binary ' + source);
            };
            xhr.responseType = 'arraybuffer';
            xhr.onload = function (e) {
                var binary;
                arrayBuffer = xhr.response;
                if (arrayBuffer) {
                    byteArray = new Uint8Array(arrayBuffer);
                    buffer = [];
                    for (i; i < byteArray.byteLength; ++i) {
                        buffer[i] = String.fromCharCode(byteArray[i]);
                    }
                    // loadedAssets.binary[name] = buffer.join('');
                    binary = buffer.join('');
                    success(null, name, binary);
                }
            };
            xhr.send();
        };
        var loadImage = function (name, source, callback) {
            var img = new Image();

            // cocoon lazy load, might be useful some day?
            // img.cocoonLazyLoad = true;

            img.addEventListener('load', function () {
                callback(null, name, img);
            }, false);
            img.addEventListener('error', function (evt) {
                // TODO: Implement failure: should it retry to load the image?
                Utils.log('ERROR: loading image ' + source);
            }, false);

            img.src = source;
        };
        var loadTTF = function (name, source, callback) {
            // for every font to load we measure the width on a canvas
            var splitName = name;
            var canvas = document.createElement('canvas');
            var context = canvas.getContext('2d');
            var width = 0;
            var oldWidth;
            var intervalId;
            var checkCount = 0;
            var measure = function () {
                width = context.measureText('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890.,').width;
                return width;
            };
            var loadFont = function () {
                // append a style element with the font face
                // this method works with Canvas+
                var style = document.createElement('style');
                style.setAttribute("type", "text/css");
                style.innerHTML = "@font-face { font-family: '" + name +
                    "'; src: url('" + source + "');}";

                document.body.appendChild(style);

                // try setting it
                context.font = "normal 16px " + name;
            };
            // detect a loaded font by checking if the width changed
            var isLoaded = function () {
                return oldWidth !== measure();
            };

            // unlike other assets, the font name is not allowed to have slashes!
            if (name.indexOf("/") >= 0) {
                splitName = name.split("/");
                // swap name with last word
                name = splitName[splitName.length - 1];
            }

            loadFont();

            // measure for the first time
            oldWidth = measure();

            // check every 100ms
            intervalId = window.setInterval(function () {
                if (isLoaded()) {
                    // done!
                    window.clearInterval(intervalId);
                    if (callback) {
                        callback(null, name, name);
                    }
                } else if (checkCount >= 10) {
                    // give up after 1000ms
                    // possible scenarios:
                    // * a mistake was made, for example a typo in the path, and the font was never loaded
                    // * the font was already loaded (can happen in reloading in Cocoon devapp)
                    // either way we continue as if nothing happened, not loading the font shouldn't crash the game
                    window.clearInterval(intervalId);
                    console.log('Warning: font "' + name + '" timed out with loading.');
                    if (callback) {
                        callback(null, name, name);
                    }
                }
                checkCount += 1;
            }, 100);
        };
        var loadSpriteSheet = function (name, source, callback) {
            var spriteSheet = {
                image: null,
                animation: null
            };

            var checkForCompletion = function () {
                if (spriteSheet.image !== null && spriteSheet.animation !== null) {
                    callback(null, name, spriteSheet);
                }
            };

            loadJSON(name, source + '.json', function (err, name, json) {
                if (err) {
                    callback(err, name, null);
                    return;
                }
                spriteSheet.animation = json;
                checkForCompletion();
            });

            loadImage(name, source + '.png', function (err, name, img) {
                if (err) {
                    callback(err, name, null);
                    return;
                }
                spriteSheet.image = PackedImage(img);
                checkForCompletion();
            });
        };
        var loadPackedImage = function (name, source, callback) {
            // very similar to spritesheet: load an image and load a json
            var packedImage = {
                image: null,
                data: null
            };
            var checkForCompletion = function () {
                if (packedImage.image !== null && packedImage.data !== null) {
                    callback(null, name, packedImage);
                }
            };

            loadJSON(name, source + '.json', function (err, name, json) {
                if (err) {
                    callback(err, name, null);
                    return;
                }
                packedImage.data = json;
                checkForCompletion();
            });
            loadImage(name, source + '.png', function (err, name, img) {
                if (err) {
                    callback(err, name, null);
                    return;
                }
                packedImage.image = img;
                checkForCompletion();
            });
        };
        var loadSpriteSheetPack = function (name, source, callback) {
            var spriteSheet = {
                image: null,
                data: null
            };

            var checkForCompletion = function () {
                if (spriteSheet.image !== null && spriteSheet.data !== null) {
                    callback(null, name, spriteSheet);
                }
            };

            loadJSON(name, source + '.json', function (err, name, json) {
                if (err) {
                    callback(err, name, null);
                    return;
                }
                spriteSheet.data = json;
                checkForCompletion();
            });

            loadImage(name, source + '.png', function (err, name, img) {
                if (err) {
                    callback(err, name, null);
                    return;
                }
                spriteSheet.image = img;
                checkForCompletion();
            });
        };
        var loadSpine = function (name, source, callback) {
            var path = (function () {
                // remove the final part
                var paths = source.split('/');
                paths.splice(-1, 1);
                return paths.join('/') + '/';
            })();
            var spine = {
                skeleton: null,
                atlas: null,
                images: [], // {img: Image, path: ''}
                imageCount: 0, // only used to check if all images are loaded
                skinImages: {}, // imageName -> skinName
                path: path,
                pathJson: source + ".json", // need this when removing asset
                pathAtlas: source + ".atlas", // need this when removing asset
                dispose: function () {
                    var i, l;
                    for (i = 0, l = spine.images.length; i < l; ++i) {
                        spineAssetLoader.remove(spine.images[i].path);
                    }
                    spineAssetLoader.remove(spine.pathJson);
                    spineAssetLoader.remove(spine.pathAtlas);
                }
            };
            var checkForCompletion = function () {
                if (
                    spine.imageCount === spine.images.length &&
                    spine.skeleton !== null &&
                    spine.atlas !== null
                ) {
                    callback(null, name, spine);
                }
            };
            var onLoadSpineJson = function (path, data) {
                spine.skeleton = data;
                checkForCompletion();

                // next: load atlas
                spineAssetLoader.loadText(
                    source.replace("-pro", "").replace("-ess", "") + ".atlas",
                    function (path, dataAtlas) {
                        // it is in my belief that spine exports either the atlas or json wrong when skins are involved
                        // the atlas path becomes an relative path to the root as opposed to relative to images/
                        var skeletonJson = JSON.parse(data);
                        var prefix = skeletonJson.skeleton.images;
                        prefix = prefix.replace('./', '');
                        while (dataAtlas.indexOf(prefix) >= 0) {
                            dataAtlas = dataAtlas.replace(prefix, '');
                        }
                        onLoadSpineAtlas(path, dataAtlas);
                    },
                    function (path, err) {
                        callback(err, name, null);
                    }
                );
            };
            var onLoadSpineAtlas = function (path, data) {
                // parse the atlas just to check what images to load
                var textureAtlas = new window.spine.TextureAtlas(data, function (path) {
                    // return a fake texture
                    if (!tempSpineImage) {
                        tempSpineImage = new Image();
                    }
                    return new window.spine.FakeTexture(tempSpineImage);
                });
                var pages = textureAtlas.pages;
                var i, l;

                // update image count
                spine.imageCount = pages.length;

                // load all the images
                if (!manager.lazyLoadSpine) {
                    for (i = 0, l = pages.length; i < l; ++i) {
                        spineAssetLoader.loadTexture(
                            spine.path + pages[i].name,
                            onLoadSpineImage,
                            function (path, err) {
                                callback(err, name, null);
                            }
                        );
                    }
                } else {
                    // in case of lazy loading: Bento asset manager will not manage the spine images!
                    spine.imageCount = 0;

                    // we will now inspect the texture atlas and match skins with images
                    // which allows us to lazy load images per skin
                    // requirement: one image must match one skin! see this forum post http://esotericsoftware.com/forum/Separated-atlas-for-each-skin-9835?p=45504#p45504
                    linkSkinWithImage(textureAtlas);
                }

                spine.atlas = data;
                checkForCompletion();
            };
            var onLoadSpineImage = function (path, image) {
                spine.images.push({
                    img: image,
                    path: path
                });
                checkForCompletion();
            };
            var linkSkinWithImage = function (textureAtlas) {
                // In order for the lazy loading to work, we need to know 
                // what skin is related to which image. Spine will not do this out of the box
                // so we will have to parse the skeleton json and atlas manually and make
                // think link ourselves.
                var skeletonJson = JSON.parse(spine.skeleton);
                var skins = skeletonJson.skins;
                var findRegion = function (name) {
                    // searches region for a name and returns the page name
                    var i, l;
                    var region;
                    var regions = textureAtlas.regions;
                    for (i = 0, l = regions.length; i < l; ++i) {
                        region = regions[i];
                        if (region.name === name) {
                            return region.page.name;
                        }
                    }
                    return '';
                };
                Utils.forEach(skins, function (skinData, skinName) {
                    Utils.forEach(skinData, function (slotData, slotName, l, breakLoop) {
                        Utils.forEach(slotData, function (attachmentData, attachmentName) {
                            var actualAttachmentName = attachmentData.name;
                            // we link the name with a region in the atlas data
                            var pageName;

                            if (!actualAttachmentName) {
                                // attachment name does not exist, just assign to the first page??
                                pageName = textureAtlas.pages[0].name;
                            } else {
                                pageName = findRegion(actualAttachmentName);
                            }

                            // once found, we break the slots loop
                            if (pageName) {
                                breakLoop();
                                spine.skinImages[pageName] = skinName;
                            }
                        });
                    });
                });
            };

            // to load spine, you must include spine-canvas.js
            if (!window.spine) {
                console.error("ERROR: spine library not found!");
                callback("Loading spine failed.");
                return;
            }
            // note: we could in the future implement the asset loading with bento
            // but for convenience sake we simply use the spine asset manager for now
            if (!spineAssetLoader) {
                spineAssetLoader = new window.spine.canvas.AssetManager();
            }

            spineAssetLoader.loadText(
                spine.pathJson,
                onLoadSpineJson, // will load atlas here
                function (path, err) {
                    callback(err, name, null);
                }
            );
        };
        /**
         * Loads asset groups (json files containing names and asset paths to load)
         * If the assetGroup parameter is passed to Bento.setup, this function will be
         * called automatically by Bento.
         * This will not load the assets (merely the assetgroups). To load the assets,
         * you must call Bento.assets.load()
         * @function
         * @instance
         * @param {Object} jsonFiles - Name with json path
         * @param {Function} onReady - Callback when ready
         * @param {Function} onLoaded - Callback when json file is loaded
         * @name loadAssetGroups
         */
        var loadAssetGroups = function (jsonFiles, onReady, onLoaded) {
            var jsonName;
            var keyCount = Utils.getKeyLength(jsonFiles);
            var loaded = 0;
            var callback = function (err, name, json) {
                if (err) {
                    Utils.log(err);
                    return;
                }
                assetGroups[name] = json;
                loaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(loaded, keyCount, name, 'json');
                }
                if (keyCount === loaded && Utils.isDefined(onReady)) {
                    onReady(null, 'assetGroup');
                }
            };
            for (jsonName in jsonFiles) {
                if (jsonFiles.hasOwnProperty(jsonName)) {
                    loadJSON(jsonName, jsonFiles[jsonName], callback);
                }
            }
        };
        /**
         * Loads assets from asset group.
         * @function
         * @instance
         * @param {String} groupName - Name of asset group
         * @param {Function} onReady - Callback when ready
         * @param {Function} onLoaded - Callback when asset file is loaded
         * @param {Bool} skipPackedImages - do not initialize texture packed images
         * @name load
         */
        var load = function (groupName, onReady, onLoaded) {
            var group = assetGroups[groupName];
            var asset;
            var assetsLoaded = 0;
            var assetCount = 0;
            var toLoad = [];
            // assets to unpack
            var toUnpack = {
                'packed-images': {},
                'packed-spritesheets': {},
                'packed-json': {}
            };
            var packs = [];
            var postLoad = function () {
                var initPackedImagesLegacy = function () {
                    // old way of packed images
                    var frame, pack, i, l, image, json, name;
                    while (packs.length) {
                        pack = packs.pop();
                        image = getImageElement(pack);
                        json = getJson(pack);

                        if (!image || !json) {
                            // TODO: should have a cleaner method to check if packs are not loaded yet
                            // return the pack until the image/json is loaded
                            packs.push(pack);
                            return;
                        }

                        // parse json
                        for (i = 0, l = json.frames.length; i < l; ++i) {
                            name = json.frames[i].filename;
                            name = name.substring(0, name.length - 4);
                            frame = json.frames[i].frame;
                            assets.texturePacker[name] = new PackedImage(image, frame);
                        }
                    }
                };
                var initPackedImages = function () {
                    // expand into images
                    var packedImages = toUnpack['packed-images'];
                    Utils.forEach(packedImages, function (packData, name) {
                        var image = packData.image;
                        var data = packData.data;
                        Utils.forEach(data, function (textureData, i) {
                            // turn into image data
                            var assetName = textureData.assetName;
                            var frame = {
                                x: textureData.x,
                                y: textureData.y,
                                w: textureData.width,
                                h: textureData.height,
                            };
                            assets.texturePacker[assetName] = new PackedImage(image, frame);
                        });
                    });
                };
                var unpackJson = function () {
                    // unpack json into multiple jsons
                    var key;
                    var packedJson = toUnpack['packed-json'];
                    Utils.forEach(packedJson, function (group) {
                        Utils.forEach(group, function (json, key, l, breakLoop) {
                            assets.json[key] = json;
                        });
                    });
                };
                var unpackSpriteSheets = function () {
                    // expand into images
                    var packedImages = toUnpack['packed-spritesheets'];
                    Utils.forEach(packedImages, function (packData, name) {
                        var image = packData.image;
                        var data = packData.data;
                        Utils.forEach(data, function (textureData, i) {
                            // turn into image data
                            var assetName = textureData.assetName;
                            var frame = {
                                x: textureData.x,
                                y: textureData.y,
                                w: textureData.width,
                                h: textureData.height,
                            };
                            var spriteSheet = {
                                image: new PackedImage(image, frame),
                                animation: textureData.spriteSheet
                            };
                            assets.spritesheets[assetName] = spriteSheet;
                        });
                    });
                };
                // after everything has loaded, do some post processing
                initPackedImagesLegacy();
                initPackedImages();
                unpackJson();
                unpackSpriteSheets();
                // mark as loaded
                loadedGroups[groupName] = true;
                // callback
                if (Utils.isDefined(onReady)) {
                    onReady(null, groupName);
                }
            };
            var checkLoaded = function () {
                if (assetCount === 0 || (assetCount > 0 && assetsLoaded === assetCount)) {
                    postLoad();
                }
            };
            var onLoadImage = function (err, name, image) {
                if (err) {
                    Utils.log(err);
                    return;
                }
                assets.images[name] = image;
                assetsLoaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(assetsLoaded, assetCount, name, 'image');
                }
                checkLoaded();
            };
            // DEPRECATED
            var onLoadPack = function (err, name, json) {
                // TODO: fix texturepacker loading
                if (err) {
                    Utils.log(err);
                    return;
                }
                assets.json[name] = json;
                packs.push(name);
                assetsLoaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(assetsLoaded, assetCount, name, 'pack');
                }
                checkLoaded();
            };
            var onLoadJson = function (err, name, json) {
                if (err) {
                    Utils.log(err);
                    return;
                }
                assets.json[name] = json;
                assetsLoaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(assetsLoaded, assetCount, name, 'json');
                }
                checkLoaded();
            };
            var onLoadTTF = function (err, name, ttf) {
                if (err) {
                    Utils.log(err);
                    return;
                }
                assets.fonts[name] = ttf;
                assetsLoaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(assetsLoaded, assetCount, name, 'ttf');
                }
                checkLoaded();
            };
            var onLoadAudio = function (err, name, audio) {
                if (err) {
                    Utils.log(err);
                } else {
                    assets.audio[name] = audio;
                }
                assetsLoaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(assetsLoaded, assetCount, name, 'audio');
                }
                checkLoaded();
            };
            var onLoadSpriteSheet = function (err, name, spriteSheet) {
                if (err) {
                    Utils.log(err);
                } else {
                    assets.spritesheets[name] = spriteSheet;
                }
                assetsLoaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(assetsLoaded, assetCount, name, 'spriteSheet');
                }
                checkLoaded();
            };
            var onLoadSpine = function (err, name, spine) {
                if (err) {
                    Utils.log(err);
                } else {
                    assets.spine[name] = spine;
                }
                assetsLoaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(assetsLoaded, assetCount, name, 'spine');
                }
                checkLoaded();
            };
            // packs
            var onLoadImagePack = function (err, name, imagePack) {
                if (err) {
                    Utils.log(err);
                    return;
                }
                assets['packed-images'][name] = imagePack;
                toUnpack['packed-images'][name] = imagePack;
                assetsLoaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(assetsLoaded, assetCount, name, 'imagePack');
                }
                checkLoaded();
            };
            var onLoadJsonPack = function (err, name, json) {
                if (err) {
                    console.log(err);
                    return;
                }
                assets['packed-json'][name] = json;
                toUnpack['packed-json'][name] = json;
                assetsLoaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(assetsLoaded, assetCount, name, 'jsonPack');
                }
                checkLoaded();
            };
            var onLoadSpriteSheetPack = function (err, name, spriteSheetPack) {
                if (err) {
                    Utils.log(err);
                    return;
                }
                assets['packed-spritesheets'][name] = spriteSheetPack;
                toUnpack['packed-spritesheets'][name] = spriteSheetPack;
                assetsLoaded += 1;
                if (Utils.isDefined(onLoaded)) {
                    onLoaded(assetsLoaded, assetCount, name, 'spriteSheetPack');
                }
                checkLoaded();
            };

            var readyForLoading = function (fn, asset, path, callback) {
                toLoad.push({
                    fn: fn,
                    asset: asset,
                    path: path,
                    callback: callback
                });
            };
            var loadAllAssets = function () {
                var i = 0,
                    l;
                var data;
                for (i = 0, l = toLoad.length; i < l; ++i) {
                    data = toLoad[i];
                    data.fn(data.asset, data.path, data.callback);
                }
                if (toLoad.length === 0) {
                    checkLoaded();
                }
            };

            if (!Utils.isDefined(group)) {
                onReady('Could not find asset group ' + groupName);
                return;
            }
            // set path
            if (Utils.isDefined(group.path)) {
                path = group.path;
            }
            // count the number of assets first
            // get images
            if (Utils.isDefined(group.images)) {
                assetCount += Utils.getKeyLength(group.images);
                for (asset in group.images) {
                    if (!group.images.hasOwnProperty(asset)) {
                        continue;
                    }
                    readyForLoading(loadImage, asset, path + 'images/' + group.images[asset], onLoadImage);
                }
            }
            // get packed images
            if (Utils.isDefined(group.texturePacker)) {
                assetCount += Utils.getKeyLength(group.texturePacker);
                for (asset in group.texturePacker) {
                    if (!group.texturePacker.hasOwnProperty(asset)) {
                        continue;
                    }
                    readyForLoading(loadJSON, asset, path + 'json/' + group.texturePacker[asset], onLoadPack);
                }
            }
            // get audio
            if (Utils.isDefined(group.audio)) {
                assetCount += Utils.getKeyLength(group.audio);
                for (asset in group.audio) {
                    if (!group.audio.hasOwnProperty(asset)) {
                        continue;
                    }
                    readyForLoading(loadAudio, asset, group.audio[asset], onLoadAudio);
                }
            }
            // get json
            if (Utils.isDefined(group.json)) {
                assetCount += Utils.getKeyLength(group.json);
                for (asset in group.json) {
                    if (!group.json.hasOwnProperty(asset)) {
                        continue;
                    }
                    readyForLoading(loadJSON, asset, path + 'json/' + group.json[asset], onLoadJson);
                }
            }
            // get fonts
            if (Utils.isDefined(group.fonts)) {
                assetCount += Utils.getKeyLength(group.fonts);
                for (asset in group.fonts) {
                    if (!group.fonts.hasOwnProperty(asset)) {
                        continue;
                    }
                    readyForLoading(loadTTF, asset, path + 'fonts/' + group.fonts[asset], onLoadTTF);
                }
            }
            // get spritesheets
            if (Utils.isDefined(group.spritesheets)) {
                assetCount += Utils.getKeyLength(group.spritesheets);
                for (asset in group.spritesheets) {
                    if (!group.spritesheets.hasOwnProperty(asset)) {
                        continue;
                    }
                    readyForLoading(loadSpriteSheet, asset, path + 'spritesheets/' + group.spritesheets[asset], onLoadSpriteSheet);
                }
            }
            // get spine
            if (Utils.isDefined(group.spine)) {
                assetCount += Utils.getKeyLength(group.spine);
                for (asset in group.spine) {
                    if (!group.spine.hasOwnProperty(asset)) {
                        continue;
                    }
                    readyForLoading(loadSpine, asset, path + 'spine/' + group.spine[asset], onLoadSpine);
                }
            }

            // packed assets
            if (Utils.isDefined(group['packed-images'])) {
                assetCount += Utils.getKeyLength(group['packed-images']);
                Utils.forEach(group['packed-images'], function (assetPath, assetName) {
                    readyForLoading(loadPackedImage, assetName, path + 'packed-images/' + assetPath, onLoadImagePack);
                });
            }
            // get (compressed) packed json
            if (Utils.isDefined(group['packed-json'])) {
                assetCount += Utils.getKeyLength(group['packed-json']);
                Utils.forEach(group['packed-json'], function (assetPath, assetName) {
                    readyForLoading(loadJSON, assetName, path + 'packed-json/' + assetPath, onLoadJsonPack);
                });
            }
            // get packed spritesheet
            if (Utils.isDefined(group['packed-spritesheets'])) {
                assetCount += Utils.getKeyLength(group['packed-spritesheets']);
                Utils.forEach(group['packed-spritesheets'], function (assetPath, assetName) {
                    readyForLoading(loadSpriteSheetPack, assetName, path + 'packed-spritesheets/' + assetPath, onLoadSpriteSheetPack);
                });
            }

            // load all assets
            loadAllAssets();

            return assetCount;
        };
        /**
         * Loads image from URL. The resulting asset can be accessed through Bento.assets.getImage().
         * @function
         * @instance
         * @param {String} name - Name of asset
         * @param {String} url - Url path (relative to your index.html)
         * @param {Function} callback - Callback function
         * @name loadImageFromUrl
         */
        var loadImageFromUrl = function (name, url, callback) {
            var onLoadImage = function (err, name, image) {
                if (err) {
                    Utils.log(err);
                    if (callback) {
                        callback(err);
                    }
                    return;
                }
                assets.images[name] = image;
                if (callback) {
                    callback(null, image);
                }
            };
            loadImage(name, url, onLoadImage);
        };
        /**
         * Loads JSON from URL. The resulting asset can be accessed through Bento.assets.getJson().
         * @function
         * @instance
         * @param {String} name - Name of asset
         * @param {String} url - Url path (relative to your index.html)
         * @param {Function} callback - Callback function
         * @name loadJsonFromUrl
         */
        var loadJsonFromUrl = function (name, url, callback) {
            var onLoadJson = function (err, name, json) {
                if (err) {
                    Utils.log(err);
                    if (callback) {
                        callback(err);
                    }
                    return;
                }
                assets.json[name] = json;
                if (callback) {
                    callback(null, json);
                }
            };
            loadJSON(name, url, onLoadJson);
        };
        /**
         * Loads audio from URL. The resulting asset can be accessed through Bento.assets.getAudio().
         * @function
         * @instance
         * @param {String} name - Name of asset
         * @param {String} url - Url path (relative to your index.html)
         * @param {Function} callback - Callback function
         * @name loadAudioFromUrl
         */
        var loadAudioFromUrl = function (name, url, callback) {
            var onLoadAudio = function (err, name, audio) {
                if (err) {
                    Utils.log(err);
                    if (callback) {
                        callback(err);
                    }
                    return;
                }
                assets.audio[name] = audio;
                if (callback) {
                    callback(audio);
                }
            };
            loadAudio(name, url, onLoadAudio);
        };
        /**
         * Unloads assets
         * @function
         * @instance
         * @param {String} groupName - Name of asset group
         * @param {Boolean} dispose - Should use Canvas+ dispose
         * @name unload
         */
        var unload = function (groupName, dispose) {
            // find all assets in this group
            var assetGroup = assetGroups[groupName];

            if (!assetGroup) {
                Utils.log('ERROR: asset group ' + groupName + ' does not exist');
                return;
            }
            Utils.forEach(assetGroup, function (group, type) {
                if (typeof group !== "object") {
                    return;
                }
                Utils.forEach(group, function (assetPath, name) {
                    // NOTE: from this point on there are a lot of manual checks etc.
                    // would be nicer to make unify the logic...

                    // find the corresponding asset from the assets object
                    var assetTypeGroup = assets[type] || {};
                    var asset = assetTypeGroup[name];
                    var removePackedImage = function (packedImages) {
                        // find what it unpacked to
                        var image = packedImages.image;
                        var data = packedImages.data;
                        Utils.forEach(data, function (textureData, i) {
                            // find out the asset name
                            var assetName = textureData.assetName;
                            var textureAsset = assets.texturePacker[assetName];
                            // delete if this asset still exists
                            if (textureAsset) {
                                delete assets.texturePacker[assetName];
                            }
                        });
                        // dispose if possible
                        if (dispose && image.dispose) {
                            image.dispose();
                        }
                        if (dispose && image.image && image.image.dispose) {
                            image.image.dispose();
                        }
                    };
                    var removePackedSpriteSheet = function (packedSpriteSheets) {
                        // find what it unpacked to
                        var image = packedSpriteSheets.image;
                        var data = packedSpriteSheets.data;
                        Utils.forEach(data, function (textureData, i) {
                            // find out the asset name
                            var assetName = textureData.assetName;
                            var spriteSheet = assets.spritesheets[assetName];
                            // delete if this asset still exists
                            if (spriteSheet) {
                                delete assets.spritesheets[assetName];
                            }
                        });
                        // dispose if possible
                        if (dispose && image.dispose) {
                            image.dispose();
                        }
                        if (dispose && image.image && image.image.dispose) {
                            image.image.dispose();
                        }
                    };
                    var removePackedJson = function (packedJson) {
                        // find what it unpacked to
                        Utils.forEach(packedJson, function (json, key, l, breakLoop) {
                            delete assets.json[key];
                        });
                    };

                    if (asset) {
                        // remove reference to it
                        assetTypeGroup[name] = undefined;
                        // delete could be bad for performance(?)
                        delete assetTypeGroup[name];

                        if (type === 'images') {
                            // also remove corresponding texturepacker
                            if (assets.texturePacker[name]) {
                                assets.texturePacker[name] = undefined;
                                delete assets.texturePacker[name];
                            }
                        } else if (type === 'packed-images') {
                            removePackedImage(asset);
                        } else if (type === 'packed-spritesheets') {
                            removePackedSpriteSheet(asset);
                        } else if (type === 'packed-json') {
                            removePackedJson(asset);
                        }

                        // Canvas+ only: dispose if possible
                        // https://blog.ludei.com/techniques-to-optimize-memory-use-in-ludeis-canvas-environment/
                        if (dispose) {
                            // image
                            if (asset.dispose) {
                                asset.dispose();
                            }
                            // spritesheet or spine
                            else if (asset.image && asset.image.dispose) {
                                asset.image.dispose();
                            } else if (asset.image && asset.image.image && asset.image.image.dispose) {
                                asset.image.image.dispose();
                            }
                            // audia
                            else if (asset._audioNode && asset._audioNode.dispose) {
                                asset._audioNode.dispose();
                            }
                        }
                    }
                });
            });
            // mark as unloaded
            loadedGroups[groupName] = false;
        };
        /**
         * Returns a previously loaded image
         * @function
         * @instance
         * @param {String} name - Name of image
         * @returns {PackedImage} Image
         * @name getImage
         */
        var getImage = function (name) {
            // NOTE: getImage always returns a PackedImage
            // if the loaded image has not been initialized as PackedImage yet,
            // getImage will do that now and caches the PackedImage in assets.texturePacker
            var image, packedImage = assets.texturePacker[name];
            if (!packedImage) {
                image = getImageElement(name);
                if (!image) {
                    Utils.log("ERROR: Image " + name + " could not be found");
                    return null;
                }
                packedImage = PackedImage(image);
                assets.texturePacker[name] = packedImage;
            }
            return packedImage;
        };
        /**
         * Returns a previously loaded image element
         * @function
         * @instance
         * @param {String} name - Name of image
         * @returns {HTMLImage} Html Image element
         * @name getImageElement
         */
        var getImageElement = function (name) {
            var asset = assets.images[name];
            if (!Utils.isDefined(asset)) {
                Utils.log("ERROR: ImageElement " + name + " could not be found");
            }
            return asset;
        };
        /**
         * Returns a previously loaded json object
         * @function
         * @instance
         * @param {String} name - Name of json file
         * @returns {Object} Json object
         * @name getJson
         */
        var getJson = function (name) {
            var asset = assets.json[name];
            if (!Utils.isDefined(asset)) {
                Utils.log("ERROR: JSON " + name + " could not be found");
            }
            return asset;
        };
        /**
         * Returns a previously loaded audio element (currently by howler)
         * @function
         * @instance
         * @param {String} name - Name of image
         * @returns {Audia} Audia object
         * @name getAudio
         */
        var getAudio = function (name) {
            var asset = assets.audio[name];
            if (!Utils.isDefined(asset)) {
                Utils.log("ERROR: Audio " + name + " could not be found");
            }
            return asset;
        };
        /**
         * Returns a previously loaded spriteSheet element
         * @function
         * @instance
         * @param {String} name - Name of spriteSheet
         * @returns {Object} spriteSheet object
         * @name getSpriteSheet
         */
        var getSpriteSheet = function (name) {
            var asset = assets.spritesheets[name];
            if (!Utils.isDefined(asset)) {
                Utils.log("ERROR: Sprite sheet " + name + " could not be found");
            }
            return asset;
        };
        /**
         * Returns a previously loaded Spine object
         * @function
         * @instance
         * @param {String} name - Name of Spine object
         * @returns {Object} Spine object
         * @name getSpine
         */
        var getSpine = function (name) {
            var asset = assets.spine[name];
            if (!Utils.isDefined(asset)) {
                Utils.log("ERROR: Spine object " + name + " could not be found");
            }
            return asset;
        };
        var getSpineLoader = function (name) {
            return spineAssetLoader;
        };
        /**
         * Returns all assets
         * @function
         * @instance
         * @param {String} name - Name of image
         * @returns {Object} assets - Object with reference to all loaded assets
         * @name getAssets
         */
        var getAssets = function () {
            return assets;
        };
        /**
         * Returns asset group
         * @function
         * @instance
         * @returns {Object} assetGroups - reference to loaded JSON file
         * @name getAssetGroups
         */
        var getAssetGroups = function () {
            return assetGroups;
        };
        /**
         * Reloads all previously loaded assets
         * @function
         * @instance
         * @param {Function} callback - called when all assets are loaded
         * @name reload
         */
        var reload = function (callback) {
            var group;
            var loaded = 0;
            var groupsToLoad = [];
            var loadGroups = function () {
                var i, l;
                for (i = 0, l = groupsToLoad.length; i < l; ++i) {
                    load(groupsToLoad[i], end, function (current, total, name) {});
                }
            };
            var end = function () {
                loaded += 1;

                if (loaded === groupsToLoad.length && callback) {
                    callback();
                }
            };
            // collect groups
            for (group in assetGroups) {
                if (!assetGroups.hasOwnProperty(group)) {
                    continue;
                }
                if (!loadedGroups[group]) {
                    // havent loaded this group yet
                    continue;
                }
                groupsToLoad.push(group);
            }

            // load them
            loadGroups();
        };
        /**
         * Attempts to load ./assets.json and interpret it as assetgroups
         * @function
         * @instance
         * @param {Function} onRead - Called with an error string or null if successful
         * @name loadAssetsJson
         */
        var loadAssetsJson = function (onReady) {
            loadJSON('assets.json', 'assets.json', function (error, name, assetsJson) {
                var isLoading = false;
                var groupsToLoad = {};
                if (error) {
                    onReady(error);
                    return;
                }
                // check the contents of json
                Utils.forEach(assetsJson, function (group, groupName, l, breakLoop) {
                    if (Utils.isString(group)) {
                        // assume assets.json consists of strings to load json files with
                        isLoading = true;
                        groupsToLoad[groupName] = group;
                    } else {
                        // the asset group is present
                        assetGroups[groupName] = group;
                    }
                });

                if (isLoading) {
                    // load jsons
                    loadAssetGroups(groupsToLoad, onReady);
                } else {
                    // done
                    onReady(null, 'assetsJson');
                }
            });
        };
        /**
         * Loads all assets
         * @function
         * @instance
         * @param {Object} settings
         * @param {Array} settings.exceptions - array of strings, which asset groups not to load
         * @param {Function} settings.onComplete - called when all assets are loaded
         * @param {Function} settings.onLoad - called on every asset loaded
         * @name reload
         */
        var loadAllAssets = function (settings) {
            var exceptions = settings.exceptions || [];
            var onReady = settings.onReady || settings.onComplete || function (err, name) {};
            var onLoaded = settings.onLoaded || settings.onLoad || function (count, total, name, type) {};
            var group;
            var groupName;
            var groupCount = 0;
            var assetCount = 0;
            var groupsLoaded = 0;
            var current = 0;
            // check if all groups loaded
            var end = function (err) {
                if (err) {
                    Utils.log(err);
                    return;
                }
                groupsLoaded += 1;
                if (groupsLoaded === groupCount && onReady) {
                    onReady(null);
                }
            };
            // called on every asset
            var loadAsset = function (c, a, name, type) {
                current += 1;
                if (onLoaded) {
                    onLoaded(current, assetCount, name, type);
                }
            };
            // count groups before any loading
            for (groupName in assetGroups) {
                if (!assetGroups.hasOwnProperty(groupName)) {
                    continue;
                }
                if (exceptions.indexOf(groupName) >= 0) {
                    continue;
                }
                groupCount += 1;
            }

            // check every assetgroup and load its assets
            for (groupName in assetGroups) {
                if (!assetGroups.hasOwnProperty(groupName)) {
                    continue;
                }
                if (exceptions.indexOf(groupName) >= 0) {
                    continue;
                }
                group = assetGroups[groupName];
                assetCount += load(groupName, end, loadAsset);
            }

            // nothing to load
            if (groupCount === 0 && onReady) {
                onReady();
            }
        };
        var manager = {
            lazyLoadSpine: false,
            skipAudioCallback: false,
            reload: reload,
            loadAllAssets: loadAllAssets,
            loadAssetGroups: loadAssetGroups,
            loadAssetsJson: loadAssetsJson,
            load: load,
            loadJson: loadJSON,
            loadImageFromUrl: loadImageFromUrl,
            loadJsonFromUrl: loadJsonFromUrl,
            loadAudioFromUrl: loadAudioFromUrl,
            unload: unload,
            getImage: getImage,
            getImageElement: getImageElement,
            getJson: getJson,
            getAudio: getAudio,
            getSpriteSheet: getSpriteSheet,
            getAssets: getAssets,
            getAssetGroups: getAssetGroups,
            getSpine: getSpine,
            getSpineLoader: getSpineLoader,
            forceHtml5Audio: function () {
                Audia = Audia.getHtmlAudia();
            }
        };

        // implement dispose for spine canvas texture(?)
        /*if (window.spine && window.spine.canvas && window.spine.canvas.CanvasTexture) {
            window.spine.canvas.CanvasTexture.prototype.dispose = function () {
                if (this._image && this._image.dispose) {
                    this._image.dispose();
                }
            };
        }*/
        return manager;
    };
});
/**
 * Audio manager to play sounds and music. The audio uses WebAudio API when possible, though it's mostly based on HTML5 Audio for
 * CocoonJS compatibility. To make a distinction between sound effects and music, you must prefix the audio
 * asset names with sfx_ and bgm_ respectively.
 * <br>Exports: Constructor, can be accessed through Bento.audio namespace.
 * @module bento/managers/audio
 * @moduleName AudioManager
 * @returns AudioManager
 */
bento.define('bento/managers/audio', [
    'bento/utils'
], function (Utils) {
    return function (bento) {
        var volume = 1,
            mutedSound = false,
            mutedMusic = false,
            preventSounds = false,
            isPlayingMusic = false,
            howler,
            musicLoop = false,
            lastMusicPlayed = '',
            currentMusicId = 0,
            saveMuteSound,
            saveMuteMusic,
            assetManager = bento.assets,
            canvasElement = bento.getCanvas(),
            onVisibilityChanged = function (hidden) {
                if (hidden) {
                    // save audio preferences and mute
                    saveMuteSound = mutedSound;
                    saveMuteMusic = mutedMusic;
                    obj.muteMusic(true);
                    obj.muteSound(true);
                } else {
                    // reload audio preferences and replay music if necessary
                    mutedSound = saveMuteSound;
                    mutedMusic = saveMuteMusic;
                    if (lastMusicPlayed) {
                        obj.playMusic(lastMusicPlayed, musicLoop);
                    }
                }
            },
            obj = {
                /**
                 * Sets the volume (0 = minimum, 1 = maximum)
                 * @name setVolume
                 * @instance
                 * @function
                 * @param {Number} value - the volume
                 * @param {String} name - name of the sound to change volume
                 */
                setVolume: function (value, name) {
                    var audio = assetManager.getAudio(name);
                    if (!audio) {
                        return;
                    }
                    audio.volume = value;
                },
                /**
                 * Gets the volume (0 = minimum, 1 = maximum)
                 * @name getVolume
                 * @instance
                 * @function
                 * @param {String} name - name of the sound
                 */
                getVolume: function (name) {
                    var audio = assetManager.getAudio(name);
                    if (!audio) {
                        Utils.log('ERROR: Could not find audio file');
                        return 0;
                    }
                    return audio.volume;
                },
                /**
                 * Plays a sound effect
                 * @name playSound
                 * @instance
                 * @function
                 * @param {String} name - name of the audio asset
                 * @param {Boolean} [loop] - should the audio loop (defaults to false)
                 * @param {Function} [onEnd] - callback when the audio ends
                 * @param {Boolean} [stopSound] - stops the sound if true
                 */
                playSound: function (name, loop, onEnd, stopSound) {
                    var audio = assetManager.getAudio(name);
                    var slashIndex = name.lastIndexOf('/');
                    if (!audio) {
                        Utils.log('ERROR: Could not find audio file');
                        return;
                    }

                    if (name.substr(slashIndex + 1, 4) !== 'sfx_') {
                        Utils.log("Warning: file names of sound effects should start with 'sfx_'");
                    }

                    if (!mutedSound && !preventSounds) {
                        if (stopSound)
                            obj.stopSound(name);
                        if (Utils.isDefined(loop)) {
                            audio.loop = loop;
                        }
                        if (Utils.isDefined(onEnd)) {
                            audio.onended = onEnd;
                        }
                        audio.play();
                    }
                },
                /**
                 * Stops a specific sound effect
                 * @name stopSound
                 * @instance
                 * @function
                 */
                stopSound: function (name) {
                    var i, l, node;
                    var audio = assetManager.getAudio(name);
                    if (!audio) {
                        Utils.log('ERROR: Could not find audio file');
                        return;
                    }
                    audio.stop();
                },
                /**
                 * Plays a music
                 * @name playMusic
                 * @instance
                 * @function
                 * @param {String} name - name of the audio asset
                 * @param {Boolean} [loop] - should the audio loop (defaults to true)
                 * @param {Function} [onEnd] - callback when the audio ends
                 * @param {Boolean} [stopAllMusic] - stops all music if true
                 */
                playMusic: function (name, loop, onEnd, stopAllMusic) {
                    var audio;
                    var slashIndex = name.lastIndexOf('/');

                    if (stopAllMusic) {
                        obj.stopAllMusic();
                    }

                    if (name.substr(slashIndex + 1, 4) !== 'bgm_') {
                        Utils.log("Warning: file names of music tracks should start with 'bgm_'");
                    }

                    lastMusicPlayed = name;
                    if (Utils.isDefined(loop)) {
                        musicLoop = loop;
                    } else {
                        musicLoop = true;
                    }
                    // set end event
                    if (!mutedMusic && lastMusicPlayed !== '') {
                        audio = assetManager.getAudio(name);
                        if (!audio) {
                            Utils.log('ERROR: Could not find audio file');
                            return;
                        }
                        if (onEnd) {
                            audio.onended = onEnd;
                        }
                        audio.loop = musicLoop;
                        audio.play();
                        isPlayingMusic = true;
                    }
                },
                /**
                 * Stops a specific music
                 * @name stopMusic
                 * @param {String} name - name of the audio asset
                 * @instance
                 * @function
                 */
                stopMusic: function (name) {
                    var i, l, node;
                    assetManager.getAudio(name).stop();
                    isPlayingMusic = false;
                },
                /**
                 * Mute or unmute all sound
                 * @name muteSound
                 * @instance
                 * @function
                 * @param {Boolean} mute - whether to mute or not
                 */
                muteSound: function (mute) {
                    mutedSound = mute;
                    if (mutedSound) {
                        // we stop all sounds because setting volume is not supported on all devices
                        this.stopAllSound();
                    }
                },
                /**
                 * Mute or unmute all music
                 * @instance
                 * @name muteMusic
                 * @function
                 * @param {Boolean} mute - whether to mute or not
                 * @param {Boolean} continueMusic - whether the music continues
                 */
                muteMusic: function (mute, continueMusic) {
                    var last = lastMusicPlayed;
                    mutedMusic = mute;

                    if (!Utils.isDefined(continueMusic)) {
                        continueMusic = false;
                    }
                    if (mutedMusic) {
                        obj.stopAllMusic();
                        lastMusicPlayed = last;
                    } else if (continueMusic && lastMusicPlayed !== '') {
                        obj.playMusic(lastMusicPlayed, musicLoop);
                    }
                },
                /**
                 * Stop all sound effects currently playing
                 * @instance
                 * @name stopAllSound
                 * @function
                 */
                stopAllSound: function () {
                    var sound,
                        sounds = assetManager.getAssets().audio;
                    for (sound in sounds) {
                        if (sounds.hasOwnProperty(sound) && sound.indexOf('sfx_') >= 0) {
                            sounds[sound].stop();
                        }
                    }
                },
                /**
                 * Stop all music currently playing
                 * @instance
                 * @name stopAllMusic
                 * @function
                 */
                stopAllMusic: function () {
                    var sound,
                        sounds = assetManager.getAssets().audio;
                    for (sound in sounds) {
                        if (sounds.hasOwnProperty(sound) && sound.indexOf('bgm_') >= 0) {
                            sounds[sound].stop(sound === lastMusicPlayed ? currentMusicId : void(0));
                        }
                    }
                    lastMusicPlayed = '';
                    isPlayingMusic = false;
                },
                /**
                 * Prevents any sound from playing without interrupting current sounds
                 * @instance
                 * @name preventSounds
                 * @function
                 */
                preventSounds: function (bool) {
                    preventSounds = bool;
                },
                /**
                 * Returns true if any music is playing
                 * @instance
                 * @name isPlayingMusic
                 * @param {String} [name] - Check whether this particular music is playing
                 * @function
                 */
                isPlayingMusic: function (name) {
                    if (name) {
                        return lastMusicPlayed === name;
                    }
                    return isPlayingMusic;
                }
            };
        // https://developer.mozilla.org/en-US/docs/Web/Guide/User_experience/Using_the_Page_Visibility_API
        if ('hidden' in document) {
            document.addEventListener("visibilitychange", function () {
                onVisibilityChanged(document.hidden);
            }, false);
        } else if ('mozHidden' in document) {
            document.addEventListener("mozvisibilitychange", function () {
                onVisibilityChanged(document.mozHidden);
            }, false);
        } else if ('webkitHidden' in document) {
            document.addEventListener("webkitvisibilitychange", function () {
                onVisibilityChanged(document.webkitHidden);
            }, false);
        } else if ('msHidden' in document) {
            document.addEventListener("msvisibilitychange", function () {
                onVisibilityChanged(document.msHidden);
            }, false);
        } else if ('onpagehide' in window) {
            window.addEventListener('pagehide', function () {
                onVisibilityChanged(true);
            }, false);
            window.addEventListener('pageshow', function () {
                onVisibilityChanged(false);
            }, false);
        } else if ('onblur' in document) {
            window.addEventListener('blur', function () {
                onVisibilityChanged(true);
            }, false);
            window.addEventListener('focus', function () {
                onVisibilityChanged(false);
            }, false);
        } else if ('onfocusout' in document) {
            window.addEventListener('focusout', function () {
                onVisibilityChanged(true);
            }, false);
            window.addEventListener('focusin', function () {
                onVisibilityChanged(false);
            }, false);
        }
        return obj;
    };
});
/**
 * Manager that tracks mouse/touch and keyboard input. Useful for manual input managing.
 * <br>Exports: Constructor, can be accessed through Bento.input namespace.
 * @module bento/managers/input
 * @moduleName InputManager
 * @param {Object} gameData - gameData
 * @param {Vector2} gameData.canvasScale - Reference to the current canvas scale.
 * @param {HtmlCanvas} gameData.canvas - Reference to the canvas element.
 * @param {Rectangle} gameData.viewport - Reference to viewport.
 * @param {Object} settings - settings passed from Bento.setup
 * @param {Boolean} [settings.preventContextMenu] - Prevents right click menu
 * @param {Boolean} [settings.globalMouseUp] - Catch mouseup events outside canvas (only useful for desktop)
 * @returns InputManager
 */
bento.define('bento/managers/input', [
    'bento/utils',
    'bento/math/vector2',
    'bento/eventsystem'
], function (Utils, Vector2, EventSystem) {
    'use strict';
    var startPositions = {};
    return function (gameData, settings) {
        var isPaused = false,
            isListening = false,
            canvas,
            canvasScale,
            viewport,
            pointers = [],
            keyStates = {},
            offsetLeft = 0,
            offsetTop = 0,
            offsetLocal = new Vector2(0, 0),
            gamepad,
            gamepads,
            gamepadButtonsPressed = [],
            gamepadButtonStates = {},
            remote,
            remoteButtonsPressed = [],
            remoteButtonStates = {},
            pointerDown = function (evt) {
                pointers.push({
                    id: evt.id,
                    position: evt.position,
                    eventType: evt.eventType,
                    localPosition: evt.localPosition,
                    worldPosition: evt.worldPosition
                });
                EventSystem.fire('pointerDown', evt);
            },
            pointerMove = function (evt) {
                EventSystem.fire('pointerMove', evt);
                updatePointer(evt);
            },
            pointerUp = function (evt) {
                EventSystem.fire('pointerUp', evt);
                removePointer(evt);
            },
            touchStart = function (evt) {
                var id, i, l;
                evt.preventDefault();
                for (i = 0, l = evt.changedTouches.length; i < l; ++i) {
                    addTouchPosition(evt, i, 'start');
                    pointerDown(evt);
                }
            },
            touchMove = function (evt) {
                var id, i, l;
                evt.preventDefault();
                for (i = 0, l = evt.changedTouches.length; i < l; ++i) {
                    addTouchPosition(evt, i, 'move');
                    pointerMove(evt);
                }
            },
            touchEnd = function (evt) {
                var id, i, l;
                evt.preventDefault();
                for (i = 0, l = evt.changedTouches.length; i < l; ++i) {
                    addTouchPosition(evt, i, 'end');
                    pointerUp(evt);
                }
            },
            mouseDown = function (evt) {
                // evt.preventDefault();
                addMousePosition(evt, 'start');
                pointerDown(evt);
            },
            mouseMove = function (evt) {
                // evt.preventDefault();
                addMousePosition(evt, 'move');
                pointerMove(evt);
            },
            mouseUp = function (evt) {
                // evt.preventDefault();
                addMousePosition(evt, 'end');
                pointerUp(evt);
            },
            addTouchPosition = function (evt, n, type) {
                var touch = evt.changedTouches[n];
                var x = (touch.pageX - offsetLeft) / canvasScale.x + offsetLocal.x;
                var y = (touch.pageY - offsetTop) / canvasScale.y + offsetLocal.y;
                var startPos = {};

                evt.preventDefault();
                evt.id = 0;
                evt.eventType = 'touch';
                touch.position = new Vector2(x, y);
                touch.worldPosition = touch.position.clone();
                touch.worldPosition.x += viewport.x;
                touch.worldPosition.y += viewport.y;
                touch.localPosition = touch.position.clone();
                // add 'normal' position
                evt.position = touch.position.clone();
                evt.worldPosition = touch.worldPosition.clone();
                evt.localPosition = touch.localPosition.clone();
                // id
                evt.id = touch.identifier + 1;
                // diff position
                if (type === 'start') {
                    startPos.startPosition = touch.position.clone();
                    startPos.startWorldPosition = touch.worldPosition.clone();
                    startPos.startLocalPosition = touch.localPosition.clone();
                    // save startPos
                    startPositions[evt.id] = startPos;
                }
                if (type === 'end') {
                    // load startPos
                    startPos = startPositions[evt.id];
                    if (startPos && startPos.startPosition) {
                        touch.diffPosition = touch.position.subtract(startPos.startPosition);
                        touch.diffWorldPosition = touch.worldPosition.subtract(startPos.startWorldPosition);
                        touch.diffLocalPosition = touch.localPosition.subtract(startPos.startLocalPosition);
                        evt.diffPosition = touch.diffPosition.clone();
                        evt.diffWorldPosition = touch.diffWorldPosition.clone();
                        evt.diffLocalPosition = touch.diffLocalPosition.clone();
                        delete startPositions[evt.id];
                    } else {
                        Utils.log("ERROR: touch startPosition was not defined");
                    }
                }

            },
            addMousePosition = function (evt, type) {
                var x = (evt.pageX - offsetLeft) / canvasScale.x + offsetLocal.x,
                    y = (evt.pageY - offsetTop) / canvasScale.y + offsetLocal.y,
                    startPos = {},
                    n = -1;
                evt.id = 0;
                evt.eventType = 'mouse';
                evt.position = new Vector2(x, y);
                evt.worldPosition = evt.position.clone();
                evt.worldPosition.x += viewport.x;
                evt.worldPosition.y += viewport.y;
                evt.localPosition = evt.position.clone();
                // diff position
                if (type === 'start') {
                    startPos.startPosition = evt.position.clone();
                    startPos.startWorldPosition = evt.worldPosition.clone();
                    startPos.startLocalPosition = evt.localPosition.clone();
                    // save startPos
                    startPositions[n] = startPos;
                }
                if (type === 'end') {
                    // load startPos
                    startPos = startPositions[n];
                    evt.diffPosition = evt.position.substract(startPos.startPosition);
                    evt.diffWorldPosition = evt.worldPosition.substract(startPos.startWorldPosition);
                    evt.diffLocalPosition = evt.localPosition.substract(startPos.startLocalPosition);
                }
                // give it an id that doesn't clash with touch id
                evt.id = -1;
            },
            updatePointer = function (evt) {
                var i = 0, l;
                for (i = 0, l = pointers.length; i < l; ++i) {
                    if (pointers[i].id === evt.id) {
                        pointers[i].position = evt.position;
                        pointers[i].worldPosition = evt.worldPosition;
                        pointers[i].localPosition = evt.position;
                        return;
                    }
                }
            },
            removePointer = function (evt) {
                var i = 0, l;
                for (i = 0, l = pointers.length; i < l; ++i) {
                    if (pointers[i].id === evt.id) {
                        pointers.splice(i, 1);
                        return;
                    }
                }
            },
            initTouch = function () {
                if (window.ejecta) {
                    canvas.addEventListener('tvtouchstart', tvTouchStart);
                    canvas.addEventListener('tvtouchmove', tvTouchMove);
                    canvas.addEventListener('tvtouchend', tvTouchEnd);
                }
                canvas.addEventListener('touchstart', touchStart);
                canvas.addEventListener('touchmove', touchMove);
                canvas.addEventListener('touchend', touchEnd);
                if (settings.globalMouseUp) {
                    // TODO: add correction for position
                    window.addEventListener('mouseup', mouseUp);
                } else {
                    canvas.addEventListener('mouseup', mouseUp);
                }
                canvas.addEventListener('mousedown', mouseDown);
                canvas.addEventListener('mousemove', mouseMove);
                isListening = true;

                if (!Utils.isCocoonJs()) {
                    canvas.addEventListener('touchstart', function (evt) {
                        if (evt && evt.preventDefault) {
                            evt.preventDefault();
                        }
                        if (evt && evt.stopPropagation) {
                            evt.stopPropagation();
                        }
                        return false;
                    });
                    canvas.addEventListener('touchmove', function (evt) {
                        if (evt && evt.preventDefault) {
                            evt.preventDefault();
                        }
                        if (evt && evt.stopPropagation) {
                            evt.stopPropagation();
                        }
                        return false;
                    });
                }

                // touchcancel can be used when system interveness with the game
                canvas.addEventListener('touchcancel', function (evt) {
                    EventSystem.fire('touchcancel', evt);
                });
            },
            initKeyboard = function () {
                var element = gameData.canvas || window,
                    refocus = function (evt) {
                        if (element.focus) {
                            element.focus();
                        }
                    };
                // fix for iframes
                element.tabIndex = 0;
                if (element.focus) {
                    element.focus();
                }
                element.addEventListener('keydown', keyDown, false);
                element.addEventListener('keyup', keyUp, false);
                // refocus
                element.addEventListener('mousedown', refocus, false);

            },
            keyDown = function (evt) {
                var i, l, names;
                evt.preventDefault();
                EventSystem.fire('keyDown', evt);
                // get names
                names = Utils.keyboardMapping[evt.keyCode];
                // catch unknown keys
                if (!names) {
                    Utils.log("ERROR: Key with keyCode " + evt.keyCode + " is undefined.");
                    return;
                }
                for (i = 0, l = names.length; i < l; ++i) {
                    keyStates[names[i]] = true;
                    EventSystem.fire('buttonDown', names[i]);
                    EventSystem.fire('buttonDown-' + names[i]);
                }
            },
            keyUp = function (evt) {
                var i, l, names;
                evt.preventDefault();
                EventSystem.fire('keyUp', evt);
                // get names
                names = Utils.keyboardMapping[evt.keyCode];
                // catch unknown keys
                if (!names) {
                    Utils.log("ERROR: Key with keyCode " + evt.keyCode + " is undefined.");
                    return;
                }
                for (i = 0, l = names.length; i < l; ++i) {
                    keyStates[names[i]] = false;
                    EventSystem.fire('buttonUp', names[i]);
                    EventSystem.fire('buttonUp-' + names[i]);
                }
            },
            destroy = function () {
                // remove all event listeners
            },
            /**
             * Changes the offsets after resizing or screen re-orientation.
             */
            updateCanvas = function () {
                if (Utils.isCocoonJs()) {
                    // assumes full screen
                    canvasScale.x = window.innerWidth / viewport.width;
                    canvasScale.y = window.innerHeight / viewport.height;
                } else {
                    // use offsetWidth and offsetHeight to determine visual size
                    canvasScale.x = canvas.offsetWidth / viewport.width;
                    canvasScale.y = canvas.offsetHeight / viewport.height;
                    // get the topleft position
                    offsetLeft = canvas.offsetLeft;
                    offsetTop = canvas.offsetTop;
                }
            },
            initMouseClicks = function () {
                if (!canvas || !canvas.addEventListener) {
                    return;
                }
                canvas.addEventListener('contextmenu', function (e) {
                    EventSystem.fire('mouseDown-right');
                    // prevent context menu
                    if (settings.preventContextMenu) {
                        e.preventDefault();
                    }
                }, false);
                canvas.addEventListener('click', function (e) {
                    if (e.which === 1) {
                        EventSystem.fire('mouseDown-left');
                        e.preventDefault();
                    } else if (e.which === 2) {
                        EventSystem.fire('mouseDown-middle');
                        e.preventDefault();
                    }
                }, false);
            },
            /**
             * Adds event listeners for connecting/disconnecting a gamepad
             */
            initGamepad = function () {
                window.addEventListener('gamepadconnected', gamepadConnected);
                window.addEventListener('gamepaddisconnected', gamepadDisconnected);
            },
            /**
             * Fired when the browser detects that a gamepad has been connected or the first time a button/axis of the gamepad is used.
             * Adds a pre-update loop check for gamepads and gamepad input
             * @param {GamepadEvent} evt
             */
            gamepadConnected = function (evt) {
                // check for button input before the regular update
                EventSystem.on('preUpdate', checkGamepad);

                console.log('Gamepad connected:', evt.gamepad);
            },
            /**
             * Fired when the browser detects that a gamepad has been disconnected.
             * Removes the reference to the gamepad
             * @param {GamepadEvent} evt
             */
            gamepadDisconnected = function (evt) {
                gamepad = undefined;

                // stop checking for button input
                EventSystem.off('preUpdate', checkGamepad);
            },
            /**
             * Gets a list of all gamepads and checks if any buttons are pressed.
             */
            checkGamepad = function () {
                var i = 0,
                    len = 0;

                // get gamepad every frame because Chrome doesn't store a reference to the gamepad's state
                gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
                for (i = 0, len = gamepads.length; i < len; ++i) {
                    if (gamepads[i]) {
                        gamepad = gamepads[i];
                    }
                }

                if (!gamepad)
                    return;

                // uses an array to check against the state of the buttons from the previous frame
                for (i = 0, len = gamepad.buttons.length; i < len; ++i) {
                    if (gamepad.buttons[i].pressed !== gamepadButtonsPressed[i]) {
                        if (gamepad.buttons[i].pressed) {
                            gamepadButtonDown(i);
                        } else {
                            gamepadButtonUp(i);
                        }
                    }
                }
            },
            gamepadButtonDown = function (id) {
                var i = 0,
                    names = Utils.gamepadMapping[id],
                    len = 0;

                // confusing name is used to keep the terminology similar to keyDown/keyUp
                EventSystem.fire('gamepadKeyDown', id);
                // save value in array
                gamepadButtonsPressed[id] = true;

                for (i = 0, len = names.length; i < len; ++i) {
                    gamepadButtonStates[names[i]] = true;
                    EventSystem.fire('gamepadButtonDown', names[i]);
                    EventSystem.fire('gamepadButtonDown-' + names[i]);
                }
            },
            gamepadButtonUp = function (id) {
                var i = 0,
                    names = Utils.gamepadMapping[id],
                    len = 0;

                // confusing name is used to keep the terminology similar to keyDown/keyUp
                EventSystem.fire('gamepadKeyUp', id);
                // save value in array
                gamepadButtonsPressed[id] = false;

                for (i = 0, len = names.length; i < len; ++i) {
                    gamepadButtonStates[names[i]] = false;
                    EventSystem.fire('gamepadButtonUp', names[i]);
                }
            },
            /**
             * Adds a check for input from the apple remote before every update. Only if on tvOS.
             *
             * Ejecta (at least in version 2.0) doesn't have event handlers for button input, so
             * continually checking for input is the only way for now.
             */
            initRemote = function () {
                var i = 0, l,
                    tvOSGamepads;

                if (window.ejecta) {
                    // get all connected gamepads
                    tvOSGamepads = navigator.getGamepads();
                    // find apple remote gamepad
                    for (i = 0, l = tvOSGamepads.length; i < l; ++i)
                        if (tvOSGamepads[i] && tvOSGamepads[i].profile === 'microGamepad')
                            remote = tvOSGamepads[i];

                    for (i = 0, l = remote.buttons.length; i < l; ++i)
                        remoteButtonsPressed.push(remote.buttons[i].pressed);

                    // check for button input before the regular update
                    EventSystem.on('preUpdate', checkRemote);
                }
            },
            /**
             * Checks if a remote button has been pressed. Runs before every frame, if added.
             */
            checkRemote = function () {
                var i = 0,
                    len = 0;

                // uses an array to check against the state of the buttons from the previous frame
                for (i = 0, len = remote.buttons.length; i < len; ++i) {
                    if (remote.buttons[i].pressed !== remoteButtonsPressed[i]) {
                        if (remote.buttons[i].pressed) {
                            remoteButtonDown(i);
                        } else {
                            remoteButtonUp(i);
                        }
                    }
                }
            },
            remoteButtonDown = function (id) {
                var i = 0, l,
                    names = Utils.remoteMapping[id];
                // save value in array
                remoteButtonsPressed[id] = true;

                for (i = 0, l = names.length; i < l; ++i)
                    remoteButtonStates[names[i]] = true;
            },
            remoteButtonUp = function (id) {
                var i = 0, l,
                    names = Utils.remoteMapping[id];
                // save value in array
                remoteButtonsPressed[id] = false;

                for (i = 0, l = names.length; i < l; ++i)
                    remoteButtonStates[names[i]] = false;
            },
            tvPointerDown = function (evt) {
                pointers.push({
                    id: evt.id,
                    position: evt.position,
                    eventType: evt.eventType,
                    localPosition: evt.localPosition,
                    worldPosition: evt.worldPosition
                });
                EventSystem.fire('tvPointerDown', evt);
            },
            tvPointerMove = function (evt) {
                EventSystem.fire('tvPointerMove', evt);
                updatePointer(evt);
            },
            tvPointerUp = function (evt) {
                EventSystem.fire('tvPointerUp', evt);
                removePointer(evt);
            },
            tvTouchStart = function (evt) {
                var id, i, l;
                evt.preventDefault();
                for (i = 0, l = evt.changedTouches.length; i < l; ++i) {
                    addTvTouchPosition(evt, i, 'start');
                    tvPointerDown(evt);
                }
            },
            tvTouchMove = function (evt) {
                var id, i, l;
                evt.preventDefault();
                for (i = 0, l = evt.changedTouches.length; i < l; ++i) {
                    addTvTouchPosition(evt, i, 'move');
                    tvPointerMove(evt);
                }
            },
            tvTouchEnd = function (evt) {
                var id, i, l;
                evt.preventDefault();
                for (i = 0, l = evt.changedTouches.length; i < l; ++i) {
                    addTvTouchPosition(evt, i, 'end');
                    tvPointerUp(evt);
                }
            },
            addTvTouchPosition = function (evt, n, type) {
                var touch = evt.changedTouches[n],
                    x = (touch.pageX - offsetLeft) / canvasScale.x + offsetLocal.x,
                    y = (touch.pageY - offsetTop) / canvasScale.y + offsetLocal.y,
                    startPos = {};

                evt.preventDefault();
                evt.id = 0;
                evt.eventType = 'tvtouch';
                touch.position = new Vector2(x, y);
                touch.worldPosition = touch.position.clone();
                touch.worldPosition.x += viewport.x;
                touch.worldPosition.y += viewport.y;
                touch.localPosition = touch.position.clone();
                // add 'normal' position
                evt.position = touch.position.clone();
                evt.worldPosition = touch.worldPosition.clone();
                evt.localPosition = touch.localPosition.clone();
                // id
                evt.id = touch.identifier + 1;
                // diff position
                if (type === 'start') {
                    startPos.startPosition = touch.position.clone();
                    startPos.startWorldPosition = touch.worldPosition.clone();
                    startPos.startLocalPosition = touch.localPosition.clone();
                    // save startPos
                    startPositions[evt.id] = startPos;
                }
                if (type === 'end') {
                    // load startPos
                    startPos = startPositions[evt.id];
                    if (startPos && startPos.startPosition) {
                        touch.diffPosition = touch.position.substract(startPos.startPosition);
                        touch.diffWorldPosition = touch.worldPosition.substract(startPos.startWorldPosition);
                        touch.diffLocalPosition = touch.localPosition.substract(startPos.startLocalPosition);
                        evt.diffPosition = touch.diffPosition.clone();
                        evt.diffWorldPosition = touch.diffWorldPosition.clone();
                        evt.diffLocalPosition = touch.diffLocalPosition.clone();
                        delete startPositions[evt.id];
                    } else {
                        Utils.log("ERROR: touch startPosition was not defined");
                    }
                }
            };

        if (!gameData) {
            throw 'Supply a gameData object';
        }
        // canvasScale is needed to take css scaling into account
        canvasScale = gameData.canvasScale;
        canvas = gameData.canvas;
        viewport = gameData.viewport;

        // TODO: it's a bit tricky with order of event listeners
        if (canvas) {
            window.addEventListener('resize', updateCanvas, false);
            window.addEventListener('orientationchange', updateCanvas, false);
            updateCanvas();
        }

        // touch device
        initTouch();
        // keyboard
        initKeyboard();
        // init clicks
        initMouseClicks();
        // apple remote (only on tvOS)
        initRemote();
        // start listening for gamepads
        initGamepad();

        return {
            /**
             * Returns all current pointers down
             * @function
             * @instance
             * @returns {Array} pointers - Array with pointer positions
             * @name getPointers
             */
            getPointers: function () {
                return pointers;
            },
            /**
             * Removes all current pointers down
             * @function
             * @instance
             * @name resetPointers
             */
            resetPointers: function () {
                pointers.length = 0;
            },
            /**
             * Checks if a keyboard key is down
             * @function
             * @instance
             * @param {String} name - name of the key
             * @returns {Boolean} Returns true if the provided key is down.
             * @name isKeyDown
             */
            isKeyDown: function (name) {
                return keyStates[name] || false;
            },
            /**
             * Checks if any keyboard key is pressed
             * @function
             * @instance
             * @returns {Boolean} Returns true if any provided key is down.
             * @name isAnyKeyDown
             */
            isAnyKeyDown: function () {
                var state;

                for (state in keyStates)
                    if (keyStates[state])
                        return true;

                return false;
            },
            /**
             * Is the gamepad connected?
             * @function
             * @instance
             * @returns {Boolean} Returns true if gamepad is connected, false otherwise.
             * @name isGamepadButtonDown
             */
            isGamepadConnected: function () {
                if (gamepad)
                    return true;
                else
                    return false;
            },
            /**
             * Checks if a gamepad button is down
             * @function
             * @instance
             * @param {String} name - name of the button
             * @returns {Boolean} Returns true if the provided button is down.
             * @name isGamepadButtonDown
             */
            isGamepadButtonDown: function (name) {
                return gamepadButtonStates[name] || false;
            },
            /**
             * Checks if any gamepad button is pressed
             * @function
             * @instance
             * @returns {Boolean} Returns true if any button is down.
             * @name isAnyGamepadButtonDown
             */
            isAnyGamepadButtonDown: function () {
                var state;

                for (state in gamepadButtonStates)
                    if (gamepadButtonStates[state])
                        return true;

                return false;
            },
            /**
             * Returns the current float values of the x and y axes of left thumbstick
             * @function
             * @instance
             * @returns {Vector2} Values range from (-1, -1) in the top left to (1, 1) in the bottom right.
             * @name getGamepadAxesLeft
             */
            getGamepadAxesLeft: function () {
                return new Vector2(gamepad.axes[0], gamepad.axes[1]);
            },
            /**
             * Returns the current float values of the x and y axes of right thumbstick
             * @function
             * @instance
             * @returns {Vector2} Values range from (-1, -1) in the top left to (1, 1) in the bottom right.
             * @name getGamepadAxesRight
             */
            getGamepadAxesRight: function () {
                return new Vector2(gamepad.axes[2], gamepad.axes[3]);
            },
            /**
             * Checks if a remote button is down
             * @function
             * @instance
             * @param {String} name - name of the button
             * @returns {Boolean} Returns true if the provided button is down.
             * @name isRemoteButtonDown
             */
            isRemoteButtonDown: function (name) {
                return remoteButtonStates[name] || false;
            },
            /**
             * Defines if pressing 'menu' button will go back to Apple TV home screen
             * @function
             * @instance
             * @param {Boolean} Set to false if you want to assign custom behaviour for the 'menu' button
             * @name setRemoteExitOnMenuPress
             */
            setRemoteExitOnMenuPress: function (bool) {
                remote.exitOnMenuPress = bool;
            },
            /**
             * Returns the current float values of the x and y axes of the touch area
             * @function
             * @instance
             * @returns {Vector2} Values range from (-1, -1) in the top left to (1, 1) in the bottom right.
             * @name getRemoteAxes
             */
            getRemoteAxes: function () {
                return new Vector2(remote.axes[0], remote.axes[1]);
            },
            /**
             * Stop all pointer input
             * @function
             * @instance
             * @name stop
             */
            stop: function () {
                if (!isListening) {
                    return;
                }
                if (window.ejecta) {
                    canvas.removeEventListener('tvtouchstart', tvTouchStart);
                    canvas.removeEventListener('tvtouchmove', tvTouchMove);
                    canvas.removeEventListener('tvtouchend', tvTouchEnd);
                }
                canvas.removeEventListener('touchstart', touchStart);
                canvas.removeEventListener('touchmove', touchMove);
                canvas.removeEventListener('touchend', touchEnd);
                canvas.removeEventListener('mousedown', mouseDown);
                canvas.removeEventListener('mousemove', mouseMove);
                if (settings.globalMouseUp) {
                    window.removeEventListener('mouseup', mouseUp);
                } else {
                    canvas.removeEventListener('mouseup', mouseUp);
                }

                isListening = false;
            },
            /**
             * Resumes all pointer input
             * @function
             * @instance
             * @name resume
             */
            resume: function () {
                if (isListening) {
                    return;
                }
                if (window.ejecta) {
                    canvas.addEventListener('tvtouchstart', tvTouchStart);
                    canvas.addEventListener('tvtouchmove', tvTouchMove);
                    canvas.addEventListener('tvtouchend', tvTouchEnd);
                }
                canvas.addEventListener('touchstart', touchStart);
                canvas.addEventListener('touchmove', touchMove);
                canvas.addEventListener('touchend', touchEnd);
                canvas.addEventListener('mousedown', mouseDown);
                canvas.addEventListener('mousemove', mouseMove);
                if (settings.globalMouseUp) {
                    window.addEventListener('mouseup', mouseUp);
                } else {
                    canvas.addEventListener('mouseup', mouseUp);
                }

                isListening = true;
            },
            /**
             * Changes the offsets after resizing or screen re-orientation.
             * @function
             * @instance
             * @name updateCanvas
             */
            updateCanvas: updateCanvas,
            /**
             * Adds an offset to all pointer input
             * Note that this is in local space
             * @function
             * @instance
             * @param {Vector2} offset - Offset as Vector2
             * @name setOffset
             */
            setOffset: function (offset) {
                offsetLocal = offset;
            }
        };
    };
});
/**
 * Manager that controls presistent variables. A wrapper for localStorage. Use Bento.saveState.save() to
 * save values and Bento.saveState.load() to retrieve them.
 * <br>Exports: Object, can be accessed through Bento.saveState namespace.
 * @module bento/managers/savestate
 * @moduleName SaveStateManager
 * @returns SaveState
 */
bento.define('bento/managers/savestate', [
    'bento/utils'
], function (
    Utils
) {
    'use strict';
    var uniqueID = document.URL,
        storage,
        // an object that acts like a localStorageObject
        storageFallBack = {
            data: {},
            setItem: function (key, value) {
                var k,
                    count = 0,
                    data = this.data;
                data[key] = value;
                // update length
                for (k in data) {
                    if (data.hasOwnProperty(k)) {
                        ++count;
                    }
                }
                this.length = count;
            },
            getItem: function (key) {
                var item = storageFallBack.data[key];
                return Utils.isDefined(item) ? item : null;
            },
            removeItem: function (key) {
                delete storageFallBack.data[key];
            },
            clear: function () {
                this.data = {};
                this.length = 0;
            },
            length: 0
        };

    // initialize
    try {
        storage = window.localStorage;
        // try saving once
        if (window.localStorage) {
            window.localStorage.setItem(uniqueID + 'save', '0');
        } else {
            throw 'No local storage available';
        }
    } catch (e) {
        console.log('Warning: you have disabled cookies on your browser. You cannot save progress in your game.');
        storage = storageFallBack;
    }
    return {
        /**
         * Boolean that indicates if keys should be saved
         * @instance
         * @name saveKeys
         */
        saveKeys: false,
        /**
         * Saves/serializes a variable
         * @function
         * @instance
         * @param {String} key - Name of the variable
         * @param {Object} value - Number/Object/Array to be saved
         * @name save
         */
        save: function (elementKey, element) {
            var keys;
            if (!elementKey) {
                Utils.log("ERROR: savestate key is not defined.");
                return;
            }
            if (typeof elementKey !== 'string') {
                elementKey = JSON.stringify(elementKey);
            }
            if (element === undefined) {
                Utils.log("ERROR: Don't save a value as undefined, it can't be loaded back in. Use null instead.");
                element = null;
            }
            storage.setItem(uniqueID + elementKey, JSON.stringify(element));

            // also store the keys
            if (this.saveKeys) {
                keys = this.load('_keys', []);
                if (keys.indexOf(elementKey) > -1) {
                    return;
                }
                keys.push(elementKey);
                storage.setItem(uniqueID + '_keys', JSON.stringify(keys));
            }
        },
        /**
         * Adds to a saved variable/number
         * @function
         * @instance
         * @param {String} key - Name of the variable
         * @param {Object} value - Number to be added, if the value does not exists, it defaults to 0
         * @name add
         */
        add: function (elementKey, element) {
            if (!elementKey) {
                Utils.log("ERROR: savestate key is not defined.");
                return;
            }
            var value = this.load(elementKey, 0);
            value += element;
            this.save(elementKey, value);
        },
        /**
         * Loads/deserializes a variable
         * @function
         * @instance
         * @param {String} key - Name of the variable
         * @param {Object} defaultValue - The value returns if saved variable doesn't exists
         * @returns {Object} Returns saved value, otherwise defaultValue
         * @name load
         */
        load: function (elementKey, defaultValue) {
            var element;

            if (!elementKey) {
                Utils.log("ERROR: savestate key is not defined.");
                return;
            }

            element = storage.getItem(uniqueID + elementKey);
            if (element === null || element === undefined) {
                return defaultValue;
            }
            try {
                return JSON.parse(element);
            } catch (e) {
                Utils.log("ERROR: save file corrupted. " + e);
                return defaultValue;
            }
        },
        /**
         * Deletes a variable
         * @function
         * @instance
         * @param {String} key - Name of the variable
         * @name remove
         */
        remove: function (elementKey) {
            if (!elementKey) {
                Utils.log("ERROR: savestate key is not defined.");
                return;
            }
            storage.removeItem(uniqueID + elementKey);
        },
        /**
         * Clears the savestate
         * @function
         * @instance
         * @name clear
         */
        clear: function () {
            storage.clear();
        },
        debug: function () {
            console.log(localStorage);
        },
        /**
         * Checks if localStorage has values
         * @function
         * @instance
         * @name isEmpty
         */
        isEmpty: function () {
            return storage.length === 0;
        },
        /**
         * Returns a copy of the uniqueID.
         * @function
         * @instance
         * @returns {String} uniqueID of current game
         * @name getId
         */
        getId: function () {
            return uniqueID.slice(0);
        },
        /**
         * Sets an identifier that's prepended on every key.
         * By default this is the game's URL, to prevend savefile clashing.
         * @function
         * @instance
         * @param {String} name - ID name
         * @name setId
         */
        setId: function (str) {
            uniqueID = str;
        },
        /**
         * Swaps the storage object. Allows you to use something else than localStorage. But the storage object
         * must have similar methods as localStorage.
         * @function
         * @instance
         * @param {Object} storageObject - an object that resembels localStorage
         * @name setStorage
         */
        setStorage: function (storageObj) {
            storage = storageObj;
        },
        /**
         * Returns the current storage object
         * @function
         * @instance
         * @name getStorage
         */
        getStorage: function () {
            return storage;
        }
    };
});
/**
 * Manager that controls screens. Screens are defined as separate modules. See {@link module:bento/screen}. To show
 * your screen, simply call Bento.screens.show(). See {@link module:bento/managers/screen#show}.
 * <br>Exports: Constructor, can be accessed through Bento.screens namespace.
 * @module bento/managers/screen
 * @moudleName ScreenManager
 * @returns ScreenManager
 */
bento.define('bento/managers/screen', [
    'bento/eventsystem',
    'bento/utils'
], function (EventSystem, Utils) {
    'use strict';
    return function () {
        var screens = {},
            currentScreen = null,
            getScreen = function (name) {
                return screens[name];
            },
            screenManager = {
                /**
                 * Adds a new screen to the cache
                 * @function
                 * @instance
                 * @param {Screen} screen - Screen object
                 * @name add
                 */
                add: function (screen) {
                    if (!screen.name) {
                        throw 'Add name property to screen';
                    }
                    screens[screen.name] = screen;
                },
                /**
                 * Shows a screen. If the screen was not added previously, it
                 * will be loaded asynchronously by a require call.
                 * @function
                 * @instance
                 * @param {String} name - Name of the screen
                 * @param {Object} data - Extra data to pass on to the screen
                 * @param {Function} callback - Called when screen is shown
                 * @name show
                 */
                show: function (name, data, callback) {
                    if (currentScreen !== null) {
                        screenManager.hide({
                            next: name
                        });
                    }
                    currentScreen = screens[name];
                    if (currentScreen) {
                        if (currentScreen.onShow) {
                            currentScreen.onShow(data);
                        }
                        EventSystem.fire('screenShown', currentScreen);
                        if (callback) {
                            callback();
                        }
                    } else {
                        // load asynchronously
                        bento.require([name], function (screenObj) {
                            if (!screenObj.name) {
                                screenObj.name = name;
                            }
                            screenManager.add(screenObj);
                            // try again
                            screenManager.show(name, data, callback);
                        });
                    }
                },
                /**
                 * Hides a screen. You may call this to remove all objects on screen, but
                 * it's not needed to call this yourself if you want to show a new screen.
                 * Screens.hide is internally called on the current screen when Screens.show
                 * is called.
                 * @function
                 * @instance
                 * @param {Object} data - Extra data to pass on to the screen
                 * @name hide
                 */
                hide: function (data) {
                    if (!currentScreen) {
                        return;
                    }
                    if (currentScreen.onHide) {
                        currentScreen.onHide(data);
                    }
                    EventSystem.fire('screenHidden', currentScreen);
                    currentScreen = null;
                },
                /**
                 * Return reference to the screen currently shown.
                 * @function
                 * @instance
                 * @returns {Screen} The current screen
                 * @name getCurrentScreen
                 */
                getCurrentScreen: function () {
                    return currentScreen;
                },
                /**
                 * Clears cache of screens
                 * @function
                 * @instance
                 * @name reset
                 */
                reset: function () {
                    screens = {};
                }
            };

        return screenManager;

    };
});
/**
 * A 2-dimensional array
 * <br>Exports: Constructor
 * @module bento/math/array2d
 * @moduleName Array2D
 * @param {Number} width - horizontal size of array
 * @param {Number} height - vertical size of array
 * @returns {Array} Returns 2d array.
 */
bento.define('bento/math/array2d', [], function () {
    'use strict';
    return function (width, height) {
        var array = [],
            i,
            j;

        // init array
        for (i = 0; i < width; ++i) {
            array[i] = [];
            for (j = 0; j < height; ++j) {
                array[i][j] = null;
            }
        }

        return {
            /**
             * Returns true
             * @function
             * @returns {Boolean} Is always true
             * @instance
             * @name isArray2d
             */
            isArray2d: function () {
                return true;
            },
            /**
             * Callback at every iteration.
             *
             * @callback IterationCallBack
             * @param {Number} x - The current x index
             * @param {Number} y - The current y index
             * @param {Number} value - The value at the x,y index
             */
            /**
             * Iterate through 2d array
             * @function
             * @param {IterationCallback} callback - Callback function to be called every iteration
             * @instance
             * @name iterate
             */
            iterate: function (callback) {
                var i, j;
                for (j = 0; j < height; ++j) {
                    for (i = 0; i < width; ++i) {
                        callback(i, j, array[i][j]);
                    }
                }
            },
            /**
             * Get the value inside array
             * @function
             * @param {Number} x - x index
             * @param {Number} y - y index
             * @returns {Object} The value at the index
             * @instance
             * @name get
             */
            get: function (x, y) {
                return array[x][y];
            },
            /**
             * Set the value inside array
             * @function
             * @param {Number} x - x index
             * @param {Number} y - y index
             * @param {Number} value - new value
             * @instance
             * @name set
             */
            set: function (x, y, value) {
                array[x][y] = value;
            }
        };
    };
});
/* DEPRECATED: use transformmatrix
 * Matrix
 * <br>Exports: Constructor
 * @module bento/math/matrix
 * @moduleName Matrix
 * @param {Number} width - horizontal size of matrix
 * @param {Number} height - vertical size of matrix
 * @returns {Matrix} Returns a matrix object.
 */
bento.define('bento/math/matrix', [
    'bento/utils'
], function (Utils) {
    'use strict';
    var add = function (other) {
            var newMatrix = this.clone();
            newMatrix.addTo(other);
            return newMatrix;
        },
        multiply = function (matrix1, matrix2) {
            var newMatrix = this.clone();
            newMatrix.multiplyWith(other);
            return newMatrix;
        },
        module = function (width, height) {
            var matrix = [],
                n = width || 0,
                m = height || 0,
                i,
                j,
                set = function (x, y, value) {
                    matrix[y * n + x] = value;
                },
                get = function (x, y) {
                    return matrix[y * n + x];
                };

            // initialize as identity matrix
            for (j = 0; j < m; ++j) {
                for (i = 0; i < n; ++i) {
                    if (i === j) {
                        set(i, j, 1);
                    } else {
                        set(i, j, 0);
                    }
                }
            }

            return {
                /*
                 * Returns true
                 * @function
                 * @returns {Boolean} Is always true
                 * @instance
                 * @name isMatrix
                 */
                isMatrix: function () {
                    return true;
                },
                /*
                 * Returns a string representation of the matrix (useful for debugging purposes)
                 * @function
                 * @returns {String} String matrix
                 * @instance
                 * @name stringify
                 */
                stringify: function () {
                    var i,
                        j,
                        str = '',
                        row = '';
                    for (j = 0; j < m; ++j) {
                        for (i = 0; i < n; ++i) {
                            row += get(i, j) + '\t';
                        }
                        str += row + '\n';
                        row = '';
                    }
                    return str;
                },
                /*
                 * Get the value inside matrix
                 * @function
                 * @param {Number} x - x index
                 * @param {Number} y - y index
                 * @returns {Number} The value at the index
                 * @instance
                 * @name get
                 */
                get: function (x, y) {
                    return get(x, y);
                },
                /*
                 * Set the value inside matrix
                 * @function
                 * @param {Number} x - x index
                 * @param {Number} y - y index
                 * @param {Number} value - new value
                 * @instance
                 * @name set
                 */
                set: function (x, y, value) {
                    set(x, y, value);
                },
                /*
                 * Set the values inside matrix using an array.
                 * If the matrix is 2x2 in size, then supplying an array with
                 * values [1, 2, 3, 4] will result in a matrix
                 * <br>[1 2]
                 * <br>[3 4]
                 * <br>If the array has more elements than the matrix, the
                 * rest of the array is ignored.
                 * @function
                 * @param {Array} array - array with Numbers
                 * @returns {Matrix} Returns self
                 * @instance
                 * @name setValues
                 */
                setValues: function (array) {
                    var i, l = Math.min(matrix.length, array.length);
                    for (i = 0; i < l; ++i) {
                        matrix[i] = array[i];
                    }
                    return this;
                },
                /*
                 * Get the matrix width
                 * @function
                 * @returns {Number} The width of the matrix
                 * @instance
                 * @name getWidth
                 */
                getWidth: function () {
                    return n;
                },
                /*
                 * Get the matrix height
                 * @function
                 * @returns {Number} The height of the matrix
                 * @instance
                 * @name getHeight
                 */
                getHeight: function () {
                    return m;
                },
                /*
                 * Callback at every iteration.
                 *
                 * @callback IterationCallBack
                 * @param {Number} x - The current x index
                 * @param {Number} y - The current y index
                 * @param {Number} value - The value at the x,y index
                 */
                /*
                 * Iterate through matrix
                 * @function
                 * @param {IterationCallback} callback - Callback function to be called every iteration
                 * @instance
                 * @name iterate
                 */
                iterate: function (callback) {
                    var i, j;
                    for (j = 0; j < m; ++j) {
                        for (i = 0; i < n; ++i) {
                            if (!Utils.isFunction(callback)) {
                                throw ('Please supply a callback function');
                            }
                            callback(i, j, get(i, j));
                        }
                    }
                },
                /*
                 * Transposes the current matrix
                 * @function
                 * @returns {Matrix} Returns self
                 * @instance
                 * @name transpose
                 */
                transpose: function () {
                    var i, j, newMat = [];
                    // reverse loop so m becomes n
                    for (i = 0; i < n; ++i) {
                        for (j = 0; j < m; ++j) {
                            newMat[i * m + j] = get(i, j);
                        }
                    }
                    // set new matrix
                    matrix = newMat;
                    // swap width and height
                    m = [n, n = m][0];
                    return this;
                },
                /*
                 * Addition of another matrix
                 * @function
                 * @param {Matrix} matrix - matrix to add
                 * @returns {Matrix} Updated matrix
                 * @instance
                 * @name addTo
                 */
                addTo: function (other) {
                    var i, j;
                    if (m != other.getHeight() || n != other.getWidth()) {
                        throw 'Matrix sizes incorrect';
                    }
                    for (j = 0; j < m; ++j) {
                        for (i = 0; i < n; ++i) {
                            set(i, j, get(i, j) + other.get(i, j));
                        }
                    }
                    return this;
                },
                /*
                 * Addition of another matrix
                 * @function
                 * @param {Matrix} matrix - matrix to add
                 * @returns {Matrix} A new matrix
                 * @instance
                 * @name add
                 */
                add: add,
                /*
                 * Multiply with another matrix
                 * If a new matrix C is the result of A * B = C
                 * then B is the current matrix and becomes C, A is the input matrix
                 * @function
                 * @param {Matrix} matrix - input matrix to multiply with
                 * @returns {Matrix} Updated matrix
                 * @instance
                 * @name multiplyWith
                 */
                multiplyWith: function (other) {
                    var i, j,
                        newMat = [],
                        newWidth = n, // B.n
                        oldHeight = m, // B.m
                        newHeight = other.getHeight(), // A.m
                        oldWidth = other.getWidth(), // A.n
                        newValue = 0,
                        k;
                    if (oldHeight != oldWidth) {
                        throw 'Matrix sizes incorrect';
                    }

                    for (j = 0; j < newHeight; ++j) {
                        for (i = 0; i < newWidth; ++i) {
                            newValue = 0;
                            // loop through matbentos
                            for (k = 0; k < oldWidth; ++k) {
                                newValue += other.get(k, j) * get(i, k);
                            }
                            newMat[j * newWidth + i] = newValue;
                        }
                    }
                    // set to new matrix
                    matrix = newMat;
                    // update matrix size
                    n = newWidth;
                    m = newHeight;
                    return this;
                },
                /*
                 * Multiply with another matrix
                 * If a new matrix C is the result of A * B = C
                 * then B is the current matrix and becomes C, A is the input matrix
                 * @function
                 * @param {Matrix} matrix - input matrix to multiply with
                 * @returns {Matrix} A new matrix
                 * @instance
                 * @name multiply
                 */
                multiply: multiply,
                /*
                 * Returns a clone of the current matrix
                 * @function
                 * @returns {Matrix} A new matrix
                 * @instance
                 * @name clone
                 */
                clone: function () {
                    var newMatrix = module(n, m);
                    newMatrix.setValues(matrix);
                    return newMatrix;
                }
            };
        };
    return module;
});
/**
 * Polygon
 * <br>Exports: Constructor
 * @module bento/math/polygon
 * @moduleName Polygon
 * @param {Array} points - An array of Vector2 with positions of all points
 * @returns {Polygon} Returns a polygon.
 */
// TODO: cleanup, change to prototype object
bento.define('bento/math/polygon', [
    'bento/utils',
    'bento/math/rectangle'
], function (Utils, Rectangle) {
    'use strict';
    var isPolygon = function () {
            return true;
        },
        clone = function () {
            var clone = [],
                points = this.points,
                i = points.length;
            // clone the array
            while (i--) {
                clone[i] = points[i];
            }
            return module(clone);
        },
        offset = function (pos) {
            var clone = [],
                points = this.points,
                i = points.length;
            while (i--) {
                clone[i] = points[i];
                clone[i].x += pos.x;
                clone[i].y += pos.y;
            }
            return module(clone);
        },
        doLineSegmentsIntersect = function (p, p2, q, q2) {
            // based on https://github.com/pgkelley4/line-segments-intersect
            var crossProduct = function (p1, p2) {
                    return p1.x * p2.y - p1.y * p2.x;
                },
                subtractPoints = function (p1, p2) {
                    return {
                        x: p1.x - p2.x,
                        y: p1.y - p2.y
                    };
                },
                r = subtractPoints(p2, p),
                s = subtractPoints(q2, q),
                uNumerator = crossProduct(subtractPoints(q, p), r),
                denominator = crossProduct(r, s),
                u,
                t;
            if (uNumerator === 0 && denominator === 0) {
                return ((q.x - p.x < 0) !== (q.x - p2.x < 0) !== (q2.x - p.x < 0) !== (q2.x - p2.x < 0)) ||
                    ((q.y - p.y < 0) !== (q.y - p2.y < 0) !== (q2.y - p.y < 0) !== (q2.y - p2.y < 0));
            }
            if (denominator === 0) {
                return false;
            }
            u = uNumerator / denominator;
            t = crossProduct(subtractPoints(q, p), s) / denominator;
            return (t >= 0) && (t <= 1) && (u >= 0) && (u <= 1);
        },
        intersect = function (polygon) {
            var intersect = false,
                other = [],
                points = this.points,
                p1,
                p2,
                q1,
                q2,
                i, ii,
                j, jj;

            // is other really a polygon?
            if (polygon.isRectangle) {
                // before constructing a polygon, check if boxes collide in the first place
                if (!this.getBoundingBox().intersect(polygon)) {
                    return false;
                }
                // construct a polygon out of rectangle
                other.push({
                    x: polygon.x,
                    y: polygon.y
                });
                other.push({
                    x: polygon.getX2(),
                    y: polygon.y
                });
                other.push({
                    x: polygon.getX2(),
                    y: polygon.getY2()
                });
                other.push({
                    x: polygon.x,
                    y: polygon.getY2()
                });
                polygon = module(other);
            } else {
                // simplest check first: regard polygons as boxes and check collision
                if (!this.getBoundingBox().intersect(polygon.getBoundingBox())) {
                    return false;
                }
                // get polygon points
                other = polygon.points;
            }

            // precision check
            for (i = 0, ii = points.length; i < ii; ++i) {
                for (j = 0, jj = other.length; j < jj; ++j) {
                    p1 = points[i];
                    p2 = points[(i + 1) % points.length];
                    q1 = other[j];
                    q2 = other[(j + 1) % other.length];
                    if (doLineSegmentsIntersect(p1, p2, q1, q2)) {
                        return true;
                    }
                }
            }
            // check inside one or another
            if (this.hasPosition(other[0]) || polygon.hasPosition(points[0])) {
                return true;
            } else {
                return false;
            }
        },
        hasPosition = function (p) {
            var points = this.points,
                has = false,
                i = 0,
                j = points.length - 1,
                l,
                bounds = this.getBoundingBox();

            if (p.x < bounds.x || p.x > bounds.x + bounds.width || p.y < bounds.y || p.y > bounds.y + bounds.height) {
                return false;
            }
            for (i, j, l = points.length; i < l; j = i++) {
                if ((points[i].y > p.y) != (points[j].y > p.y) &&
                    p.x < (points[j].x - points[i].x) * (p.y - points[i].y) /
                    (points[j].y - points[i].y) + points[i].x) {
                    has = !has;
                }
            }
            return has;
        },
        module = function (points) {
            var minX = points[0].x,
                maxX = points[0].x,
                minY = points[0].y,
                maxY = points[0].y,
                n = 1,
                q, l;

            for (n = 1, l = points.length; n < l; ++n) {
                q = points[n];
                minX = Math.min(q.x, minX);
                maxX = Math.max(q.x, maxX);
                minY = Math.min(q.y, minY);
                maxY = Math.max(q.y, maxY);
            }

            return {
                // TODO: use x and y as offset, widht and height as boundingbox
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY,
                /**
                 * Array of Vector2 points
                 * @instance
                 * @name points
                 */
                points: points,
                /**
                 * Returns true
                 * @function
                 * @returns {Boolean} Is always true
                 * @instance
                 * @name isPolygon
                 */
                isPolygon: isPolygon,
                /**
                 * Get the rectangle containing the polygon
                 * @function
                 * @returns {Rectangle} Rectangle containing the polygon
                 * @instance
                 * @name getBoundingBox
                 */
                getBoundingBox: function () {
                    return new Rectangle(minX, minY, maxX - minX, maxY - minY);
                },
                /**
                 * Checks if Vector2 lies within the polygon
                 * @function
                 * @returns {Boolean} true if position is inside
                 * @instance
                 * @name hasPosition
                 */
                hasPosition: hasPosition,
                /**
                 * Checks if other polygon/rectangle overlaps.
                 * Note that this may be computationally expensive.
                 * @function
                 * @param {Polygon/Rectangle} other - Other polygon or rectangle
                 * @returns {Boolean} true if polygons overlap
                 * @instance
                 * @name intersect
                 */
                intersect: intersect,
                /**
                 * Moves polygon by an offset
                 * @function
                 * @param {Vector2} vector - Position to offset
                 * @returns {Polygon} Returns a new polygon instance
                 * @instance
                 * @name offset
                 */
                offset: offset,
                /**
                 * Clones polygon
                 * @function
                 * @returns {Polygon} a clone of the current polygon
                 * @instance
                 * @name clone
                 */
                clone: clone
            };
        };
    return module;
});
/**
 * 3x 3 Matrix specifically used for transformations
 * <br>[ a c tx ]
 * <br>[ b d ty ]
 * <br>[ 0 0 1  ]
 * <br>Exports: Constructor
 * @module bento/math/transformmatrix
 * @moduleName TransformMatrix
 * @returns {Matrix} Returns a matrix object.
 */
bento.define('bento/math/transformmatrix', [
    'bento/utils',
    'bento/math/vector2'
], function (
    Utils,
    Vector2
) {
    'use strict';

    var Matrix = function () {
        if (!(this instanceof Matrix)) {
            return new Matrix();
        }
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.tx = 0;
        this.ty = 0;
    };

    /**
     * Applies matrix on a vector
     * @function
     * @returns {Vector2} Transformed vector
     * @instance
     * @name multiplyWithVector
     */
    Matrix.prototype.multiplyWithVector = function (vector) {
        var x = vector.x;
        var y = vector.y;

        vector.x = this.a * x + this.c * y + this.tx;
        vector.y = this.b * x + this.d * y + this.ty;

        return vector;
    };

    Matrix.prototype.inverseMultiplyWithVector = function (vector) {
        var x = vector.x;
        var y = vector.y;
        var determinant = 1 / (this.a * this.d - this.c * this.b);

        vector.x = this.d * x * determinant + -this.c * y * determinant + (this.ty * this.c - this.tx * this.d) * determinant;
        vector.y = this.a * y * determinant + -this.b * x * determinant + (-this.ty * this.a + this.tx * this.b) * determinant;

        return vector;
    };

    /**
     * Apply translation transformation on the matrix
     * @function
     * @param {Number} x - Translation in x axis
     * @param {Number} y - Translation in y axis
     * @returns {Matrix} Matrix with translation transform
     * @instance
     * @name translate
     */
    Matrix.prototype.translate = function (x, y) {
        this.tx += x;
        this.ty += y;

        return this;
    };

    /**
     * Apply scale transformation on the matrix
     * @function
     * @param {Number} x - Scale in x axis
     * @param {Number} y - Scale in y axis
     * @returns {Matrix} Matrix with scale transform
     * @instance
     * @name scale
     */
    Matrix.prototype.scale = function (x, y) {
        this.a *= x;
        this.b *= y;
        this.c *= x;
        this.d *= y;
        this.tx *= x;
        this.ty *= y;

        return this;
    };

    /**
     * Apply rotation transformation on the matrix
     * @function
     * @param {Number} angle - Angle to rotate in radians
     * @param {Number} [sin] - Precomputed sin(angle) if known
     * @param {Number} [cos] - Precomputed cos(angle) if known
     * @returns {Matrix} Matrix with rotation transform
     * @instance
     * @name rotate
     */
    Matrix.prototype.rotate = function (angle, sin, cos) {
        var a = this.a;
        var b = this.b;
        var c = this.c;
        var d = this.d;
        var tx = this.tx;
        var ty = this.ty;

        if (sin === undefined) {
            sin = Math.sin(angle);
        }
        if (cos === undefined) {
            cos = Math.cos(angle);
        }

        this.a = a * cos - b * sin;
        this.b = a * sin + b * cos;
        this.c = c * cos - d * sin;
        this.d = c * sin + d * cos;
        this.tx = tx * cos - ty * sin;
        this.ty = tx * sin + ty * cos;

        return this;
    };

    /**
     * Multiplies matrix
     * @function
     * @param {Matrix} matrix - Matrix to multiply with
     * @returns {Matrix} Self
     * @instance
     * @name multiplyWith
     */
    Matrix.prototype.multiplyWith = function (matrix) {
        var a = this.a;
        var b = this.b;
        var c = this.c;
        var d = this.d;

        this.a = matrix.a * a + matrix.b * c;
        this.b = matrix.a * b + matrix.b * d;
        this.c = matrix.c * a + matrix.d * c;
        this.d = matrix.c * b + matrix.d * d;
        this.tx = matrix.tx * a + matrix.ty * c + this.tx;
        this.ty = matrix.tx * b + matrix.ty * d + this.ty;

        return this;
    };
    /**
     * Multiplies matrix
     * @function
     * @param {Matrix} matrix - Matrix to multiply with
     * @returns {Matrix} Cloned matrix
     * @instance
     * @name multiply
     */
    Matrix.prototype.multiply = function (matrix) {
        return this.clone().multiplyWith(matrix);
    };

    /**
     * Clones matrix
     * @function
     * @returns {Matrix} Cloned matrix
     * @instance
     * @name clone
     */
    Matrix.prototype.clone = function () {
        var matrix = new Matrix();
        matrix.a = this.a;
        matrix.b = this.b;
        matrix.c = this.c;
        matrix.d = this.d;
        matrix.tx = this.tx;
        matrix.ty = this.ty;

        return matrix;
    };

    /**
     * Resets matrix to identity matrix
     * @function
     * @returns {Matrix} Self
     * @instance
     * @name reset
     */
    Matrix.prototype.reset = function () {
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.tx = 0;
        this.ty = 0;
        return this;
    };
    Matrix.prototype.identity = Matrix.prototype.reset;

    /**
     * Prepend matrix
     * @function
     * @param {Matrix} Other matrix
     * @instance
     * @returns {Matrix} Self
     */
    Matrix.prototype.prependWith = function (matrix) {
        var selfTx = this.tx;
        var selfA = this.a;
        var selfC = this.c;

        this.a = selfA * matrix.a + this.b * matrix.c;
        this.b = selfA * matrix.b + this.b * matrix.d;
        this.c = selfC * matrix.a + this.d * matrix.c;
        this.d = selfC * matrix.b + this.d * matrix.d;

        this.tx = selfTx * matrix.a + this.ty * matrix.c + matrix.tx;
        this.ty = selfTx * matrix.b + this.ty * matrix.d + matrix.ty;

        return this;
    };

    /**
     * Prepends matrix
     * @function
     * @param {Matrix} matrix - Matrix to prepend
     * @returns {Matrix} Cloned matrix
     * @instance
     * @name prepend
     */
    Matrix.prototype.prepend = function (matrix) {
        return this.clone().prependWith(matrix);
    };

    // aliases
    Matrix.prototype.appendWith = Matrix.prototype.multiplyWith;
    Matrix.prototype.append = Matrix.prototype.multiply;


    Matrix.prototype.toString = function () {
        return '[object Matrix]';
    };
    return Matrix;
});
/**
 * A helper module that returns a rectangle with the same aspect ratio as the screen size.
 * Assuming portrait mode, autoresize holds the width and then fills up the height
 * If the height goes over the max or minimum size, then the width gets adapted.
 * <br>Exports: Constructor
 * @module bento/autoresize
 * @moduleName AutoResize
 * @param {Rectangle} canvasDimension - Default size
 * @param {Number} minSize - Minimal height (in portrait mode), if the height goes lower than this,
 * then autoresize will start filling up the width
 * @param {Boolean} isLandscape - Game is landscape, swap operations of width and height
 * @returns Rectangle
 */
bento.define('bento/autoresize', [
    'bento/utils'
], function (Utils) {
    return function (canvasDimension, minSize, maxSize, isLandscape) {
        var originalDimension = canvasDimension.clone(),
            innerWidth = window.innerWidth,
            innerHeight = window.innerHeight,
            devicePixelRatio = window.devicePixelRatio,
            deviceHeight = !isLandscape ? innerHeight * devicePixelRatio : innerWidth * devicePixelRatio,
            deviceWidth = !isLandscape ? innerWidth * devicePixelRatio : innerHeight * devicePixelRatio,
            swap = function () {
                // swap width and height
                var temp = canvasDimension.width;
                canvasDimension.width = canvasDimension.height;
                canvasDimension.height = temp;
            },
            setup = function () {
                var ratio = deviceWidth / deviceHeight;

                if (ratio > 1) {
                    // user is holding device wrong
                    ratio = 1 / ratio;
                }

                canvasDimension.height = canvasDimension.width / ratio;

                // exceed min size?
                if (canvasDimension.height < minSize) {
                    canvasDimension.height = minSize;
                    canvasDimension.width = ratio * canvasDimension.height;
                }
                if (canvasDimension.height > maxSize) {
                    canvasDimension.height = maxSize;
                    canvasDimension.width = ratio * canvasDimension.height;
                }

                if (isLandscape) {
                    swap();
                }

                console.log('Screen size: ' + innerWidth * devicePixelRatio + ' x ' + innerHeight * devicePixelRatio);
                console.log('Resolution: ' + canvasDimension.width.toFixed(2) + ' x ' + canvasDimension.height.toFixed(2));
                return canvasDimension;
            },
            scrollAndResize = function () {
                window.scrollTo(0, 0);
            };


        window.addEventListener('orientationchange', scrollAndResize, false);

        if (isLandscape) {
            swap();
        }

        return setup();
    };
});
/**
 * An Entity that helps using a HTML5 2d canvas as Sprite. Its component temporarily takes over
 * the renderer, so any entity that gets attached to the parent will start drawing on the canvas.
 * <br>Exports: Constructor
 * @param {Object} settings - Required, set the width and height
 * @param {Number} settings.width - Width of the canvas (ignored if settings.canvas is set)
 * @param {Number} settings.height - Height of the canvas (ignored if settings.canvas is set)
 * @param {HTML-Canvas-Element} (settings.canvas) - Reference to an existing canvas object. Optional.
 * @param {Number} settings.preventAutoClear - Stops the canvas from clearing every tick
 * @param {Number} settings.pixelSize - size of a pixel (multiplies canvas size)
 * @module bento/canvas
 * @moduleName Canvas
 * @returns Entity
 * @snippet Canvas|constructor
Canvas({
    z: ${1:0},
    width: ${2:64},
    height: ${3:64},
    preventAutoClear: ${4:false}, // prevent canvas from clearing every tick
    pixelSize: ${5:1}, // multiplies internal canvas size
    drawOnce: ${6:false}, // draw canvas only once
    originRelative: new Vector2(${7:0}, ${8:0}),
    components: []
});
 */
bento.define('bento/canvas', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/components/sprite',
    'bento/components/clickable',
    'bento/entity',
    'bento/eventsystem',
    'bento/utils',
    'bento/tween',
    'bento/packedimage',
    'bento/objectpool',
    'bento/renderers/canvas2d'
], function (
    Bento,
    Vector2,
    Rectangle,
    Sprite,
    Clickable,
    Entity,
    EventSystem,
    Utils,
    Tween,
    PackedImage,
    ObjectPool,
    Canvas2D
) {
    'use strict';
    var canvasPool = new ObjectPool({
        poolSize: 1,
        constructor: function () {
            var canvas = document.createElement('canvas');

            return canvas;
        },
        destructor: function (obj) {
            // clear canvas
            var context = obj.getContext('2d');
            context.clearRect(0, 0, obj.width, obj.height);
            // clear texture
            if (obj.texture) {
                obj.texture = null;
            }
            return obj;
        }
    });
    return function (settings) {
        var viewport = Bento.getViewport();
        var i;
        var l;
        var sprite;
        var canvas;
        var context;
        var originalRenderer;
        var renderer;
        var packedImage;
        var origin = new Vector2(0, 0);
        var entity;
        var components;
        var drawn = false;
        // this component swaps the renderer with a Canvas2D renderer (see bento/renderers/canvas2d)
        var component = {
            name: 'rendererSwapper',
            draw: function (data) {
                // draw once
                if (drawn) {
                    return;
                }

                // clear up canvas
                if (!settings.preventAutoClear) {
                    context.clearRect(0, 0, canvas.width, canvas.height);
                }

                // clear up webgl
                if (canvas.texture) {
                    canvas.texture = null;
                }

                // swap renderer
                originalRenderer = data.renderer;
                data.renderer = renderer;

                // re-apply the origin translation
                data.renderer.save();
                data.renderer.translate(Math.round(origin.x), Math.round(origin.y));
            },
            postDraw: function (data) {
                if (drawn) {
                    return;
                }
                data.renderer.restore();
                // swap back
                data.renderer = originalRenderer;

                // draw once
                if (settings.drawOnce) {
                    drawn = true;
                }
            }
        };

        // init canvas
        if (settings.canvas) {
            canvas = settings.canvas;
        } else {
            canvas = canvasPool.get();
            canvas.width = settings.width;
            canvas.height = settings.height;
        }
        context = canvas.getContext('2d');

        // init renderer
        renderer = new Canvas2D(canvas, {
            pixelSize: settings.pixelSize || 1
        });

        if (settings.origin) {
            origin = settings.origin;
        } else if (settings.originRelative) {
            origin = new Vector2(
                settings.width * settings.originRelative.x,
                settings.height * settings.originRelative.y
            );
        }

        // init sprite
        packedImage = new PackedImage(canvas);
        sprite = new Sprite({
            image: packedImage,
            origin: settings.origin,
            originRelative: settings.originRelative
        });

        // init entity and its components
        // sprite goes before the swapcomponent, otherwise the canvas will never be drawn
        components = [sprite, component];
        // attach any other component in settings
        if (settings.components) {
            for (i = 0, l = settings.components.length; i < l; ++i) {
                components.push(settings.components[i]);
            }
        }
        entity = new Entity({
            z: settings.z,
            name: settings.name || 'canvas',
            position: settings.position,
            components: components,
            family: settings.family,
            init: settings.init
        });

        // public interface
        entity.extend({
            /**
             * Returns the canvas element
             * @function
             * @instance
             * @returns HTML Canvas Element
             * @name getCanvas
             * @snippet #Canvas.getCanvas|CanvasElement
                getCanvas();
             */
            getCanvas: function () {
                return canvas;
            },
            /**
             * Returns the 2d context, to perform manual drawing operations
             * @function
             * @instance
             * @returns HTML Canvas 2d Context
             * @snippet #Canvas.getContext|Context2D
                getContext();
             * @name getContext
             */
            getContext: function () {
                return context;
            },
            /**
             * Get the base64 string of the canvas
             * @function
             * @instance
             * @returns String
             * @name getBase64
             * @snippet #Canvas.getBase64|String
                getBase64();
             */
            getBase64: function () {
                return canvas.toDataURL();
            },
            /**
             * Download the canvas as png (useful for debugging purposes)
             * @function
             * @instance
             * @name downloadImage
             * @snippet #Canvas.downloadImage|debug
                downloadImage();
             */
            downloadImage: function (name) {
                var link = document.createElement("a");
                link.download = name || entity.name;
                link.href = canvas.toDataURL();
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            },
            /**
             * Call this function if you have no intent on attaching the canvas,
             * but you do want to draw on the canvas once
             * @function
             * @instance
             * @name drawOnce
             * @snippet #Canvas.drawOnce|snippet
                drawOnce();
             */
            drawOnce: function (data) {
                if (canvas.isAdded) {
                    Utils.log('This Canvas is already attached, no need to call this function.');
                    return;
                }
                canvas.start(data);
                canvas.draw(data);
            }
        });

        return entity;
    };
});
/*
 * Returns a color array, for use in renderer
 * <br>Exports: Constructor
 * @param {Number} r - Red value [0...255]
 * @param {Number} g - Green value [0...255]
 * @param {Number} b - Blue value [0...255]
 * @param {Number} a - Alpha value [0...1]
 * @returns {Array} Returns a color array
 * @module bento/color
 * @module Color
 */
bento.define('bento/color', ['bento/utils'], function (Utils) {
    return function (r, g, b, a) {
        r = r / 255;
        r = g / 255;
        r = b / 255;
        if (!Utils.isDefined(a)) {
            a = 1;
        }
        return [r, g, b, a];
    };
});
/*
 * DEPRECATED
 * Simple container that masks the children's sprites in a rectangle. Does not work with rotated children.
 * The container's boundingbox is used as mask.
 * @moduleName MaskedContainer
 */
bento.define('bento/maskedcontainer', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/components/sprite',
    'bento/components/clickable',
    'bento/entity',
    'bento/eventsystem',
    'bento/gui/clickbutton',
    'bento/gui/counter',
    'bento/gui/text',
    'bento/utils',
    'bento/tween'
], function (
    Bento,
    Vector2,
    Rectangle,
    Sprite,
    Clickable,
    Entity,
    EventSystem,
    ClickButton,
    Counter,
    Text,
    Utils,
    Tween
) {
    'use strict';
    return function (settings) {
        var viewport = Bento.getViewport();
        var components = settings.components || [];
        var container;
        var maskedDraw = function (data) {
            // target rectangle to draw, determine x and y below
            var target;
            // mask is local to the container
            var mask = container.getBoundingBox();
            if (!this.currentAnimation || !this.visible) {
                return;
            }

            // do the sprite update
            var entity = data.entity;
            this.updateFrame();

            // determine target
            // target is local to the sprite
            target = new Rectangle(
                (-this.origin.x) | 0,
                (-this.origin.y) | 0,
                this.frameWidth,
                this.frameHeight
            );

            // we have to transform the mask to the sprite's local space
            // first to world
            var maskTopLeftWorld = container.toWorldPosition(mask.getCorner(Rectangle.TOPLEFT));
            var maskBottomRightWorld = container.toWorldPosition(mask.getCorner(Rectangle.BOTTOMRIGHT));
            // world to sprite's local
            var maskTopLeft = entity.toLocalPosition(maskTopLeftWorld);
            var maskBottomRight = entity.toLocalPosition(maskBottomRightWorld);
            // construct a rectangle using the topleft and bottomright positions
            var localMask = new Rectangle(maskTopLeft.x, maskTopLeft.y, maskBottomRight.x - maskTopLeft.x, maskBottomRight.y - maskTopLeft.y);
            // get the intersection between mask and target
            var intersection = localMask.intersection(target);

            if (!intersection.width && !intersection.height) {
                // there is nothing to draw
                return;
            }
            // console.log(intersection)

            data.renderer.drawImage(
                this.spriteImage,
                this.sourceX + (intersection.x - target.x),
                this.sourceY + (intersection.y - target.y),
                intersection.width,
                intersection.height,
                intersection.x,
                intersection.y,
                intersection.width,
                intersection.height
            );
        };
        // traverse through children, find sprites
        var traverse = function (children) {
            Utils.forEach(children, function (child, i, l, breakLoop) {
                // check if this is an entity
                if (child.components) {
                    traverse(child.components);
                }
                // overwrite the sprite's draw function
                if (child.name === 'sprite' && child.draw !== maskedDraw) {
                    child.draw = maskedDraw;
                }
            });
        };
        // this component traverses through all child components and updates the sprites
        var watcher = {
            name: 'componentWatcher',
            start: function () {
                traverse(components);
            },
            update: function () {
                // would be better to only traverse when a new entity/component is attached, this requires some new event
                // for now, it's a setting
                if (settings.watchComponents) {
                    traverse(components);
                }
            }
        };

        components.push(watcher);

        container = new Entity(settings);
        return container;
    };
});
/**
 * General object pool
 * <br>Exports: Constructor
 * @param {Object} settings - Settings object is required
 * @param {Function} settings.constructor - function that returns the object for pooling
 * @param {Function} settings.destructor - function that resets object for reuse
 * @param {Number} settings.poolSize - amount to pre-initialize
 * @module bento/objectpool
 * @moduleName ObjectPool
 * @returns ObjectPool
 */
bento.define('bento/objectpool', [
    'bento',
    'bento/utils'
], function (
    Bento,
    Utils
) {
    'use strict';
    return function (specs) {
        var pool = [],
            isInitialized = false,
            constructor = specs.constructor,
            destructor = specs.destructor,
            pushObject = function () {
                pool.push(constructor());
            };

        if (!constructor) {
            throw 'Error: Must pass a settings.constructor function that returns an object';
        }
        if (!destructor) {
            throw 'Error: Must pass a settings.destructor function that cleans the object';
        }

        // return interface
        return {
            /**
             * Returns a new object from the pool, the pool is populated automatically if empty
             */
            get: function () {
                // pool is empty!
                if (pool.length === 0) {
                    pushObject();
                }
                // get the last in the pool
                return pool.pop();
            },
            /**
             * Puts object back in the pool
             */
            discard: function (obj) {
                // reset the object
                destructor(obj);
                // put it back
                pool.push(obj);
            },
            init: function () {
                if (isInitialized) {
                    return;
                }
                isInitialized = true;
                Utils.repeat(specs.poolSize || 0, pushObject);

            }
        };
    };
});
/**
 * Screen object. Screens are convenience modules that are similar to levels/rooms/scenes in games.
 * Tiled Map Editor can be used to design the levels {@link http://www.mapeditor.org/}.
 * Note: in Tiled, you must export as json file and leave uncompressed as CSV (for now)
 * <br>Exports: Constructor
 * @module bento/screen
 * @moduleName Screen
 * @param {Object} settings - Settings object
 * @param {String} settings.tiled - Asset name of the json file
 * @param {String} settings.onShow - Callback when screen starts
 * @param {String} settings.onHide - Callback when screen is removed
 * @param {Rectangle} [settings.dimension] - Set dimension of the screen (overwritten by tmx size)
 * @returns Screen
 */
bento.define('bento/screen', [
    'bento/utils',
    'bento',
    'bento/math/rectangle',
    'bento/math/vector2',
    'bento/tiled'
], function (Utils, Bento, Rectangle, Vector2, Tiled) {
    'use strict';
    var Screen = function (settings) {
        /*settings = {
            dimension: Rectangle, [optional / overwritten by tmx size]
            tiled: String
        }*/
        var viewport = Bento.getViewport(),
            module = {
                /**
                 * Name of the screen
                 * @instance
                 * @name name
                 */
                name: null,
                /**
                 * Reference to Tiled object (if tiled was used)
                 * @instance
                 * @see module:bento/tiled
                 * @name tiled
                 */
                tiled: null,
                /**
                 * Dimension of the screen
                 * @instance
                 * @name dimension
                 */
                dimension: (settings && settings.dimension) ? settings.dimension : viewport.clone(),
                extend: function (object) {
                    return Utils.extend(this, object);
                },
                /**
                 * Loads a tiled map
                 * @function
                 * @instance
                 * @returns {String} name - Name of the JSON asset
                 * @name loadTiled
                 */
                loadTiled: function (name) {
                    this.tiled = new Tiled({
                        assetName: name,
                        spawnBackground: true,
                        spawnEntities: true
                    });
                    this.dimension = this.tiled.dimension;
                },
                /**
                 * Callback when the screen is shown (called by screen manager)
                 * @function
                 * @instance
                 * @returns {Object} data - Extra data to be passed
                 * @name onShow
                 */
                onShow: function (data) {
                    if (settings) {
                        // load tiled map if present
                        if (settings.tiled) {
                            this.loadTiled(settings.tiled);
                        }
                        // callback
                        if (settings.onShow) {
                            settings.onShow.call(module, data);
                        }
                    }
                },
                /**
                 * Removes all objects and restores viewport position
                 * @function
                 * @instance
                 * @returns {Object} data - Extra data to be passed
                 * @name onHide
                 */
                onHide: function (data) {
                    var viewport = Bento.getViewport();
                    // 1st callback
                    if (settings.onHide) {
                        settings.onHide.call(module, data);
                    }
                    // reset viewport scroll when hiding screen
                    viewport.x = 0;
                    viewport.y = 0;
                    // remove all objects
                    Bento.removeAll();

                    // 2nd callback
                    if (settings.onHidden) {
                        settings.onHidden.call(module, data);
                    }
                    // reset pause level
                    Bento.objects.resume();
                }
            };

        return module;
    };
    return Screen;
});
/**
 * Sorted EventSystem is EventSystem's "little brother". It's functionality is the same as
 * EventSystem, except you can pass a component to the event listener. The event listener will then
 * be sorted by which component is visually "on top". Sorted EventSystem will listen to events fired by
 * the normal EventSystem. Recommended to use this only when you need to.
 * <br>Exports: Object
 * @module bento/sortedeventsystem
 */
bento.define('bento/sortedeventsystem', [
    'bento',
    'bento/eventsystem',
    'bento/utils'
], function (
    Bento,
    EventSystem,
    Utils
) {
    // sorting data class: its purpose is to cache variables useful for sorting
    var SortingData = function (component) {
        var rootIndex = -1; // index of root parent in object manager
        var componentIndex = -1; // index of component in entity
        var depth = -1; // how many grandparents
        var parent = component.parent; // component's direct parent
        var parentIndex = -1;
        var parents = [];
        var rootParent = null;
        var rootZ;

        // init objects if needed
        if (objects === null) {
            objects = Bento.objects.getObjects();
        }

        if (!parent) {
            // either the component itself a rootParent, or it wasn't attached yet
            rootParent = component;
        } else {
            // get index of component
            componentIndex = component.rootIndex;
            // grandparent?
            if (parent.parent) {
                parentIndex = parent.rootIndex;
            }

            // find the root
            while (parent) {
                parents.unshift(parent);
                depth += 1;
                if (!parent.parent) {
                    // current parent must be the root
                    rootParent = parent;
                }
                // next iteration
                parent = parent.parent;
            }
        }

        // collect data
        rootIndex = rootParent.rootIndex;
        rootZ = rootParent.z;

        this.isDirty = false;
        this.component = component;
        this.parent = parent;
        this.parentIndex = parentIndex;
        this.parents = parents;
        this.componentIndex = componentIndex;
        this.depth = depth;
        this.rootParent = rootParent;
        this.rootIndex = rootIndex;
        this.rootZ = rootZ;
    };

    var isLoopingEvents = false;
    var objects = null;
    var events = {};
    /*events = {
        [String eventName]: [Array listeners = {callback: Function, context: this}]
    }*/
    var removedEvents = [];
    var cleanEventListeners = function () {
        var i, j, l, listeners, eventName, callback, context;

        if (isLoopingEvents) {
            return;
        }
        for (j = 0, l = removedEvents.length; j < l; ++j) {
            eventName = removedEvents[j].eventName;
            if (removedEvents[j].reset === true) {
                // reset the whole event listener
                events[eventName] = [];
                continue;
            }
            callback = removedEvents[j].callback;
            context = removedEvents[j].context;
            if (Utils.isUndefined(events[eventName])) {
                continue;
            }
            listeners = events[eventName];
            for (i = listeners.length - 1; i >= 0; --i) {
                if (listeners[i].callback === callback) {
                    if (context) {
                        if (listeners[i].context === context) {
                            events[eventName].splice(i, 1);
                            break;
                        }
                    } else {
                        events[eventName].splice(i, 1);
                        break;
                    }
                }
            }
        }
        removedEvents = [];
    };
    var addEventListener = function (component, eventName, callback, context) {
        var sortingData = new SortingData(component);

        if (Utils.isString(component)) {
            Utils.log('ERROR: First parameter of SortedEventSystem.on is the component!');
            return;
        }
        if (Utils.isUndefined(events[eventName])) {
            events[eventName] = [];
        }
        events[eventName].push({
            sortingData: sortingData,
            callback: callback,
            context: context
        });
    };
    var removeEventListener = function (eventName, callback, context) {
        var listeners = events[eventName];
        if (!listeners || listeners.length === 0) {
            return;
        }
        removedEvents.push({
            eventName: eventName,
            callback: callback,
            context: context
        });

        if (!isLoopingEvents) {
            // can clean immediately
            cleanEventListeners();
        }
    };
    var clearEventListeners = function (eventName) {
        var listeners = events[eventName];
        if (!listeners || listeners.length === 0) {
            return;
        }
        removedEvents.push({
            eventName: eventName,
            reset: true
        });

        if (!isLoopingEvents) {
            // can clean immediately
            cleanEventListeners();
        }
    };
    var sortFunction = function (a, b) {
        // sort event listeners by the component location in the scenegraph
        var sortA = a.sortingData;
        var sortB = b.sortingData;
        // refresh sorting data
        if (sortA.isDirty) {
            a.sortingData = new SortingData(sortA.component);
            sortA = a.sortingData;
        }
        if (sortB.isDirty) {
            b.sortingData = new SortingData(sortB.component);
            sortB = b.sortingData;
        }

        // 0. A === B
        if (sortA.component === sortB.component) {
            // no preference.
            return 0;
        }

        // 1. Sort by z
        var zDiff = sortB.rootZ - sortA.rootZ;
        if (zDiff) {
            return zDiff;
        }

        // 2. Same z: sort by index of the root entity
        var rootDiff = sortB.rootIndex - sortA.rootIndex;
        if (rootDiff) {
            // different roots: sort by root
            return rootDiff;
        }

        // 3. Same index: the components must have common (grand)parents, aka in the same scenegraph
        // NOTE: there might be a better way to sort scenegraphs than this
        // 3A. are the components siblings?
        var parentA = sortA.component.parent;
        var parentB = sortB.component.parent;
        if (parentA === parentB) {
            return sortB.componentIndex - sortA.componentIndex;
        }
        // 3B. common grandparent? This should be a pretty common case
        if (parentA && parentB && parentA.parent === parentB.parent) {
            return sortB.parentIndex - sortA.parentIndex;
        }

        // 3C. one of the component's parent entity is a (grand)parent of the other?
        if (sortA.parents.indexOf(sortB.component.parent) >= 0 || sortB.parents.indexOf(sortA.component.parent) >= 0) {
            return sortB.depth - sortA.depth;
        }
        // 3D. last resort: find the earliest common parent and compare their component index
        return findCommonParentIndex(sortA, sortB);
    };
    var findCommonParentIndex = function (sortA, sortB) {
        // used when components have a common parent, but that common parent is not the root
        var parentsA = sortA.parents;
        var parentsB = sortB.parents;
        var min = Math.min(parentsA.length, parentsB.length);
        var i;
        var commonParent = null;
        var componentA;
        var componentB;
        // find the last common parent
        for (i = 0; i < min; ++i) {
            if (parentsA[i] === parentsB[i]) {
                commonParent = parentsA[i];
            } else {
                // we found the last common parent, now we need to compare these children
                componentA = parentsA[i];
                componentB = parentsB[i];
                break;
            }
        }
        if (!commonParent || !commonParent.components) {
            // error: couldn't find common parent
            return 0;
        }
        // compare indices
        return commonParent.components.indexOf(componentB) - commonParent.components.indexOf(componentA);
    };
    var inspectSortingData = function (listeners) {
        // go through all sortingData and check if their z index didnt change in the meantime
        var sortingData;
        var i = 0,
            l = listeners.length;
        for (i = 0; i < l; ++i) {
            sortingData = listeners[i].sortingData;
            if (sortingData.rootZ !== sortingData.rootParent.z) {
                sortingData.isDirty = true;
            }
            // update rootIndex
            sortingData.rootIndex = sortingData.rootParent.rootIndex;
        }
    };
    var sortListeners = function (listeners) {
        // sort the listeners
        Utils.stableSort.inplace(listeners, sortFunction);
    };
    var stopPropagation = false;

    var SortedEventSystem = {
        suppressWarnings: false,
        stopPropagation: function () {
            stopPropagation = true;
        },
        fire: function (eventName, eventData) {
            var i, l, listeners, listener;

            stopPropagation = false;

            // clean up before firing event
            cleanEventListeners();

            if (!Utils.isString(eventName)) {
                eventName = eventName.toString();
            }
            if (Utils.isUndefined(events[eventName])) {
                return;
            }

            listeners = events[eventName];

            // leaving this for debugging purposes
            // if (eventName === 'pointerDown') {
            //     console.log(listeners);
            // }

            // sort before looping through listeners
            inspectSortingData(listeners);
            sortListeners(listeners);

            for (i = 0, l = listeners.length; i < l; ++i) {
                isLoopingEvents = true;
                listener = listeners[i];
                if (listener) {
                    if (listener.context) {
                        listener.callback.apply(listener.context, [eventData]);
                    } else {
                        listener.callback(eventData);
                    }
                } else if (!this.suppressWarnings) {
                    // TODO: this warning appears when event listeners are removed
                    // during another listener being triggered. For example, removing an entity
                    // while that entity was listening to the same event.
                    // In a lot of cases, this is normal... Consider removing this warning?
                    // console.log('Warning: listener is not a function');
                }
                if (stopPropagation) {
                    stopPropagation = false;
                    break;
                }
            }
            isLoopingEvents = false;
        },
        addEventListener: addEventListener,
        removeEventListener: removeEventListener,
        /**
         * Callback function
         *
         * @callback Callback
         * @param {Object} eventData - Any data that is passed
         */
        /**
         * Listen to event.
         * @function
         * @instance
         * @param {Object} component - The component as sorting reference
         * @param {String} eventName - Name of the event
         * @param {Callback} callback - Callback function.
         * Be careful about adding anonymous functions here, you should consider removing the event listener
         * to prevent memory leaks.
         * @param {Object} [context] - For prototype objects only: if the callback function is a prototype of an object
         you must pass the object instance or "this" here!
         * @name on
         */
        on: addEventListener,
        /**
         * Removes event listener
         * @function
         * @instance
         * @param {String} eventName - Name of the event
         * @param {Callback} callback - Reference to the callback function
         * @param {Object} [context] - For prototype objects only: if the callback function is a prototype of an object
         you must pass the object instance or "this" here!
         * @name off
         */
        off: removeEventListener,
        clear: clearEventListeners,
        sortListeners: sortListeners
    };

    // save reference in EventSystem
    EventSystem.SortedEventSystem = SortedEventSystem;


    return SortedEventSystem;
});
/**
 * Reads Tiled JSON file and draws layers.
 * Tile layers are drawn onto canvas images. If the map is larger than maxCanvasSize (default 1024 * 1024),
 * the layer is split into multiple canvases. Easiest way to get started is to pass the asset name of the Tiled
 * JSON and set spawnBackground and spawnEntities to true.
 * <br>Exports: Constructor
 * @module bento/tiled
 * @moduleName Tiled
 * @param {Object} settings - Settings object
 * @param {String} settings.assetName - Name of the Tiled JSON asset to load
 * @param {Boolean} [settings.merge] - Merge tile layers into a single canvas layer, default: false
 * @param {Vector2} [settings.maxCanvasSize] - Max canvasSize for the canvas objects, default: Vector2(1024, 1024)
 * @param {Vector2} [settings.offset] - Offsets all entities/backgrounds spawned
 * @param {Function} [settings.onInit] - Callback on initial parsing, parameters: (tiledJson, externalTilesets)
 * @param {Function} [settings.onLayer] - Callback when the reader passes a layer object, parameters: (layer)
 * @param {Function} [settings.onTile] - Callback after tile is drawn, parameters: (tileX, tileY, tilesetJSON, tileIndex)
 * @param {Function} [settings.onObject] - Callback when the reader passes a Tiled object, parameters: (objectJSON, tilesetJSON, tileIndex) <br>Latter two if a gid is present. If no gid is present in the object JSON, it's most likely a shape! Check for object.rectangle, object.polygon etc.
 * @param {Function} [settings.onComplete] - Called when the reader passed all layers
 * @param {Boolean} [settings.drawTiles] - Draw tiles (default: true)
 * @param {Boolean} [settings.spawnBackground] - Spawns background entities (drawn tile layers)
 * @param {Boolean} [settings.spawnEntities] - Spawns objects (in Tiled: assign a tile property called "module" and enter the module name, placing an object with that tile will spawn the corresponding entity), shapes are not spawned! You are expected to handle this yourself with the onObject callback.
 * @param {Boolean} [settings.onSpawn] - Callback when entity is spawned, parameters: (entity)
 * @param {Boolean} [settings.onSpawnComplete] - Callback when all entities were spawned, may be called later than onComplete due to its asynchronous nature
 * @param {Boolean} [settings.cacheModules] - Cache spawned modules. Modules are retrieved with bento.require, caching them can speed up loading. Note that it also can clash with quick reloading unless the cache is cleared on reload. default: false
 * @returns Object
 * @snippet Tiled|constructor
Tiled({
    assetName: '$1',
    drawTiles: ${2:true},
    merge: ${3:false},
    spawnEntities: ${4:true}, // require the module (asynchronously)
    spawnBackground: ${5:true}, // spawn background entities (drawn tile layers)
    attachEntities: ${6:true}, // attach after spawning
    onInit: function (tiledJson, externalTilesets) {
        // Callback after initial parsing
        $7
    },
    onLayer: function (layer) {
        // Callback when the reader passes a layer
        $8
    },
    onTile: function (tileX, tileY, tilesetJSON, tileIndex) {
        // Callback after tile is drawn
        $9
    },
    onObject: function (objectJSON, tilesetJSON, tileIndex) {
        // Callback when the reader passes a Tiled object
        ${10}
    },
    onComplete: function () {
        // Synchronous callback when the reader passed all layers
        // `this` references the tiled object (to get width and height)
        ${11}
    },
    onLayerMergeCheck: function (layer) {
        // called for each layer when merge: true
        // return false if layer should not merge
        return ${12:true};
    },
    onSpawn: function (entity) {
        // called after all a module is spawned (asynchronous)
        ${13}
    },
    onSpawnComplete: function () {
        // called after all modules are spawned (asynchronous)
        ${14}
    }
});
 */
bento.define('bento/tiled', [
    'bento',
    'bento/entity',
    'bento/components/sprite',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/math/polygon',
    'bento/packedimage',
    'bento/utils',
    'bento/tiledreader'
], function (
    Bento,
    Entity,
    Sprite,
    Vector2,
    Rectangle,
    Polygon,
    PackedImage,
    Utils,
    TiledReader
) {
    'use strict';
    // cached modules by require
    var cachedModules = {
        // name: argumentsArray
    };
    // a collection of sprites/canvases that represent the drawn tiled layers
    var LayerSprites = function (canvasSize, mapSize) {
        // number of sprites horizontally
        var spritesCountX = Math.ceil(mapSize.x / canvasSize.x);
        var spritesCountY = Math.ceil(mapSize.y / canvasSize.y);
        // combined width of canvases
        var width = spritesCountX * canvasSize.x;
        var height = spritesCountY * canvasSize.y;
        // collection of canvases
        var layers = {
            // "0": [canvas, canvas, ...]
            length: 0
        };
        var initLayer = function (layerId) {
            var i;
            var layer = [];
            var canvas;
            var context;

            for (i = 0; i < spritesCountX * spritesCountY; ++i) {
                canvas = document.createElement('canvas');
                canvas.width = canvasSize.x;
                canvas.height = canvasSize.y;
                context = canvas.getContext('2d');
                canvas.context = context;
                layer.push(canvas);
            }
            layers[layerId] = layer;
            layers.length = Math.max(layers.length, layerId + 1);
        };
        var getCanvas = function (layerId, destination) {
            // convert destination position to array index
            var x = Math.floor(destination.x / canvasSize.x) % spritesCountX;
            var y = Math.floor(destination.y / canvasSize.y) % spritesCountY;
            var index = x + y * spritesCountX;

            // init collection if needed
            if (!layers[layerId]) {
                initLayer(layerId);
            }

            return {
                index: index,
                canvas: layers[layerId][index]
            };
        };

        return {
            spritesCountX: spritesCountX,
            spritesCountY: spritesCountY,
            canvasSize: canvasSize,
            layers: layers,
            getSpritesFromLayer: function (layerId) {
                return layers[layerId];
            },
            drawTile: function (layerId, destination, source, packedImage, flipX, flipY, flipD, opacity) {
                // get the corresponding canvas
                var canvasData = getCanvas(layerId, destination);
                var canvas = canvasData.canvas;
                var index = canvasData.index;
                var context = canvas.context;
                var doFlipX = false;
                var doFlipY = false;
                var rotation = 0;
                // canvas offset
                var offset = new Vector2(
                    canvasSize.x * (index % spritesCountX),
                    canvasSize.y * Math.floor(index / spritesCountX)
                );

                // convert to rotation and flipping
                if (!flipD) {
                    if (flipX && flipY) {
                        rotation = Math.PI;
                    } else {
                        doFlipX = flipX;
                        doFlipY = flipY;
                    }
                } else {
                    if (!flipX && !flipY) {
                        rotation = Math.PI / 2;
                        doFlipY = true;
                    } else if (flipX && !flipY) {
                        rotation = Math.PI / 2;
                    } else if (!flipX && flipY) {
                        rotation = Math.PI * 3 / 2;
                    } else if (flipX && flipY) {
                        rotation = Math.PI / 2;
                        doFlipX = true;
                    }
                }

                context.save();
                // move to destination
                context.translate(destination.x - offset.x, destination.y - offset.y);
                // offset origin for rotation
                context.translate(source.width / 2, source.height / 2);
                // apply rotation
                context.rotate(rotation);
                context.scale(doFlipX ? -1 : 1, doFlipY ? -1 : 1);
                // offset origin
                context.translate(-source.width / 2, -source.height / 2);
                // opacity
                if (opacity !== undefined) {
                    context.globalAlpha = opacity;
                }

                // draw the tile!
                context.drawImage(
                    packedImage.image,
                    packedImage.x + source.x,
                    packedImage.y + source.y,
                    source.width,
                    source.height,
                    0,
                    0,
                    destination.width,
                    destination.height
                );
                context.globalAlpha = 1;
                context.restore();
            },
            dispose: function () {
                // Cocoon: dispose canvasses
                Utils.forEach(layers, function (layer) {
                    if (layer.length) {
                        Utils.forEach(layer, function (canvas) {
                            if (canvas && canvas.dispose) {
                                canvas.dispose();
                            }
                        });
                    }
                });
            }
        };
    };

    var Tiled = function (settings) {
        var assetName = settings.assetName;
        var drawTiles = Utils.isDefined(settings.drawTiles) ? settings.drawTiles : true;
        var json = settings.tiled || Bento.assets.getJson(assetName);
        var width = json.width || 0;
        var height = json.height || 0;
        var tileWidth = json.tilewidth || 0;
        var tileHeight = json.tileheight || 0;
        var mapProperties = json.properties || {};
        var mergeLayers = settings.merge || false;
        var onInit = settings.onInit;
        var onLayer = settings.onLayer;
        var onTile = settings.onTile;
        var onObject = settings.onObject;
        var onComplete = settings.onComplete;
        var onSpawn = settings.onSpawn;
        var onSpawnComplete = settings.onSpawnComplete;
        var onLayerMergeCheck = settings.onLayerMergeCheck;
        var cacheModules = settings.cacheModules || false;
        var attachEntities = Utils.getDefault(settings.attachEntities, true);
        var offset = settings.offset || new Vector2(0, 0);
        var maxCanvasSize = settings.maxCanvasSize || new Vector2(1024, 1024);
        var mapSize = new Vector2(width * tileWidth, height * tileHeight);
        var currentSpriteLayer = -1;
        var layerSprites = new LayerSprites(maxCanvasSize, mapSize);
        var entities = [];
        var backgrounds = [];
        var entitiesSpawned = 0;
        var entitiesToSpawn = 0;
        var opacity = 1;
        var currentLayer = 0;
        var tiledReader = new TiledReader({
            tiled: json,
            onInit: onInit,
            onExternalTileset: function (source) {
                // unfortunately, external tileset paths are relative to the tile json path
                // making it difficult to load (would need to do path parsing etc...)
                // instead we try to make an educated guess what the asset name is
                var json;
                var jsonPath = source.indexOf('json/');
                var relativePath = source.indexOf('../');
                var path = source;
                var split;
                if (jsonPath >= 0) {
                    // if the name "json/" is there, we can guess the path is after the json/ part
                    path = source.substring(jsonPath + ('json/').length);
                } else if (relativePath >= 0) {
                    // no json/ is there and the path has relative indicators
                    path = source;

                    if (assetName) {
                        // path parsing, urgh
                        split = assetName.split('/');
                        split.pop(); // remove filename
                        while (path.indexOf('../') >= 0) {
                            if (split.length === 0) {
                                throw "ERROR: Impossible path to external tileset";
                            }
                            // move up one folder
                            split.pop();
                            path = path.replace('../', '');
                        }
                        // final path, may need an extra slash
                        path = split.join('/') + (split.length ? '/' : '') + path;
                    } else {
                        // more dangerous method: try removing all relative indicators
                        while (path.indexOf('../') >= 0) {
                            path = path.replace('../', '');
                        }
                    }
                }
                path = path.replace('.json', '');

                json = Bento.assets.getJson(path);

                return json;
            },
            onLayer: function (layer, index) {
                var shouldMerge = false;
                currentLayer = index;
                if (layer.type === "tilelayer") {
                    if (!mergeLayers) {
                        // check per layer
                        if (onLayerMergeCheck) {
                            shouldMerge = onLayerMergeCheck(layer);
                        }
                        if (shouldMerge) {
                            currentSpriteLayer = 9999;
                        } else {
                            currentSpriteLayer = index;
                        }
                    } else {
                        currentSpriteLayer = 9999;
                    }
                }
                opacity = layer.opacity;
                if (onLayer) {
                    onLayer.call(tiled, layer, index);
                }
            },
            onTile: function (tileX, tileY, tileSet, tileIndex, flipX, flipY, flipD) {
                if (!drawTiles) {
                    return;
                }
                // get destination position
                var x = tileX * tileWidth;
                var y = tileY * tileHeight;
                var destination = new Rectangle(x, y, tileWidth, tileHeight);

                // get source position
                var source = getSourceTile(tileSet, tileIndex);
                var layerIndex = currentLayer;

                // retrieve the corresponding image asset
                // there is a very high chance the url contains "images/" since the json files
                // should be stored in the "json/" folder and images in "images/"
                var imageUrl = tileSet.image;
                var assetName;
                var imageAsset;
                assetName = imageUrl.substring(imageUrl.indexOf('images/') + ('images/').length);
                assetName = assetName.replace('.png', '');
                imageAsset = Bento.assets.getImage(assetName);

                // draw on the layer
                // TODO: cache the drawn layers? Would load faster if a player returns to a screen, on the other hand it could lead to memory hogging
                layerSprites.drawTile(
                    currentSpriteLayer,
                    destination,
                    source,
                    imageAsset,
                    flipX,
                    flipY,
                    flipD,
                    opacity
                );

                if (onTile) {
                    onTile.call(tiled, tileX, tileY, tileSet, tileIndex, flipX, flipY, flipD, layerIndex);
                }
            },
            onObject: function (object, tileSet, tileIndex) {
                if (onObject) {
                    onObject.call(tiled, object, tileSet, tileIndex, currentLayer);
                }
                if (settings.spawnEntities) {
                    // note: we can pass currentLayer, as onLayer is synchronously called before onObject
                    spawnEntity(object, tileSet, tileIndex, currentLayer);
                }
            },
            onComplete: function () {
                var canvasLayers = layerSprites.layers;
                var layer;
                var l = canvasLayers.length;
                var i;
                var canvasSize = layerSprites.canvasSize;
                var spritesCountX = layerSprites.spritesCountX;
                var spritesCountY = layerSprites.spritesCountY;
                var makeEntity = function () {
                    var j = 0;
                    var canvas;
                    var sprite;
                    var entity;
                    var tiledLayer = json.layers[i];
                    for (j = 0; j < layer.length; ++j) {
                        canvas = layer[j];
                        sprite = new Sprite({
                            image: new PackedImage(canvas)
                        });
                        entity = new Entity({
                            z: 0,
                            name: tiledLayer ? tiledLayer.name || 'tiledLayer' : 'tiledLayer',
                            family: ['backgrounds'],
                            position: new Vector2(
                                offset.x + canvasSize.x * (j % spritesCountX),
                                offset.y + canvasSize.y * Math.floor(j / spritesCountX)
                            ),
                            components: [sprite]
                        });
                        // spawn background entities now?
                        if (settings.spawnBackground) {
                            Bento.objects.attach(entity);
                        }
                        backgrounds.push(entity);
                    }
                };

                for (i = 0; i < l; ++i) {
                    layer = canvasLayers[i];
                    if (layer) {
                        makeEntity();
                    }
                }

                if (onComplete) {
                    onComplete.call(tiled);
                }

                // call onSpawnComplete anyway, maybe no objects were spawned or synchronously spawned
                didLoopThrough = true;
                checkSpawnComplete();
            }
        });
        var didLoopThrough = false;
        var checkSpawnComplete = function () {
            if (didLoopThrough && entitiesSpawned === entitiesToSpawn && onSpawnComplete) {
                onSpawnComplete.call(tiled);
            }
        };
        // helper function to get the source in the image
        var getSourceTile = function (tileset, index) {
            var tilesetWidth = Math.floor(tileset.imagewidth / tileset.tilewidth);
            var tilesetHeight = Math.floor(tileset.imageheight / tileset.tileheight);

            return new Rectangle(
                (index % tilesetWidth) * tileset.tilewidth,
                Math.floor(index / tilesetWidth) * tileset.tileheight,
                tileset.tilewidth,
                tileset.tileheight
            );
        };
        // attempt to spawn object by tileproperty "module"
        // this is mainly for backwards compatibility of the old Tiled module
        var spawnEntity = function (object, tileSet, tileIndex, layerIndex) {
            var tileproperties;
            var properties;
            var moduleName;
            var components = {};
            var tiledSettings = {};
            var require = {
                // paths to module and components
                paths: [],
                // parameters for respective module and components
                parameters: []
            };
            var x = object.x;
            var y = object.y;

            // Reads all custom properties and fishes out the components that need
            // to be attached to the entity. Also gets the component's parameters.
            var getComponents = function (props) {
                var prop = '';
                var name = '';
                var paramName = '';
                var dotIndex = -1;
                for (prop in props) {
                    // in order to pass a component through custom properties
                    // it needs to have 'component' somewhere in the name
                    if (prop.indexOf('component') > -1) {

                        dotIndex = prop.indexOf('.');
                        name = prop.slice(0, dotIndex === -1 ? undefined : dotIndex);

                        if (!components[name]) {
                            components[name] = {};
                        }

                        // Is it a parameter for the component?
                        if (dotIndex > -1) {
                            // component parameters have the same name as the component
                            // followed by a dot and the parameter name
                            paramName = prop.slice(dotIndex + 1);
                            components[name][paramName] = props[prop];
                        }
                        // Otherwise it's the path to the component
                        else {
                            components[name].pathToComponent = props[prop];
                        }
                    }
                }
            };
            var savePathsAndParameters = function () {
                var prop = '';
                var key = '';
                var component;
                var parameters = {};

                for (key in components) {
                    parameters = {
                        tiled: tiledSettings
                    };
                    component = components[key];

                    // make an object with all parameters for the component
                    for (prop in component) {
                        if (prop !== 'pathToComponent') {
                            parameters[prop] = component[prop];
                        }
                    }

                    // save paths to JS files and corresponding parameters
                    require.paths.push(component.pathToComponent);
                    require.parameters.push(Utils.cloneJson(parameters));
                }
            };
            var onRequire = function () {
                var Constructor = arguments[0];
                var instance = new Constructor(require.parameters[0]);
                var dimension = instance.dimension;
                var spriteOrigin = new Vector2(0, 0);
                var ii = 1;
                var iil = arguments.length;

                instance.getComponent('sprite', function (sprite) {
                    spriteOrigin = sprite.origin;
                });

                instance.position = new Vector2(
                    offset.x + x + spriteOrigin.x,
                    offset.y + y + (spriteOrigin.y - dimension.height)
                );

                // instantiate and attach all the specified components
                for (; ii < iil; ++ii) {
                    instance.attach(new arguments[ii](require.parameters[ii]));
                }

                // add to game
                if (attachEntities) {
                    Bento.objects.attach(instance);
                }
                entities.push(instance);

                entitiesSpawned += 1;

                if (onSpawn) {
                    onSpawn.call(tiled, instance, object, {
                        tileSet: tileSet,
                        moduleName: moduleName,
                        properties: properties
                    }, layerIndex);
                }

                // cache module
                if (cacheModules) {
                    // caching the arguments as an actual array for safety
                    cachedModules[moduleName] = Array.prototype.slice.call(arguments);
                }

                checkSpawnComplete();
            };

            if (!object.gid) {
                // not an entity (it's a rectangle or other shape)
                return;
            }
            tileproperties = tileSet.tileproperties;
            if (!tileproperties) {
                return;
            }
            properties = tileproperties[tileIndex];
            if (!properties) {
                return;
            }
            moduleName = properties.module;
            if (!moduleName) {
                return;
            }
            // save path to module and its paramters
            require.paths.push(moduleName);
            tiledSettings = {
                position: new Vector2(x, y),
                tileSet: tileSet,
                tileIndex: tileIndex,
                tileProperties: properties,
                object: object,
                objectProperties: object.properties,
                jsonName: assetName // reference to current json name
            };
            require.parameters.push({
                tiled: tiledSettings
            });

            // search through the tileset's custom properties
            getComponents(properties);
            // search through any custom properties that were added to this instance of the object
            getComponents(object.properties);
            // save the paths to the components and save their parameters
            savePathsAndParameters();

            entitiesToSpawn += 1;

            if (cacheModules && cachedModules[moduleName]) {
                // use the cached module
                onRequire.call(this, cachedModules[moduleName]);
            } else {
                // use require
                bento.require(require.paths, onRequire);
            }
        };
        var tiled = {
            name: settings.name || 'tiled',
            /**
             * Name of the Tiled JSON asset
             * @instance
             * @name assetName
             */
            assetName: assetName,
            /**
             * Map properties
             * @instance
             * @name mapProperties
             */
            mapProperties: mapProperties,
            /**
             * Reference to the Tiled JSON asset
             * @instance
             * @name json
             */
            json: json,
            /**
             * Rectangle with width and height of the Tiled map in pixels
             * @instance
             * @name dimension
             */
            dimension: new Rectangle(0, 0, mapSize.x, mapSize.y),
            /**
             * Array of all entities spawned
             * @instance
             * @name entities
             */
            entities: entities,
            /**
             * Array of all background entities spawned
             * @instance
             * @name backgrounds
             */
            backgrounds: backgrounds,
            /**
             * Object containing all drawn layers
             * @instance
             * @name layerImages
             */
            layerImages: layerSprites,
            /**
             * Clear cached modules if cacheModules is tru (the cache is global, 
             * developer need to call this manually to clear the memory)
             * @instance
             * @name clearCache
             */
            clearCache: function () {
                cachedModules = {};
            },
            // clean up
            destroy: function () {
                layerSprites.dispose();
            }
        };

        tiledReader.read();

        return tiled;
    };

    return Tiled;
});
/**
 * A generic interpreter for Tiled map JSON files.
 * <br>Exports: Constructor
 * @module bento/tiledreader
 * @moduleName TiledReader
 * @param {Object} settings - Settings object
 * @param {String} settings.tiled - Tiled map JSON asset
 * @param {Function} settings.onExternalTileset - Called if an external tileset is needed, expects a JSON to be returned (the developer is expected to load the external tileset) Must be .json and not .tsx files.
 * @param {Function} [settings.onInit] - Callback on initial parsing, parameters: (tiledJson, externalTilesets)
 * @param {Function} [settings.onLayer] - Called when passing a layer, parameters: (layerJSON)
 * @param {Function} [settings.onTile] - Called when passing a tile, parameters: (tileX, tileY, tilesetJSON, tileIndex, flipX, flipY, flipDiagonal)
 * @param {Function} [settings.onObject] - Called when passing an object, parameters: (objectJSON, tilesetJSON, tileIndex) <br>Latter two if a gid is present in the objectJSON
 * @param {Function} [settings.onComplete] - Called when the reader is done
 * @param {Boolean} [settings.spawn] - Spawns entities
 * @returns Object
 */
bento.define('bento/tiledreader', [], function () {
    'use strict';
    var FLIPX = 0x80000000;
    var FLIPY = 0x40000000;
    var FLIPDIAGONAL = 0x20000000;

    var TiledReader = function (settings) {
        // cache callbacks
        var onExternalTileset = settings.onExternalTileset;
        var onInit = settings.onInit;
        var onLayer = settings.onLayer;
        var onTile = settings.onTile;
        var onObject = settings.onObject;
        var onComplete = settings.onComplete;

        // the tiled json
        var json = settings.tiled || {};

        // width and height in tiles
        var width = json.width || 0;
        var height = json.height || 0;

        // width and height of a single tile
        var tileWidth = json.tilewidth || 0;
        var tileHeight = json.tileheight || 0;

        // tilesets
        var tilesets = json.tilesets || [];
        var tilesetsCount = tilesets.length;
        var externalTilesets = {
            // "source": tileset JSON
        };
        var cachedFirstGids = [];

        // layers
        var layers = json.layers || [];
        var layersCount = layers.length;

        // load external tilesets
        var importTilesets = function () {
            var i;
            var l;
            var tileset;
            var source;

            // loop through all tilesets, look for external tilesets
            for (i = 0, l = tilesets.length; i < l; ++i) {
                tileset = tilesets[i];
                source = tileset.source;
                if (source) {
                    // to stay independent of any asset loader, this is loaded through a callback
                    externalTilesets[source] = onExternalTileset(source);
                }

                // meanwhile, cache all firstGids for faster lookups
                cachedFirstGids.push(tileset.firstgid);
            }
        };
        var decompress = function (layer) {
            var base64ToUint32array = function (base64) {
                var raw = window.atob(base64);
                var i;
                var len = raw.length;
                var bytes = new Uint8Array(len);
                for (i = 0; i < len; i++) {
                    bytes[i] = raw.charCodeAt(i);
                }
                var data = new Uint32Array(bytes.buffer, 0, len / 4);
                return data;
            };
            var encoding = layer.encoding;
            if (encoding === 'base64') {
                layer.data = base64ToUint32array(layer.data);
                layer.encoding = null;
            } else if (encoding) {
                // TODO: compression formats
                throw "ERROR: compression not supported. Please set Tile Layer Format to CSV in Tiled.";
            }
            return layer;
        };
        var loopLayers = function () {
            var i, il;
            var j, jl;
            var k, kl;
            var layers = json.layers;
            var layer;
            var layerData;
            var lh;
            var lw;
            var objects;
            var object;
            var properties;
            var layerId = 0;
            var type;
            var getTileset = function (gid) {
                var l,
                    tileset,
                    count = tilesetsCount,
                    current = null,
                    firstGid,
                    currentFirstGid;

                // loop through tilesets and find the highest firstgid that's
                // still lower or equal to the gid
                for (l = 0; l < count; ++l) {
                    firstGid = cachedFirstGids[l];
                    if (firstGid <= gid) {
                        current = tilesets[l];
                        currentFirstGid = firstGid;
                    }
                }

                // tileset is external?
                if (current.source) {
                    current = externalTilesets[current.source];
                }

                return {
                    tileSet: current,
                    firstGid: currentFirstGid
                };
            };
            var tileCallback = function (data, x, y) {
                // callback for every tile (stored layer.data)
                var gid = data[y * width + x];
                var tilesetData;
                var tileIndex;
                var flipX;
                var flipY;
                var flipDiagonal;

                // no tile
                if (gid === 0) {
                    return;
                }

                // read out the flags
                flipX = (gid & FLIPX);
                flipY = (gid & FLIPY);
                flipDiagonal = (gid & FLIPDIAGONAL);

                // clear flags
                gid &= ~(FLIPX | FLIPY | FLIPDIAGONAL);

                // get the corresponding tileset and tile index
                tilesetData = getTileset(gid);
                tileIndex = gid - tilesetData.firstGid;

                // callback
                onTile(x, y, tilesetData.tileSet, tileIndex, flipX, flipY, flipDiagonal);
            };
            var objectCallback = function (object) {
                var tileIndex;
                var tilesetData;
                var gid = object.gid;
                if (gid) {
                    // get the corresponding tileset and tile index
                    tilesetData = getTileset(gid);
                    tileIndex = gid - tilesetData.firstGid;
                    onObject(object, tilesetData.tileSet, tileIndex);
                } else {
                    // gid may not be present, in that case it's a rectangle or other shape
                    onObject(object);
                }
            };

            // loop through layers
            for (k = 0, kl = layers.length; k < kl; ++k) {
                layer = layers[k];
                type = layer.type;

                if (onLayer) {
                    onLayer(layer, k);
                }
                if (type === 'tilelayer') {
                    // skip layer if invisible???
                    if (!layer.visible) {
                        continue;
                    }

                    // decompress data?
                    decompress(layer);

                    layerData = layer.data;

                    // loop through layer.data, which should be width * height in size
                    for (j = 0; j < height; ++j) {
                        for (i = 0; i < width; ++i) {
                            tileCallback(layerData, i, j);
                        }
                    }

                } else if (type === 'objectgroup') {
                    objects = layer.objects || [];
                    il = objects.length;
                    for (i = 0; i < il; ++i) {
                        object = objects[i];

                        objectCallback(object);
                    }
                }
            }
            if (onComplete) {
                onComplete();
            }
        };

        importTilesets();

        if (onInit) {
            onInit(json, externalTilesets);
        }
        // loopLayers();

        return {
            /**
             * Read tiled JSON and loop through all layers, tiles and objects
             * @function
             * @instance
             * @name read
             */
            read: loopLayers
        };
    };

    return TiledReader;
});
/**
 * The Tween is an entity that performs an interpolation within a timeframe. The entity
 * removes itself after the tween ends.
 * Default tweens: linear, quadratic, squareroot, cubic, cuberoot, exponential, elastic, sin, cos
 * <br>Exports: Constructor
 * @module bento/tween
 * @moduleName Tween
 * @param {Object} settings - Settings object
 * @param {Number} settings.from - Starting value
 * @param {Number} settings.to - End value
 * @param {Number} settings.in - Time frame
 * @param {String} settings.ease - Choose between default tweens or see {@link http://easings.net/}
 * @param {Number} [settings.decay] - For use in exponential and elastic tweens: decay factor (negative growth)
 * @param {Number} [settings.growth] - For use in exponential and elastic tweens: growth factor
 * @param {Number} [settings.oscillations] - For use in sin, cos and elastic tweens: number of oscillations
 * @param {Function} [settings.onCreate] - Called as soon as the tween is added to the object manager and before the delay (if any).
 * @param {Function} [settings.onStart] - Called before the first tween update and after a delay (if any).
 * @param {Function} [settings.onUpdate] - Called every tick during the tween lifetime. Callback parameters: (value, time)
 * @param {Function} [settings.onComplete] - Called when tween ends
 * @param {Number} [settings.id] - Adds an id property to the tween. Useful when spawning tweens in a loop (remember that functions form closures)
 * @param {Number} [settings.delay] - Wait an amount of ticks before starting
 * @param {Boolean} [settings.applyOnDelay] - Perform onUpdate even during delay
 * @param {Boolean} [settings.stay] - Never complete the tween (only use if you know what you're doing)
 * @param {Boolean} [settings.updateWhenPaused] - Continue tweening even when the game is paused (optional) NOTE: tweens automatically copy the current pause level if this is not set
 * @param {Boolean} [settings.ignoreGameSpeed] - Run tween at normal speed (optional)
 * @returns Entity
 * @snippet Tween|constructor
Tween({
    from: ${1:0},
    to: ${2:1},
    in: ${3:60},
    delay: ${4:0},
    applyOnDelay: ${5:0},
    ease: '${6:linear}',
    decay: ${7:1},
    oscillations: ${8:1},
    onStart: function () {},
    onUpdate: function (v, t) {
        ${9}
    },
    onComplete: function () {
        ${10}
    }
});
 */

// Deprecated parameters
// * @param {Number} [settings.alpha] - For use in exponential y=exp(αt) or elastic y=exp(αt)*cos(βt)
// * @param {Number} [settings.beta] - For use in elastic y=exp(αt)*cos(βt)
bento.define('bento/tween', [
    'bento',
    'bento/math/vector2',
    'bento/utils',
    'bento/entity'
], function (Bento, Vector2, Utils, Entity) {
    'use strict';
    var robbertPenner = {
        // t: current time, b: begInnIng value, c: change In value, d: duration
        easeInQuad: function (t, b, c, d) {
            return c * (t /= d) * t + b;
        },
        easeOutQuad: function (t, b, c, d) {
            return -c * (t /= d) * (t - 2) + b;
        },
        easeInOutQuad: function (t, b, c, d) {
            if ((t /= d / 2) < 1) return c / 2 * t * t + b;
            return -c / 2 * ((--t) * (t - 2) - 1) + b;
        },
        easeInCubic: function (t, b, c, d) {
            return c * (t /= d) * t * t + b;
        },
        easeOutCubic: function (t, b, c, d) {
            return c * ((t = t / d - 1) * t * t + 1) + b;
        },
        easeInOutCubic: function (t, b, c, d) {
            if ((t /= d / 2) < 1) return c / 2 * t * t * t + b;
            return c / 2 * ((t -= 2) * t * t + 2) + b;
        },
        easeInQuart: function (t, b, c, d) {
            return c * (t /= d) * t * t * t + b;
        },
        easeOutQuart: function (t, b, c, d) {
            return -c * ((t = t / d - 1) * t * t * t - 1) + b;
        },
        easeInOutQuart: function (t, b, c, d) {
            if ((t /= d / 2) < 1) return c / 2 * t * t * t * t + b;
            return -c / 2 * ((t -= 2) * t * t * t - 2) + b;
        },
        easeInQuint: function (t, b, c, d) {
            return c * (t /= d) * t * t * t * t + b;
        },
        easeOutQuint: function (t, b, c, d) {
            return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
        },
        easeInOutQuint: function (t, b, c, d) {
            if ((t /= d / 2) < 1) return c / 2 * t * t * t * t * t + b;
            return c / 2 * ((t -= 2) * t * t * t * t + 2) + b;
        },
        easeInSine: function (t, b, c, d) {
            return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
        },
        easeOutSine: function (t, b, c, d) {
            return c * Math.sin(t / d * (Math.PI / 2)) + b;
        },
        easeInOutSine: function (t, b, c, d) {
            return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
        },
        easeInExpo: function (t, b, c, d) {
            return (t === 0) ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;
        },
        easeOutExpo: function (t, b, c, d) {
            return (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
        },
        easeInOutExpo: function (t, b, c, d) {
            if (t === 0) return b;
            if (t === d) return b + c;
            if ((t /= d / 2) < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
            return c / 2 * (-Math.pow(2, -10 * --t) + 2) + b;
        },
        easeInCirc: function (t, b, c, d) {
            return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
        },
        easeOutCirc: function (t, b, c, d) {
            return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
        },
        easeInOutCirc: function (t, b, c, d) {
            if ((t /= d / 2) < 1) return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
            return c / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
        },
        easeInElastic: function (t, b, c, d) {
            var s = 1.70158,
                p = 0,
                a = c;
            if (t === 0) return b;
            if ((t /= d) === 1) return b + c;
            if (!p) p = d * 0.3;
            if (a < Math.abs(c)) {
                a = c;
                s = p / 4;
            } else s = p / (2 * Math.PI) * Math.asin(c / a);
            return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
        },
        easeOutElastic: function (t, b, c, d) {
            var s = 1.70158,
                p = 0,
                a = c;
            if (t === 0) return b;
            if ((t /= d) === 1) return b + c;
            if (!p) p = d * 0.3;
            if (a < Math.abs(c)) {
                a = c;
                s = p / 4;
            } else s = p / (2 * Math.PI) * Math.asin(c / a);
            return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
        },
        easeInOutElastic: function (t, b, c, d) {
            var s = 1.70158,
                p = 0,
                a = c;
            if (t === 0) return b;
            if ((t /= d / 2) === 2) return b + c;
            if (!p) p = d * (0.3 * 1.5);
            if (a < Math.abs(c)) {
                a = c;
                s = p / 4;
            } else s = p / (2 * Math.PI) * Math.asin(c / a);
            if (t < 1) return -0.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
            return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p) * 0.5 + c + b;
        },
        easeInBack: function (t, b, c, d, s) {
            if (s === undefined) s = 1.70158;
            return c * (t /= d) * t * ((s + 1) * t - s) + b;
        },
        easeOutBack: function (t, b, c, d, s) {
            if (s === undefined) s = 1.70158;
            return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
        },
        easeInOutBack: function (t, b, c, d, s) {
            if (s === undefined) s = 1.70158;
            if ((t /= d / 2) < 1) return c / 2 * (t * t * (((s *= (1.525)) + 1) * t - s)) + b;
            return c / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2) + b;
        },
        easeInBounce: function (t, b, c, d) {
            return c - this.easeOutBounce(d - t, 0, c, d) + b;
        },
        easeOutBounce: function (t, b, c, d) {
            if ((t /= d) < (1 / 2.75)) {
                return c * (7.5625 * t * t) + b;
            } else if (t < (2 / 2.75)) {
                return c * (7.5625 * (t -= (1.5 / 2.75)) * t + 0.75) + b;
            } else if (t < (2.5 / 2.75)) {
                return c * (7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375) + b;
            } else {
                return c * (7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375) + b;
            }
        },
        easeInOutBounce: function (t, b, c, d) {
            if (t < d / 2) return this.easeInBounce(t * 2, 0, c, d) * 0.5 + b;
            return this.easeOutBounce(t * 2 - d, 0, c, d) * 0.5 + c * 0.5 + b;
        }
    };
    var interpolations = {
        linear: function (s, e, t, alpha, beta) {
            return (e - s) * t + s;
        },
        quadratic: function (s, e, t, alpha, beta) {
            return (e - s) * t * t + s;
        },
        squareroot: function (s, e, t, alpha, beta) {
            return (e - s) * Math.pow(t, 0.5) + s;
        },
        cubic: function (s, e, t, alpha, beta) {
            return (e - s) * t * t * t + s;
        },
        cuberoot: function (s, e, t, alpha, beta) {
            return (e - s) * Math.pow(t, 1 / 3) + s;
        },
        exponential: function (s, e, t, alpha, beta) {
            //takes alpha as growth/damp factor
            return (e - s) / (Math.exp(alpha) - 1) * Math.exp(alpha * t) + s - (e - s) / (Math.exp(alpha) - 1);
        },
        elastic: function (s, e, t, alpha, beta) {
            //alpha=growth factor, beta=wavenumber
            return (e - s) / (Math.exp(alpha) - 1) * Math.cos(beta * t * 2 * Math.PI) * Math.exp(alpha * t) + s - (e - s) / (Math.exp(alpha) - 1);
        },
        sin: function (s, e, t, alpha, beta) {
            //s=offset, e=amplitude, alpha=wavenumber
            return s + e * Math.sin(alpha * t * 2 * Math.PI);
        },
        cos: function (s, e, t, alpha, beta) {
            //s=offset, e=amplitude, alpha=wavenumber
            return s + e * Math.cos(alpha * t * 2 * Math.PI);
        }
    };
    var interpolate = function (type, s, e, t, alpha, beta) {
        // interpolate(string type,float from,float to,float time,float alpha,float beta)
        // s = starting value
        // e = ending value
        // t = time variable (going from 0 to 1)
        var fn = interpolations[type];
        if (s.isVector2 && e.isVector2) {
            if (fn) {
                return new Vector2(
                    fn(s.x, e.x, t, alpha, beta),
                    fn(s.y, e.y, t, alpha, beta)
                );
            } else {
                return new Vector2(
                    robbertPenner[type](t, s.x, e.x - s.x, 1),
                    robbertPenner[type](t, s.y, e.y - s.y, 1)
                );
            }
        } else {
            if (fn) {
                return fn(s, e, t, alpha, beta);
            } else {
                return robbertPenner[type](t, s, e - s, 1);
            }
        }
    };

    var Tween = function (settings) {
        /* settings = {
            from: Number
            to: Number
            in: Number
            ease: String
            alpha: Number (optional)
            beta: Number (optional)
            stay: Boolean (optional)
            do: Gunction (value, time) {} (optional)
            onComplete: function () {} (optional)
            id: Number (optional),
            updateWhenPaused: Boolean (optional)
            ignoreGameSpeed: Boolean (optional)
        }*/
        var time = 0;
        var added = false;
        var running = true;
        var onUpdate = settings.onUpdate || settings.do;
        var onComplete = settings.onComplete;
        var onCreate = settings.onCreate;
        var onStart = settings.onStart;
        var applyOnDelay = settings.applyOnDelay;
        var hasStarted = false;
        var ease = settings.ease || 'linear';
        var startVal = settings.from || 0;
        var delay = settings.delay || 0;
        var delayTimer = 0;
        var endVal = Utils.isDefined(settings.to) ? settings.to : 1;
        var deltaT = settings.in || 1;
        var alpha = Utils.isDefined(settings.alpha) ? settings.alpha : 1;
        var beta = Utils.isDefined(settings.beta) ? settings.beta : 1;
        var ignoreGameSpeed = settings.ignoreGameSpeed;
        var stay = settings.stay;
        var autoResumeTimer = -1;
        var tween = new Entity(settings).extend({
            id: settings.id,
            start: function (data) {
                if (onCreate) {
                    onCreate.apply(this);
                }
            },
            update: function (data) {
                //if an autoresume timer is running, decrease it and resume when it is done
                if (--autoResumeTimer === 0) {
                    tween.resume();
                }
                if (!running) {
                    return;
                }
                if (delayTimer < delay) {
                    if (ignoreGameSpeed) {
                        delayTimer += 1;
                    } else {
                        delayTimer += data.speed;
                    }
                    // run onUpdate before start
                    if (applyOnDelay && onUpdate) {
                        onUpdate.apply(this, [interpolate(
                            ease,
                            startVal,
                            endVal,
                            0,
                            alpha,
                            beta
                        ), 0]);
                    }
                    return;
                }
                if (ignoreGameSpeed) {
                    time += 1;
                } else {
                    time += data.speed;
                }
                // run onStart once
                if (!hasStarted) {
                    hasStarted = true;
                    if (onStart) {
                        onStart.apply(this);
                    }
                }
                // run update
                if (onUpdate) {
                    onUpdate.apply(this, [interpolate(
                        ease,
                        startVal,
                        endVal,
                        time / deltaT,
                        alpha,
                        beta
                    ), time]);
                }
                // end
                if (time >= deltaT && !stay) {
                    if (time > deltaT && onUpdate) {
                        //the tween didn't end neatly, so run onUpdate once more with a t of 1
                        onUpdate.apply(this, [interpolate(
                            ease,
                            startVal,
                            endVal,
                            1,
                            alpha,
                            beta
                        ), time]);
                    }
                    if (onComplete) {
                        onComplete.apply(this);
                    }
                    Bento.objects.remove(tween);
                    added = false;
                }
            },
            /**
             * Start the tween. Only call if you used stop() before.
             * @function
             * @instance
             * @returns {Entity} Returns self
             * @name begin
             * @snippet #Tween.begin|Tween
            begin();
             */
            begin: function () {
                time = 0;
                if (!added) {
                    Bento.objects.add(tween);
                    added = true;
                }
                running = true;
                return tween;
            },
            /**
             * Stops the tween (note that the entity isn't removed).
             * @function
             * @instance
             * @returns {Entity} Returns self
             * @name stop
             * @snippet #Tween.stop|Tween
            stop();
             */
            stop: function () {
                time = 0;
                running = false;
                return tween;
            },
            /**
             * Pauses the tween. The tween will resume itself after a certain duration if provided.
             * @function
             * @instance
             * @param {Number} [duration] - time after which to autoresume. If not provided the tween is paused indefinitely.
             * @returns {Entity} Returns self
             * @name pause
             */
            pause: function (duration) {
                running = false;
                //if a duration is provided, resume the tween after that duration.
                if (duration) {
                    autoResumeTimer = duration;
                }
                return tween;
            },
            /**
             * Resumes the tween.
             * @function
             * @instance
             * @returns {Entity} Returns self
             * @name resume
             */
            resume: function () {
                if (!added) {
                    return tween.begin();
                } else {
                    running = true;
                    return tween;
                }
            }
        });

        // convert decay and growth to alpha
        if (Utils.isDefined(settings.decay)) {
            alpha = -settings.decay;
        }
        if (Utils.isDefined(settings.growth)) {
            alpha = settings.growth;
        }
        if (Utils.isDefined(settings.oscillations)) {
            beta = settings.oscillations;
            if (settings.ease === 'sin' || settings.ease === 'cos') {
                alpha = settings.oscillations;
            }
        }

        // if (!Utils.isDefined(settings.ease)) {
        //     Utils.log("WARNING: settings.ease is undefined.");
        // }

        // Assuming that when a tween is created when the game is paused,
        // one wants to see the tween move during that pause
        if (!Utils.isDefined(settings.updateWhenPaused)) {
            tween.updateWhenPaused = Bento.objects.isPaused();
        }

        // tween automatically starts
        tween.begin();

        return tween;
    };

    // enums
    Tween.LINEAR = 'linear';
    Tween.QUADRATIC = 'quadratic';
    Tween.CUBIC = 'cubic';
    Tween.SQUAREROOT = 'squareroot';
    Tween.CUBEROOT = 'cuberoot';
    Tween.EXPONENTIAL = 'exponential';
    Tween.ELASTIC = 'elastic';
    Tween.SIN = 'sin';
    Tween.COS = 'cos';
    Tween.EASEINQUAD = 'easeInQuad';
    Tween.EASEOUTQUAD = 'easeOutQuad';
    Tween.EASEINOUTQUAD = 'easeInOutQuad';
    Tween.EASEINCUBIC = 'easeInCubic';
    Tween.EASEOUTCUBIC = 'easeOutCubic';
    Tween.EASEINOUTCUBIC = 'easeInOutCubic';
    Tween.EASEINQUART = 'easeInQuart';
    Tween.EASEOUTQUART = 'easeOutQuart';
    Tween.EASEINOUTQUART = 'easeInOutQuart';
    Tween.EASEINQUINT = 'easeInQuint';
    Tween.EASEOUTQUINT = 'easeOutQuint';
    Tween.EASEINOUTQUINT = 'easeInOutQuint';
    Tween.EASEINSINE = 'easeInSine';
    Tween.EASEOUTSINE = 'easeOutSine';
    Tween.EASEINOUTSINE = 'easeInOutSine';
    Tween.EASEINEXPO = 'easeInExpo';
    Tween.EASEOUTEXPO = 'easeOutExpo';
    Tween.EASEINOUTEXPO = 'easeInOutExpo';
    Tween.EASEINCIRC = 'easeInCirc';
    Tween.EASEOUTCIRC = 'easeOutCirc';
    Tween.EASEINOUTCIRC = 'easeInOutCirc';
    Tween.EASEINELASTIC = 'easeInElastic';
    Tween.EASEOUTELASTIC = 'easeOutElastic';
    Tween.EASEINOUTELASTIC = 'easeInOutElastic';
    Tween.EASEINBACK = 'easeInBack';
    Tween.EASEOUTBACK = 'easeOutBack';
    Tween.EASEINOUTBACK = 'easeInOutBack';
    Tween.EASEINBOUNCE = 'easeInBounce';
    Tween.EASEOUTBOUNCE = 'easeOutBounce';
    Tween.EASEINOUTBOUNCE = 'easeInOutBounce';

    return Tween;
});
/**
 * Canvas 2d renderer
 * @copyright (C) 2015 LuckyKat
 * @moduleName Canvas2DRenderer
 */
bento.define('bento/renderers/canvas2d', [
    'bento/utils'
], function (Utils) {
    return function (canvas, settings) {
        var context = canvas.getContext('2d'),
            original = context,
            pixelSize = settings.pixelSize || 1,
            renderer = {
                name: 'canvas2d',
                save: function () {
                    context.save();
                },
                restore: function () {
                    context.restore();
                },
                setTransform: function (a, b, c, d, tx, ty) {
                    context.setTransform(a, b, c, d, tx, ty);
                },
                translate: function (x, y) {
                    context.translate(x, y);
                },
                scale: function (x, y) {
                    context.scale(x, y);
                },
                rotate: function (angle) {
                    context.rotate(angle);
                },
                fillRect: function (colorArray, x, y, w, h) {
                    var colorStr = getColor(colorArray),
                        oldOpacity = context.globalAlpha;
                    if (colorArray[3] !== 1) {
                        context.globalAlpha *= colorArray[3];
                    }
                    context.fillStyle = colorStr;
                    context.fillRect(x, y, w, h);
                    if (colorArray[3] !== 1) {
                        context.globalAlpha = oldOpacity;
                    }
                },
                fillCircle: function (colorArray, x, y, radius) {
                    var colorStr = getColor(colorArray),
                        oldOpacity = context.globalAlpha;
                    if (colorArray[3] !== 1) {
                        context.globalAlpha *= colorArray[3];
                    }
                    context.fillStyle = colorStr;
                    context.beginPath();
                    context.arc(x, y, radius, 0, Math.PI * 2);
                    context.fill();
                    context.closePath();
                    if (colorArray[3] !== 1) {
                        context.globalAlpha = oldOpacity;
                    }
                },
                strokeRect: function (colorArray, x, y, w, h, lineWidth) {
                    var colorStr = getColor(colorArray),
                        oldOpacity = context.globalAlpha;
                    if (colorArray[3] !== 1) {
                        context.globalAlpha *= colorArray[3];
                    }
                    context.lineWidth = lineWidth || 0;
                    context.strokeStyle = colorStr;
                    context.strokeRect(x, y, w, h);
                    if (colorArray[3] !== 1) {
                        context.globalAlpha = oldOpacity;
                    }
                },
                strokeCircle: function (colorArray, x, y, radius, sAngle, eAngle, lineWidth) {
                    var colorStr = getColor(colorArray),
                        oldOpacity = context.globalAlpha;

                    sAngle = sAngle || 0;
                    eAngle = eAngle || 0;

                    if (colorArray[3] !== 1) {
                        context.globalAlpha *= colorArray[3];
                    }
                    context.strokeStyle = colorStr;
                    context.lineWidth = lineWidth || 0;
                    context.beginPath();
                    context.arc(x, y, radius, sAngle, eAngle, false);
                    context.stroke();
                    context.closePath();
                },
                drawLine: function (colorArray, ax, ay, bx, by, width) {
                    var colorStr = getColor(colorArray),
                        oldOpacity = context.globalAlpha;
                    if (colorArray[3] !== 1) {
                        context.globalAlpha *= colorArray[3];
                    }
                    if (!Utils.isDefined(width)) {
                        width = 1;
                    }

                    context.strokeStyle = colorStr;
                    context.lineWidth = width;

                    context.beginPath();
                    context.moveTo(ax, ay);
                    context.lineTo(bx, by);
                    context.stroke();
                    context.closePath();

                    if (colorArray[3] !== 1) {
                        context.globalAlpha = oldOpacity;
                    }
                },
                drawImage: function (packedImage, sx, sy, sw, sh, x, y, w, h) {
                    context.drawImage(packedImage.image, packedImage.x + sx, packedImage.y + sy, sw, sh, x, y, w, h);
                },
                getOpacity: function () {
                    return context.globalAlpha;
                },
                setOpacity: function (value) {
                    context.globalAlpha = value;
                },
                createSurface: function (width, height) {
                    var newCanvas = document.createElement('canvas'),
                        newContext;

                    newCanvas.width = width;
                    newCanvas.height = height;

                    newContext = canvas.getContext('2d');

                    return {
                        canvas: newCanvas,
                        context: newContext
                    };
                },
                setContext: function (ctx) {
                    context = ctx;
                },
                restoreContext: function () {
                    context = original;
                },
                getContext: function () {
                    return context;
                },
                begin: function () {
                    if (context === original && pixelSize !== 1) {
                        context.save();
                        context.scale(pixelSize, pixelSize);
                    }
                },
                flush: function () {
                    if (context === original && pixelSize !== 1) {
                        context.restore();
                    }
                }
            },
            getColor = function (colorArray) {
                var colorStr = '#';
                colorStr += ('00' + Math.floor(colorArray[0] * 255).toString(16)).slice(-2);
                colorStr += ('00' + Math.floor(colorArray[1] * 255).toString(16)).slice(-2);
                colorStr += ('00' + Math.floor(colorArray[2] * 255).toString(16)).slice(-2);
                return colorStr;
            };

        if (!settings.smoothing) {
            if (context.imageSmoothingEnabled) {
                context.imageSmoothingEnabled = false;
            }
            if (context.webkitImageSmoothingEnabled) {
                context.webkitImageSmoothingEnabled = false;
            }
            if (context.mozImageSmoothingEnabled) {
                context.mozImageSmoothingEnabled = false;
            }
            if (context.msImageSmoothingEnabled) {
                context.msImageSmoothingEnabled = false;
            }
        }
        return renderer;
    };
});
/**
 * Renderer using PIXI by GoodBoyDigital
 * @moduleName PixiRenderer
 */
bento.define('bento/renderers/pixi', [
    'bento',
    'bento/utils',
    'bento/math/transformmatrix',
    'bento/renderers/canvas2d'
], function (Bento, Utils, TransformMatrix, Canvas2d) {
    var PIXI = window.PIXI;
    var SpritePool = function (initialSize) {
        var i;
        // initialize
        this.sprites = [];
        for (i = 0; i < initialSize; ++i) {
            this.sprites.push(new PIXI.Sprite());
        }
        this.index = 0;
    };
    SpritePool.prototype.reset = function () {
        this.index = 0;
    };
    SpritePool.prototype.getSprite = function () {
        var sprite = this.sprites[this.index];
        if (!sprite) {
            sprite = new PIXI.Sprite();
            this.sprites.push(sprite);
        }
        this.index += 1;
        return sprite;
    };

    return function (canvas, settings) {
        var gl;
        var canWebGl = (function () {
            // try making a canvas
            try {
                gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                return !!window.WebGLRenderingContext;
            } catch (e) {
                return false;
            }
        })();
        var matrix;
        var Matrix;
        var matrices = [];
        var alpha = 1;
        var color = 0xFFFFFF;
        var pixiRenderer;
        var spriteRenderer;
        var meshRenderer;
        var graphicsRenderer;
        var particleRenderer;
        var test = false;
        var cocoonScale = 1;
        var pixelSize = settings.pixelSize || 1;
        var tempDisplayObjectParent = null;
        var spritePool = new SpritePool(2000);
        var transformObject = {
            worldTransform: null,
            worldAlpha: 1,
            children: []
        };
        var getPixiMatrix = function () {
            var pixiMatrix = new PIXI.Matrix();
            pixiMatrix.a = matrix.a;
            pixiMatrix.b = matrix.b;
            pixiMatrix.c = matrix.c;
            pixiMatrix.d = matrix.d;
            pixiMatrix.tx = matrix.tx;
            pixiMatrix.ty = matrix.ty;
            return pixiMatrix;
        };
        var getFillGraphics = function (color) {
            var graphics = new PIXI.Graphics();
            var colorInt = color[2] * 255 + (color[1] * 255 << 8) + (color[0] * 255 << 16);
            var alphaColor = color[3];
            graphics.beginFill(colorInt, alphaColor);
            graphics.worldTransform = getPixiMatrix();
            graphics.worldAlpha = alpha;
            return graphics;
        };
        var renderer = {
            name: 'pixi',
            init: function () {

            },
            destroy: function () {},
            save: function () {
                matrices.push(matrix.clone());
            },
            restore: function () {
                matrix = matrices.pop();
            },
            setTransform: function (a, b, c, d, tx, ty) {
                matrix.a = a;
                matrix.b = b;
                matrix.c = c;
                matrix.d = d;
                matrix.tx = tx;
                matrix.ty = ty;
            },
            translate: function (x, y) {
                var transform = new TransformMatrix();
                matrix.multiplyWith(transform.translate(x, y));
            },
            scale: function (x, y) {
                var transform = new TransformMatrix();
                matrix.multiplyWith(transform.scale(x, y));
            },
            rotate: function (angle) {
                var transform = new TransformMatrix();
                matrix.multiplyWith(transform.rotate(angle));
            },
            fillRect: function (color, x, y, w, h) {
                var graphics = getFillGraphics(color);
                graphics.drawRect(x, y, w, h);

                pixiRenderer.setObjectRenderer(graphicsRenderer);
                graphicsRenderer.render(graphics);
            },
            fillCircle: function (color, x, y, radius) {
                var graphics = getFillGraphics(color);
                graphics.drawCircle(x, y, radius);

                pixiRenderer.setObjectRenderer(graphicsRenderer);
                graphicsRenderer.render(graphics);

            },
            strokeRect: function (color, x, y, w, h, lineWidth) {
                var graphics = new PIXI.Graphics();
                var colorInt = color[2] * 255 + (color[1] * 255 << 8) + (color[0] * 255 << 16);
                var alphaColor = color[3];
                graphics.worldTransform = getPixiMatrix();
                graphics.worldAlpha = alpha;

                graphics.lineStyle(lineWidth, colorInt, alphaColor);
                graphics.drawRect(x, y, w, h);

                pixiRenderer.setObjectRenderer(graphicsRenderer);
                graphicsRenderer.render(graphics);
            },
            strokeCircle: function (color, x, y, radius, sAngle, eAngle, lineWidth) {
                var graphics = new PIXI.Graphics();
                var colorInt = color[2] * 255 + (color[1] * 255 << 8) + (color[0] * 255 << 16);
                var alphaColor = color[3];
                graphics.worldTransform = getPixiMatrix();
                graphics.worldAlpha = alpha;

                graphics
                    .lineStyle(lineWidth, colorInt, alphaColor)
                    .arc(x, y, radius, sAngle, eAngle);

                pixiRenderer.setObjectRenderer(graphicsRenderer);
                graphicsRenderer.render(graphics);

            },
            drawLine: function (color, ax, ay, bx, by, width) {
                var graphics = getFillGraphics(color);
                var colorInt = color[2] * 255 + (color[1] * 255 << 8) + (color[0] * 255 << 16);

                if (!Utils.isDefined(width)) {
                    width = 1;
                }
                if (!Utils.isDefined(color[3])) {
                    color[3] = 1;
                }

                graphics
                    .lineStyle(width, colorInt, color[3])
                    .moveTo(ax, ay)
                    .lineTo(bx, by)
                    .endFill();

                pixiRenderer.setObjectRenderer(graphicsRenderer);
                graphicsRenderer.render(graphics);
            },
            drawImage: function (packedImage, sx, sy, sw, sh, x, y, w, h) {
                var image = packedImage.image;
                var px = packedImage.x;
                var py = packedImage.y;
                var rectangle;
                var sprite = spritePool.getSprite();
                var texture;
                // If image and frame size don't correspond Pixi will throw an error and break the game.
                // This check tries to prevent that.
                if (px + sx + sw > image.width || py + sy + sh > image.height) {
                    console.error("Warning: image and frame size do not correspond.", image);
                    return;
                }
                if (!image.texture) {
                    // initialize pixi baseTexture
                    image.texture = new PIXI.BaseTexture(image, PIXI.SCALE_MODES.NEAREST);
                    image.frame = new PIXI.Texture(image.texture);
                }
                // without spritepool
                /*
                rectangle = new PIXI.Rectangle(px + sx, py + sy, sw, sh);
                texture = new PIXI.Texture(image.texture, rectangle);
                texture._updateUvs();
                sprite = new PIXI.Sprite(texture);
                */

                // with spritepool
                texture = image.frame;
                rectangle = texture._frame;
                rectangle.x = px + sx;
                rectangle.y = py + sy;
                rectangle.width = sw;
                rectangle.height = sh;
                texture._updateUvs();
                sprite._texture = texture;

                // apply x, y, w, h
                renderer.save();
                renderer.translate(x, y);
                renderer.scale(w / sw, h / sh);

                sprite.worldTransform = matrix;
                sprite.worldAlpha = alpha;

                // push into batch
                pixiRenderer.setObjectRenderer(spriteRenderer);
                spriteRenderer.render(sprite);

                renderer.restore();

                // did the spriteRenderer flush in the meantime?
                if (spriteRenderer.currentBatchSize === 0) {
                    // the spritepool can be reset as well then
                    spritePool.reset();
                }
            },
            begin: function () {
                spriteRenderer.start();
                if (pixelSize !== 1 || Utils.isCocoonJs()) {
                    this.save();
                    this.scale(pixelSize * cocoonScale, pixelSize * cocoonScale);
                }
            },
            flush: function () {
                // note: only spriterenderer has an implementation of flush
                spriteRenderer.flush();
                spritePool.reset();
                if (pixelSize !== 1 || Utils.isCocoonJs()) {
                    this.restore();
                }
            },
            getOpacity: function () {
                return alpha;
            },
            setOpacity: function (value) {
                alpha = value;
            },
            /*
             * Pixi only feature: draws any pixi displayObject
             */
            drawPixi: function (displayObject) {
                // trick the renderer by setting our own parent
                transformObject.worldTransform = matrix;
                transformObject.worldAlpha = alpha;

                // method 1, replace the "parent" that the renderer swaps with
                // maybe not efficient because it calls flush all the time?
                // pixiRenderer._tempDisplayObjectParent = transformObject;
                // pixiRenderer.render(displayObject);

                // method 2, set the object parent and update transform
                displayObject.parent = transformObject;
                displayObject.updateTransform();
                displayObject.renderWebGL(pixiRenderer);
            },
            getContext: function () {
                return gl;
            },
            getPixiRenderer: function () {
                return pixiRenderer;
            },
            // pixi specific: update the webgl view, needed if the canvas changed size
            updateSize: function () {
                pixiRenderer.resize(canvas.width, canvas.height);
            }
        };

        if (canWebGl && Utils.isDefined(window.PIXI)) {
            // init pixi
            // Matrix = PIXI.Matrix;
            matrix = new TransformMatrix();
            // additional scale
            if (Utils.isCocoonJs()) {
                cocoonScale = window.innerWidth * window.devicePixelRatio / canvas.width;
                canvas.width *= cocoonScale;
                canvas.height *= cocoonScale;
            }
            pixiRenderer = new PIXI.WebGLRenderer(canvas.width, canvas.height, {
                view: canvas,
                backgroundColor: 0x000000,
                clearBeforeRender: false
            });
            pixiRenderer.filterManager.setFilterStack(pixiRenderer.renderTarget.filterStack);
            tempDisplayObjectParent = pixiRenderer._tempDisplayObjectParent;
            spriteRenderer = pixiRenderer.plugins.sprite;
            graphicsRenderer = pixiRenderer.plugins.graphics;
            meshRenderer = pixiRenderer.plugins.mesh;

            return renderer;
        } else {
            if (!window.PIXI) {
                console.log('WARNING: PIXI library is missing, reverting to Canvas2D renderer');
            } else if (!canWebGl) {
                console.log('WARNING: WebGL not available, reverting to Canvas2D renderer');
            }
            return Canvas2d(canvas, settings);
        }
    };
});
/**
 * Sprite component with a pixi sprite exposed. Must be used with pixi renderer.
 * Useful if you want to use pixi features.
 * <br>Exports: Constructor
 * @module bento/components/pixi/sprite
 * @moduleName PixiSprite
 * @returns Returns a component object to be attached to an entity.
 */
bento.define('bento/components/pixi/sprite', [
    'bento',
    'bento/utils',
    'bento/components/sprite'
], function (Bento, Utils, Sprite) {
    'use strict';
    var PixiSprite = function (settings) {
        if (!(this instanceof PixiSprite)) {
            return new PixiSprite(settings);
        }
        Sprite.call(this, settings);
        this.sprite = new window.PIXI.Sprite();
    };
    PixiSprite.prototype = Object.create(Sprite.prototype);
    PixiSprite.prototype.constructor = PixiSprite;
    PixiSprite.prototype.draw = function (data) {
        var entity = data.entity;

        if (!this.currentAnimation || !this.visible) {
            return;
        }
        this.updateFrame();
        this.updateSprite(
            this.spriteImage,
            this.sourceX,
            this.sourceY,
            this.frameWidth,
            this.frameHeight
        );

        // draw with pixi
        data.renderer.translate(-Math.round(this.origin.x), -Math.round(this.origin.y));
        data.renderer.drawPixi(this.sprite);
        data.renderer.translate(Math.round(this.origin.x), Math.round(this.origin.y));
    };
    PixiSprite.prototype.updateSprite = function (packedImage, sx, sy, sw, sh) {
        var rectangle;
        var sprite;
        var texture;
        var image;

        if (!packedImage) {
            return;
        }
        image = packedImage.image;
        if (!image.texture) {
            // initialize pixi baseTexture
            image.texture = new window.PIXI.BaseTexture(image, window.PIXI.SCALE_MODES.NEAREST);
        }
        rectangle = new window.PIXI.Rectangle(sx, sy, sw, sh);
        texture = new window.PIXI.Texture(image.texture, rectangle);
        texture._updateUvs();

        this.sprite.texture = texture;
    };

    PixiSprite.prototype.toString = function () {
        return '[object PixiSprite]';
    };

    return PixiSprite;
});
/**
 * An entity that behaves like a click button.
 * <br>Exports: Constructor
 * @param {Object} settings - Required, can include Entity settings
 * @param {Sprite} settings.sprite - Sprite component. The sprite should have an "up", "down" and an "inactive" animation. Alternatively, you can pass all Sprite settings. Then, by default "up" and "down" are assumed to be frames 0 and 1 respectively. Frame 3 is assumed to be "inactive", if it exists
 * @param {Function} settings.onClick - Callback when user clicks on the button ("this" refers to the clickbutton entity). Alternatively, you can listen to a "clickButton" event, the entity is passed as parameter.
 * @param {Bool} settings.active - Whether the button starts in the active state (default: true)
 * @param {String} [settings.sfx] - Plays sound when pressed
 * @param {Function} [settings.onButtonDown] - When the user holds the mouse or touches the button
 * @param {Function} [settings.onButtonUp] - When the user releases the mouse or stops touching the button
 * @param {Boolean} [settings.sort] - Callbacks are executed first if the component/entity is visually on top. Other ClickButtons must also have "sort" to true.
 * @module bento/gui/clickbutton
 * @moduleName ClickButton
 * @returns Entity
 * @snippet ClickButton|constructor
ClickButton({
    z: ${1:0},
    name: '$2',
    sfx: '$3',
    imageName: '$4',
    frameCountX: ${5:1},
    frameCountY: ${6:3},
    position: new Vector2(${7:0}, ${8:0}),
    updateWhenPaused: ${9:0},
    float: ${10:false},
    onClick: function () {
        $11
    }
});
 */
bento.define('bento/gui/clickbutton', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/components/sprite',
    'bento/components/nineslice',
    'bento/components/clickable',
    'bento/entity',
    'bento/utils',
    'bento/tween',
    'bento/eventsystem'
], function (
    Bento,
    Vector2,
    Rectangle,
    Sprite,
    NineSlice,
    Clickable,
    Entity,
    Utils,
    Tween,
    EventSystem
) {
    'use strict';
    var ClickButton = function (settings) {
        var viewport = Bento.getViewport();
        var active = true;
        var defaultAnimations = {
            'up': {
                speed: 0,
                frames: [0]
            },
            'down': {
                speed: 0,
                frames: [1]
            },
            'inactive': {
                speed: 0,
                frames: [2]
            }
        };
        if (settings.frameCountX * settings.frameCountY <= 2) {
            defaultAnimations.inactive.frames = [0];
        }
        if (settings.frameCountX * settings.frameCountY <= 1) {
            defaultAnimations.down.frames = [0];
        }
        var animations = settings.animations || defaultAnimations;
        var nsSettings = settings.nineSliceSettings || null;
        var nineSlice = !nsSettings ? null : new NineSlice({
            image: settings.image,
            imageName: settings.imageName,
            originRelative: settings.originRelative || new Vector2(0.5, 0.5),
            frameWidth: settings.frameWidth,
            frameHeight: settings.frameHeight,
            frameCountX: settings.frameCountX,
            frameCountY: settings.frameCountY,
            width: nsSettings.width,
            height: nsSettings.height,
            animations: animations
        });
        var sprite = nineSlice ? null : settings.sprite || new Sprite({
            image: settings.image,
            imageName: settings.imageName,
            originRelative: settings.originRelative || new Vector2(0.5, 0.5),
            padding: settings.padding,
            frameWidth: settings.frameWidth,
            frameHeight: settings.frameHeight,
            frameCountX: settings.frameCountX,
            frameCountY: settings.frameCountY,
            animations: animations
        });
        var visualComponent = nineSlice || sprite;
        // workaround for pointerUp/onHoldEnd order of events
        var wasHoldingThis = false;
        var clickable = new Clickable({
            sort: settings.sort,
            ignorePauseDuringPointerUpEvent: settings.ignorePauseDuringPointerUpEvent,
            onClick: function (data) {
                wasHoldingThis = false;
                if (!active || ClickButton.currentlyPressing) {
                    return;
                }
                ClickButton.currentlyPressing = entity;
                setAnimation('down');
                if (settings.onButtonDown) {
                    settings.onButtonDown.apply(entity, [data]);
                }
                EventSystem.fire('clickButton-onButtonDown', {
                    entity: entity,
                    event: 'onClick',
                    data: data
                });
            },
            onHoldEnter: function (data) {
                if (!active) {
                    return;
                }
                setAnimation('down');
                if (settings.onButtonDown) {
                    settings.onButtonDown.apply(entity, [data]);
                }
                EventSystem.fire('clickButton-onButtonDown', {
                    entity: entity,
                    event: 'onHoldEnter',
                    data: data
                });
            },
            onHoldLeave: function (data) {
                if (!active) {
                    return;
                }
                setAnimation('up');
                if (settings.onButtonUp) {
                    settings.onButtonUp.apply(entity, [data]);
                }
                EventSystem.fire('clickButton-onButtonUp', {
                    entity: entity,
                    event: 'onHoldLeave',
                    data: data
                });
            },
            pointerUp: function (data) {
                if (!active) {
                    return;
                }
                setAnimation('up');
                if (settings.onButtonUp) {
                    settings.onButtonUp.apply(entity, [data]);
                }
                EventSystem.fire('clickButton-onButtonUp', {
                    entity: entity,
                    event: 'pointerUp',
                    data: data
                });
                if (ClickButton.currentlyPressing === entity) {
                    wasHoldingThis = true;
                    ClickButton.currentlyPressing = null;
                }
            },
            onHoldEnd: function (data) {
                if (active && settings.onClick && (ClickButton.currentlyPressing === entity || wasHoldingThis)) {
                    wasHoldingThis = false;
                    settings.onClick.apply(entity, [data]);
                    if (settings.sfx) {
                        Bento.audio.stopSound(settings.sfx);
                        Bento.audio.playSound(settings.sfx);
                    }
                    EventSystem.fire('clickButton-onClick', {
                        entity: entity,
                        event: 'onHoldEnd',
                        data: data
                    });
                }
                ClickButton.currentlyPressing = null;
            },
            onClickMiss: function (data) {
                if (settings.onClickMiss) {
                    settings.onClickMiss(data);
                }
            }
        });
        var entitySettings = Utils.extend({
            z: 0,
            name: 'clickButton',
            position: new Vector2(0, 0),
            family: ['buttons'],
            init: function () {
                setActive(active);
            }
        }, settings, true);

        // merge components array
        entitySettings.components = [
            visualComponent,
            clickable
        ].concat(settings.components || []);

        var setActive = function (bool) {
            active = bool;

            animations = visualComponent.animations || animations;

            if (!active) {
                if (ClickButton.currentlyPressing === entity) {
                    ClickButton.currentlyPressing = null;
                }
                if (animations.inactive) {
                    setAnimation('inactive');
                } else {
                    setAnimation('up');
                }
            } else {
                setAnimation('up');
            }
        };

        var setAnimation = function (animation) {
            visualComponent.setAnimation(animation);
        };

        var entity = new Entity(entitySettings).extend({
            /**
             * Activates or deactives the button. Deactivated buttons cannot be pressed.
             * @function
             * @param {Bool} active - Should be active or not
             * @instance
             * @name setActive
             * @snippet #ClickButton.setActive|snippet
            setActive(${1:true});
             */
            setActive: setActive,
            /**
             * Performs the callback as if the button was clicked
             * @function
             * @instance
             * @name doCallback
             * @snippet #ClickButton.doCallback|snippet
            doCallback();
             */
            doCallback: function () {
                settings.onClick.apply(entity);
            },
            /**
             * Check if the button is active
             * @function
             * @instance
             * @name isActive
             * @returns {Bool} Whether the button is active
             * @snippet #ClickButton.isActive|Boolean
            isActive(${1:true});
             */
            isActive: function () {
                return active;
            },
            /**
             * Set the size of the clickbutton if it's using a nine slice
             * @function
             * @param {Number} width
             * @param {Number} height
             * @instance
             * @name setNineSliceSize
             */
            setNineSliceSize: function (width, height) {
                if (visualComponent.name !== 'nineslice') {
                    console.warn("LK_WARN: Don't use setNineSliceSize if the clickbutton uses a sprite.");
                    return;
                }
                nsSettings.width = width;
                nsSettings.height = height;
                visualComponent.width = width;
                visualComponent.height = height;
            }
        });

        if (Utils.isDefined(settings.active)) {
            active = settings.active;
        }

        // events for the button becoming active
        entity.attach({
            name: 'attachComponent',
            start: function () {
                EventSystem.fire('clickButton-start', {
                    entity: entity
                });
            },
            destroy: function () {
                EventSystem.fire('clickButton-destroy', {
                    entity: entity
                });
                if (ClickButton.currentlyPressing === entity) {
                    ClickButton.currentlyPressing = null;
                }
            }
        });

        // active property
        Object.defineProperty(entity, 'active', {
            get: function () {
                return active;
            },
            set: setActive
        });

        return entity;
    };

    ClickButton.currentlyPressing = null;

    return ClickButton;
});
/**
 * An entity that behaves like a counter.
 * <br>Exports: Constructor
 * @module bento/gui/counter
 * @moduleName Counter
 * @returns Entity
 * @snippet Counter|constructor
Counter({
    z: ${1:0},
    name: '$2',
    value: ${3:0},
    imageName: '$4',
    frameCountX: ${5:1},
    frameCountY: ${6:10},
    padding: ${7:0},
    align: '${8:center}',
    spacing: new Vector2(${9:0}, ${10:0}),
    position: new Vector2(${11:0}, ${12:0}),
    updateWhenPaused: ${13:0},
    float: ${14:false},
});
 * @snippet Counter|animations
Counter({
    z: ${1:0},
    name: '$2',
    value: ${3:0},
    imageName: '$4',
    frameCountX: ${5:1},
    frameCountY: ${6:10},
    animations: {
        '0': {
            frames: [0]
        },
        '1': {
            frames: [1]
        },
        '2': {
            frames: [2]
        },
        '3': {
            frames: [3]
        },
        '4': {
            frames: [4]
        },
        '5': {
            frames: [5]
        },
        '6': {
            frames: [6]
        },
        '7': {
            frames: [7]
        },
        '8': {
            frames: [8]
        },
        '9': {
            frames: [9]
        }
    },
    padding: ${7:0},
    align: '${8:center}',
    spacing: new Vector2(${9:0}, ${10:0}),
    position: new Vector2(${11:0}, ${12:0}),
    updateWhenPaused: ${13:0},
    float: ${14:false},
});
 */
bento.define('bento/gui/counter', [
    'bento',
    'bento/entity',
    'bento/math/vector2',
    'bento/components/sprite',
    'bento/utils'
], function (
    Bento,
    Entity,
    Vector2,
    Sprite,
    Utils
) {
    'use strict';
    return function (settings) {
        /*{
            value: Number,
            spacing: Vector,
            align: String,
            image: Image, // lower priority
            frameWidth: Number, // lower priority
            frameHeight: Number, // lower priority
            animations: Object, // only way to overwrite animations
            sprite: Sprite({
                image: Image,
                imageName: String,
                frameWidth: Number,
                frameHeight: Number,
                animations: Animation
            }),
            position: Vector
        }*/
        var value = settings.value || 0;
        var spacing = settings.spacing || new Vector2(0, 0);
        var alignment = settings.align || settings.alignment || 'right';
        var digitWidth = 0;
        var children = [];
        var spriteSettings = {};
        /*
         * Counts the number of digits in the value
         */
        var getDigits = function () {
            return value.toString().length;
        };
        /*
         * Returns an entity with all digits as animation
         */
        var createDigit = function () {
            var defaultNumbers = {
                '0': {
                    frames: [0]
                },
                '1': {
                    frames: [1]
                },
                '2': {
                    frames: [2]
                },
                '3': {
                    frames: [3]
                },
                '4': {
                    frames: [4]
                },
                '5': {
                    frames: [5]
                },
                '6': {
                    frames: [6]
                },
                '7': {
                    frames: [7]
                },
                '8': {
                    frames: [8]
                },
                '9': {
                    frames: [9]
                }
                // TODO: add a '-' as default or not?
                // '-': {
                //     frames: [10]
                // }
            };
            var sprite = new Sprite({
                image: spriteSettings.image,
                padding: spriteSettings.padding,
                imageName: spriteSettings.imageName,
                frameWidth: spriteSettings.frameWidth,
                frameHeight: spriteSettings.frameHeight,
                frameCountX: spriteSettings.frameCountX,
                frameCountY: spriteSettings.frameCountY,
                animations: settings.animations || defaultNumbers
            });
            // settings.digit can be used to change every digit entity constructor
            var digitSettings = Utils.extend({
                components: [sprite]
            }, settings.digit || {});
            var entity = new Entity(digitSettings);

            // update width
            digitWidth = sprite.frameWidth;

            return entity;
        };
        /*
         * Adds or removes children depending on the value
         * and number of current digits and updates
         * the visualuzation of the digits
         */
        var updateDigits = function () {
            // add or remove digits
            var i, l,
                valueStr = value.toString(),
                pos,
                digit,
                digits = getDigits(),
                difference = children.length - digits;
            /* update number of children to be
                    the same as number of digits*/
            if (difference < 0) {
                // create new
                for (i = 0; i < Math.abs(difference); ++i) {
                    digit = createDigit();
                    children.push(digit);
                    container.attach(digit);

                }
            } else if (difference > 0) {
                // remove
                for (i = 0; i < Math.abs(difference); ++i) {
                    digit = children.pop();
                    container.remove(digit);
                }
            }
            /* update animations */
            for (i = 0, l = children.length; i < l; ++i) {
                digit = children[i];
                digit.position = new Vector2((digitWidth + spacing.x) * i, 0);
                digit.getComponent('sprite', function (sprite) {
                    sprite.setAnimation(valueStr.substr(i, 1));
                });
            }

            /* alignment */
            if (alignment === 'right') {
                // move all the children
                for (i = 0, l = children.length; i < l; ++i) {
                    digit = children[i];
                    pos = digit.position;
                    pos.substractFrom(new Vector2((digitWidth + spacing.x) * digits - spacing.x, 0));
                }
            } else if (alignment === 'center') {
                for (i = 0, l = children.length; i < l; ++i) {
                    digit = children[i];
                    pos = digit.position;
                    pos.addTo(new Vector2(((digitWidth + spacing.x) * digits - spacing.x) / -2, 0));
                }
            }
        };
        var entitySettings = {
            z: settings.z,
            name: settings.name,
            position: settings.position
        };
        var container;

        // copy spritesettings
        spriteSettings.image = settings.image;
        spriteSettings.imageName = settings.imageName;
        spriteSettings.padding = settings.padding;
        spriteSettings.frameWidth = settings.frameWidth;
        spriteSettings.frameHeight = settings.frameHeight;
        spriteSettings.frameCountX = settings.frameCountX;
        spriteSettings.frameCountY = settings.frameCountY;
        // can also use a predetermined sprite as base for every
        if (settings.sprite) {
            settings.sprite = settings.sprite.animationSettings;
            spriteSettings.image = settings.sprite.image;
            spriteSettings.imageName = settings.sprite.imageName;
            spriteSettings.padding = settings.sprite.padding;
            spriteSettings.frameWidth = settings.sprite.frameWidth;
            spriteSettings.frameHeight = settings.sprite.frameHeight;
            spriteSettings.frameCountX = settings.sprite.frameCountX;
            spriteSettings.frameCountY = settings.sprite.frameCountY;
        }

        Utils.extend(entitySettings, settings);
        // merge components array
        entitySettings.components = settings.components;
        /*
         * Public interface
         */
        container = new Entity(entitySettings).extend({
            /*
             * Sets current value
             * @snippet #Counter.setValue|snippet
                setValue(${1:0});
             */
            setValue: function (val) {
                value = val;
                updateDigits();
            },
            /*
             * Retrieves current value
             * @snippet #Counter.getValue|Number
                getValue();
             */
            getValue: function () {
                return value;
            },
            /*
             * Add value
             * @snippet #Counter.addValue|snippet
                addValue(${1:0});
             */
            addValue: function (val) {
                value += val;
                updateDigits();
            },
            /*
             * Get number of digits
             * @snippet #Counter.getDigits|Number
                getDigits();
             */
            getDigits: function () {
                return getDigits();
            },
            /*
             * Loop through digits
             * @snippet #Counter.loopDigits|snippet
                loopDigits(function (digitEntity) {$1});
             */
            loopDigits: function (callback) {
                var i = 0, l;
                for (i = 0, l = children.length; i < l; ++i) {
                    callback(children[i]);
                }
            }
        });

        updateDigits();

        return container;
    };
});
/**
 * An entity that displays text from a system font or ttf font. Be warned: drawing text is an expensive operation.
 * This module caches the drawn text as a speed boost, however if you are updating the text all the time this
 * speed boost is cancelled.
 * <br>Exports: Constructor
 * @param {Object} settings - Required, can include Entity settings
 * @param {String} settings.text - String to set as text
 * @param {String} settings.font - Name of the font
 * @param {Number} [settings.fontSize] - Font size in pixels
 * @param {String} [settings.fontColor] - Color of the text (CSS color specification)
 * @param {String} [settings.align] - Alignment: left, center, right (also sets the origin)
 * @param {String} [settings.textBaseline] - Text baseline: bottom, middle, top (also sets the origin)
 * @param {Vector2} [settings.margin] - Expands the canvas (only useful for fonts that have letters that are too large to draw)
 * @param {Number} [settings.ySpacing] - Additional vertical spacing between line breaks
 * @param {Number} [settings.sharpness] - In Chrome the text can become blurry when centered. As a workaround, sharpness acts as extra scale (1 for normal, defaults to 4)
 * @param {Number/Array} [settings.lineWidth] - Line widths (must be set when using strokes), can stroke multiple times
 * @param {String/Array} [settings.strokeStyle] - CSS stroke style
 * @param {Bool/Array} [settings.innerStroke] - Whether the particular stroke should be inside the text
 * @param {Bool} [settings.pixelStroke] - Cocoon.io's canvas+ has a bug with text strokes. This is a workaround that draws a stroke by drawing the text multiple times.
 * @param {Boolean} [settings.shadow] - Draws a shadow under the text
 * @param {Vector2} [settings.shadowOffset] - Offset of shadow
 * @param {String} [settings.shadowColor] - Color of the shadow (CSS color specification)
 * @param {Number} [settings.maxWidth] - Maximum width for the text. If the the text goes over this, it will first start adding linebreaks. If that doesn't help it will start scaling ifself down. Use null to reset maxWidth.
 * @param {Number} [settings.maxHeight] - Maximum height for the text. If the the text goes over this, it will start scaling itself down. Use null to reset maxHeight.
 * @param {Number} [settings.linebreaks] - Allow the module to add linebreaks to fit text with maxWidth (default true)
 * @param {Boolean} [settings.drawDebug] - Draws the maxWidth and maxHeight as a box. Also available as static value Text.drawDebug, affecting every Text object.
 * @module bento/gui/text
 * @moduleName Text
 * @snippet Text|constructor
Text({
    z: ${1:0},
    position: new Vector2(${2:0}, ${3:0}),
    text: '${4}',
    font: '${5:font}',
    fontSize: ${6:16},
    fontColor: '${7:#ffffff}',
    align: '${8:left}',
    textBaseline: '${9:bottom}',
    ySpacing: ${10:0},
    lineWidth: ${11:0}, // set to add an outline
    strokeStyle: '${12:#000000}',
    innerStroke: ${13:false},
    pixelStroke: ${14:false}, // workaround for Cocoon bug
    maxWidth: ${15:undefined},
    maxHeight: ${16:undefined},
    linebreaks: ${17:true},
    drawDebug: ${18:false},
    components: [$19]
});
 * @returns Entity
 */
bento.define('bento/gui/text', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/utils',
    'bento/components/sprite',
    'bento/packedimage'
], function (
    Bento,
    Vector2,
    Rectangle,
    Entity,
    Utils,
    Sprite,
    PackedImage
) {
    'use strict';
    var isEmpty = function (obj) {
        var temp;
        if (obj === "" || obj === 0 || obj === "0" || obj === null ||
            obj === false || !Utils.isDefined(obj)) {
            return true;
        }
        //  Check if the array is empty
        if (Utils.isArray(obj) && obj.length === 0) {
            return true;
        }
        //  Check if the object is empty
        if (Utils.isObject(obj)) {
            for (temp in obj) {
                if (Utils.has(obj, temp)) {
                    return false;
                }
            }
            return true;
        }
        return false;
    };

    var Text = function (settings) {
        /*settings = {
            font: string,
            align: string,
            textBaseline: string,
            margin: vector,
            fontColor: string ,
            lineWidth: number or array,
            strokeStyle: string or array,
            innerStroke: boolean or array,
            pixelStroke: boolean, // for the Cocoon strokeText bug
            fontSize: number,
            ySpacing: number,
            position: vector
        }*/
        var text = '';
        var linebreaks = true;
        var maxWidth;
        var maxHeight;
        var fontWeight = 'normal';
        var gradient;
        var gradientColors = ['black', 'white'];
        var align = 'left';
        var font = 'arial';
        var fontSize = 16;
        var originalFontSize = 32;
        var fontColor = 'black';
        var lineWidth = [0];
        var maxLineWidth = 0;
        var strokeStyle = ['black'];
        var innerStroke = [false];
        var textBaseline = 'top';
        var pixelStroke = false;
        var centerByCanvas = false; // quick fix
        var strings = [];
        var spaceWidth = 0;
        var margin = new Vector2(8, 8);
        var ySpacing = 0;
        var overlaySprite = null;
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var canvasWidth = 1;
        var canvasHeight = 1;
        var compositeOperation = 'source-over';
        var packedImage = new PackedImage(canvas);
        var sharpness = 4; // extra scaling to counter blurriness in chrome
        var invSharpness = 1 / sharpness;
        var fontSizeCache = {};
        var drawDebug = settings.drawDebug || false;
        var shadow = false;
        var shadowOffset = new Vector2(0, 0);
        var shadowOffsetMax = 0;
        var shadowColor = 'black';
        /*
         * Prepare font settings, gradients, max width/height etc.
         */
        var applySettings = function (textSettings) {
            var i,
                l,
                maxLength;

            // apply fontSettings
            if (textSettings.fontSettings) {
                Utils.extend(textSettings, textSettings.fontSettings);
            }

            // patch for blurry text in chrome
            if (textSettings.sharpness) {
                sharpness = textSettings.sharpness;
                invSharpness = 1 / sharpness;
            }
            if (textSettings.fontSize) {
                textSettings.fontSize *= sharpness;
            }

            /*
             * Gradient settings
             * overwrites fontColor behavior
             */
            if (textSettings.gradient) {
                gradient = textSettings.gradient;
            }
            if (textSettings.gradientColors) {
                gradientColors = [];
                for (i = 0, l = textSettings.gradientColors.length; i < l; ++i) {
                    gradientColors[i] = textSettings.gradientColors[i];
                }
            }
            if (textSettings.overlaySprite) {
                overlaySprite = textSettings.overlaySprite;
                if (!overlaySprite.initialized) {
                    overlaySprite.init();
                    overlaySprite.initialized = true;
                }
            }
            /*
             * Alignment settings
             */
            if (textSettings.align) {
                align = textSettings.align;
            }
            if (Utils.isDefined(textSettings.ySpacing)) {
                ySpacing = textSettings.ySpacing * sharpness;
            }
            /*
             * Font settings
             */
            if (textSettings.font) {
                font = textSettings.font;
            }
            if (Utils.isDefined(textSettings.fontSize)) {
                fontSize = textSettings.fontSize;
                originalFontSize = fontSize;
            }
            if (textSettings.fontColor) {
                fontColor = textSettings.fontColor;
            }
            if (textSettings.textBaseline) {
                textBaseline = textSettings.textBaseline;
            }
            if (textSettings.centerByCanvas) {
                centerByCanvas = textSettings.centerByCanvas;
            }
            if (Utils.isDefined(textSettings.fontWeight)) {
                fontWeight = textSettings.fontWeight;
            }
            /*
             * Stroke settings
             * Sets a stroke over the text. You can apply multiple strokes by
             * supplying an array of lineWidths / strokeStyles
             * By default, the strokes are outlines, you can create inner strokes
             * by setting innerStroke to true (for each stroke by supplying an array).
             *
             * lineWidth: {Number / Array of Numbers} width of linestroke(s)
             * strokeStyle: {strokeStyle / Array of strokeStyles} A strokestyle can be a
             *              color string, a gradient object or pattern object
             * innerStroke: {Boolean / Array of booleans} True = stroke becomes an inner stroke, false by default
             */
            if (Utils.isDefined(textSettings.lineWidth)) {
                if (!Utils.isArray(textSettings.lineWidth)) {
                    lineWidth = [textSettings.lineWidth * sharpness];
                } else {
                    lineWidth = textSettings.lineWidth;
                    Utils.forEach(lineWidth, function (item, i, l, breakLoop) {
                        lineWidth[i] *= sharpness;
                    });
                }
            }
            if (textSettings.strokeStyle) {
                if (!Utils.isArray(textSettings.strokeStyle)) {
                    strokeStyle = [textSettings.strokeStyle];
                } else {
                    strokeStyle = textSettings.strokeStyle;
                }
            }
            if (textSettings.innerStroke) {
                if (!Utils.isArray(textSettings.innerStroke)) {
                    innerStroke = [textSettings.innerStroke];
                } else {
                    innerStroke = textSettings.innerStroke;
                }
            }
            pixelStroke = textSettings.pixelStroke || false;
            // align array lengths
            maxLength = Math.max(lineWidth.length, strokeStyle.length, innerStroke.length);
            while (lineWidth.length < maxLength) {
                lineWidth.push(0);
            }
            while (strokeStyle.length < maxLength) {
                strokeStyle.push('black');
            }
            while (innerStroke.length < maxLength) {
                innerStroke.push(false);
            }
            // find max width
            maxLineWidth = 0;
            for (i = 0, l = lineWidth.length; i < l; ++i) {
                // double lineWidth, because we only do outer/inner
                maxLineWidth = Math.max(maxLineWidth, lineWidth[i] * 2);
            }

            // shadow
            if (Utils.isDefined(textSettings.shadow)) {
                shadow = textSettings.shadow;
                if (Utils.isDefined(textSettings.shadowOffset)) {
                    shadowOffset = textSettings.shadowOffset.scalarMultiplyWith(sharpness);
                } else {
                    if (shadow) {
                        // default is 1 pixel down
                        shadowOffset = new Vector2(0, 1 * sharpness);
                    } else {
                        shadowOffset = new Vector2(0, 0);
                    }
                }
                // get largest offset so we can resize the canvas
                shadowOffsetMax = Math.max(Math.abs(shadowOffset.x), Math.abs(shadowOffset.y));
                shadowColor = textSettings.shadowColor || 'black';
            }

            /*
             * entity settings
             */
            if (Utils.isDefined(textSettings.linebreaks)) {
                linebreaks = textSettings.linebreaks;
            }
            if (Utils.isDefined(textSettings.maxWidth)) {
                maxWidth = textSettings.maxWidth * sharpness;
            }
            if (Utils.isDefined(textSettings.maxHeight)) {
                maxHeight = textSettings.maxHeight * sharpness;
            }
            if (Utils.isDefined(textSettings.margin)) {
                margin = textSettings.margin;
            }

            // set up text
            if (textSettings.text) {
                entity.setText(settings.text);
            } else {
                entity.setText(text);
            }
        };
        /*
         * Draw text to canvas
         */
        var updateCanvas = function () {
            if (!canvas) {
                // re-initialize canvas
                canvas = document.createElement('canvas');
                ctx = canvas.getContext('2d');
                packedImage.image = canvas;
            }

            var i, ii,
                j, jj,
                l,
                x,
                y,
                scale,
                // extra offset because we may draw a line around the text
                offset = new Vector2(maxLineWidth / 2, maxLineWidth / 2),
                origin = sprite.origin,
                position = entity.position,
                doPixelStroke = function () {
                    var tempCanvas = document.createElement('canvas');
                    var tempCtx = tempCanvas.getContext('2d');

                    tempCanvas.width = canvas.width;
                    tempCanvas.height = canvas.height;

                    // copy fillText operation with
                    setContext(tempCtx);
                    tempCtx.fillStyle = strokeStyle[j];
                    tempCtx.fillText(strings[i].string, ~~x, ~~y + (navigator.isCocoonJS ? 0 : 0.5));

                    // draw it 8 times on normal canvas
                    ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, -lineWidth, tempCanvas.width, tempCanvas.height);
                    ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, -lineWidth, -lineWidth, tempCanvas.width, tempCanvas.height);
                    ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, -lineWidth, 0, tempCanvas.width, tempCanvas.height);
                    ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, -lineWidth, lineWidth, tempCanvas.width, tempCanvas.height);
                    ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, lineWidth, tempCanvas.width, tempCanvas.height);
                    ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, lineWidth, lineWidth, tempCanvas.width, tempCanvas.height);
                    ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, lineWidth, 0, tempCanvas.width, tempCanvas.height);
                    ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, lineWidth, -lineWidth, tempCanvas.width, tempCanvas.height);
                },
                doShadow = function () {
                    var tempCanvas = document.createElement('canvas');
                    var tempCtx = tempCanvas.getContext('2d');

                    tempCanvas.width = canvas.width;
                    tempCanvas.height = canvas.height;

                    // copy fillText operation with
                    setContext(tempCtx);
                    tempCtx.fillStyle = shadowColor;
                    tempCtx.fillText(strings[i].string, ~~x, ~~y + (navigator.isCocoonJS ? 0 : 0.5));

                    // draw it again on normal canvas
                    ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, shadowOffset.x, shadowOffset.y, tempCanvas.width, tempCanvas.height);
                };

            // resize canvas based on text size
            canvas.width = canvasWidth + maxLineWidth + shadowOffsetMax + margin.x * 2;
            canvas.height = canvasHeight + maxLineWidth + shadowOffsetMax + margin.y * 2;
            // clear
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // update baseobject
            entity.dimension = new Rectangle(0, 0, canvas.width / sharpness, canvas.height / sharpness);

            // TODO: fix this if needed
            // fit overlay onto canvas
            if (overlaySprite) {
                scale = canvas.width / overlaySprite.getDimension().width;
                if (overlaySprite.scalable) {
                    overlaySprite.scalable.setScale(new Vector2(scale, scale));
                }
            }

            // offset text left or up for shadow if needed
            if (shadow) {
                if (shadowOffset.x < 0) {
                    offset.x -= shadowOffset.x;
                }
                if (shadowOffset.y < 0) {
                    offset.y -= shadowOffset.y;
                }
            }

            // set alignment by setting the origin
            switch (align) {
            case 'left':
                origin.x = 0;
                break;
            case 'center':
                origin.x = margin.x + canvasWidth / 2;
                break;
            case 'right':
                origin.x = margin.x + canvasWidth;
                break;
            default:
                break;
            }
            switch (textBaseline) {
            case 'top':
                origin.y = 0;
                break;
            case 'middle':
                origin.y = (centerByCanvas ? canvas.height : canvasHeight) / 2;
                break;
            case 'bottom':
                origin.y = (centerByCanvas ? canvas.height : canvasHeight);
                break;
            default:
                break;
            }

            // draw text
            setContext(ctx);
            for (i = 0, ii = strings.length; i < ii; ++i) {
                // gradient or solid color
                if (Utils.isDefined(strings[i].gradient)) {
                    ctx.fillStyle = strings[i].gradient;
                } else {
                    ctx.fillStyle = fontColor;
                }
                // add 1 fontSize because text is aligned to the bottom (most reliable one)
                x = offset.x + origin.x + strings[i].spaceWidth / 2;
                y = offset.y + (i + 1) * fontSize + margin.y + ySpacing * i;

                // outer stroke with pixelStroke
                ctx.globalCompositeOperation = 'source-over';
                if (pixelStroke) {
                    for (j = lineWidth.length - 1; j >= 0; --j) {
                        if (lineWidth[j] && !innerStroke[j]) {
                            doPixelStroke();
                        }
                    }
                }

                // shadow
                if (shadow) {
                    doShadow();
                }

                // fillText
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillText(strings[i].string, ~~x, ~~y + (navigator.isCocoonJS ? 0 : 0.5));


                // pattern
                if (!isEmpty(overlaySprite)) {
                    ctx.globalCompositeOperation = 'source-atop';
                    overlaySprite.setPosition(new Vector2(x, y - fontSize));
                    overlaySprite.draw({
                        canvas: canvas,
                        context: ctx
                    });
                }

                // inner stroke
                ctx.globalCompositeOperation = 'source-atop';
                for (j = 0, jj = lineWidth.length; j < jj; ++j) {
                    if (lineWidth[j] && innerStroke[j]) {
                        ctx.lineWidth = lineWidth[j] * 2;
                        ctx.strokeStyle = strokeStyle[j];
                        ctx.strokeText(strings[i].string, ~~x, ~~y);
                    }
                }

                // outer stroke
                if (!pixelStroke) {
                    ctx.globalCompositeOperation = 'destination-over';
                    for (j = lineWidth.length - 1; j >= 0; --j) {
                        if (lineWidth[j] && !innerStroke[j]) {
                            ctx.lineWidth = lineWidth[j] * 2;
                            ctx.strokeStyle = strokeStyle[j];
                            ctx.strokeText(strings[i].string, ~~x, ~~y);
                        }
                    }
                }
            }
            restoreContext(ctx);
            canvas.texture = null;
            packedImage = new PackedImage(canvas);
            sprite.setup({
                image: packedImage
            });
        };
        /*
         * Restore context and previous font settings
         */
        var restoreContext = function (context) {
            context.textAlign = 'left';
            context.textBaseline = 'bottom';
            context.lineWidth = 0;
            context.strokeStyle = 'black';
            context.fillStyle = 'black';
            context.globalCompositeOperation = compositeOperation;
            context.restore();
        };
        /*
         * Save context and set font settings for drawing
         */
        var setContext = function (context) {
            context.save();
            context.textAlign = align;
            context.textBaseline = 'bottom';
            context.font = fontWeight + ' ' + fontSize.toString() + 'px ' + font;
            compositeOperation = context.globalCompositeOperation;
        };
        /*
         * Splits the string into an array per line (canvas does not support
         * drawing of linebreaks in text)
         */
        var setupStrings = function () {
            var singleStrings = ('' + text).split('\n'),
                stringWidth,
                singleString,
                i,
                j,
                l,
                calcGrd,
                subString,
                remainingString,
                spacePos,
                extraSpace = false;

            strings = [];
            canvasWidth = 1;
            canvasHeight = 1;
            setContext(ctx);
            for (i = 0, l = singleStrings.length; i < l; ++i) {
                spaceWidth = 0;
                singleString = singleStrings[i];
                stringWidth = ctx.measureText(singleString).width;
                // do we need to generate extra linebreaks?
                if (linebreaks && !isEmpty(maxWidth) && stringWidth > maxWidth) {
                    // start cutting off letters until width is correct
                    j = 0;
                    while (stringWidth > maxWidth) {
                        ++j;
                        subString = singleString.slice(0, singleString.length - j);
                        stringWidth = ctx.measureText(subString).width;
                        // no more letters left: assume 1 letter
                        if (j === l) {
                            j = l - 1;
                            break;
                        }
                    }
                    // find first space to split (if there are no spaces, we just split at our current position)
                    spacePos = subString.lastIndexOf(' ');
                    if (spacePos > 0 && spacePos != subString.length) {
                        // set splitting position
                        j += subString.length - spacePos;
                    }
                    // split the string into 2
                    remainingString = singleString.slice(l - j, l);
                    singleString = singleString.slice(0, l - j);

                    // remove first space in remainingString
                    if (remainingString.charAt(0) === ' ') {
                        remainingString = remainingString.slice(1);
                    }

                    // the remaining string will be pushed into the array right after this one
                    if (remainingString.length !== 0) {
                        singleStrings.splice(i + 1, 0, remainingString);
                    }

                    // set width correctly and proceed
                    stringWidth = ctx.measureText(singleString).width;
                }

                if (stringWidth > canvasWidth) {
                    canvasWidth = stringWidth;
                }

                calcGrd = calculateGradient(stringWidth, i);
                strings.push({
                    string: singleString,
                    width: stringWidth,
                    gradient: calcGrd,
                    spaceWidth: spaceWidth
                });
                canvasHeight += fontSize + ySpacing;
            }
        };
        /*
         * Prepares the gradient object for every string line
         * @param {Number} width - Gradient width
         * @param {index} index - String index of strings array
         */
        var calculateGradient = function (width, index) {
            var grd,
                startGrd = {
                    x: 0,
                    y: 0
                },
                endGrd = {
                    x: 0,
                    y: 0
                },
                gradientValue,
                i,
                l,
                top,
                bottom;

            if (!gradient) {
                return;
            }

            top = (fontSize + ySpacing) * index;
            bottom = (fontSize + ySpacing) * (index + 1);

            switch (gradient) {
            case 'top-down':
                startGrd.x = 0;
                startGrd.y = top;
                endGrd.x = 0;
                endGrd.y = bottom;
                break;
            case 'down-top':
                startGrd.x = 0;
                startGrd.y = bottom;
                endGrd.x = 0;
                endGrd.y = top;
                break;
            case 'left-right':
                startGrd.x = 0;
                startGrd.y = 0;
                endGrd.x = width;
                endGrd.y = 0;
                break;
            case 'right-left':
                startGrd.x = width;
                startGrd.y = 0;
                endGrd.x = 0;
                endGrd.y = 0;
                break;
            case 'topleft-downright':
                startGrd.x = 0;
                startGrd.y = top;
                endGrd.x = width;
                endGrd.y = bottom;
                break;
            case 'topright-downleft':
                startGrd.x = width;
                startGrd.y = top;
                endGrd.x = 0;
                endGrd.y = bottom;
                break;
            case 'downleft-topright':
                startGrd.x = 0;
                startGrd.y = bottom;
                endGrd.x = width;
                endGrd.y = top;
                break;
            case 'downright-topleft':
                startGrd.x = width;
                startGrd.y = bottom;
                endGrd.x = 0;
                endGrd.y = top;
                break;
            default:
                break;
            }
            // offset with the linewidth
            startGrd.x += maxLineWidth / 2;
            startGrd.y += maxLineWidth / 2;
            endGrd.x += maxLineWidth / 2;
            endGrd.y += maxLineWidth / 2;

            grd = {};/*ctx.createLinearGradient(
                startGrd.x,
                startGrd.y,
                endGrd.x,
                endGrd.y
            );
            for (i = 0.0, l = gradientColors.length; i < l; ++i) {
                gradientValue = i * (1 / (l - 1));
                grd.addColorStop(gradientValue, gradientColors[i]);
            }*/

            return grd;
        };
        var debugDrawComponent = {
            name: 'debugDrawComponent',
            draw: function (data) {
                // draw the debug box while we're at it
                var entity;
                var box;
                var relativeOrigin = new Vector2(0, 0);
                var absoluteOrigin = new Vector2(0, 0);
                if (
                    (Text.drawDebug || drawDebug) &&
                    (maxWidth !== null || maxHeight !== null)
                ) {
                    entity = data.entity;

                    // predict where the origin will be if max is not reached
                    relativeOrigin.x = sprite.origin.x / entity.dimension.width;
                    relativeOrigin.y = sprite.origin.y / entity.dimension.height;
                    absoluteOrigin = sprite.origin.clone();
                    if (maxWidth !== null) {
                        absoluteOrigin.x = relativeOrigin.x * maxWidth;
                    }
                    if (maxHeight !== null) {
                        absoluteOrigin.y = relativeOrigin.y * maxHeight;
                    }

                    box = new Rectangle(
                        absoluteOrigin.x * -1 || 0,
                        absoluteOrigin.y * -1 || 0,
                        maxWidth || entity.dimension.width,
                        maxHeight || entity.dimension.height
                    );
                    data.renderer.fillRect([0, 0, 1, 0.25], box.x, box.y, box.width, box.height);
                    // draw edges
                    if (maxWidth !== null) {
                        data.renderer.drawLine([0, 0, 1, 0.5], box.x, box.y, box.x, box.y + box.height, 1);
                        data.renderer.drawLine([0, 0, 1, 0.5], box.x + box.width, box.y, box.x + box.width, box.y + box.height, 1);
                    }
                    if (maxHeight !== null) {
                        data.renderer.drawLine([0, 0, 1, 0.5], box.x, box.y, box.x + box.width, box.y, 1);
                        data.renderer.drawLine([0, 0, 1, 0.5], box.x, box.y + box.height, box.x + box.width, box.y + box.height, 1);
                    }
                }
            },
            start: function () {
                // re-init canvas
                if (!canvas) {
                    updateCanvas();
                }
            },
            destroy: function () {
                if (Text.disposeCanvas && canvas.dispose) {
                    canvas.dispose();
                    canvas = null;
                }
            }
        };
        var sprite = new Sprite({
            image: packedImage
        });
        var scaler = new Entity({
            name: 'sharpnessScaler',
            scale: new Vector2(invSharpness, invSharpness),
            components: [
                debugDrawComponent,
                sprite
            ]
        });
        var entitySettings = Utils.extend({
            z: 0,
            name: 'text',
            position: new Vector2(0, 0)
        }, settings, true);

        // merge components array
        entitySettings.components = settings.components || [];

        var entity;

        // add the scaler (debugDrawComponent and sprite) as top component
        entitySettings.components = [scaler].concat(entitySettings.components || []);

        entity = new Entity(entitySettings).extend({
            /**
             * Get a reference to the internal canvas
             * @function
             * @instance
             * @name getCanvas
             * @returns HTMLCanvasElement
             */
            getCanvas: function () {
                return canvas;
            },
            /**
             * Retrieve current text
             * @function
             * @instance
             * @name getText
             * @returns String
             * @snippet #Text.getText|String
                getText();
             */
            getText: function () {
                return text;
            },
            /**
             * Get array of the string setup settings
             * @function
             * @instance
             * @name getStrings
             * @snippet #Text.getStrings|Array
                getStrings();
             * @returns Array
             */
            getStrings: function () {
                return strings;
            },
            /**
             * Sets and displays current text
             * @param {String} text - The string you want to set
             * @param {Object} settings (optional) - Apply new settings for text visuals
             * @function
             * @instance
             * @name setText
             * @snippet #Text.setText|snippet
                setText('$1');
             * @snippet #Text.setText|settings
                setText('$1', ${2:{}});
             */
            setText: function (str, settings) {
                var cachedFontSize = 0,
                    hash;
                //reset fontSize
                fontSize = originalFontSize;

                if (settings) {
                    applySettings(settings);
                }
                text = str;
                setupStrings();

                // check maxWidth and maxHeight
                if (!isEmpty(maxWidth) || !isEmpty(maxHeight)) {
                    hash = Utils.checksum(str + '_' + maxWidth + '_' + maxHeight);
                    if (Utils.isDefined(fontSizeCache[hash])) {
                        fontSize = fontSizeCache[hash];
                        setupStrings();
                    } else {
                        while (fontSize > 0 && ((!isEmpty(maxWidth) && canvasWidth > maxWidth) || (!isEmpty(maxHeight) && canvasHeight > maxHeight))) {
                            // try again by reducing fontsize
                            fontSize -= 1;
                            setupStrings();
                        }
                        fontSizeCache[hash] = fontSize;
                    }
                }
                updateCanvas();

                return fontSize / sharpness;
            }
        });

        applySettings(settings);

        return entity;
    };

    // static value drawDebug
    Text.drawDebug = false;
    // clean up internal canvas
    Text.disposeCanvas = false;

    return Text;
});
/**
 * An entity that behaves like a toggle button.
 * <br>Exports: Constructor
 * @param {Object} settings - Required, can include Entity settings
 * @param {Sprite} settings.sprite - Same as clickbutton! See @link module:bento/gui/clickbutton}
 * @param {Bool} settings.active - Whether the button starts in the active state (default: true)
 * @param {Bool} settings.toggled - Initial toggle state (default: false)
 * @param {String} settings.onToggle - Callback when user clicks on the toggle ("this" refers to the clickbutton entity).
 * @param {String} [settings.sfx] - Plays sound when pressed
 * @module bento/gui/togglebutton
 * @moduleName ToggleButton
 * @returns Entity
 * @snippet ToggleButton|constructor
ToggleButton({
    z: ${1:0},
    name: '$2',
    sfx: '$3',
    imageName: '$4',
    frameCountX: ${5:1},
    frameCountY: ${6:3},
    position: new Vector2(${7:0}, ${8:0}),
    updateWhenPaused: ${9:0},
    float: ${10:false},
    onToggle: function () {
        ${11}
    }
});
 */
bento.define('bento/gui/togglebutton', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/components/sprite',
    'bento/components/clickable',
    'bento/entity',
    'bento/utils',
    'bento/tween',
    'bento/eventsystem'
], function (
    Bento,
    Vector2,
    Rectangle,
    Sprite,
    Clickable,
    Entity,
    Utils,
    Tween,
    EventSystem
) {
    'use strict';
    return function (settings) {
        var viewport = Bento.getViewport();
        var active = true;
        var toggled = false;
        var animations = settings.animations || {
            'up': {
                speed: 0,
                frames: [0]
            },
            'down': {
                speed: 0,
                frames: [1]
            }
        };
        var sprite = settings.sprite || new Sprite({
            image: settings.image,
            imageName: settings.imageName,
            originRelative: settings.originRelative || new Vector2(0.5, 0.5),
            padding: settings.padding,
            frameWidth: settings.frameWidth,
            frameHeight: settings.frameHeight,
            frameCountX: settings.frameCountX,
            frameCountY: settings.frameCountY,
            animations: animations
        });
        var clickable = new Clickable({
            sort: settings.sort,
            ignorePauseDuringPointerUpEvent: settings.ignorePauseDuringPointerUpEvent,
            onClick: function () {
                if (!active) {
                    return;
                }
                sprite.setAnimation('down');
                EventSystem.fire('toggleButton-toggle-down', {
                    entity: entity,
                    event: 'onClick'
                });
            },
            onHoldEnter: function () {
                if (!active) {
                    return;
                }
                sprite.setAnimation('down');
                EventSystem.fire('toggleButton-toggle-down', {
                    entity: entity,
                    event: 'onHoldEnter'
                });
            },
            onHoldLeave: function () {
                if (!active) {
                    return;
                }
                sprite.setAnimation(toggled ? 'down' : 'up');
                EventSystem.fire('toggleButton-toggle-' + (toggled ? 'down' : 'up'), {
                    entity: entity,
                    event: 'onHoldLeave'
                });
            },
            pointerUp: function () {
                if (!active) {
                    return;
                }
                sprite.setAnimation(toggled ? 'down' : 'up');
                EventSystem.fire('toggleButton-toggle-' + (toggled ? 'down' : 'up'), {
                    entity: entity,
                    event: 'pointerUp'
                });
            },
            onHoldEnd: function () {
                if (!active) {
                    return;
                }
                if (toggled) {
                    toggled = false;
                } else {
                    toggled = true;
                }
                if (settings.onToggle) {
                    settings.onToggle.apply(entity);
                    if (settings.sfx) {
                        Bento.audio.stopSound(settings.sfx);
                        Bento.audio.playSound(settings.sfx);
                    }
                }
                sprite.setAnimation(toggled ? 'down' : 'up');
                EventSystem.fire('toggleButton-onToggle', {
                    entity: entity,
                    event: 'onHoldEnd'
                });
            }
        });
        var entitySettings = Utils.extend({
            z: 0,
            name: 'toggleButton',
            position: new Vector2(0, 0),
            family: ['buttons']
        }, settings);

        // merge components array
        entitySettings.components = [
            sprite,
            clickable
        ].concat(settings.components || []);

        var entity = new Entity(entitySettings).extend({
            /**
             * Check if the button is toggled
             * @function
             * @instance
             * @name isToggled
             * @snippet #ToggleButton.isToggled|Boolean
                isToggled();
             * @returns {Bool} Whether the button is toggled
             */
            isToggled: function () {
                return toggled;
            },
            /**
             * Toggles the button programatically
             * @function
             * @param {Bool} state - Toggled or not
             * @param {Bool} doCallback - Perform the onToggle callback or not
             * @instance
             * @name toggle
             * @snippet #ToggleButton.toggle|snippet
                toggle(${1:true});
             * @snippet #ToggleButton.toggle|do callback
                toggle(${1:true}, true);
             */
            toggle: function (state, doCallback) {
                if (Utils.isDefined(state)) {
                    toggled = state;
                } else {
                    toggled = !toggled;
                }
                if (doCallback) {
                    if (settings.onToggle) {
                        settings.onToggle.apply(entity);
                        if (settings.sfx) {
                            Bento.audio.stopSound(settings.sfx);
                            Bento.audio.playSound(settings.sfx);
                        }
                    }
                }
                sprite.setAnimation(toggled ? 'down' : 'up');
            },
            mimicClick: function () {
                entity.getComponent('clickable').callbacks.onHoldEnd();
            },
            /**
             * Activates or deactives the button. Deactivated buttons cannot be pressed.
             * @function
             * @param {Bool} active - Should be active or not
             * @instance
             * @name setActive
             * @snippet #ToggleButton.setActive|snippet
                setActive(${1:true});
             */
            setActive: function (bool) {
                active = bool;
                if (!active && animations.inactive) {
                    sprite.setAnimation('inactive');
                } else {
                    sprite.setAnimation(toggled ? 'down' : 'up');
                }
            },
            /**
             * Performs the callback as if the button was clicked
             * @function
             * @instance
             * @name doCallback
             * @snippet #ToggleButton.doCallback|snippet
                doCallback();
             */
            doCallback: function () {
                settings.onToggle.apply(entity);
            },
            /**
             * Check if the button is active
             * @function
             * @instance
             * @name isActive
             * @returns {Bool} Whether the button is active
             * @snippet #ToggleButton.isActive|Boolean
                isActive();
             */
            isActive: function () {
                return active;
            }
        });

        if (Utils.isDefined(settings.active)) {
            active = settings.active;
        }
        // set intial state
        if (settings.toggled) {
            toggled = true;
        }

        animations = sprite.animations || animations;
        if (!active && animations.inactive) {
            sprite.setAnimation('inactive');
        } else {
            sprite.setAnimation(toggled ? 'down' : 'up');
        }

        // events for the button becoming active
        entity.attach({
            name: 'attachComponent',
            start: function () {
                EventSystem.fire('toggleButton-start', {
                    entity: entity
                });
            },
            destroy: function () {
                EventSystem.fire('toggleButton-destroy', {
                    entity: entity
                });
            }
        });

        // active property
        Object.defineProperty(entity, 'active', {
            get: function () {
                return active;
            },
            set: entity.setActive
        });

        return entity;
    };
});
/**
 * Allows you to fire custom events. Catch these events by using EventSystem.on(). Don't forget to turn
 off listeners with EventSystem.off or you will end up with memory leaks and/or unexpected behaviors.
 * <br>Exports: Object
 * @module bento/eventsystem
 * @moduleName EventSystem
 * @snippet EventSystem.on|snippet
EventSystem.on('${1}', ${2:fn});
 * @snippet EventSystem.off|snippet
EventSystem.off('${1}', ${2:fn});
 * @snippet EventSystem.fire|snippet
EventSystem.fire('${1}', ${2:data});
 */
bento.define('bento/eventsystem', [
    'bento/utils'
], function (Utils) {
    var isLoopingEvents = false;
    var events = {};
    /*events = {
            [String eventName]: [Array listeners = {callback: Function, context: this}]
        }*/
    var removedEvents = [];
    var cleanEventListeners = function () {
        var i, j, l, listeners, eventName, callback, context;

        if (isLoopingEvents) {
            return;
        }
        for (j = 0, l = removedEvents.length; j < l; ++j) {
            eventName = removedEvents[j].eventName;
            if (removedEvents[j].reset === true) {
                // reset the whole event listener
                events[eventName] = [];
                continue;
            }
            callback = removedEvents[j].callback;
            context = removedEvents[j].context;
            if (Utils.isUndefined(events[eventName])) {
                continue;
            }
            listeners = events[eventName];
            for (i = listeners.length - 1; i >= 0; --i) {
                if (listeners[i].callback === callback) {
                    if (context) {
                        if (listeners[i].context === context) {
                            events[eventName].splice(i, 1);
                            break;
                        }
                    } else {
                        events[eventName].splice(i, 1);
                        break;
                    }
                }
            }
        }
        removedEvents = [];
    };
    var addEventListener = function (eventName, callback, context) {
        if (Utils.isUndefined(events[eventName])) {
            events[eventName] = [];
        }
        events[eventName].push({
            callback: callback,
            context: context
        });
    };
    var removeEventListener = function (eventName, callback, context) {
        var listeners = events[eventName];
        if (!listeners || listeners.length === 0) {
            return;
        }
        removedEvents.push({
            eventName: eventName,
            callback: callback,
            context: context
        });

        if (!isLoopingEvents) {
            // can clean immediately
            cleanEventListeners();
        }
    };
    var clearEventListeners = function (eventName) {
        var listeners = events[eventName];
        if (!listeners || listeners.length === 0) {
            return;
        }
        removedEvents.push({
            eventName: eventName,
            reset: true
        });

        if (!isLoopingEvents) {
            // can clean immediately
            cleanEventListeners();
        }
    };
    var stopPropagation = false;
    var EventSystem = {
        SortedEventSystem: null,
        /**
         * Ignore warnings
         * @instance
         * @name suppressWarnings
         */
        suppressWarnings: false,
        /**
         * Stops the current event from further propagating
         * @function
         * @instance
         * @name stopPropagation
         */
        stopPropagation: function () {
            stopPropagation = true;
            // also stop propagation of sorted events by calling this
            var SortedEventSystem = EventSystem.SortedEventSystem;
            if (SortedEventSystem) {
                SortedEventSystem.stopPropagation();
            }
        },
        /**
         * Fires an event
         * @function
         * @instance
         * @param {String} eventName - Name of the event
         * @param {Object} [eventData] - Extra data to pass with event
         * @name fire
         */
        fire: function (eventName, eventData) {
            var i, l, listeners, listener;
            // Note: Sorted events are called before unsorted event listeners
            var SortedEventSystem = EventSystem.SortedEventSystem;
            if (SortedEventSystem) {
                SortedEventSystem.fire(eventName, eventData);
            }

            stopPropagation = false;

            // clean up before firing event
            cleanEventListeners();

            if (!Utils.isString(eventName)) {
                eventName = eventName.toString();
            }
            if (Utils.isUndefined(events[eventName])) {
                return;
            }
            listeners = events[eventName];
            for (i = 0, l = listeners.length; i < l; ++i) {
                isLoopingEvents = true;
                listener = listeners[i];
                if (listener) {
                    if (listener.context) {
                        listener.callback.apply(listener.context, [eventData]);
                    } else {
                        listener.callback(eventData);
                    }
                } else if (!this.suppressWarnings) {
                    // TODO: this warning appears when event listeners are removed
                    // during another listener being triggered. For example, removing an entity
                    // while that entity was listening to the same event.
                    // In a lot of cases, this is normal... Consider removing this warning?
                    // console.log('Warning: listener is not a function');
                }
                if (stopPropagation) {
                    stopPropagation = false;
                    break;
                }

            }
            isLoopingEvents = false;
        },
        addEventListener: addEventListener,
        removeEventListener: removeEventListener,
        /**
         * Callback function
         *
         * @callback Callback
         * @param {Object} eventData - Any data that is passed
         */
        /**
         * Listen to event.
         * @function
         * @instance
         * @param {String} eventName - Name of the event
         * @param {Callback} callback - Callback function.
         * Be careful about adding anonymous functions here, you should consider removing the event listener
         * to prevent memory leaks.
         * @param {Object} [context] - For prototype objects only: if the callback function is a prototype of an object
         you must pass the object instance or "this" here!
         * @name on
         */
        on: addEventListener,
        /**
         * Removes event listener
         * @function
         * @instance
         * @param {String} eventName - Name of the event
         * @param {Callback} callback - Reference to the callback function
         * @param {Object} [context] - For prototype objects only: if the callback function is a prototype of an object
         you must pass the object instance or "this" here!
         * @name off
         */
        off: removeEventListener,
        /**
         * Removes all listeners of an event
         * @function
         * @instance
         * @param {String} eventName - Name of the event
         * @name clear
         */
        clear: clearEventListeners
    };

    return EventSystem;
});
/**
 * A wrapper for HTML images, holds data for image atlas. Bento renderers only work with PackedImage and not plain
 * HTML Image elements. This allows for easy transitions to using, for example, TexturePacker.
 * (That's why it's called PackedImage, for a lack of better naming).
 * If you plan to use a HTML Canvas as image source, always remember to wrap it in a PackedImage.
 * <br>Exports: Constructor
 * @module bento/packedimage
 * @moduleName PackedImage
 * @param {HTMLImageElement} image - HTML Image Element or HTML Canvas Element
 * @param {Rectangle} frame - Frame boundaries in the image
 * @returns {Rectangle} rectangle - Returns a rectangle with additional image property
 * @returns {HTMLImage} rectangle.image - Reference to the image
 * @snippet PackedImage|constructor
PackedImage(${1:image});
 * @snippet PackedImage|frame
PackedImage(${1:image}, new Rectangle(${2:0}, ${3:0}, ${4:32}, ${5:32}));
 */
bento.define('bento/packedimage', [
    'bento/math/rectangle'
], function (Rectangle) {
    return function (image, frame) {
        var rectangle = frame ? new Rectangle(frame.x, frame.y, frame.w, frame.h) :
            new Rectangle(0, 0, image.width, image.height);
        rectangle.image = image;
        return rectangle;
    };
});
/*
 * Time profiler
 * @moduleName Profiler
 */
bento.define('bento/profiler', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/components/sprite',
    'bento/components/clickable',
    'bento/entity',
    'bento/eventsystem',
    'bento/utils',
    'bento/tween'
], function (
    Bento,
    Vector2,
    Rectangle,
    Sprite,
    Clickable,
    Entity,
    EventSystem,
    Utils,
    Tween
) {
    'use strict';
    var ticTime = 0;
    var startTime = 0;
    var totalTime = 0;
    var times = {};
    var totals = {};
    var measures = {};
    var measurements = 0;
    var hasStarted = false;
    var start = function () {
        hasStarted = true;
        startTime = window.performance.now();
    };
    var stop = function () {
        totalTime += window.performance.now() - startTime;
        measurements += 1;

        if (this.reportAfter && measurements > this.reportAfter) {
            measurements = 0;
            this.report();
        }
        hasStarted = false;
    };
    var report = function () {
        var key;
        console.log('== Report for time spent ==');
        console.log('Total time:', totalTime.toFixed(2) + 'ms');
        for (key in totals) {
            if (!totals.hasOwnProperty(key)) {
                continue;
            }

            console.log(
                key,
                '\n  ' + totals[key].toFixed(2) + 'ms',
                '\n  ' + (totals[key] / totalTime * 100).toFixed(0) + '%',
                '\n  ' + measures[key] + ' tics'
            );
        }
    };
    var tic = function (name) {
        if (!hasStarted) {
            return;
        }
        if (name) {
            times[name] = window.performance.now();
            totals[name] = totals[name] || 0;
            measures[name] = measures[name] || 0;
        } else {
            ticTime = window.performance.now();
        }
    };
    var toc = function (name, log) {
        if (!hasStarted) {
            return;
        }
        if (log) {
            if (name) {
                console.log(name, window.performance.now() - times[name]);
            } else {
                console.log(window.performance.now() - ticTime);
            }
        }
        totals[name] += window.performance.now() - times[name];
        measures[name] += 1;
    };

    return {
        reportAfter: 10, // number of measurements to report after
        start: start,
        stop: stop,
        report: report,
        tic: tic,
        toc: toc
    };
});
/*
 * Base functions for renderer. Has many equivalent functions to a canvas context.
 * <br>Exports: Constructor
 * @module bento/renderer
 * @moduleName Renderer
 */
bento.define('bento/renderer', [
    'bento/utils'
], function (Utils) {
    return function (rendererName, canvas, settings, callback) {
        var module = {
            save: function () {},
            restore: function () {},
            setTransform: function (a, b, c, d, tx, ty) {},
            translate: function () {},
            scale: function (x, y) {},
            rotate: function (angle) {},
            fillRect: function (color, x, y, w, h) {},
            fillCircle: function (color, x, y, radius) {},
            strokeRect: function (color, x, y, w, h) {},
            drawLine: function (color, ax, ay, bx, by, width) {},
            drawImage: function (spriteImage, sx, sy, sw, sh, x, y, w, h) {},
            begin: function () {},
            flush: function () {},
            setColor: function () {},
            getOpacity: function () {},
            setOpacity: function () {},
            createSurface: function () {},
            setContext: function () {},
            restoreContext: function () {}
        };
        bento.require([rendererName], function (renderer) {
            Utils.extend(module, renderer(canvas, settings), true);
            callback(module);
        });
    };
});
/**
 * A collection of useful functions
 * <br>Exports: Object
 * @module bento/utils
 * @moduleName Utils
 */
bento.define('bento/utils', [], function () {
    'use strict';
    var Utils,
        dev = false,
        isString = function (value) {
            return typeof value === 'string' || value instanceof String;
        },
        isArray = Array.prototype.isArray || function (value) {
            return Object.prototype.toString.call(value) === '[object Array]';
        },
        isObject = function (value) {
            return Object.prototype.toString.call(value) === '[object Object]';
        },
        isFunction = function (value) {
            return Object.prototype.toString.call(value) === '[object Function]';
        },
        isNumber = function (obj) {
            return Object.prototype.toString.call(obj) === '[object Number]';
        },
        isBoolean = function (obj) {
            return obj === true || obj === false ||
                Object.prototype.toString.call(obj) === '[object Boolean]';
        },
        isInt = function (obj) {
            return parseFloat(obj) === parseInt(obj, 10) && !isNaN(obj);
        },
        isUndefined = function (obj) {
            return obj === void(0);
        },
        isDefined = function (obj) {
            return obj !== void(0);
        },
        isEmpty = function (obj) {
            return obj == null;
        },
        isNotEmpty = function (obj) {
            return obj != null;
        },
        isObjLiteral = function (_obj) {
            var _test = _obj;
            return (typeof _obj !== 'object' || _obj === null ?
                false :
                (
                    (function () {
                        while (!false) {
                            if (Object.getPrototypeOf(_test = Object.getPrototypeOf(_test)) === null) {
                                break;
                            }
                        }
                        return Object.getPrototypeOf(_obj) === _test;
                    })()
                )
            );
        },
        removeFromArray = function (array, obj) {
            var index = array.indexOf(obj);
            var removed = false;
            while (index >= 0) {
                array.splice(index, 1);
                index = array.indexOf(obj);
                removed = true;
            }
            return removed;
        },
        extend = function (obj1, obj2, force, onConflict) {
            var prop, temp;
            for (prop in obj2) {
                if (obj2.hasOwnProperty(prop)) {
                    if (obj1.hasOwnProperty(prop) && !force) {
                        // property already exists, move it up
                        obj1.base = obj1.base || {};
                        temp = {};
                        temp[prop] = obj1[prop];
                        extend(obj1.base, temp);
                        if (onConflict) {
                            onConflict(prop);
                        }
                    }
                    if (isObjLiteral(obj2[prop])) {
                        obj1[prop] = extend({}, obj2[prop]);
                    } else {
                        obj1[prop] = obj2[prop];
                    }
                }
            }
            return obj1;
        },
        getKeyLength = function (obj) {
            if (!obj) {
                Utils.log("WARNING: object is " + obj);
                return 0;
            }
            return Object.keys(obj).length;
        },
        copyObject = function (obj) {
            var newObject = {};
            var key;
            for (key in obj) {
                if (!obj.hasOwnProperty(key)) {
                    continue;
                }
                newObject[key] = obj[key];
                //TODO? deep copy?
            }
            return newObject;
        },
        setAnimationFrameTimeout = function (callback, timeout) {
            var now = new Date().getTime(),
                rafID = null;

            if (timeout === undefined) timeout = 1;

            function animationFrame() {
                var later = new Date().getTime();

                if (later - now >= timeout) {
                    callback();
                } else {
                    rafID = window.requestAnimationFrame(animationFrame);
                }
            }

            animationFrame();
            return {
                cancel: function () {
                    if (typeof cancelAnimationFrame !== 'undefined') {
                        window.cancelAnimationFrame(rafID);
                    }
                }
            };
        },
        stableSort = (function () {
            // https://github.com/Two-Screen/stable
            // A stable array sort, because `Array#sort()` is not guaranteed stable.
            // This is an implementation of merge sort, without recursion.
            var stable = function (arr, comp) {
                    return exec(arr.slice(), comp);
                },
                // Execute the sort using the input array and a second buffer as work space.
                // Returns one of those two, containing the final result.
                exec = function (arr, comp) {
                    if (typeof (comp) !== 'function') {
                        comp = function (a, b) {
                            return String(a).localeCompare(b);
                        };
                    }

                    // Short-circuit when there's nothing to sort.
                    var len = arr.length;
                    if (len <= 1) {
                        return arr;
                    }

                    // Rather than dividing input, simply iterate chunks of 1, 2, 4, 8, etc.
                    // Chunks are the size of the left or right hand in merge sort.
                    // Stop when the left-hand covers all of the array.
                    var buffer = new Array(len);
                    for (var chk = 1; chk < len; chk *= 2) {
                        pass(arr, comp, chk, buffer);

                        var tmp = arr;
                        arr = buffer;
                        buffer = tmp;
                    }
                    return arr;
                },
                // Run a single pass with the given chunk size.
                pass = function (arr, comp, chk, result) {
                    var len = arr.length;
                    var i = 0;
                    // Step size / double chunk size.
                    var dbl = chk * 2;
                    // Bounds of the left and right chunks.
                    var l, r, e;
                    // Iterators over the left and right chunk.
                    var li, ri;

                    // Iterate over pairs of chunks.
                    for (l = 0; l < len; l += dbl) {
                        r = l + chk;
                        e = r + chk;
                        if (r > len) r = len;
                        if (e > len) e = len;

                        // Iterate both chunks in parallel.
                        li = l;
                        ri = r;
                        while (true) {
                            // Compare the chunks.
                            if (li < r && ri < e) {
                                // This works for a regular `sort()` compatible comparator,
                                // but also for a simple comparator like: `a > b`
                                if (comp(arr[li], arr[ri]) <= 0) {
                                    result[i++] = arr[li++];
                                } else {
                                    result[i++] = arr[ri++];
                                }
                            }
                            // Nothing to compare, just flush what's left.
                            else if (li < r) {
                                result[i++] = arr[li++];
                            } else if (ri < e) {
                                result[i++] = arr[ri++];
                            }
                            // Both iterators are at the chunk ends.
                            else {
                                break;
                            }
                        }
                    }
                };
            stable.inplace = function (arr, comp) {
                var result = exec(arr, comp);

                // This simply copies back if the result isn't in the original array,
                // which happens on an odd number of passes.
                if (result !== arr) {
                    pass(result, null, arr.length, arr);
                }

                return arr;
            };
            // return it instead and keep the method local to this scope
            return stable;
        })(),
        keyboardMapping = (function () {
            var aI,
                keys = {
                    // http://github.com/RobertWhurst/KeyboardJS
                    // general
                    "3": ["cancel"],
                    "8": ["backspace"],
                    "9": ["tab"],
                    "12": ["clear"],
                    "13": ["enter"],
                    "16": ["shift"],
                    "17": ["ctrl"],
                    "18": ["alt", "menu"],
                    "19": ["pause", "break"],
                    "20": ["capslock"],
                    "27": ["escape", "esc"],
                    "32": ["space", "spacebar"],
                    "33": ["pageup"],
                    "34": ["pagedown"],
                    "35": ["end"],
                    "36": ["home"],
                    "37": ["left"],
                    "38": ["up"],
                    "39": ["right"],
                    "40": ["down"],
                    "41": ["select"],
                    "42": ["printscreen"],
                    "43": ["execute"],
                    "44": ["snapshot"],
                    "45": ["insert", "ins"],
                    "46": ["delete", "del"],
                    "47": ["help"],
                    "91": ["command", "windows", "win", "super", "leftcommand", "leftwindows", "leftwin", "leftsuper"],
                    "92": ["command", "windows", "win", "super", "rightcommand", "rightwindows", "rightwin", "rightsuper"],
                    "145": ["scrolllock", "scroll"],
                    "186": ["semicolon", ";"],
                    "187": ["equal", "equalsign", "="],
                    "188": ["comma", ","],
                    "189": ["dash", "-"],
                    "190": ["period", "."],
                    "191": ["slash", "forwardslash", "/"],
                    "192": ["graveaccent", "`"],

                    "195": ["GamepadA"],
                    "196": ["GamepadB"],
                    "197": ["GamepadX"],
                    "198": ["GamepadY"],
                    "199": ["GamepadRightShoulder"], // R1
                    "200": ["GamepadLeftShoulder"], // L1
                    "201": ["GamepadLeftTrigger"], // L2
                    "202": ["GamepadRightTrigger"], // R2
                    "203": ["GamepadDPadUp"],
                    "204": ["GamepadDPadDown"],
                    "205": ["GamepadDPadLeft"],
                    "206": ["GamepadDPadRight"],
                    "207": ["GamepadMenu"], // 'start' button
                    "208": ["GamepadView"], // 'select' button
                    "209": ["GamepadLeftThumbstick"], // pressed left thumbstick
                    "210": ["GamepadRightThumbstick"], // pressed right thumbstick
                    "211": ["GamepadLeftThumbstickUp"],
                    "212": ["GamepadLeftThumbstickDown"],
                    "213": ["GamepadLeftThumbstickRight"],
                    "214": ["GamepadLeftThumbstickLeft"],
                    "215": ["GamepadRightThumbstickUp"],
                    "216": ["GamepadRightThumbstickDown"],
                    "217": ["GamepadRightThumbstickRight"],
                    "218": ["GamepadRightThumbstickLeft"],
                    "7": ["GamepadXboxButton"], // the middle xbox button

                    "219": ["openbracket", "["],
                    "220": ["backslash", "\\"],
                    "221": ["closebracket", "]"],
                    "222": ["apostrophe", "'"],

                    //0-9
                    "48": ["zero", "0"],
                    "49": ["one", "1"],
                    "50": ["two", "2"],
                    "51": ["three", "3"],
                    "52": ["four", "4"],
                    "53": ["five", "5"],
                    "54": ["six", "6"],
                    "55": ["seven", "7"],
                    "56": ["eight", "8"],
                    "57": ["nine", "9"],

                    //numpad
                    "96": ["numzero", "num0"],
                    "97": ["numone", "num1"],
                    "98": ["numtwo", "num2"],
                    "99": ["numthree", "num3"],
                    "100": ["numfour", "num4"],
                    "101": ["numfive", "num5"],
                    "102": ["numsix", "num6"],
                    "103": ["numseven", "num7"],
                    "104": ["numeight", "num8"],
                    "105": ["numnine", "num9"],
                    "106": ["nummultiply", "num*"],
                    "107": ["numadd", "num+"],
                    "108": ["numenter"],
                    "109": ["numsubtract", "num-"],
                    "110": ["numdecimal", "num."],
                    "111": ["numdivide", "num/"],
                    "144": ["numlock", "num"],

                    //function keys
                    "112": ["f1"],
                    "113": ["f2"],
                    "114": ["f3"],
                    "115": ["f4"],
                    "116": ["f5"],
                    "117": ["f6"],
                    "118": ["f7"],
                    "119": ["f8"],
                    "120": ["f9"],
                    "121": ["f10"],
                    "122": ["f11"],
                    "123": ["f12"],

                    // volume keys Microsoft Surface
                    "174": ["volDown"],
                    "175": ["volUp"]
                };
            for (aI = 65; aI <= 90; aI += 1) {
                keys[aI] = keys[aI] || [];
                keys[aI].push(String.fromCharCode(aI + 32));
            }

            return keys;
        })(),
        remoteMapping = (function () {
            // the commented out keys are not used by the remote's micro gamepad
            var buttons = {
                "0": ["A", "a", "click"], // click on touch area
                // "1": ["B"],
                "2": ["X", "x", "play", "pause"], // pause/play button
                // "3": ["Y"],
                // "4": ["L1"],
                // "5": ["R1"],
                // "6": ["L2"],
                // "7": ["R2"],
                "12": ["up"], // upper half touch area
                "13": ["down"], // lower half touch area
                "14": ["left"], // left half touch area
                "15": ["right"], // right half touch area
                "16": ["menu"] // menu button
            };

            return buttons;
        })(),
        /**
         * Mapping for the Xbox controller
         * @return {Object} mapping of all the buttons
         */
        gamepadMapping = (function () {
            var buttons = {
                "0": ["A", "a"],
                "1": ["B", "b"],
                "2": ["X", "x"],
                "3": ["Y", "y"],
                "4": ["L1", "l1"],
                "5": ["R1", "r1"],
                "6": ["L2", "l2"],
                "7": ["R2", "r2"],
                "8": ["back", "select"],
                "9": ["start"],
                "10": ["right-thumb", "right-stick"],
                "11": ["left-thumb", "left-stick"],
                "12": ["up"],
                "13": ["down"],
                "14": ["left"],
                "15": ["right"],
                "16": ["menu", "home"]
            };

            return buttons;
        })();

    Utils = {
        /**
         * Checks if environment is iOS (using Cocoon.io)
         * @function
         * @instance
         * @name isNativeIos
         * @snippet Utils.isNativeIos|Boolean
        Utils.isNativeIos()
         */
        isNativeIos: function () {
            if (navigator.isCocoonJS && window.Cocoon && window.Cocoon.getPlatform() === 'ios') {
                return true;
            }
            return false;
        },
        /**
         * Checks if environment is Android (using Cocoon.io)
         * @function
         * @instance
         * @name isNativeAndroid
         * @snippet Utils.isNativeAndroid|Boolean
        Utils.isNativeAndroid()
         */
        isNativeAndroid: function () {
            var platform;
            if (navigator.isCocoonJS && window.Cocoon) {
                platform = window.Cocoon.getPlatform();
                if (platform === 'android' || platform === 'amazon') {
                    return true;
                }
            }
            return false;
        },
        /**
         * Callback during foreach
         *
         * @callback IteratorCallback
         * @param {Object} value - The value in the array or object literal
         * @param {Number} index - Index of the array or key in object literal
         * @param {Number} length - Length of the array or key count in object literal
         * @param {Function} breakLoop - Calling this breaks the loop and stops iterating over the array or object literal
         */
        /**
         * Loops through an array
         * @function
         * @instance
         * @param {Array/Object} array - Array or Object literal to loop through
         * @param {IteratorCallback} callback - Callback function
         * @name forEach
         * @snippet Utils.forEach
        Utils.forEach(${1:array}, function (${2:item}, i, l, breakLoop) {
    ${3:// code here}
});
         */
        forEach: function (array, callback) {
            var obj;
            var i;
            var l;
            var stop = false;
            var breakLoop = function () {
                stop = true;
            };
            if (Utils.isArray(array)) {
                for (i = 0, l = array.length; i < l; ++i) {
                    callback(array[i], i, l, breakLoop, array[i + 1]);
                    if (stop) {
                        return;
                    }
                }
            } else {
                l = Utils.getKeyLength(array);
                for (i in array) {
                    if (!array.hasOwnProperty(i)) {
                        continue;
                    }
                    callback(array[i], i, l, breakLoop);
                    if (stop) {
                        return;
                    }
                }
            }
        },
        /**
         * Returns either the provided value, or the provided fallback value in case the provided value was undefined
         * @function
         * @instance
         * @name getDefault
         * @snippet Utils.getDefault|snippet
        Utils.getDefault(${1:value}, ${2:default})
         * @param {Anything} value - any type
         * @param {Anything} value - any type
         */
        getDefault: function (param, fallback) {
            return (param !== void(0)) ? param : fallback;
        },
        /**
         * Returns a random integer [0...n)
         * @function
         * @instance
         * @name getRandom
         * @snippet Utils.getRandom|Number
        Utils.getRandom(${1:Number})
         * @param {Number} n - limit of random number
         * @return {Number} Randomized integer
         */
        getRandom: function (n) {
            return Math.floor(Math.random() * n);
        },
        /**
         * Returns a random integer between range [min...max)
         * @function
         * @instance
         * @name getRandomRange
         * @snippet Utils.getRandomRange|Number
        Utils.getRandomRange(${1:Minimum}, ${2:Number})
         * @param {Number} min - minimum value
         * @param {Number} max - maximum value
         * @return {Number} Randomized integer
         */
        getRandomRange: function (min, max) {
            var diff = max - min;
            return min + Math.floor(Math.random() * diff);
        },
        /**
         * Returns a random float [0...n)
         * @function
         * @instance
         * @name getRandomFloat
         * @snippet Utils.getRandomFloat|Number
        Utils.getRandomFloat(${1:Number})
         * @param {Number} n - limit of random number
         * @return {Number} Randomized number
         */
        getRandomFloat: function (n) {
            return Math.random() * n;
        },
        /**
         * Returns a random float between range [min...max)
         * @function
         * @instance
         * @name getRandomRangeFloat
         * @snippet Utils.getRandomRangeFloat|Number
        Utils.getRandomRangeFloat(${1:Minimum}, ${2:Number})
         * @param {Number} min - minimum value
         * @param {Number} max - maximum value
         * @return {Number} Randomized number
         */
        getRandomRangeFloat: function (min, max) {
            var diff = max - min;
            return min + Math.random() * diff;
        },
        /**
         * Turns degrees into radians
         * @function
         * @instance
         * @name toRadian
         * @snippet Utils.toRadian|Number
        Utils.toRadian(${1:Degrees})
         * @param {Number} degree - value in degrees
         * @return {Number} radians
         */
        toRadian: function (degree) {
            return degree * Math.PI / 180;
        },
        /**
         * Turns radians into degrees
         * @function
         * @instance
         * @name toDegree
         * @snippet Utils.toDegree|Number
        Utils.toDegree(${1:Radians})
         * @param {Number} radians - value in radians
         * @return {Number} degree
         */
        toDegree: function (radian) {
            return radian / Math.PI * 180;
        },
        /**
         * Sign of a number. Returns 0 if value is 0.
         * @function
         * @instance
         * @param {Number} value - value to check
         * @name sign
         * @snippet Utils.sign|Number
        Utils.sign(${1:Number})
         */
        sign: function (value) {
            if (value > 0) {
                return 1;
            } else if (value < 0) {
                return -1;
            } else {
                return 0;
            }
        },
        /**
         * Steps towards a number without going over the limit
         * @function
         * @instance
         * @param {Number} start - current value
         * @param {Number} end - target value
         * @param {Number} step - step to take (should always be a positive value)
         * @name approach
         * @snippet Utils.approach|Number
        Utils.approach(${1:start}, ${2:end}, ${3:step})
         */
        approach: function (start, end, max) {
            max = Math.abs(max);
            if (start < end) {
                return Math.min(start + max, end);
            } else {
                return Math.max(start - max, end);
            }
        },
        /**
         * Repeats a function for a number of times
         * @function
         * @instance
         * @param {Number} number - Number of times to repeat
         * @param {Function} fn - function to perform
         * @param {Array} [params] - Parameters to pass to function
         * @name repeat
         * @snippet Utils.repeat|snippet
        Utils.repeat(${1:1}, ${2:Function})
         */
        repeat: function (number, fn) {
            var i;
            var count;
            var action;
            if (typeof number === "number") {
                count = number;
                action = fn;
            } else {
                // swapped the parameters
                count = fn;
                action = number;
            }
            if (!action.apply) {
                Utils.log("Did not pass a function");
                return;
            }
            for (i = 0; i < count; ++i) {
                action(i, count);
            }
        },
        /**
         * A simple hashing function, similar to Java's String.hashCode()
         * source: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
         * @function
         * @instance
         * @param {String} string - String to hash
         * @name checksum
         * @snippet Utils.checksum|Number
        Utils.checksum(${1:String})
         */
        checksum: function (str) {
            var hash = 0,
                strlen = (str || '').length,
                i,
                c;
            if (strlen === 0) {
                return hash;
            }
            for (i = 0; i < strlen; ++i) {
                c = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + c;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash;
        },
        /**
         * Extends object literal properties with another object
         * If the objects have the same property name, then the old one is pushed to a property called "base"
         * @function
         * @instance
         * @name extend
         * @snippet Utils.extend|Object
        Utils.extend(${1:Object}, ${2:Object2})
         * @snippet Utils.extend|conflict
Utils.extend(${1:Object}, ${2:Object2}, false, function (prop) {
    ${4://code here}
});
         * @param {Object} object1 - original object
         * @param {Object} object2 - new object
         * @param {Bool} [force] - Overwrites properties (defaults to false)
         * @param {Function} [onConflict] - Called when properties have the same name. Only called if force is false.
         * @return {Array} The updated array
         */
        extend: extend,
        /**
         * Counts the number of keys in an object literal
         * @function
         * @instance
         * @name getKeyLength
         * @snippet Utils.getKeyLength|Number
        Utils.getKeyLength(${1})
         * @param {Object} object - object literal
         * @return {Number} Number of keys
         */
        getKeyLength: getKeyLength,
        /**
         * Returns a (shallow) copy of an object literal
         * @function
         * @instance
         * @name copyObject
         * @snippet Utils.copyObject|Object
        Utils.copyObject(${1:Object})
         * @param {Object} object - object literal
         * @return {Object} Shallow copy
         */
        copyObject: copyObject,
        /**
         * Returns a clone of a JSON object
         * @function
         * @instance
         * @param {Object} jsonObj - Object literal that adheres to JSON standards
         * @name cloneJson
         * @snippet Utils.cloneJson|Object
        Utils.cloneJson(${1:json})
         */
        cloneJson: function (jsonObj) {
            var out;
            try {
                out = JSON.parse(JSON.stringify(jsonObj));
            } catch (e) {
                out = {};
                console.log('WARNING: object cloning failed');
            }
            return out;
        },
        /**
         * Removes entry from array (note: only removes all matching values it finds)
         * @function
         * @instance
         * @param {Array} array - array
         * @param {Anything} value - any type
         * @return {Bool} True if removal was successful, false if the value was not found
         * @name removeFromArray
         * @snippet Utils.removeFromArray|Object
        Utils.removeFromArray(${1:Array}, ${2:Value})
         */
        removeFromArray: removeFromArray,
        /**
         * Checks whether a value is between two other values
         * @function
         * @instance
         * @param {Number} min - lower limit
         * @param {Number} value - value to check that's between min and max
         * @param {Number} max - upper limit
         * @param {Boolean} includeEdge - includes edge values
         * @name isBetween
         * @snippet Utils.isBetween|Boolean
        Utils.isBetween(${1:minimum}, ${2:value}, ${3:maximum}, ${4:false})
         */
        isBetween: function (min, value, max, includeEdge) {
            if (includeEdge) {
                return min <= value && value <= max;
            }
            return min < value && value < max;
        },
        /**
         * Picks one of the parameters of this function and returns it
         * @function
         * @instance
         * @name pickRandom
         * @snippet Utils.pickRandom|Object
        Utils.pickRandom(${1}, ${2}, ${3:...})
         */
        pickRandom: function () {
            return arguments[this.getRandom(arguments.length)];
        },
        /**
         * Clamps a numerical value between a minimum and maximum value
         * @function
         * @instance
         * @param {Number} min - lower limit
         * @param {Number} value - value to clamp between min and max
         * @param {Number} max - upper limit
         * @name clamp
         * @snippet Utils.clamp
        Utils.clamp(${1:min}, ${2:value}, ${3:max})
         */
        clamp: function (min, value, max) {
            return Math.max(min, Math.min(value, max));
        },
        /**
         * Checks useragent if device is an apple device. Works on web only.
         * @function
         * @instance
         * @name isApple
         * @snippet Utils.isApple|Boolean
        Utils.isApple()
         */
        isApple: function () {
            var device = (navigator.userAgent).match(/iPhone|iPad|iPod/i);
            return /iPhone/i.test(device) || /iPad/i.test(device) || /iPod/i.test(device);
        },
        /**
         * Checks useragent if device is an android device. Works on web only.
         * @function
         * @instance
         * @name isAndroid
         * @snippet Utils.isAndroid|Boolean
        Utils.isAndroid()
         */
        isAndroid: function () {
            return /Android/i.test(navigator.userAgent);
        },
        /**
         * Checks if environment is cocoon
         * @function
         * @instance
         * @name isCocoonJs
         * @snippet Utils.isCocoonJs|Boolean
        Utils.isCocoonJs()
         */
        isCocoonJS: function () {
            return navigator.isCocoonJS;
        },
        isCocoonJs: function () {
            return navigator.isCocoonJS;
        },
        /**
         * Checks if environment is mobile browser
         * @function
         * @instance
         * @name isMobileBrowser
         * @snippet Utils.isMobileBrowser|Boolean
        Utils.isMobileBrowser()
         */
        isMobileBrowser: function () {
            var check = false;
            (function (a) {
                if (/(android|bb\d+|meego|android|ipad|playbook|silk).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) {
                    check = true;
                }
            })(navigator.userAgent || navigator.vendor || window.opera);
            return check;
        },
        /**
         * Checks if environment is Android (using Cordova Device plugin)
         * @function
         * @instance
         * @name isAndroidDevice
         * @snippet Utils.isAndroidDevice|Boolean
        Utils.isAndroidDevice()
         */
        isAndroidDevice: function () {
            var platform = window.device && window.device.platform ? window.device.platform.toLowerCase() : '';
            if (platform === 'android') {
                return true;
            }
            return false;
        },
        /**
         * Checks if environment is iOS (using Cordova Device plugin)
         * @function
         * @instance
         * @name isIosDevice
         * @snippet Utils.isIosDevice|Boolean
        Utils.isIosDevice()
         */
        isIosDevice: function () {
            var platform = window.device && window.device.platform ? window.device.platform.toLowerCase() : '';
            if (platform === 'ios') {
                return true;
            }
            return false;
        },
        /**
         * Checks if environment is Amazon/Fire OS (using Cordova Device plugin)
         * @function
         * @instance
         * @name isAmazonDevice
         * @snippet Utils.isAmazonDevice|Boolean
        Utils.isAmazonDevice()
         */
        isAmazonDevice: function () {
            var platform = window.device && window.device.platform ? window.device.platform.toLowerCase() : '';
            // platform can be either 'amazon-fireos' or 'Amazon'
            if (platform.indexOf('amazon') > -1) {
                return true;
            }
            return false;
        },
        /**
         * Turn dev mode on or off to use throws or console.logs
         * @function
         * @instance
         * @param {Boolean} bool - set to true to use throws instead of console.logs
         * @name setDev
         * @snippet Utils.setDev|snippet
        Utils.setDev()
         */
        setDev: function (bool) {
            dev = bool;
        },
        /**
         * Is dev mode on
         * @function
         * @instance
         * @name isDev
         * @snippet Utils.isDev|Boolean
        Utils.isDev()
         */
        isDev: function () {
            return dev;
        },
        /**
         * Wrapper around console.error
         * @function
         * @instance
         * @param {String} msg - the message to log
         * @name log
         * @snippet Utils.log
        Utils.log('WARNING: ${1}')
         */
        log: function (msg) {
            console.error(msg);
        },
        /**
         * @function
         * @instance
         * @name isString
         * @snippet Utils.isString|Boolean
        Utils.isString(${1:String})
         */
        isString: isString,
        /**
         * @function
         * @instance
         * @name isArray
         * @snippet Utils.isArray|Boolean
        Utils.isArray(${1:Array})
         */
        isArray: isArray,
        /**
         * @function
         * @instance
         * @name isObject
         * @snippet Utils.isObject|Boolean
        Utils.isObject(${1:Object})
         */
        isObject: isObject,
        /**
         * @function
         * @instance
         * @name isFunction
         * @snippet Utils.isFunction|Boolean
        Utils.isFunction(${1:Function})
         */
        isFunction: isFunction,
        /**
         * @function
         * @instance
         * @name isNumber
         * @snippet Utils.isNumber|Boolean
        Utils.isNumber(${1:Number})
         */
        isNumber: isNumber,
        /**
         * @function
         * @instance
         * @name isBoolean
         * @snippet Utils.isBoolean|Boolean
        Utils.isBoolean(${1:Boolean})
         */
        isBoolean: isBoolean,
        /**
         * @function
         * @instance
         * @name isInt
         * @snippet Utils.isInt|Boolean
        Utils.isInt(${1:Integer})
         */
        isInt: isInt,
        /**
         * Is parameter undefined?
         * @function
         * @name isUndefined
         * @snippet Utils.isUndefined|Boolean
        Utils.isUndefined(${1})
         * @param {Anything} obj - any type
         * @return {Bool} True if parameter is undefined
         * @instance
         */
        isUndefined: isUndefined,
        /**
         * Is parameter anything other than undefined?
         * @function
         * @instance
         * @param {Anything} obj - any type
         * @return {Bool} True if parameter is not undefined
         * @name isDefined
         * @snippet Utils.isDefined|Boolean
        Utils.isDefined(${1})
         */
        isDefined: isDefined,
        /**
         * Is parameter null or undefined
         * @function
         * @instance
         * @param {Anything} obj - any type
         * @return {Bool} True if parameter is null or undefined
         * @name isEmpty
         * @snippet Utils.isEmpty|Boolean
        Utils.isEmpty(${1})
         */
        isEmpty: isEmpty,
        /**
         * Is parameter anything other than null or undefined
         * @function
         * @instance
         * @param {Anything} obj - any type
         * @return {Bool} True if parameter is not null or undefined
         * @name isNotEmpty
         * @snippet Utils.isNotEmpty|Boolean
        Utils.isNotEmpty(${1})
         */
        isNotEmpty: isNotEmpty,
        stableSort: stableSort,
        keyboardMapping: keyboardMapping,
        remoteMapping: remoteMapping,
        gamepadMapping: gamepadMapping,
        /**
         * Enum for sort mode, pass this to Bento.setup
         * @readonly
         * @enum {Number}
         */
        SortMode: {
            ALWAYS: 0,
            NEVER: 1,
            SORT_ON_ADD: 2
        }
    };
    return Utils;
});