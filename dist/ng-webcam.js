(function () {
    "use strict";
    var ngWebcam = angular.module("ngWebcam", []);

    ngWebcam.directive("ngWebcam", [function () {
            var cam = {
                loaded: false,
                live: false,
                constraints: {},
                userMedia: true,
                flipFlag: true,
                init: function () {
                    cam.mediaDevices = (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ?
                            navigator.mediaDevices : ((navigator.mozGetUserMedia || navigator.webkitGetUserMedia) ? {
                                getUserMedia: function (c) {
                                    return new Promise(function (y, n) {
                                        (navigator.mozGetUserMedia ||
                                                navigator.webkitGetUserMedia).call(navigator, c, y, n);
                                    });
                                }
                            } : null);
                    window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
                    cam.userMedia = cam.userMedia && !!cam.mediaDevices && !!window.URL;
                }
            };

            function initConfig(scope) {
                if (!scope.ngWebcam.destWidth) {
                    scope.ngWebcam.destWidth = cam.video.clientWidth;
                }

                if (!scope.ngWebcam.destHeight) {
                    scope.ngWebcam.destHeight = cam.video.clientHeight;
                }

                if (scope.ngWebcam.constraints && typeof scope.ngWebcam.constraints === 'object') {
                    cam.constraints = scope.ngWebcam.constraints;
                }

                if (!scope.ngWebcam.flipHoriz) {
                    scope.ngWebcam.flipHoriz = false;
                    cam.flipFlag = false;
                }

                if (!scope.ngWebcam.imageFormat) {
                    scope.ngWebcam.imageFormat = "jpeg";
                }

                if (!scope.ngWebcam.imageQuality) {
                    scope.ngWebcam.imageQuality = 90;
                } else if (isNaN(scope.ngWebcam.imageQuality) || scope.ngWebcam.imageQuality > 100 || scope.ngWebcam.imageQuality < 0) {
                    alert("imageQuality option is not valid");
                    return false;
                }

                scope.ngWebcam.flip = function (flip) {
                    var style = cam.video.style;
                    scope.ngWebcam.flipHoriz = !scope.ngWebcam.flipHoriz;
                    if (flip) {
                        scope.ngWebcam.flipHoriz = flip;
                    }
                    if (scope.ngWebcam.flipHoriz) {
                        style.webkitTransform = 'scaleX(-1)';
                        style.mozTransform = 'scaleX(-1)';
                        style.msTransform = 'scaleX(-1)';
                        style.oTransform = 'scaleX(-1)';
                        style.transform = 'scaleX(-1)';
                        style.filter = 'FlipH';
                        style.msFilter = 'FlipH';
                    } else {
                        style.webkitTransform = 'scaleX(1)';
                        style.mozTransform = 'scaleX(1)';
                        style.msTransform = 'scaleX(1)';
                        style.oTransform = 'scaleX(1)';
                        style.transform = 'scaleX(1)';
                        style.filter = '';
                        style.msFilter = '';
                    }
                    cam.flipFlag = true;
                }
                if (scope.ngWebcam.flipHoriz) {
                    scope.ngWebcam.flip(true);
                }
                return true;
            }

            function link(scope, el, attrs) {
                cam.init();
                if (!initConfig(scope))
                    return;
                function startCam() {
                    if (cam.loaded) {
                        return;
                    }
                    cam.mediaDevices.getUserMedia({
                        "audio": false,
                        "video": cam.constraints
                    }).then(function (stream) {
                        cam.video.src = window.URL.createObjectURL(stream) || stream;
                        cam.stream = stream;
                        cam.loaded = cam.live = true;
                        if (scope.ngWebcam.onload && typeof scope.ngWebcam.onload === 'function') {
                            scope.ngWebcam.onload();
                        }
                        if (scope.ngWebcam.onlive && typeof scope.ngWebcam.onlive === 'function') {
                            scope.ngWebcam.onlive();
                        }
                    }).catch(function (err) {
                        console.log(err);
                    });
                }
                
                function snap() {
                    var canvas = document.createElement('canvas');
                    canvas.width = scope.ngWebcam.destWidth;
                    canvas.height = scope.ngWebcam.destHeight;
                    var ctx = canvas.getContext('2d');

                    if (scope.ngWebcam.flipHoriz) {
                        ctx.translate(scope.ngWebcam.destWidth, 0);
                        ctx.scale(-1, 1);
                    }

                    ctx.drawImage(cam.video, 0, 0, canvas.width, canvas.height);
                    var dataURI = canvas.toDataURL('image/' + scope.ngWebcam.imageFormat, scope.ngWebcam.imageQuality / 100);
                    ctx = null;
                    canvas = null;
                    return dataURI;
                }

                scope.ngWebcam.snap = function (callback) {
                    if (callback && typeof callback === 'function') {
                        callback(snap());
                    }
                };

                function stream() {
                    scope.ngWebcam.onstream(snap());
                    if (!scope.$parent.$$phase) {
                        scope.$parent.$apply();
                    }
                    setTimeout(stream, 0);
                }
                if (scope.ngWebcam.onstream && typeof scope.ngWebcam.onstream === 'function') {
                    stream();
                }

                scope.ngWebcam.stop = function () {
                    if (cam.userMedia) {
                        if (cam.stream) {
                            if (cam.stream.getVideoTracks) {
                                var tracks = cam.stream.getVideoTracks();
                                if (tracks && tracks[0] && tracks[0].stop)
                                    tracks[0].stop();
                            }
                            else if (cam.stream.stop) {
                                cam.stream.stop();
                            }
                        }
                        cam.stream = null;
                        cam.loaded = cam.live = false;
                        cam.video.src = "";
                        //cam.video = null;
                    }
                };

                scope.ngWebcam.start = function () {
                    startCam();
                };

                function drawCanvas(canvas) {
                    var ctx = canvas.getContext('2d');

                    if (cam.flipFlag) {
                        ctx.translate(canvas.width, 0);
                        ctx.scale(-1, 1);
                        cam.flipFlag = false;
                    }

                    ctx.drawImage(cam.video, 0, 0, canvas.width, canvas.height);
                    setTimeout(function () {
                        drawCanvas(canvas);
                    }, 0);
                }

                if (scope.ngWebcam.liveCanvas) {
                    drawCanvas(scope.ngWebcam.liveCanvas);
                }
                
                if (scope.ngWebcam.startOnload) {
                    startCam();
                }
            }

            function template(el, attrs) {
                cam.video = document.createElement('video');
                cam.video.setAttribute('autoplay', 'autoplay');
                cam.video.style.width = '100%';
                cam.video.style.height = '100%';
                return cam.video;
            }
            return {
                restrict: 'A',
                scope: {ngWebcam: '='},
                link: link,
                template: template
            };
        }]);
}());