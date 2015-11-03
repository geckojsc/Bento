bento.define('bento/gui/clickbutton', [
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
        var viewport = Bento.getViewport(),
            active = true,
            sprite = new Sprite({
                image: settings.image,
                frameWidth: settings.frameWidth || 32,
                frameHeight: settings.frameHeight || 32,
                animations: settings.animations || {
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
                }
            }),
            clickable = new Clickable({
                onClick: function () {
                    if (!active) {
                        return;
                    }
                    sprite.animation.setAnimation('down');
                },
                onHoldEnter: function () {
                    if (!active) {
                        return;
                    }
                    sprite.animation.setAnimation('down');
                },
                onHoldLeave: function () {
                    if (!active) {
                        return;
                    }
                    sprite.animation.setAnimation('up');
                },
                pointerUp: function () {
                    if (!active) {
                        return;
                    }
                    sprite.animation.setAnimation('up');
                },
                onHoldEnd: function () {
                    if (active && settings.onClick) {
                        settings.onClick.apply(entity);
                        if (settings.sfx) {
                            Bento.audio.stopSound(settings.sfx);
                            Bento.audio.playSound(settings.sfx);
                        }
                        EventSystem.fire('clickButton', entity);
                    }
                }
            }),
            entitySettings = Utils.extend({
                z: 0,
                name: '',
                originRelative: new Vector2(0.5, 0.5),
                position: new Vector2(0, 0),
                components: [
                    sprite,
                    clickable
                ],
                family: ['buttons'],
                init: function () {
                    if (!active) {
                        sprite.animation.setAnimation('inactive');
                    } else {
                        sprite.animation.setAnimation('up');
                    }
                }
            }, settings),
            entity = new Entity(entitySettings).extend({
                setActive: function (bool) {
                    active = bool;
                    if (!active) {
                        sprite.animation.setAnimation('inactive');
                    } else {
                        sprite.animation.setAnimation('up');
                    }
                },
                doCallback: function () {
                    settings.onClick.apply(entity);
                }
            });

        if (Utils.isDefined(settings.active)) {
            active = settings.active;
        }

        return entity;
    };
});