bento.define('bento/components/scale', [
    'bento/utils',
    'bento/math/vector2'
], function (Utils, Vector2) {
    'use strict';
    return function (entity) {
        var set = false,
            scale = Vector2(1, 1),
            mixin = {},
            component = {
                name: 'scale',
                draw: function (data) {
                    if (set) {
                        data.renderer.scale(scale.x, scale.y);
                    }
                },
                setScale: function (vector) {
                    set = true;
                    scale = vector;
                },
                getScale: function () {
                    return scale;
                },
                setScaleX: function (value) {
                    set = true;
                    scale.x = value;
                },
                setScaleY: function (value) {
                    set = true;
                    scale.y = value;
                }
            };
        entity.attach(component);
        mixin[component.name] = component;
        Utils.extend(entity, mixin);
        return entity;
    };
});