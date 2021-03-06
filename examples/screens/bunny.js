bento.define('bunny', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/utils',
    'bento/entity',
    'bento/components/sprite',
    'bento/components/clickable',
    'bento/tween'
], function (
    Bento,
    Vector2,
    Rectangle,
    Utils,
    Entity,
    Sprite,
    Clickable,
    Tween
) {
    'use strict';
    return function () {
        var sprite = new Sprite({
                image: Bento.assets.getImage('bunnygirlsmall'),
                originRelative: new Vector2(0.5, 0.5),
                frameWidth: 32,
                frameHeight: 32,
                animations: {
                    'default': {
                        speed: 0.1,
                        frames: [0, 10, 11, 12]
                    },
                    'walk': {
                        speed: 0.15,
                        frames: [4, 5, 6, 7, 8, 9]
                    }
                }
            }),
            animation = sprite.animation,
            clickable = new Clickable({
                onClick: function () {
                    console.log('clicked!')
                    if (Bento.screens.getCurrentScreen().name === 'screen1') {
                        Bento.screens.show('screen2');
                    } else {
                        Bento.screens.show('screen1');
                    }
                }
            }),
            entity = new Entity({
                z: 0,
                name: 'bunny',
                components: [
                    sprite,
                    clickable
                ],
                family: ['bunnies']
            });

        return entity;
    };
});